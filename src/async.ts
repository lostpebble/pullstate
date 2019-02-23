import { IPullstateAllStores, PullstateContext } from "./PullstateCore";
const shallowEqual = require("fbjs/lib/shallowEqual");
import { useContext, useEffect, useState } from "react";

type TPullstateAsyncUpdateListener = () => void;

// result state = [ started, finished, resp, updating ]
export type TPullstateAsyncWatchResponse<R> = [boolean, boolean, null | R, boolean];
export type TPullstateAsyncBeckonResponse<R> = [boolean, null | R, boolean];
export type TPullstateAsyncRunResponse<R> = Promise<[null | R]>;
// export interface IPullstateAsyncResponse<R> {
//   started: boolean;
//   finished: boolean;
//   updating: boolean;
//   result: R;
// }

export interface IPullstateAsyncState {
  [key: string]: TPullstateAsyncWatchResponse<any>;
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

export type TPullstateAsyncAction<A, R, S extends IPullstateAllStores> = (args: A, stores: S) => Promise<R>;

export interface IAsyncActionWatchOptions {
  initiate?: boolean;
}

export interface IAsyncActionRunOptions {
  treatAsUpdate?: boolean;
}

type TAsyncActionBeckon<A, R> = (args?: A) => TPullstateAsyncBeckonResponse<R>;
type TAsyncActionWatch<A, R> = (args?: A, options?: IAsyncActionWatchOptions) => TPullstateAsyncWatchResponse<R>;
type TAsyncActionRun<A, R> = (args?: A, options?: IAsyncActionRunOptions) => TPullstateAsyncRunResponse<R>;
type TAsyncActionClearCache<A> = (args?: A) => void;

export interface IOCreateAsyncActionOutput<A, R> {
  beckon: TAsyncActionBeckon<A, R>;
  watch: TAsyncActionWatch<A, R>;
  run: TAsyncActionRun<A, R>;
  clearCache: TAsyncActionClearCache<A>;
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

function notifyListeners(key: string) {
  console.log(`Notifying (${clientAsyncCache.listeners[key].length}) listeners for key: ${key}`);
  for (const listener of clientAsyncCache.listeners[key]) {
    listener();
  }
}

export function createAsyncAction<A, R, S extends IPullstateAllStores = IPullstateAllStores>(
  action: TPullstateAsyncAction<A, R, S>,
  defaultArgs: A = {} as A,
  clientStores: S = {} as S
): IOCreateAsyncActionOutput<A, R> {
  const ordinal: number = asyncCreationOrdinal++;
  const onServer: boolean = typeof window === "undefined";
  // console.log(`Creating async action with ordinal: ${ordinal} - action name: ${action.name}`);

  const watch: TAsyncActionWatch<A, R> = (args = defaultArgs, { initiate = false }: IAsyncActionWatchOptions = {}) => {
    const key = createKey(ordinal, args);
    let shouldUpdate = true;

    const cache: IPullstateAsyncCache = onServer ? useContext(PullstateContext)._asyncCache : clientAsyncCache;
    const stores = onServer ? (useContext(PullstateContext).stores as S) : clientStores;

    function checkKeyAndReturnResponse(key: string): TPullstateAsyncWatchResponse<R> {
      if (cache.results.hasOwnProperty(key)) {
        // console.log(`Pullstate Async: [${key}] Already been run - do nothing`);
        return cache.results[key];
        // return [true, true, null, false];
      }

      // console.log(`Pullstate Async: [${key}] has no results yet`);

      // check if it is already pending as an action
      if (!cache.actions.hasOwnProperty(key)) {
        if (initiate) {
          // queue (on server) or start the action now (on client)
          cache.actions[key] = () => action(args, stores);

          if (!onServer) {
            cache.actions[key]()
              .then(resp => {
                cache.results[key] = [true, true, resp, false];
              })
              .catch(() => {
                cache.results[key] = [true, true, null, false];
              })
              .then(() => {
                delete cache.actions[key];
                notifyListeners(key);
              });
          }
        } else {
          return [false, false, null, false];
        }
      }

      return [true, false, null, false];
    }

    // only listen for updates when on client
    if (!onServer) {
      function onAsyncStateChanged() {
        if (shouldUpdate && !shallowEqual(response, cache.results[key])) {
          setResponse(checkKeyAndReturnResponse(key));
        }
      }

      useEffect(() => {
        if (!cache.listeners.hasOwnProperty(key)) {
          cache.listeners[key] = [];
        }

        // console.log(`Adding listener for key: ${key}`);
        cache.listeners[key].push(onAsyncStateChanged);

        return () => {
          shouldUpdate = false;
          // console.log(`Removing listener for key: ${key}`);
          cache.listeners[key] = cache.listeners[key].filter(f => f !== onAsyncStateChanged);
        };
      }, [key]);
    }

    const [response, setResponse] = useState<TPullstateAsyncWatchResponse<R>>(() => {
      return checkKeyAndReturnResponse(key);
    });

    const [prevKey, setPrevKey] = useState<string>(key);

    if (prevKey !== key) {
      setPrevKey(key);
      setResponse(checkKeyAndReturnResponse(key));
    }

    return response;
  };

  // Same as watch - just initiated, so no need for "started" return value
  const beckon: TAsyncActionBeckon<A, R> = (args = defaultArgs) => {
    const result = watch(args, { initiate: true });
    return [result[1], result[2], result[3]];
  }

  const run: TAsyncActionRun<A, R> = async (args = defaultArgs, { treatAsUpdate = false }: IAsyncActionRunOptions = {}) => {
    const key = createKey(ordinal, args);

    const [prevFinished, prevResp] = clientAsyncCache.results[key] || [false, null];

    if (prevFinished && treatAsUpdate) {
      clientAsyncCache.results[key] = [true, true, prevResp, true];
    } else {
      clientAsyncCache.results[key] = [true, false, null, false];
    }

    notifyListeners(key);

    // for (const listener of clientAsyncCache.listeners[key]) {
    //   listener();
    // }

    try {
      const resp = await action(args, clientStores);
      clientAsyncCache.results[key] = [true, true, resp, false];
      notifyListeners(key);
      return [resp];
    } catch (e) {
      clientAsyncCache.results[key] = [true, true, null, false];
      notifyListeners(key);
      return [null];
    }
  };

  const clearCache: TAsyncActionClearCache<A> = (args = {} as A) => {
    const key = createKey(ordinal, args);
    delete clientAsyncCache.results[key];
    notifyListeners(key);
  };

  return {
    beckon,
    watch,
    run,
    clearCache,
  };
}
