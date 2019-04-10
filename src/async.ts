import { IPullstateAllStores, PullstateContext } from "./PullstateCore";
const shallowEqual = require("fbjs/lib/shallowEqual");
import { useContext, useEffect, useRef, useState, useMemo } from "react";

type TPullstateAsyncUpdateListener = () => void;

// [ started, finished, result, updating ]
export type TPullstateAsyncWatchResponse<R, T extends string> = [
  boolean,
  boolean,
  TAsyncActionResult<R, T>,
  boolean
];

// [ started, finished, result, updating, postActionResult ]
export type TPullstateAsyncResponseCacheFull<R, T extends string> = [
  boolean,
  boolean,
  TAsyncActionResult<R, T>,
  boolean,
  TAsyncActionResult<R, T> | true | null
];
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

export type TAsyncActionResult<R, T extends string> =
  | IAsyncActionResultPositive<R, T>
  | IAsyncActionResultNegative<T>;

export type TPullstateAsyncAction<A, R, T extends string, S extends IPullstateAllStores> = (
  args: A,
  stores: S
) => Promise<TAsyncActionResult<R, T>>;

export type TPullstateAsyncShortCircuitHook<A, R, T extends string, S extends IPullstateAllStores> = (
  args: A,
  stores: S
) => TAsyncActionResult<R, T> | false;

export type TPullstateAsyncCacheBreakHook<A, R, T extends string, S extends IPullstateAllStores> = (
  args: A,
  result: TAsyncActionResult<R, T>,
  stores: S
) => boolean;

export enum EPostActionContext {
  CACHE = "CACHE",
  SHORT_CIRCUIT = "SHORT_CIRCUIT",
  DIRECT_RUN = "DIRECT_RUN",
}

export type TPullstateAsyncPostActionHook<A, R, T extends string, S extends IPullstateAllStores> = (
  args: A,
  result: TAsyncActionResult<R, T>,
  stores: S,
  context: EPostActionContext
) => TAsyncActionResult<R, T> | void;

export interface IAsyncActionBeckonOptions {
  ssr?: boolean;
}

export interface IAsyncActionWatchOptions extends IAsyncActionBeckonOptions {
  initiate?: boolean;
}

export interface IAsyncActionRunOptions {
  treatAsUpdate?: boolean;
  ignoreShortCircuit?: boolean;
}

// Order of new hook functions:

// shortCircuitHook = ({ args, stores }) => cachable response | false     - happens only on uncached action
// cacheBreakHook = ({ args, stores, result }) => true | false            - happens only on cached action
// postActionHook = ({ args, result, stores }) => void | new result       - happens on all actions, after the async / short circuit has resolved
// ----> postActionHook potentially needs a mechanism which allows it to run only once per new key change (another layer caching of some sorts expiring on key change)

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
    [key: string]: {
      [watchId: string]: TPullstateAsyncUpdateListener;
    };
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

  return (prefix += "}");
}

function createKey(ordinal, args: any) {
  return `${ordinal}-${keyFromObject(args)}`;
}

