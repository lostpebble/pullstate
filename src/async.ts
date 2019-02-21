import { IPullstateAllStores, PullstateContext } from "./PullstateCore";
import shallowEqual from "fbjs/lib/shallowEqual";
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

export type TPullstateAsyncAction<A, S extends IPullstateAllStores, R> = (args: A, stores: S) => Promise<R>;

type TAsyncActionWatch<A, R> = (args?: A) => [boolean, boolean, R, boolean];
type TAsyncActionRun<A, R> = (args?: A, treatAsUpdate?: boolean) => Promise<[boolean, R]>;
// type TAsyncActionClearCache<A> = (args?: A) => void;

export interface IOCreateAsyncActionOutput<A, R> {
  watch: TAsyncActionWatch<A, R>;
  run: TAsyncActionRun<A, R>;
  // clearCache: TAsyncActionClearCache<A>;
}

export const clientAsyncCache: IPullstateAsyncCache = {
  listeners: {},
  results: {},
  actions: {},
};

let asyncCreationOrdinal = 0;

export function keyFromObject(json: any): string {
  if (json == null) {
    return `${json}`;
  }

  let prefix = "";

  for (const key of Object.keys(json).sort()) {
    prefix += key;

    if (typeof json[key] == null) {
      prefix += JSON.stringify(json[key]);
    } else if (typeof json[key] === "string") {
      prefix += `~${json[key]}~`;
    } else if (typeof json[key] === "boolean" || typeof json[key] === "number") {
      prefix += json[key];
    } else {
      prefix += keyFromObject(json[key]);
    }
  }

  return prefix;
}

function createKey(ordinal, args: any) {
  return `${ordinal}-${keyFromObject(args)}`;
}

export function createAsyncAction<A, R, S extends IPullstateAllStores = IPullstateAllStores>(
  action: TPullstateAsyncAction<A, S, R>,
  defaultArgs: A = {} as A,
  clientStores: S = {} as S
): IOCreateAsyncActionOutput<A, R> {
  const ordinal: number = asyncCreationOrdinal++;
  const onServer: boolean = typeof window === "undefined";
  console.log(`Creating async action with ordinal: ${ordinal} - action name: ${action.name}`);

  const watch: TAsyncActionWatch<A, R> = (args = defaultArgs) => {
    const key = createKey(ordinal, args);
    let shouldUpdate = true;

    // console.log(`Got args: with key: ${key}`);

    const cache: IPullstateAsyncCache = onServer ? useContext(PullstateContext)._asyncCache : clientAsyncCache;
    const stores = onServer ? (useContext(PullstateContext).stores as S) : clientStores;

    function checkKeyAndReturnResponse(key: string): [boolean, boolean, R, boolean] {
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
            })
            .catch(() => {
              cache.results[key] = [true, true, null, false];
            })
            .then(() => {
              delete cache.actions[key];
              for (const listener of cache.listeners[key]) {
                listener();
              }
            });
        }
      }

      return [false, false, null, false];
    }

    const [prevKey, setPrevKey] = useState<string>(key);
    const [response, setResponse] = useState<[boolean, boolean, R, boolean]>(() => {
      return checkKeyAndReturnResponse(key);
    });

    if (prevKey !== key) {
      setPrevKey(key);
      setResponse(checkKeyAndReturnResponse(key));
    }

    // only listen for updates when on client
    if (!onServer) {
      function onAsyncStateChanged() {
        console.log(`Need to react to a new load or finish`);
        if (shouldUpdate && !shallowEqual(response, cache.results[key])) {
          setResponse(cache.results[key]);
        }
      }

      useEffect(() => {
        if (!cache.listeners.hasOwnProperty(key)) {
          cache.listeners[key] = [];
        }

        cache.listeners[key].push(onAsyncStateChanged);

        return () => {
          shouldUpdate = false;
          cache.listeners[key].filter(f => f !== onAsyncStateChanged);
        };
      });
    }

    return response;
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

    try {
      const resp = await action(args, clientStores);
      clientAsyncCache.results[key] = [true, false, resp, false];
      return [false, resp];
    } catch (e) {
      clientAsyncCache.results[key] = [true, true, null, false];
      return [true, null];
    }
  };

  /*const clearCache: TAsyncActionClearCache<A> = (args = {} as A) => {

  };*/

  return {
    watch,
    run,
  };
}
