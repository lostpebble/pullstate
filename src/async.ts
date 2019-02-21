import { IPullstateAllStores, PullstateContext } from "./PullstateController";
import { useContext, useEffect, useState } from "react";

type TPullstateAsyncUpdateListener = () => void;

// result state = [ finished, error, resp, updating ]
export interface IPullstateAsyncState {
  [key: string]: [boolean, boolean, any, boolean];
}

export interface IPullstateAsyncCache {
  results: IPullstateAsyncState;
  listeners: {
    [key: string]: TPullstateAsyncUpdateListener[];
  };
  actions: {
    [key: string]: () => Promise<any>;
  };
}

type TPullstateAsyncAction<A = any, S extends IPullstateAllStores = IPullstateAllStores, R = any> = (
  args?: A,
  stores?: S
) => Promise<R>;

type TAsyncActionWatch<A, R> = (args?: A) => [boolean, boolean, R, boolean];
type TAsyncActionRun<A, R> = (args?: A, treatAsUpdate?: boolean) => Promise<[boolean, R]>;
type TAsyncActionClearCache<A> = (args?: A) => void;

export interface IOCreateAsyncActionOutput<A = any, R = any> {
  watch: TAsyncActionWatch<A, R>;
  run: TAsyncActionRun<A, R>;
  clearCache: TAsyncActionClearCache<A>;
}

const clientAsyncCache: IPullstateAsyncCache = {
  listeners: {},
  results: {},
  actions: {},
};

let asyncCreationOrdinal = 0;

function createKey(ordinal, args: any) {
  return `${ordinal}-${JSON.stringify(args)}`;
}

export function createAsyncAction<A, R, S extends IPullstateAllStores = IPullstateAllStores>(
  action: TPullstateAsyncAction<A, S, R>,
  defaultArgs: A = {} as A,
  stores?: S
): IOCreateAsyncActionOutput {
  const ordinal: number = asyncCreationOrdinal++;
  const onServer: boolean = typeof window === "undefined";
  console.log(`Creating async action with ordinal: ${ordinal} - action name: ${action.name}`);

  const watch: TAsyncActionWatch<A, R> = (args = defaultArgs) => {
    const key = createKey(ordinal, args);
    let shouldUpdate = true;

    const cache: IPullstateAsyncCache = onServer ? useContext(PullstateContext)._asyncCache : clientAsyncCache;

    const [response, setResponse] = useState<[boolean, boolean, R, boolean]>(() => {
      if (cache.results.hasOwnProperty(key)) {
        console.log(`Pullstate Async: [${key}] Already been run - do nothing`);
        return [true, false, null, false];
      }

      console.log(`Pullstate Async: [${key}] has no results yet`);

      // check if it is already pending as an action
      if (!cache.actions.hasOwnProperty(key)) {
        // queue (on server) or start the action now (on client)
        cache.actions[key] = () => action(args, stores);
        if (!onServer) {
          cache.actions[key]()
            .then(resp => {
              cache.results[key] = [true, false, resp, false];
              delete cache.actions[key];

              for (const listener of cache.listeners[key]) {
                listener();
              }
            })
            .catch(() => {
              cache.results[key] = [true, true, null, false];
              delete cache.actions[key];

              for (const listener of cache.listeners[key]) {
                listener();
              }
            });
        }
      }

      return [false, false, null, false];
    });

    // only listen for updates when on client
    if (!onServer) {
      function onAsyncStateChanged() {
        console.log(`Need to react to a new load or finish`);
        setResponse(cache.results[key]);
      }

      useEffect(() => {
        cache.listeners[key].push(onAsyncStateChanged);

        return () => {
          shouldUpdate = false;
          cache.listeners[key].filter(f => f !== onAsyncStateChanged);
        };
      });
    }

    return response;

    /*if (response.finished) {
      return [response.finished, response.error, response.resp];
    }*/

    /*if (onServer) {
      // on the server
      const pullstateContext = useContext(PullstateContext);
      const asyncCache: IPullstateAsyncCache = pullstateContext === null ? pullstateClientAsyncCache : pullstateContext._asyncCache;
    } else {

    }*/
    // const asyncCache: IPullstateAsyncCache = pullstateContext === null ? pullstateClientAsyncCache : pullstateContext._asyncCache;
    // const useStores = pullstateContext === null ? stores : pullstateContext.stores;

    /*if (asyncCache.results.hasOwnProperty(key)) {
      console.log(`Pullstate Async: [${key}] Already been run - do nothing`);
      return [true, asyncCache.results[key].error, asyncCache.results[key].resp as R];
    } else {
      console.log(`Pullstate Async: [${key}] NEW async action`);
      if (typeof window === "undefined") {
        // on the server
        asyncCache.actions[key] = () => action(args, stores);
      } else {
        // on the client
        action(args, stores)
          .then(resp => {
            if (shouldUpdate) {
              asyncCache.results[key] = { resp, error: false };
              setResponse({ finished: true, error: false, resp });
            }
          })
          .catch(() => {
            if (shouldUpdate) {
              asyncCache.results[key] = { resp: null, error: true };
              setResponse({ finished: false, error: true, resp: null });
            }
          });
      }
    }

    return [response.finished, response.error, response.resp];*/
  };

  const run: TAsyncActionRun<A, R> = async (args = defaultArgs, treatAsUpdate = false) => {
    const key = createKey(ordinal, args);

    const currentResult = clientAsyncCache.results[key];

    if (currentResult[0] && treatAsUpdate) {
      clientAsyncCache.results[key] = [true, false, currentResult[2], true];
    } else {
      clientAsyncCache.results[key] = [false, false, null, false];
    }

    for (const listener of clientAsyncCache.listeners[key]) {
      listener();
    }

    if (!clientAsyncCache.actions.hasOwnProperty(key)) {
      delete clientAsyncCache.results[key];

      // queue (on server) or start the action now (on client)
      clientAsyncCache.actions[key] = () => action(args, stores);
      await clientAsyncCache.actions[key]()
        .then(resp => {
          clientAsyncCache.results[key] = { resp, error: false };
          delete clientAsyncCache.actions[key];

          for (const listener of clientAsyncCache.listeners[key]) {
            listener([true, false, resp]);
          }
          // if (shouldUpdate) {
          //   setResponse({ finished: true, error: false, resp });
          // }
        })
        .catch(() => {
          clientAsyncCache.results[key] = { resp: null, error: true };
          delete clientAsyncCache.actions[key];

          for (const listener of clientAsyncCache.listeners[key]) {
            listener([true, true, null]);
          }
          // if (shouldUpdate) {
          //   setResponse({ finished: false, error: true, resp: null });
          // }
        });
    } else {
      await clientAsyncCache.actions[key];
    }

    // await action(args, stores)
    //   .then(resp => {})
    //   .catch(() => {});
  };
  const clearCache: TAsyncActionClearCache<A> = (args = {} as A) => {};

  return {
    watch,
    run,
    clearCache,
  };
}
