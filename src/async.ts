import { IPullstateAllStores, PullstateContext } from "./PullstateCore";
const shallowEqual = require("fbjs/lib/shallowEqual");
import { useContext, useEffect, useRef, useState, useMemo } from "react";

type TPullstateAsyncUpdateListener = () => void;

// [ started, finished, result, updating ]
export type TPullstateAsyncWatchResponse<R, T extends string> = [boolean, boolean, TAsyncActionResult<R, T>, boolean];
// [finished, result, updating]
export type TPullstateAsyncBeckonResponse<R, T extends string> = [boolean, TAsyncActionResult<R, T>, boolean];
// [result]
export type TPullstateAsyncRunResponse<R, T extends string> = Promise<TAsyncActionResult<R, T>>;

export interface IPullstateAsyncResultState {
  [key: string]: TPullstateAsyncWatchResponse<any, string>;
}

export interface IPullstateAsyncActionOrdState {
  [key: string]: number;
}

export enum EAsyncEndTags {
  THREW_ERROR = "THREW_ERROR",
  RETURNED_ERROR = "RETURNED_ERROR",
  UNFINISHED = "UNFINISHED",
}

interface IAsyncActionResultBase<T extends string> {
  message: string;
  tags: (EAsyncEndTags | T)[];
}

export interface IAsyncActionResultPositive<R, T extends string> extends IAsyncActionResultBase<T> {
  error: false;
  payload: R;
}

export interface IAsyncActionResultNegative<T extends string> extends IAsyncActionResultBase<T> {
  error: true;
  payload: null;
}

export type TAsyncActionResult<R, T extends string> = IAsyncActionResultPositive<R, T> | IAsyncActionResultNegative<T>;

export type TPullstateAsyncAction<A, R, T extends string, S extends IPullstateAllStores> = (
  args: A,
  stores: S
) => Promise<TAsyncActionResult<R, T>>;

export interface IAsyncActionBeckonOptions {
  ssr?: boolean;
}

export interface IAsyncActionWatchOptions extends IAsyncActionBeckonOptions {
  initiate?: boolean;
}

export interface IAsyncActionRunOptions {
  treatAsUpdate?: boolean;
}

type TAsyncActionBeckon<A, R, T extends string> = (
  args?: A,
  options?: IAsyncActionBeckonOptions
) => TPullstateAsyncBeckonResponse<R, T>;
type TAsyncActionWatch<A, R, T extends string> = (
  args?: A,
  options?: IAsyncActionWatchOptions
) => TPullstateAsyncWatchResponse<R, T>;
type TAsyncActionRun<A, R, T extends string> = (
  args?: A,
  options?: IAsyncActionRunOptions
) => TPullstateAsyncRunResponse<R, T>;
type TAsyncActionClearCache<A> = (args?: A) => void;
type TAsyncActionClearAllCache = () => void;

export interface IOCreateAsyncActionOutput<A, R, T extends string> {
  useBeckon: TAsyncActionBeckon<A, R, T>;
  useWatch: TAsyncActionWatch<A, R, T>;
  run: TAsyncActionRun<A, R, T>;
  clearCache: TAsyncActionClearCache<A>;
  clearAllCache: TAsyncActionClearAllCache;
}

export interface IPullstateAsyncCache {
  results: IPullstateAsyncResultState;
  listeners: {
    [key: string]: TPullstateAsyncUpdateListener[];
  };
  actions: {
    [key: string]: () => Promise<TAsyncActionResult<any, string>>;
  };
  actionOrd: IPullstateAsyncActionOrdState;
}

export const clientAsyncCache: IPullstateAsyncCache = {
  listeners: {},
  results: {},
  actions: {},
  actionOrd: {},
};

let asyncCreationOrdinal = 0;

export function keyFromObject(json: any): string {
  if (json == null) {
    return `${json}`;
  }

  let prefix = "{";
  // const keys = Object.keys(json);

  for (const key of Object.keys(json).sort()) {
    prefix += key;

    if (typeof json[key] == null) {
      prefix += JSON.stringify(json[key]);
    } else if (typeof json[key] === "string") {
      prefix += `~${json[key]}~`;
    } else if (typeof json[key] === "boolean" || typeof json[key] === "number") {
      prefix += json[key];
    } else {
      prefix += `{${keyFromObject(json[key])}}`;
    }
  }

  /*if (keys.length > 0) {

  }*/

  return prefix += "}";
}

function createKey(ordinal, args: any) {
  return `${ordinal}-${keyFromObject(args)}`;
}

