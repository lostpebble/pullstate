import { clientStores, IPullstateAllStores, PullstateContext } from "./PullstateCore";
import React, { MutableRefObject, useContext, useEffect, useRef, useState } from "react";
import {
  EAsyncEndTags,
  EPostActionContext,
  IAsyncActionBeckonOptions,
  IAsyncActionReadOptions,
  IAsyncActionResultNegative,
  IAsyncActionResultPositive,
  IAsyncActionRunOptions,
  IAsyncActionUseDeferOptions,
  IAsyncActionWatchOptions,
  IBaseObjResponseUseDefer,
  ICreateAsyncActionOptions,
  IOCreateAsyncActionOutput,
  IPullstateAsyncCache,
  TAsyncActionBeckon,
  TAsyncActionClearAllCache,
  TAsyncActionClearAllUnwatchedCache,
  TAsyncActionClearCache,
  TAsyncActionDelayedRun,
  TAsyncActionGetCached,
  TAsyncActionRead,
  TAsyncActionResult,
  TAsyncActionRun,
  TAsyncActionSetCached,
  TAsyncActionSetCachedPayload,
  TAsyncActionUpdateCached,
  TAsyncActionUse,
  TAsyncActionUseDefer,
  TAsyncActionWatch,
  TPullstateAsyncAction,
  TPullstateAsyncCacheBreakHook,
  TPullstateAsyncWatchResponse,
  TRunWithPayload,
  TUseResponse
} from "./async-types";
// @ts-ignore
import produce, { Draft } from "immer";

import isEqual from "fast-deep-equal/es6";
// const isEqual = require("fast-deep-equal/es6");

export const clientAsyncCache: IPullstateAsyncCache = {
  listeners: {},
  results: {},
  actions: {},
  actionOrd: {}
};

/*if (typeof window !== "undefined") {
  console.log("Should start logging cache");

  function logCache() {
    const toLog: any = {};

    for (const key of Object.keys(clientAsyncCache)) {
      toLog[key] = { ...clientAsyncCache[key as keyof IPullstateAsyncCache] };
    }

    console.log(toLog);
  }

  setInterval(logCache, 1000);
}*/

let asyncCreationOrdinal = 0;

