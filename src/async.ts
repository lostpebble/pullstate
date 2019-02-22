import { IPullstateAllStores, PullstateContext } from "./PullstateCore";
// import shallowEqual from "fbjs/lib/shallowEqual";
const shallowEqual = require("fbjs/lib/shallowEqual");
import { useContext, useEffect, useState } from "react";

type TPullstateAsyncUpdateListener = () => void;

export type TPullstateAsyncResponse<R> = [boolean, null | R, boolean];
// result state = [ finished, error, resp, updating ]
export interface IPullstateAsyncState {
  [key: string]: TPullstateAsyncResponse<any>;
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

type TAsyncActionWatch<A, R> = (args?: A) => TPullstateAsyncResponse<R>;
type TAsyncActionRun<A, R> = (args?: A, options?: IAsyncActionRunOptions) => Promise<[boolean, R]>;
type TAsyncActionClearCache<A> = (args?: A) => void;

export interface IOCreateAsyncActionOutput<A, R> {
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

export interface IAsyncActionRunOptions {
  treatAsUpdate?: boolean;
}

export function createAsyncAction<A, R, S extends IPullstateAllStores = IPullstateAllStores>(
  action: TPullstateAsyncAction<A, R, S>,
  defaultArgs: A = {} as A,
  clientStores: S = {} as S
): IOCreateAsyncActionOutput<A, R> {
  const ordinal: number = asyncCreationOrdinal++;
  const onServer: boolean = typeof window === "undefined";
  console.log(`Creating async action with ordinal: ${ordinal} - action name: ${action.name}`);

  const watch: TAsyncActionWatch<A, R> = (args = defaultArgs) => {
    const key = createKey(ordinal, args);
    let shouldUpdate = true;

    const cache: IPullstateAsyncCache = onServer ? useContext(PullstateContext)._asyncCache : clientAsyncCache;
    const stores = onServer ? (useContext(PullstateContext).stores as S) : clientStores;

    function checkKeyAndReturnResponse(key: string): TPullstateAsyncResponse<R> {
      if (cache.results.hasOwnProperty(key)) {
        console.log(`Pullstate Async: [${key}] Already been run - do nothing`);
        return [true, null, false];
      }

      console.log(`Pullstate Async: [${key}] has no results yet`);

      // check if it is already pending as an action
      if (!cache.actions.hasOwnProperty(key)) {
        // queue (on server) or start the action now (on client)
        cache.actions[key] = () => action(args, stores);

        if (!onServer) {
          cache.actions[key]()
            .then(resp => {
              cache.results[key] = [true, resp, false];
            })
            .catch(() => {
              cache.results[key] = [true, null, false];
            })
            .then(() => {
              delete cache.actions[key];
              console.log(`Notifying listeners on key [${key}] after async action completes`);
              notifyListeners(key);
            });
        }
      }

      return [false, null, false];
    }

    // only listen for updates when on client
    if (!onServer) {
      function onAsyncStateChanged() {
        console.log(`Need to react to a new load or finish`);
        if (shouldUpdate && !shallowEqual(response, cache.results[key])) {
          setResponse(checkKeyAndReturnResponse(key));
        }
      }

      useEffect(() => {
        if (!cache.listeners.hasOwnProperty(key)) {
          cache.listeners[key] = [];
        }

        console.log(`Adding listener for key: ${key}`);
        cache.listeners[key].push(onAsyncStateChanged);

        return () => {
          shouldUpdate = false;
          console.log(`Removing listener for key: ${key}`);
          cache.listeners[key] = cache.listeners[key].filter(f => f !== onAsyncStateChanged);
        };
      }, [key]);
    }

    const [response, setResponse] = useState<TPullstateAsyncResponse<R>>(() => {
      return checkKeyAndReturnResponse(key);
    });

    const [prevKey, setPrevKey] = useState<string>(key);

    if (prevKey !== key) {
      setPrevKey(key);
      setResponse(checkKeyAndReturnResponse(key));
    }

    return response;
  };

  const run: TAsyncActionRun<A, R> = async (args = defaultArgs, { treatAsUpdate = false }: IAsyncActionRunOptions = {}) => {
    const key = createKey(ordinal, args);

    const [prevFinished, prevResp] = clientAsyncCache.results[key] || [false, null];

    if (prevFinished && treatAsUpdate) {
      clientAsyncCache.results[key] = [true, prevResp, true];
    } else {
      clientAsyncCache.results[key] = [false, null, false];
    }

    notifyListeners(key);

    // for (const listener of clientAsyncCache.listeners[key]) {
    //   listener();
    // }

    try {
      const resp = await action(args, clientStores);
      clientAsyncCache.results[key] = [true, resp, false];
      notifyListeners(key);
      return [false, resp];
    } catch (e) {
      clientAsyncCache.results[key] = [true, null, false];
      notifyListeners(key);
      return [true, null];
    }
  };

  const clearCache: TAsyncActionClearCache<A> = (args = {} as A) => {
    const key = createKey(ordinal, args);
    delete clientAsyncCache.results[key];
    notifyListeners(key);
  };

  return {
    watch,
    run,
    clearCache,
  };
}