function notifyListeners(key: string) {
  if (clientAsyncCache.listeners.hasOwnProperty(key)) {
    console.log(`[${key}] Notifying (${clientAsyncCache.listeners[key].length}) listeners`);
    for (const listener of clientAsyncCache.listeners[key]) {
      listener();
    }
  } else {

  }
}

function clearActionCache(key: string) {
  if (clientAsyncCache.actionOrd.hasOwnProperty(key)) {
    clientAsyncCache.actionOrd[key] += 1;
  }

  // console.log(`Set ordinal for action [${key}] to ${clientAsyncCache.actionOrd[key] || "DIDNT EXIST"}`);
  // console.log(`Clearing cache for [${key}]`);
  delete clientAsyncCache.results[key];
  notifyListeners(key);
}

function actionOrdUpdate(cache: IPullstateAsyncCache, key: string): number {
  if (!cache.actionOrd.hasOwnProperty(key)) {
    cache.actionOrd[key] = 0;
  } else {
    cache.actionOrd[key] += 1;
  }

  return cache.actionOrd[key];
}

export function successResult<R extends any = null, T extends string = string>(
  payload: R = null,
  tags: (EAsyncEndTags | T)[] = [],
  message: string = ""
): IAsyncActionResultPositive<R, T> {
  return {
    payload,
    tags,
    message,
    error: false,
  };
}

export function errorResult<R = any, T extends string = string>(
  tags: (EAsyncEndTags | T)[] = [],
  message: string = ""
): IAsyncActionResultNegative<T> {
  return {
    payload: null,
    tags: [EAsyncEndTags.RETURNED_ERROR, ...tags],
    message,
    error: true,
  };
}

export function createAsyncAction<
  A = any,
  R = any,
  T extends string = string,
  S extends IPullstateAllStores = IPullstateAllStores