export function keyFromObject(json: any) {
  if (json === null) {
    return "(n)";
  }

  const typeOf = typeof json;

  if (typeOf !== "object") {
    if (typeOf === "undefined") {
      return "(u)";
    } else if (typeOf === "string") {
      return ":" + json + ";";
    } else if (typeOf === "boolean" || typeOf === "number") {
      return "(" + json + ")";
    }
  }

  let prefix = "{";

  for (const key of Object.keys(json).sort()) {
    prefix += key + keyFromObject(json[key]);
  }

  return prefix + "}";
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

function clearActionCache(key: string, clearPending: boolean = true, notify = true) {
  if (clearPending && clientAsyncCache.actionOrd.hasOwnProperty(key)) {
    clientAsyncCache.actionOrd[key] += 1;
  }

  // console.log(`Set ordinal for action [${key}] to ${clientAsyncCache.actionOrd[key] || "DIDNT EXIST"}`);
  // console.log(`Clearing cache for [${key}]`);
  delete clientAsyncCache.results[key];
  if (notify) {
    notifyListeners(key);
  }
}

function actionOrdUpdate(cache: IPullstateAsyncCache, key: string): number {
  if (!cache.actionOrd.hasOwnProperty(key)) {
    cache.actionOrd[key] = 0;
  } else {
    cache.actionOrd[key] += 1;
  }

  return cache.actionOrd[key];
}

export function successResult<R, T extends string = string>(
  payload: R = (null as unknown) as R,
  tags: (EAsyncEndTags | T)[] = [],
  message: string = ""
): IAsyncActionResultPositive<R, T> {
  return {
    payload,
    tags,
    message,
    error: false,
    errorPayload: null
  };
}

export function errorResult<T extends string = string, N = unknown>(
  tags: (EAsyncEndTags | T)[] = [],
  message: string = "",
  errorPayload?: N
): IAsyncActionResultNegative<T, N> {
  return {
    payload: null,
    tags: [EAsyncEndTags.RETURNED_ERROR, ...tags],
    message,
    error: true,
    errorPayload: errorPayload as N
  };
}

export class PullstateAsyncError extends Error {
  tags: string[];

  constructor(message: string, tags: string[]) {
    super(message);
    this.tags = tags;
  }
}

let storeErrorProxy: any;
try {
  storeErrorProxy = new Proxy(
    {},
    {
      get: function(obj, prop) {
        throw new Error(
          `Pullstate: Trying to access store (${String(prop)}) inside async actions without the correct usage or setup.
If this error occurred on the server:
* If using run(), make use of your created instance for this request: instance.runAsyncAction()
* If using read(), useWatch(), useBeckon() etc. - make sure you have properly set up your <PullstateProvider/>

If this error occurred on the client:
* Make sure you have created your "pullstateCore" object with all your stores, using createPullstateCore(), and are making use of instantiate() before rendering.`
        );
      }
    }
  );
} catch {
  storeErrorProxy = {};
}

const startedButUnfinishedResult: TPullstateAsyncWatchResponse = [
  true,
  false,
  {
    message: "",
    tags: [EAsyncEndTags.UNFINISHED],
    error: true,
    payload: null,
    errorPayload: null
  },
  false,
  -1
];

export function createAsyncActionDirect<A extends any = any,
  R extends any = any,
  N extends any = any,
  S extends IPullstateAllStores = IPullstateAllStores>(
  action: (args: A, stores: S, customContext: any) => Promise<R>,
  options: ICreateAsyncActionOptions<A, R, string, N, S> = {}
): IOCreateAsyncActionOutput<A, R, string, N, S> {
  return createAsyncAction<A, R, string, N, S>(async (args: A, stores: S, customContext: any) => {
    return successResult(await action(args, stores, customContext));
  }, options);
}

function convertCustomCacheBreakHook<A = any,
  R = any,
  T extends string = string,
  N extends any = any,
  S extends IPullstateAllStores = IPullstateAllStores>(cacheBreakHook?: boolean | number | TPullstateAsyncCacheBreakHook<A, R, T, N, S>): TPullstateAsyncCacheBreakHook<A, R, T, N, S> | undefined {
  if (cacheBreakHook != null) {
    if (typeof cacheBreakHook === "boolean") {
      return () => cacheBreakHook;
    } else if (typeof cacheBreakHook === "number") {
      return ({ timeCached, result }) => {
        if (!result.error) {
          return Date.now() - timeCached > cacheBreakHook;
        }

        return true;
      };
    }

    return cacheBreakHook;
  }

  return undefined;
}

export function createAsyncAction<A = any,
  R = any,
  T extends string = string,
  N extends any = any,
  S extends IPullstateAllStores = IPullstateAllStores>(
  action: TPullstateAsyncAction<A, R, T, N, S>,
  {
    forceContext = false,
    shortCircuitHook,
    cacheBreakHook,
    postActionHook,
    subsetKey,
    actionId
  }: ICreateAsyncActionOptions<A, R, T, N, S> = {}
): IOCreateAsyncActionOutput<A, R, T, N, S> {
  const ordinal: string | number = actionId != null ? `_${actionId}` : asyncCreationOrdinal++;
  const onServer: boolean = typeof window === "undefined";

  function _createKey(args: A, customKey?: string) {
    if (customKey != null) {
      return `${ordinal}-c-${customKey}`;
    }

    if (subsetKey !== undefined) {
      return `${ordinal}-${keyFromObject(subsetKey(args))}`;
    }
    return `${ordinal}-${keyFromObject(args)}`;
  }

  const deferWaitingKey = `def_wait_${_createKey({} as A)}`;

  let cacheBreakWatcher: { [actionKey: string]: number } = {};
  let watchIdOrd: number = 0;
  const shouldUpdate: {
    [actionKey: string]: {
      [watchId: string]: boolean;
    };
  } = {};

  // console.log(`Creating async action with ordinal: ${ordinal} - action name: ${action.name}`);

  function runPostActionHook(result: TAsyncActionResult<R, T, N>, args: A, stores: S, context: EPostActionContext): void {
    if (postActionHook !== undefined) {
      postActionHook({ args, result, stores, context });
    }
  }

  function getCachedResult(
    { args, cache, cacheBreakEnabled, context, fromListener, key, postActionEnabled, stores, customCacheBreak }: {
      key: string,
      cache: IPullstateAsyncCache,
      args: A,
      stores: S,
      context: EPostActionContext,
      postActionEnabled: boolean,
      cacheBreakEnabled: boolean,
      fromListener: boolean,
      customCacheBreak?: TPullstateAsyncCacheBreakHook<A, R, T, N, S>;
    }
  ): {
    cacheBroke: boolean;
    response: TPullstateAsyncWatchResponse<R, T> | undefined;
    previous: TPullstateAsyncWatchResponse<R, T> | undefined
  } {
    const useCacheBreakHook = customCacheBreak ?? cacheBreakHook;

    if (cache.results.hasOwnProperty(key)) {
      const cacheBreakLoop = cacheBreakWatcher.hasOwnProperty(key) && cacheBreakWatcher[key] > 2;
      // console.log(`[${key}] Pullstate Async: Already finished - returning cached result`);

      // Only beckon() or run() can cache break - because watch() will not initiate the re-caching mechanism
      if (
        !onServer &&
        !fromListener &&
        cacheBreakEnabled &&
        useCacheBreakHook != null
        && cache.results[key][1] && // isFinished?
        useCacheBreakHook({
          args,
          result: cache.results[key][2] as TAsyncActionResult<R, T, N>,
          stores,
          timeCached: cache.results[key][4]
        }) &&
        !cacheBreakLoop
      ) {
        if (cacheBreakWatcher.hasOwnProperty(key)) {
          cacheBreakWatcher[key]++;
        } else {
          cacheBreakWatcher[key] = 1;
        }

        const previous = cache.results[key] as TPullstateAsyncWatchResponse<R, T>;
        delete cache.results[key];
        return { cacheBroke: true, response: undefined, previous };
      } else {
        if (cacheBreakLoop) {
          console.error(`[${key}] Pullstate detected an infinite loop caused by cacheBreakHook()
returning true too often (breaking cache as soon as your action is resolving - hence
causing beckoned actions to run the action again) in one of your AsyncActions - Pullstate prevented
further looping. Fix in your cacheBreakHook() is needed.`);
        } else {
          cacheBreakWatcher[key] = 0;
        }

        // if the cached result is "finished" (and we are not running
        // this during a listener update) we need to run the post
        // action hook with WATCH_HIT_CACHE context
        if (postActionEnabled && cache.results[key][1] && !fromListener) {
          runPostActionHook(cache.results[key][2] as TAsyncActionResult<R, T, N>, args, stores, context);
        }

        return {
          response: cache.results[key] as TPullstateAsyncWatchResponse<R, T>,
          cacheBroke: false,
          previous: undefined
        };
      }
    }

    return { cacheBroke: false, response: undefined, previous: undefined };
  }

  function createInternalAction(
    key: string,
    cache: IPullstateAsyncCache,
    args: A,
    stores: S,
    currentActionOrd: number,
    postActionEnabled: boolean,
    executionContext: EPostActionContext,
    customContext: any
  ): () => Promise<TAsyncActionResult<R, T, N>> {
    return () =>
      action(args, stores, customContext)
        .then((resp) => {
          if (currentActionOrd === cache.actionOrd[key]) {
            if (postActionEnabled) {
              runPostActionHook(resp as TAsyncActionResult<R, T, N>, args, stores, executionContext);
            }
            cache.results[key] = [true, true, resp, false, Date.now()] as TPullstateAsyncWatchResponse<R, T>;
          }

          return resp;
        })
        .catch((e) => {
          // console.log(`Pullstate async action threw error`);
          console.error(e);
          const result: TAsyncActionResult<R, T, N> = {
            payload: null,
            errorPayload: null as N,
            error: true,
            tags: [EAsyncEndTags.THREW_ERROR],
            message: e.message
          };

          if (currentActionOrd === cache.actionOrd[key]) {
            if (postActionEnabled) {
              runPostActionHook(result, args, stores, executionContext);
            }
            cache.results[key] = [true, true, result, false, Date.now()] as TPullstateAsyncWatchResponse<R, T>;
          }

          return result;
        })
        .then((resp) => {
          if (currentActionOrd === cache.actionOrd[key]) {
            delete cache.actions[key];
            if (!onServer) {
              notifyListeners(key);
            }
          }
          return resp;
        });
  }

  function checkKeyAndReturnResponse(
    {
      key,
      cache,
      initiate,
      ssr,
      args,
      stores,
      fromListener = false,
      postActionEnabled = true,
      cacheBreakEnabled = true,
      holdingResult,
      customContext,
      customCacheBreak,
      holdPrevious
    }: {
      key: string,
      cache: IPullstateAsyncCache,
      initiate: boolean,
      ssr: boolean,
      args: A,
      stores: S,
      fromListener?: boolean; //= false,
      postActionEnabled?: boolean;// = true,
      cacheBreakEnabled?: boolean;// = true,
      holdingResult: TPullstateAsyncWatchResponse<R, T, N> | undefined,
      customContext: any,
      customCacheBreak?: TPullstateAsyncCacheBreakHook<A, R, T, N, S>;
      holdPrevious: boolean;
    }
  ): TPullstateAsyncWatchResponse<R, T, N> {
    const cached = getCachedResult(
      {
        key,
        cache,
        args,
        stores,
        context: initiate ? EPostActionContext.BECKON_HIT_CACHE : EPostActionContext.WATCH_HIT_CACHE,
        postActionEnabled,
        cacheBreakEnabled,
        fromListener,
        customCacheBreak
      }
    );

    if (cached.response) {
      return cached.response;
    }

    // console.log(`[${key}] Pullstate Async: has no results yet`);

    // check if it is already pending as an action
    if (!cache.actions.hasOwnProperty(key)) {
      const currentActionOrd = actionOrdUpdate(cache, key);

      if (initiate) {
        // if it is not pending, check if for any short circuiting before initiating
        if (shortCircuitHook !== undefined) {
          const shortCircuitResponse = shortCircuitHook({ args, stores });
          if (shortCircuitResponse !== false) {
            runPostActionHook(shortCircuitResponse, args, stores, EPostActionContext.SHORT_CIRCUIT);
            cache.results[key] = [true, true, shortCircuitResponse, false, Date.now()];
            return cache.results[key] as TPullstateAsyncWatchResponse<R, T>;
          }
        }

        // queue (on server) or start the action now (on client)
        if (ssr || !onServer) {
          cache.actions[key] = createInternalAction(
            key,
            cache,
            args,
            stores,
            currentActionOrd,
            postActionEnabled,
            EPostActionContext.BECKON_RUN,
            customContext
          );
        }

        if (!onServer) {
          cache.actions[key]();
          cache.results[key] = startedButUnfinishedResult as TPullstateAsyncWatchResponse<R, T>;
        } else {
          return startedButUnfinishedResult as TPullstateAsyncWatchResponse<R, T>;
        }
      } else {
        const resp: TPullstateAsyncWatchResponse<R, T> = [
          false,
          false,
          {
            message: "",
            tags: [EAsyncEndTags.UNFINISHED],
            error: true,
            payload: null,
            errorPayload: null
          },
          false,
          -1
        ];

        if (!onServer) {
          cache.results[key] = resp;
        }

        if (holdPrevious) {
          if (holdingResult) {
            const response = [...holdingResult] as TPullstateAsyncWatchResponse<R, T>;
            response[3] = true;
            return response;
          }

          if (cached.previous != null) {
            const response = [...cached.previous] as TPullstateAsyncWatchResponse<R, T>;
            response[3] = true;
            return response;
          }
        }
        /*if (holdingResult) {
          const response = [...holdingResult] as TPullstateAsyncWatchResponse<R, T>;
          response[3] = true;
          return response;
        }*/

        return resp;
        // return cache.results[key] as TPullstateAsyncWatchResponse<R, T>;
        /*return [
          false,
          false,
          {
            message: "",
            tags: [EAsyncEndTags.UNFINISHED],
            error: true,
            payload: null,
          },
          false,
          -1,
        ] as TPullstateAsyncWatchResponse<R, T>;*/
      }
    }

    if (holdPrevious) {
      if (holdingResult) {
        const response = [...holdingResult] as TPullstateAsyncWatchResponse<R, T>;
        response[3] = true;
        return response;
      }

      if (cached.previous != null) {
        const response = [...cached.previous] as TPullstateAsyncWatchResponse<R, T>;
        response[3] = true;
        return response;
      }
    }
    /*if (holdingResult) {
      const response = [...holdingResult] as TPullstateAsyncWatchResponse<R, T>;
      response[3] = true;
      return response;
    }*/

    return startedButUnfinishedResult as TPullstateAsyncWatchResponse<R, T>;
  }

  const read: TAsyncActionRead<A, R, T, N, S> = (
    args = {} as A,
    { cacheBreakEnabled = true, postActionEnabled = true, key: customKey }: IAsyncActionReadOptions<A, R, T, N, S> = {}
  ) => {
    const key = _createKey(args, customKey);

    const cache: IPullstateAsyncCache = onServer ? useContext(PullstateContext)!._asyncCache : clientAsyncCache;

    let stores: S;
    let customContext: any;

    if (onServer || forceContext) {
      const pullstateContext = useContext(PullstateContext)!;
      stores = pullstateContext.stores as S;
      customContext = pullstateContext.customContext;
    } else if (clientStores.loaded) {
      stores = clientStores.stores as S;
    } else {
      stores = storeErrorProxy as S;
    }

    /*const stores =
      onServer || forceContext
        ? (useContext(PullstateContext)!.stores as S)
        : clientStores.loaded
        ? (clientStores.stores as S)
        : (storeErrorProxy as S);*/

    const cached = getCachedResult(
      {
        key,
        cache,
        args,
        stores,
        context: EPostActionContext.READ_HIT_CACHE,
        postActionEnabled,
        cacheBreakEnabled,
        fromListener: false
      }
    );

    if (cached.response) {
      if (!cached.response[2].error) {
        return cached.response[2].payload;
      } else {
        throw new PullstateAsyncError(cached.response[2].message, cached.response[2].tags);
      }
    }

    if (!cache.actions.hasOwnProperty(key)) {
      // if it is not pending, check if for any short circuiting before initiating
      if (shortCircuitHook !== undefined) {
        const shortCircuitResponse = shortCircuitHook({ args, stores });
        if (shortCircuitResponse !== false) {
          runPostActionHook(shortCircuitResponse, args, stores, EPostActionContext.SHORT_CIRCUIT);
          cache.results[key] = [true, true, shortCircuitResponse, false, Date.now()];
          if (!shortCircuitResponse.error) {
            return shortCircuitResponse.payload;
          } else {
            throw new PullstateAsyncError(shortCircuitResponse.message, shortCircuitResponse.tags);
          }
        }
      }

      const currentActionOrd = actionOrdUpdate(cache, key);
      cache.actions[key] = createInternalAction(
        key,
        cache,
        args,
        stores,
        currentActionOrd,
        postActionEnabled,
        EPostActionContext.READ_RUN,
        customContext
      );

      if (onServer) {
        throw new Error(
          `Pullstate Async Action: action.read() : Resolve all async state for Suspense actions before Server-side render ( make use of instance.runAsyncAction() )`
        );
      }

      throw cache.actions[key]();
    }

    if (onServer) {
      throw new Error(
        `Pullstate Async Action: action.read() : Resolve all async state for Suspense actions before Server-side render ( make use of instance.runAsyncAction() )`
      );
    }

    const watchOrd = watchIdOrd++;

    throw new Promise((resolve) => {
      cache.listeners[key][watchOrd] = () => {
        delete cache.listeners[key][watchOrd];
        resolve();
      };
    });
  };

  const useWatch: TAsyncActionWatch<A, R, T, N, S> = (
    args = {} as A,
    {
      initiate = false,
      ssr = true,
      postActionEnabled = false,
      cacheBreakEnabled = false,
      holdPrevious = false,
      dormant = false,
      key: customKey,
      cacheBreak: customCacheBreakIncoming
    }: IAsyncActionWatchOptions<A, R, T, N, S> = {}
  ) => {
    // Where we store the current response that will be returned from our hook
    const responseRef = useRef<TPullstateAsyncWatchResponse<R, T>>();

    // For comparisons to our previous "fingerprint" / key from args
    const prevKeyRef = useRef<string>(".");

    const key = dormant ? "." : _createKey(args, customKey);

    let watchId: MutableRefObject<number> = useRef(-1);
    if (watchId.current === -1) {
      watchId.current = watchIdOrd++;
    }

    if (!dormant) {
      if (!shouldUpdate.hasOwnProperty(key)) {
        shouldUpdate[key] = {
          [watchId.current]: true
        };
      } else {
        shouldUpdate[key][watchId.current] = true;
      }
    }
    // console.log(`[${key}][${watchId.current}] Starting useWatch()`);

    const cache: IPullstateAsyncCache = onServer ? useContext(PullstateContext)!._asyncCache : clientAsyncCache;

    let stores: S;
    let customContext: any;

    if (onServer || forceContext) {
      const pullstateContext = useContext(PullstateContext)!;
      stores = pullstateContext.stores as S;
      customContext = pullstateContext.customContext;
    } else if (clientStores.loaded) {
      stores = clientStores.stores as S;
    } else {
      stores = storeErrorProxy as S;
    }
    /*const stores =
      onServer || forceContext
        ? (useContext(PullstateContext)!.stores as S)
        : clientStores.loaded
        ? (clientStores.stores as S)
        : (storeErrorProxy as S);*/

    // only listen for updates when on client
    if (!onServer) {
      const onAsyncStateChanged = () => {
        /*console.log(`[${key}][${watchId.current}] should update: ${shouldUpdate[key][watchId.current]}`);
        console.log(
          `[${key}][${watchId.current}] will update?: ${!isEqual(responseRef.current, cache.results[key])} - ${
            responseRef.current
          } !== ${cache.results[key]}`
        );
        console.log(responseRef.current);
        console.log(cache.results[key]);
        console.log(cache);*/
        if (shouldUpdate[key][watchId.current] && !isEqual(responseRef.current, cache.results[key])) {
          const nextResponse = checkKeyAndReturnResponse(
            {
              key,
              cache,
              initiate,
              ssr,
              args,
              stores,
              fromListener: true,
              postActionEnabled,
              cacheBreakEnabled,
              holdingResult: undefined,
              customContext,
              holdPrevious
            }
          );

          if (holdPrevious && !nextResponse[1] && responseRef.current != null && responseRef.current[1]) {
            responseRef.current = [...responseRef.current];
            responseRef.current[3] = true;
          } else {
            responseRef.current = nextResponse;
          }

          setWatchUpdate((prev) => {
            return prev + 1;
          });
        } /*else {
          // Way to keep our shouldUpdate keys map small (and make clearUnwatchedCache() faster)
          // - remove keys from shouldUpdate when there are no more registered listeners
          // delete shouldUpdate[key][watchId.current];
          // if (Object.keys(shouldUpdate[key]).length === 0) {
          //   delete shouldUpdate[key];
          // }
        }*/
      };

      if (!dormant) {
        if (!cache.listeners.hasOwnProperty(key)) {
          cache.listeners[key] = {};
        }
        cache.listeners[key][watchId.current] = onAsyncStateChanged;
        shouldUpdate[key][watchId.current] = true;
        // console.log(`[${key}][${watchId}] Added listener (total now: ${Object.keys(cache.listeners[key]).length})`);
      }

      useEffect(() => {
        if (!dormant) {
          cache.listeners[key][watchId.current] = onAsyncStateChanged;
          shouldUpdate[key][watchId.current] = true;

          // console.log(`[${key}][${watchId}] Added listener (total now: ${Object.keys(cache.listeners[key]).length})`);
        }

        return () => {
          if (!dormant) {
            // console.log(`[${key}][${watchId}] Removing listener (before: ${Object.keys(cache.listeners[key]).length})`);
            delete cache.listeners[key][watchId.current];
            shouldUpdate[key][watchId.current] = false;
            // console.log(`[${key}][${watchId}] Removed listener (after: ${Object.keys(cache.listeners[key]).length})`);
          }
        };
      }, [key]);
    }

    // Purely for forcing this hook to update
    const [_, setWatchUpdate] = useState<number>(0);

    /*// If we've run this before, and the keys are equal, quick return with the current set result
    if (prevKeyRef.current !== null && prevKeyRef.current === key) {
      return responseRef.current;
    }*/
    // console.log(`[${key}][${watchId}] Is dormamt?: ${dormant}`);
    // console.log(`[${key}][${watchId}] CHECKING KEYS [${prevKeyRef.current} <---> ${key}]`);
    if (dormant) {
      responseRef.current =
        holdPrevious && responseRef.current && responseRef.current[1]
          ? responseRef.current
          : ([
            false,
            false,
            {
              message: "",
              tags: [EAsyncEndTags.DORMANT],
              error: true,
              payload: null
            },
            false,
            -1
          ] as TPullstateAsyncWatchResponse<R, T>);
      prevKeyRef.current = ".";
    } else if (prevKeyRef.current !== key) {
      // console.log(`[${key}][${watchId}] KEYS MISMATCH old !== new [${prevKeyRef.current} !== ${key}]`);
      if (prevKeyRef.current !== null && shouldUpdate.hasOwnProperty(prevKeyRef.current!)) {
        delete cache.listeners[prevKeyRef.current!][watchId.current];
        shouldUpdate[prevKeyRef.current!][watchId.current] = false;
      }

      prevKeyRef.current = key;

      responseRef.current = checkKeyAndReturnResponse(
        {
          key,
          cache,
          initiate,
          ssr,
          args,
          stores,
          fromListener: false,
          postActionEnabled,
          cacheBreakEnabled,
          holdingResult: holdPrevious && responseRef.current && responseRef.current[1] ? responseRef.current : undefined,
          customContext,
          customCacheBreak: convertCustomCacheBreakHook(customCacheBreakIncoming),
          holdPrevious
        }
        // key,
        // cache,
        // initiate,
        // ssr,
        // args,
        // stores,
        // false,
        // postActionEnabled,
        // cacheBreakEnabled,
        // // If we want to hold previous and the previous result was finished -
        // // keep showing that until this new one resolves
        // holdPrevious && responseRef.current && responseRef.current[1] ? responseRef.current : undefined,
        // customContext
      );
    }

    /*console.log(
      `[${key}][${watchId}] Returning from watch() [update no. ${_}] with response: ${JSON.stringify(
        responseRef.current
      )}`
    );*/
    return responseRef.current!;
  };

  // Same as watch - just initiated, so no need for "started" return value
  const useBeckon: TAsyncActionBeckon<A, R, T, N, S> = (
    args = {} as A,
    {
      ssr = true,
      postActionEnabled = true,
      cacheBreakEnabled = true,
      holdPrevious = false,
      dormant = false,
      key
    }: IAsyncActionBeckonOptions<A, R, T, N, S> = {}
  ) => {
    const result = useWatch(args, {
      initiate: true,
      ssr,
      postActionEnabled,
      cacheBreakEnabled,
      holdPrevious,
      dormant,
      key
    });
    return [result[1], result[2], result[3]];
  };

  const run: TAsyncActionRun<A, R, T, N, S> = async (
    args = {} as A,
    inputs: IAsyncActionRunOptions<A, R, T, N, S> = {}
  ) => {
    const {
      treatAsUpdate = false,
      ignoreShortCircuit = false,
      respectCache = false,
      key: customKey,
      _asyncCache = clientAsyncCache,
      _stores = clientStores.loaded ? clientStores.stores : storeErrorProxy,
      _customContext,
      cacheBreak: customCacheBreak
    } = inputs;

    const key = _createKey(args, customKey);
    // console.log(`[${key}] Running action`, inputs);
    // console.log(JSON.parse(JSON.stringify(_asyncCache)));

    if (respectCache) {
      const cached = getCachedResult(
        {
          key,
          cache: _asyncCache,
          args,
          stores: _stores,
          context: EPostActionContext.RUN_HIT_CACHE,
          postActionEnabled: true,
          cacheBreakEnabled: true,
          fromListener: false,
          customCacheBreak: convertCustomCacheBreakHook(customCacheBreak)
        }
      );

      // console.log(`Async RUN: Found cached`, cached);

      // If cached, and has actually started
      if (cached.response && cached.response[0]) {
        // If cached result is unfinished, wait for completion
        if (!cached.response[1]) {
          const watchOrd = watchIdOrd++;
          if (!_asyncCache.listeners.hasOwnProperty(key)) {
            _asyncCache.listeners[key] = {};
          }

          return new Promise<TAsyncActionResult<R, T, N>>((resolve) => {
            _asyncCache.listeners[key][watchOrd] = () => {
              const [, finished, resp] = _asyncCache.results[key];
              if (finished) {
                delete _asyncCache.listeners[key][watchOrd];
                resolve(resp as TAsyncActionResult<R, T, N>);
              }
            };
          });
        }

        return cached.response[2];
      }
    }

    if (!ignoreShortCircuit && shortCircuitHook !== undefined) {
      const shortCircuitResponse = shortCircuitHook({ args, stores: _stores });
      if (shortCircuitResponse !== false) {
        _asyncCache.results[key] = [true, true, shortCircuitResponse, false, Date.now()];
        runPostActionHook(shortCircuitResponse, args, _stores, EPostActionContext.SHORT_CIRCUIT);
        notifyListeners(key);
        return shortCircuitResponse;
      }
    }

    const [, prevFinished, prevResp, prevUpdate, prevCacheTime] = _asyncCache.results[key] || [
      false,
      false,
      {
        error: true,
        message: "",
        payload: null,
        tags: [EAsyncEndTags.UNFINISHED]
      } as IAsyncActionResultNegative<T>,
      false,
      -1
    ];

    if (prevFinished && treatAsUpdate) {
      _asyncCache.results[key] = [true, true, prevResp, true, prevCacheTime];
    } else {
      _asyncCache.results[key] = [
        true,
        false,
        {
          error: true,
          message: "",
          payload: null,
          tags: [EAsyncEndTags.UNFINISHED]
        } as IAsyncActionResultNegative<T>,
        false,
        -1
      ];
    }

    let currentActionOrd = actionOrdUpdate(_asyncCache, key);
    _asyncCache.actions[key] = createInternalAction(
      key,
      _asyncCache,
      args,
      _stores,
      currentActionOrd,
      true,
      EPostActionContext.DIRECT_RUN,
      _customContext
    );

    notifyListeners(key);

    return _asyncCache.actions[key]() as Promise<TAsyncActionResult<R, T, N>>;
  };

  const clearCache: TAsyncActionClearCache<A> = (args = {} as A, { key: customKey, notify = true } = {}) => {
    const key = _createKey(args, customKey);
    clearActionCache(key, true, notify);
  };

  const clearAllCache: TAsyncActionClearAllCache = ({ notify = true } = {}) => {
    for (const key of Object.keys(clientAsyncCache.actionOrd)) {
      if (key.startsWith(`${ordinal}-`)) {
        clearActionCache(key, true, notify);
      }
    }
  };

  const clearAllUnwatchedCache: TAsyncActionClearAllUnwatchedCache = ({ notify = true } = {}) => {
    for (const key of Object.keys(shouldUpdate)) {
      if (!Object.values(shouldUpdate[key]).some((su) => su)) {
        delete shouldUpdate[key];
        clearActionCache(key, false, notify);
      }
    }
  };

  const setCached: TAsyncActionSetCached<A, R, T, N> = (args, result, options) => {
    const { notify = true, key: customKey } = options || {};
    const key = _createKey(args, customKey);

    const cache: IPullstateAsyncCache = onServer ? useContext(PullstateContext)!._asyncCache : clientAsyncCache;

    cache.results[key] = [true, true, result, false, Date.now()];
    if (notify) {
      notifyListeners(key);
    }
  };

  const setCachedPayload: TAsyncActionSetCachedPayload<A, R> = (args, payload, options) => {
    return setCached(args, successResult(payload), options);
  };

  const updateCached: TAsyncActionUpdateCached<A, R> = (args, updater, options) => {
    const { notify = true, resetTimeCached = true, runPostActionHook: postAction = false, key: customKey } =
    options || {};

    const key = _createKey(args, customKey);

    const cache: IPullstateAsyncCache = onServer ? useContext(PullstateContext)!._asyncCache : clientAsyncCache;

    if (cache.results.hasOwnProperty(key) && !cache.results[key][2].error) {
      const currentCached: R = cache.results[key][2].payload;

      const newResult = {
        payload: (produce(currentCached, (s: R) => updater(s as Draft<R>, currentCached)) as unknown) as R,
        error: false,
        message: cache.results[key][2].message,
        tags: cache.results[key][2].tags
      } as IAsyncActionResultPositive<R, T>;

      if (postAction) {
        runPostActionHook(
          newResult,
          args,
          clientStores.loaded ? (clientStores.stores as S) : (storeErrorProxy as S),
          EPostActionContext.CACHE_UPDATE
        );
      }

      cache.results[key] = [
        true,
        true,
        newResult,
        cache.results[key][3],
        resetTimeCached ? Date.now() : cache.results[key][4]
      ];
      // cache.results[key][2].payload = produce(currentCached as any, s => updater(s, currentCached));
      if (notify) {
        notifyListeners(key);
      }
    }
  };

  const getCached: TAsyncActionGetCached<A, R, T, N, S> = (args = {} as A, options) => {
    const { checkCacheBreak = false, key: customKey, cacheBreak: incomingCacheBreak } = options || {};
    const key = _createKey(args, customKey);

    let cacheBreakable = false;

    const cache: IPullstateAsyncCache = /*onServer ? useContext(PullstateContext)!._asyncCache : */ clientAsyncCache;

    if (cache.results.hasOwnProperty(key)) {
      const finalizedCacheBreakHook = convertCustomCacheBreakHook(incomingCacheBreak) ?? cacheBreakHook;

      if (checkCacheBreak && finalizedCacheBreakHook !== undefined) {
        const stores = onServer
          ? (useContext(PullstateContext)!.stores as S)
          : clientStores.loaded
            ? (clientStores.stores as S)
            : (storeErrorProxy as S);

        if (
          finalizedCacheBreakHook({
            args,
            result: cache.results[key][2] as TAsyncActionResult<R, T, N>,
            stores,
            timeCached: cache.results[key][4]
          })
        ) {
          cacheBreakable = true;
        }
      }

      const [started, finished, result, updating, timeCached] = cache.results[key];
      return {
        started,
        finished,
        result: result as TAsyncActionResult<R, T, N>,
        existed: true,
        cacheBreakable,
        updating,
        timeCached
      };
    } else {
      return {
        started: false,
        finished: false,
        result: {
          message: "",
          tags: [EAsyncEndTags.UNFINISHED],
          error: true,
          payload: null,
          errorPayload: null as N
        },
        updating: false,
        existed: false,
        cacheBreakable,
        timeCached: -1
      };
    }
  };

  let delayedRunActionTimeout: NodeJS.Timeout;

  const delayedRun: TAsyncActionDelayedRun<A, R, T, N, S> = (
    args = {} as A,
    { clearOldRun = true, delay, immediateIfCached = true, ...otherRunOptions }
  ) => {
    if (clearOldRun) {
      clearTimeout(delayedRunActionTimeout);
    }

    if (immediateIfCached) {
      const { finished, cacheBreakable } = getCached(args, { checkCacheBreak: true });

      if (finished && !cacheBreakable) {
        run(args, otherRunOptions);
        return () => {
        };
      }
    }

    let ref = { cancelled: false };

    delayedRunActionTimeout = setTimeout(() => {
      if (!ref.cancelled) {
        run(args, otherRunOptions);
      }
    }, delay);

    return () => {
      ref.cancelled = true;
    };
  };

  const use: TAsyncActionUse<A, R, T, N, S> = (
    args: A = {} as A,
    {
      initiate = true,
      ssr = true,
      postActionEnabled,
      cacheBreakEnabled,
      holdPrevious = false,
      dormant = false,
      key,
      onSuccess,
      cacheBreak: customCacheBreakHook
    } = {}
  ) => {
    // Set default options if initiate is true (beckon) or false (watch)
    if (postActionEnabled == null) {
      postActionEnabled = initiate;
    }

    if (cacheBreakEnabled == null) {
      cacheBreakEnabled = initiate;
    }

    const raw = useWatch(args, {
      initiate,
      ssr,
      postActionEnabled,
      cacheBreakEnabled,
      holdPrevious,
      dormant,
      key,
      cacheBreak: customCacheBreakHook
    });
    const [isStarted, isFinished, result, isUpdating] = raw;

    const isSuccess = isFinished && !result.error;
    const isFailure = isFinished && result.error;

    if (onSuccess) {
      useEffect(() => {
        if (isSuccess && !dormant) {
          onSuccess(result.payload!, args);
        }
      }, [isSuccess]);
    }

    const renderPayload: TRunWithPayload<R> = (func) => {
      if (!result.error) {
        return func(result.payload);
      }

      return React.Fragment;
    };

    return {
      isStarted,
      isFinished,
      isUpdating,
      isSuccess,
      isFailure,
      isLoading: isStarted && (!isFinished || isUpdating),
      endTags: result.tags,
      error: result.error,
      payload: result.payload,
      errorPayload: result.errorPayload,
      renderPayload,
      message: result.message,
      raw,
      execute: (runOptions) => run(args, runOptions),
      clearCached: () => clearCache(args),
      setCached: (response, options) => {
        setCached(args, response, options);
      },
      setCachedPayload: (payload, options) => {
        setCachedPayload(args, payload, options);
      },
      updateCached: (updater, options) => {
        updateCached(args, updater, options);
      }
    } as TUseResponse<A, R, T, N, S>;
  };

  const useDefer: TAsyncActionUseDefer<A, R, T, N, S> = (
    inputs: IAsyncActionUseDeferOptions<A, R, T, N, S> = {}) => {
    const [argState, setArgState] = useState<{ args: A; key: string; }>(() => ({
      key: inputs.key ? inputs.key : deferWaitingKey,
      args: {} as A
    }));

    const initialResponse = use({} as any, {
      ...inputs,
      key: argState.key,
      initiate: false
    });

    const hasCached: IBaseObjResponseUseDefer<A, R, T, N, S>["hasCached"] = (args = {} as A, options = {}) => {
      const executionKey = inputs.key ?? _createKey(args);
      const { checkCacheBreak = true, successOnly = false } = options;
      const cached = getCached(args, {
        key: executionKey,
        cacheBreak: options.cacheBreak ?? inputs.cacheBreak,
        checkCacheBreak
      });

      if (cached.existed) {
        if (!checkCacheBreak || !cached.cacheBreakable) {
          return !successOnly || !cached.result.error;
        }
      }

      return false;
    };

    const unwatchExecuted = () => {
      setArgState({ key: deferWaitingKey, args: {} as A });
    };

    const execute: IBaseObjResponseUseDefer<A, R, T, N, S>["execute"] = (args = {} as A, runOptions) => {
      const executionKey = inputs.key ?? _createKey(args);
      if (executionKey !== argState.key) {
        setArgState({ key: executionKey, args });
      }

      return run(args, {
        ...runOptions,
        key: executionKey,
        cacheBreak: inputs.cacheBreak
      } as IAsyncActionRunOptions<A, R, T, N, S>).then(resp => {
        if (inputs.clearOnSuccess) {
          clearCache({} as any, { key: executionKey });
        }

        return resp;
      });
    };

    return {
      ...initialResponse,
      clearCached: () => {
        clearCache({} as any, { key: argState.key });
      },
      unwatchExecuted,
      setCached: (response, options = {}) => {
        options.key = argState.key;
        setCached({} as A, response, options);
      },
      setCachedPayload: (payload, options = {}) => {
        options.key = argState.key;
        setCachedPayload({} as A, payload, options);
      },
      updateCached: (updater, options = {}) => {
        options.key = argState.key;
        updateCached({} as A, updater, options);
      },
      useDebouncedExecution: (args, delay, options = {}) => {
        if (!onServer) {
          const stateRef = useRef({ update: false });
          const currentValue = useRef<any>(undefined);
          const executionOrd = useRef<number>(-1);
          const timeout = useRef<any>(undefined);

          useEffect(() => {
            stateRef.current.update = true;
            return () => {
              stateRef.current.update = false;
            };
          }, []);

          const hasEqualityCheck = options.equality != null;

          if (hasEqualityCheck) {
            if (typeof options.equality === "function") {
              if ((currentValue.current === undefined || options.equality(currentValue.current, args))) {
                currentValue.current = args;
                executionOrd.current += 1;
              }
            } else if (currentValue.current !== options.equality) {
              currentValue.current = options.equality;
              executionOrd.current += 1;
            }
          } else if (!isEqual(currentValue.current, args)) {
            currentValue.current = args;
            executionOrd.current += 1;
          }

          useEffect(() => {
            clearTimeout(timeout.current);

            const executeAction = () => {
              if (stateRef.current.update) {
                execute(args, options.executeOptions ?? { respectCache: true });
              }
            };

            if (options.validInput?.(args) ?? true) {
              if (hasCached(args)) {
                executeAction();
              } else {
                timeout.current = setTimeout(executeAction, delay);
              }
            } else if (!(options.watchLastValid ?? false)) {
              unwatchExecuted();
            }
          }, [executionOrd.current]);
        }
      },
      hasCached,
      execute,
      args: argState.args,
      key: argState.key
    };
  };

  return {
    use,
    useDefer,
    read,
    useBeckon,
    useWatch,
    run,
    delayedRun,
    clearCache,
    clearAllCache,
    clearAllUnwatchedCache,
    getCached,
    setCached,
    setCachedPayload,
    updateCached
  };
}