function notifyListeners(key: string) {
  if (clientAsyncCache.listeners.hasOwnProperty(key)) {
    // console.log(`[${key}] Notifying (${Object.keys(clientAsyncCache.listeners[key]).length}) listeners`);
    for (const watchId of Object.keys(clientAsyncCache.listeners[key])) {
      // console.log(`[${key}] Notifying listener with watch id: [${watchId}]`);
      clientAsyncCache.listeners[key][watchId]();
    }
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

export interface ICreateAsyncActionOptions<A, R, T extends string, S extends IPullstateAllStores> {
  clientStores?: S;
  shortCircuitHook?: TPullstateAsyncShortCircuitHook<A, R, T, S>;
  cacheBreakHook?: TPullstateAsyncCacheBreakHook<A, R, T, S>;
  postActionHook?: TPullstateAsyncPostActionHook<A, R, T, S>;
}

export function createAsyncAction<
  A = any,
  R = any,
  T extends string = string,
  S extends IPullstateAllStores = IPullstateAllStores
>(
  action: TPullstateAsyncAction<A, R, T, S>,
  {
    clientStores = {} as S,
    shortCircuitHook,
    cacheBreakHook,
    postActionHook,
  }: ICreateAsyncActionOptions<A, R, T, S> = {}
): IOCreateAsyncActionOutput<A, R, T> {
  const ordinal: number = asyncCreationOrdinal++;
  const onServer: boolean = typeof window === "undefined";

  let cacheBreakWatcher: { [actionKey: string]: number } = {};
  let watchIdOrd: number = 0;
  const shouldUpdate: {
    [actionKey: string]: {
      [watchId: string]: boolean;
    };
  } = {};
  // console.log(`Creating async action with ordinal: ${ordinal} - action name: ${action.name}`);

  function runPostActionHook(
    result: TAsyncActionResult<R, T>,
    args: A,
    stores: S,
    context: EPostActionContext
  ): TAsyncActionResult<R, T> {
    if (postActionHook !== undefined) {
      const potentialResponse: any = postActionHook(args, result, stores, context);
      return potentialResponse != null ? potentialResponse : result;
    }

    return result;
  }

  function checkKeyAndReturnResponse(
    key: string,
    cache: IPullstateAsyncCache,
    initiate: boolean,
    ssr: boolean,
    args: A,
    stores: S
  ): TPullstateAsyncWatchResponse<R, T> {
    if (cache.results.hasOwnProperty(key)) {
      const cacheBreakLoop = (cacheBreakWatcher.hasOwnProperty(key) && cacheBreakWatcher[key] > 2);
      // console.log(`[${key}] Pullstate Async: Already finished - returning cached result`);
      if (
        cacheBreakHook !== undefined &&
        cacheBreakHook(args, cache.results[key][2] as TAsyncActionResult<R, T>, stores) &&
        !cacheBreakLoop
      ) {
        if (cacheBreakWatcher.hasOwnProperty(key)) {
          cacheBreakWatcher[key]++;
        } else {
          cacheBreakWatcher[key] = 1;
        }

        delete cache.results[key];
      } else {
        if (cacheBreakLoop) {
          console.error(`[${key}] Pullstate detected an infinite loop caused by cacheBreakHook()
returning true too often (breaking cache as soon as your action is resolving - hence
causing beckoned actions to run the action again) in one of your AsyncActions - prevented
further looping. Fix in your cacheBreakHook() is needed.`);
        } else {
          cacheBreakWatcher[key] = 0;
        }

        // if this is a "finished" cached result we need to run the post action hook with CACHE context
        if (cache.results[key][1]) {
          return [
            cache.results[key][0],
            cache.results[key][1],
            runPostActionHook(
              cache.results[key][2] as TAsyncActionResult<R, T>,
              args,
              stores,
              EPostActionContext.CACHE
            ),
            cache.results[key][3],
          ];
        } else {
          return cache.results[key] as TPullstateAsyncWatchResponse<R, T>;
        }
      }
    }

    // console.log(`[${key}] Pullstate Async: has no results yet`);

    // check if it is already pending as an action
    if (!cache.actions.hasOwnProperty(key)) {
      // if it is not pending, check if for any short circuiting before initiating
      if (shortCircuitHook !== undefined) {
        const shortCircuitResponse = shortCircuitHook(args, stores);
        if (shortCircuitResponse !== false) {
          cache.results[key] = [true, true, shortCircuitResponse, false];
          return [
            true,
            true,
            runPostActionHook(shortCircuitResponse, args, stores, EPostActionContext.SHORT_CIRCUIT),
            false,
          ];
        }
      }

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
    args = {} as A,
    { initiate = false, ssr = true }: IAsyncActionWatchOptions = {}
  ) => {
    const key = createKey(ordinal, args);

    let watchId = useRef<number>(null);
    if (watchId.current === null) {
      watchId.current = watchIdOrd++;
    }
    const prevKeyRef = useRef(key);

    if (!shouldUpdate.hasOwnProperty(key)) {
      shouldUpdate[key] = {
        [watchId.current]: true,
      };
    } else {
      shouldUpdate[key][watchId.current] = true;
    }

    // console.log(`[${key}][${watchId}] Starting useWatch()`);

    const cache: IPullstateAsyncCache = onServer
      ? useContext(PullstateContext)._asyncCache
      : clientAsyncCache;
    const stores = onServer ? (useContext(PullstateContext).stores as S) : clientStores;

    // only listen for updates when on client
    if (!onServer) {
      const onAsyncStateChanged = () => {
        // console.log(`[${key}][${watchId}] should update: ${shouldUpdate[key][watchId.current]}`);
        // console.log(`[${key}][${watchId}] will update?: ${!shallowEqual(responseRef.current, cache.results[key])} - ${responseRef.current} !== ${cache.results[key]}`);

        if (shouldUpdate[key][watchId.current] && !shallowEqual(responseRef.current, cache.results[key])) {
          responseRef.current = checkKeyAndReturnResponse(key, cache, initiate, ssr, args, stores);

          setWatchUpdate(prev => {
            // console.log(`Setting watch update to: ${prev + 1}`);
            return prev + 1;
          });
        }
      };

      useMemo(
        () => {
          if (!cache.listeners.hasOwnProperty(key)) {
            cache.listeners[key] = {};
          }

          cache.listeners[key][watchId.current] = onAsyncStateChanged;
          // console.log(`[${key}][${watchId}] Added listener (total now: ${Object.keys(cache.listeners[key]).length})`);
        },
        [key]
      );

      useEffect(
        () => () => {
          shouldUpdate[key][watchId.current] = false;
          // console.log(`[${key}][${watchId}] Removing listener (before: ${Object.keys(cache.listeners[key]).length})`);
          delete cache.listeners[key][watchId.current];
          // console.log(`[${key}][${watchId}] Removed listener (after: ${Object.keys(cache.listeners[key]).length})`);
        },
        [key]
      );
    }

    const responseRef = useRef<TPullstateAsyncWatchResponse<R, T>>(null);
    if (responseRef.current === null) {
      responseRef.current = checkKeyAndReturnResponse(key, cache, initiate, ssr, args, stores);
    }

    const [watchUpdate, setWatchUpdate] = useState<number>(0);

    if (prevKeyRef.current !== key) {
      // console.log(`[${key}][${watchId}] KEYS MISMATCH old !== new [${prevKeyRef.current} !== ${key}]`);
      shouldUpdate[prevKeyRef.current][watchId.current] = false;
      prevKeyRef.current = key;
      responseRef.current = checkKeyAndReturnResponse(key, cache, initiate, ssr, args, stores);
    }

    // console.log(`[${key}][${watchId}] Returning from watch() [update no. ${watchUpdate}] with response: ${JSON.stringify(responseRef.current)}`);
    return responseRef.current;
  };

  // Same as watch - just initiated, so no need for "started" return value
  const useBeckon: TAsyncActionBeckon<A, R, T> = (
    args = {} as A,
    { ssr = true }: IAsyncActionBeckonOptions = {}
  ) => {
    const result = useWatch(args, { initiate: true, ssr });
    return [result[1], result[2], result[3]];
  };

  const run: TAsyncActionRun<A, R, T> = async (
    args = {} as A,
    { treatAsUpdate = false, ignoreShortCircuit = false }: IAsyncActionRunOptions = {}
  ): Promise<TAsyncActionResult<R, T>> => {
    const key = createKey(ordinal, args);

    const [, prevFinished, prevResp] = clientAsyncCache.results[key] || [
      false,
      false,
      {
        error: true,
        message: "",
        payload: null,
        tags: [EAsyncEndTags.UNFINISHED],
      } as IAsyncActionResultNegative<T>,
    ];

    if (prevFinished && treatAsUpdate) {
      clientAsyncCache.results[key] = [true, true, prevResp, true];
    } else {
      clientAsyncCache.results[key] = [true, false, prevResp, false];
    }

    if (shortCircuitHook !== undefined) {
      const shortCircuitResponse = shortCircuitHook(args, clientStores);
      if (shortCircuitResponse !== false) {
        clientAsyncCache.results[key] = [true, true, shortCircuitResponse, false];
        notifyListeners(key);
        return runPostActionHook(shortCircuitResponse, args, clientStores, EPostActionContext.DIRECT_RUN);
      }
    }

    notifyListeners(key);
    let currentActionOrd = actionOrdUpdate(clientAsyncCache, key);

    try {
      const result: TAsyncActionResult<R, T> = await action(args, clientStores);

      if (currentActionOrd === clientAsyncCache.actionOrd[key]) {
        clientAsyncCache.results[key] = [true, true, result, false];
        notifyListeners(key);
      }

      return runPostActionHook(result, args, clientStores, EPostActionContext.DIRECT_RUN);
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

      return runPostActionHook(result, args, clientStores, EPostActionContext.DIRECT_RUN);
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