>(
  action: TPullstateAsyncAction<A, R, T, S>,
  defaultArgs: A = {} as A,
  clientStores: S = {} as S
): IOCreateAsyncActionOutput<A, R, T> {
  const ordinal: number = asyncCreationOrdinal++;
  const onServer: boolean = typeof window === "undefined";
  // console.log(`Creating async action with ordinal: ${ordinal} - action name: ${action.name}`);

  function checkKeyAndReturnResponse(key: string, cache: IPullstateAsyncCache, initiate: boolean, ssr: boolean, args: A, stores: S): TPullstateAsyncWatchResponse<R, T> {
    if (cache.results.hasOwnProperty(key)) {
      console.log(`[${key}] Pullstate Async: Already been run - do nothing`);
      return cache.results[key] as TPullstateAsyncWatchResponse<R, T>;
    }

    console.log(`[${key}] Pullstate Async: has no results yet`);

    // check if it is already pending as an action
    if (!cache.actions.hasOwnProperty(key)) {
      if (initiate) {
        // queue (on server) or start the action now (on client)
        if (ssr || !onServer) {
          cache.actions[key] = () => action(args, stores);
        }

        let currentActionOrd = actionOrdUpdate(cache, key);

        if (!onServer) {
          cache.actions[key]()
            .then(resp => {
              if (currentActionOrd === cache.actionOrd[key]) {
                cache.results[key] = [true, true, resp, false] as TPullstateAsyncWatchResponse<R, T>;
              }
            })
            .catch(e => {
              if (currentActionOrd === cache.actionOrd[key]) {
                cache.results[key] = [
                  true,
                  true,
                  { payload: null, error: true, tags: [EAsyncEndTags.THREW_ERROR], message: e.message },
                  false,
                ] as TPullstateAsyncWatchResponse<R, T>;
              }
            })
            .then(() => {
              delete cache.actions[key];
              notifyListeners(key);
            });
        }
      } else {
        return [
          false,
          false,
          {
            message: "",
            tags: [EAsyncEndTags.UNFINISHED],
            error: true,
            payload: null,
          },
          false,
        ] as TPullstateAsyncWatchResponse<R, T>;
      }
    }

    return [
      true,
      false,
      {
        message: "",
        tags: [EAsyncEndTags.UNFINISHED],
        error: true,
        payload: null,
      },
      false,
    ];
  }

  const useWatch: TAsyncActionWatch<A, R, T> = (
    args = defaultArgs,
    { initiate = false, ssr = true }: IAsyncActionWatchOptions = {}
  ) => {
    const key = createKey(ordinal, args);
    let shouldUpdate = true;

    console.log(`[${key}] Starting useWatch()`);

    const cache: IPullstateAsyncCache = onServer ? useContext(PullstateContext)._asyncCache : clientAsyncCache;
    const stores = onServer ? (useContext(PullstateContext).stores as S) : clientStores;

    const [prevKey, setPrevKey] = useState<string>(key);

    // only listen for updates when on client
    if (!onServer) {
      function onAsyncStateChanged() {
        if (shouldUpdate && !shallowEqual(responseRef.current, cache.results[key])) {
          const newResponse = checkKeyAndReturnResponse(key, cache, initiate, ssr, args, stores);
          setResponse(newResponse);
          responseRef.current = newResponse;
        }
      }

      useEffect(() => {
        const onAsyncStateChanged = () => {
          if (shouldUpdate && !shallowEqual(responseRef.current, cache.results[key])) {
            const newResponse = checkKeyAndReturnResponse(key, cache, initiate, ssr, args, stores);
            setResponse(newResponse);
            responseRef.current = newResponse;
          }
        };

        if (!cache.listeners.hasOwnProperty(key)) {
          cache.listeners[key] = [];
        }

        cache.listeners[key].push(onAsyncStateChanged);
        console.log(`[${key}] Added listener (total now: ${cache.listeners[key].length})`);

        /*if (!cache.listeners.hasOwnProperty(key)) {
          cache.listeners[key] = [];
        }

        console.log(`[${key}] Adding listener`);
        cache.listeners[key].push(onAsyncStateChanged);*/

        return () => {
          shouldUpdate = false;
          console.log(`[${key}] Removing listener (before: ${cache.listeners[key].length})`);
          cache.listeners[key] = cache.listeners[key].filter(f => f !== onAsyncStateChanged);
          console.log(`[${key}] Removed listener (after: ${cache.listeners[key].length})`);
        };
      }, [key]);
    }

    const [response, setResponse] = useState<TPullstateAsyncWatchResponse<R, T>>(() => {
      console.log(`[${key}] Running initial response check`);
      return checkKeyAndReturnResponse(key, cache, initiate, ssr, args, stores);
    });

    const responseRef = useRef(response);

    if (prevKey !== key) {
      console.log(`KEYS MISMATCH old !== new [${prevKey} !== ${key}]`);
      setPrevKey(key);
      const newResponse = checkKeyAndReturnResponse(key, cache, initiate, ssr, args, stores);
      setResponse(newResponse);
      responseRef.current = newResponse;
    }

    console.log(`[${key}] Returning from watch() with response: ${JSON.stringify(response)}`);
    return response;
  };

  // Same as watch - just initiated, so no need for "started" return value
  const useBeckon: TAsyncActionBeckon<A, R, T> = (
    args = defaultArgs,
    { ssr = true }: IAsyncActionBeckonOptions = {}
  ) => {
    const result = useWatch(args, { initiate: true, ssr });
    return [result[1], result[2], result[3]];
  };

  const run: TAsyncActionRun<A, R, T> = async (
    args = defaultArgs,
    { treatAsUpdate = false }: IAsyncActionRunOptions = {}
  ): Promise<TAsyncActionResult<R, T>> => {
    const key = createKey(ordinal, args);

    const [prevStarted, prevFinished, prevResp] = clientAsyncCache.results[key] || [
      false,
      false,
      { error: true, message: "", payload: null, tags: [EAsyncEndTags.UNFINISHED] } as IAsyncActionResultNegative<T>,
    ];

    if (prevFinished && treatAsUpdate) {
      clientAsyncCache.results[key] = [true, true, prevResp, true];
    } else {
      clientAsyncCache.results[key] = [true, false, prevResp, false];
    }

    notifyListeners(key);
    let currentActionOrd = actionOrdUpdate(clientAsyncCache, key);

    try {
      const result: TAsyncActionResult<R, T> = await action(args, clientStores);

      if (currentActionOrd === clientAsyncCache.actionOrd[key]) {
        clientAsyncCache.results[key] = [true, true, result, false];
        notifyListeners(key);
      }

      return result;
    } catch (e) {
      const result: IAsyncActionResultNegative<T> = {
        error: true,
        message: e.message,
        tags: [EAsyncEndTags.THREW_ERROR],
        payload: null,
      };

      if (currentActionOrd === clientAsyncCache.actionOrd[key]) {
        clientAsyncCache.results[key] = [true, true, result, false];
        notifyListeners(key);
      }

      return result;
    }
  };

  const clearCache: TAsyncActionClearCache<A> = (args = {} as A) => {
    const key = createKey(ordinal, args);
    clearActionCache(key);
  };

  const clearAllCache: TAsyncActionClearAllCache = () => {
    for (const key of Object.keys(clientAsyncCache.actionOrd)) {
      if (key.startsWith(`${ordinal}-`)) {
        clearActionCache(key);
      }
    }
  };

  return {
    useBeckon,
    useWatch,
    run,
    clearCache,
    clearAllCache,
  };
}
