import { IPullstateAllStores, PullstateContext } from "./PullstateCore";
import { MutableRefObject, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  EAsyncEndTags,
  EPostActionContext,
  IAsyncActionBeckonOptions,
  IAsyncActionResultNegative,
  IAsyncActionResultPositive,
  IAsyncActionRunOptions, IAsyncActionUpdateCachedOptions,
  IAsyncActionWatchOptions,
  ICreateAsyncActionOptions,
  IOCreateAsyncActionOutput,
  IPullstateAsyncCache,
  TAsyncActionBeckon,
  TAsyncActionClearAllCache,
  TAsyncActionClearAllUnwatchedCache,
  TAsyncActionClearCache,
  TAsyncActionDelayedRun,
  TAsyncActionGetCached,
  TAsyncActionResult,
  TAsyncActionRun,
  TAsyncActionSetCached,
  TAsyncActionUpdateCached,
  TAsyncActionWatch,
  TPullstateAsyncAction,
  TPullstateAsyncWatchResponse,
} from "./async-types";
// @ts-ignore
import produce from "immer";

const isEqual = require("fast-deep-equal");

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

function notifyListeners(key: string) {
  if (clientAsyncCache.listeners.hasOwnProperty(key)) {
    // console.log(`[${key}] Notifying (${Object.keys(clientAsyncCache.listeners[key]).length}) listeners`);
    for (const watchId of Object.keys(clientAsyncCache.listeners[key])) {
      // console.log(`[${key}] Notifying listener with watch id: [${watchId}]`);
      clientAsyncCache.listeners[key][watchId]();
    }
  }
}

function clearActionCache(key: string, clearPending: boolean = true) {
  if (clearPending && clientAsyncCache.actionOrd.hasOwnProperty(key)) {
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

export function successResult<R, T extends string = string>(
  payload: R = null as unknown as R,
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
  {
    clientStores = {} as S,
    shortCircuitHook,
    cacheBreakHook,
    postActionHook,
    subsetKey,
  }: ICreateAsyncActionOptions<A, R, T, S> = {}
): IOCreateAsyncActionOutput<A, R, T> {
  const ordinal: number = asyncCreationOrdinal++;
  const onServer: boolean = typeof window === "undefined";

  function _createKey(keyOrdinal, args: any) {
    if (subsetKey !== undefined) {
      return `${keyOrdinal}-${keyFromObject(subsetKey(args))}`
    }
    return `${keyOrdinal}-${keyFromObject(args)}`;
  }

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
  ): void {
    if (postActionHook !== undefined) {
      postActionHook({ args, result, stores, context });
    }
  }

  function checkKeyAndReturnResponse(
    key: string,
    cache: IPullstateAsyncCache,
    initiate: boolean,
    ssr: boolean,
    args: A,
    stores: S,
    fromListener = false,
    postActionEnabled = true,
    cacheBreakEnabled = true
  ): TPullstateAsyncWatchResponse<R, T> {
    if (cache.results.hasOwnProperty(key)) {
      const cacheBreakLoop = cacheBreakWatcher.hasOwnProperty(key) && cacheBreakWatcher[key] > 2;
      // console.log(`[${key}] Pullstate Async: Already finished - returning cached result`);

      // Only beckon() can cache break - because watch() will not initiate the re-caching mechanism
      if (
        cacheBreakEnabled &&
        cacheBreakHook !== undefined &&
        cacheBreakHook({
          args,
          result: cache.results[key][2] as TAsyncActionResult<R, T>,
          stores,
          timeCached: cache.results[key][4],
        }) &&
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
causing beckoned actions to run the action again) in one of your AsyncActions - Pullstate prevented
further looping. Fix in your cacheBreakHook() is needed.`);
        } else {
          cacheBreakWatcher[key] = 0;
        }

        // if the cached result is "finished" (and we are not running
        // this during a listener update) we need to run the post
        // action hook with WATCH_HIT_CACHE context
        if (postActionEnabled && cache.results[key][1] && !fromListener) {
          runPostActionHook(
            cache.results[key][2] as TAsyncActionResult<R, T>,
            args,
            stores,
            initiate ? EPostActionContext.BECKON_HIT_CACHE : EPostActionContext.WATCH_HIT_CACHE
          );
        }

        return cache.results[key] as TPullstateAsyncWatchResponse<R, T>;
      }
    }

    // console.log(`[${key}] Pullstate Async: has no results yet`);
    let currentActionOrd = actionOrdUpdate(cache, key);

    // check if it is already pending as an action
    if (!cache.actions.hasOwnProperty(key)) {
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
          cache.actions[key] = () =>
            (action(args, stores) as any)
              .then(resp => {
                if (currentActionOrd === cache.actionOrd[key]) {
                  runPostActionHook(
                    resp as TAsyncActionResult<R, T>,
                    args,
                    stores,
                    EPostActionContext.BECKON_RUN
                  );
                  cache.results[key] = [true, true, resp, false, Date.now()] as TPullstateAsyncWatchResponse<
                    R,
                    T
                  >;
                }
              })
              .catch(e => {
                // console.log(`Pullstate async action threw error`);
                console.error(e);
                if (currentActionOrd === cache.actionOrd[key]) {
                  const result: TAsyncActionResult<R, T> = {
                    payload: null,
                    error: true,
                    tags: [EAsyncEndTags.THREW_ERROR],
                    message: e.message,
                  };
                  runPostActionHook(result, args, stores, EPostActionContext.BECKON_RUN);
                  cache.results[key] = [
                    true,
                    true,
                    result,
                    false,
                    Date.now(),
                  ] as TPullstateAsyncWatchResponse<R, T>;
                }
              })
              .then(() => {
                delete cache.actions[key];
                if (!onServer) {
                  notifyListeners(key);
                }
              });
        }

        if (!onServer) {
          cache.actions[key]();
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
          -1,
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
      -1,
    ];
  }

  const useWatch: TAsyncActionWatch<A, R, T> = (
    args = {} as A,
    {
      initiate = false,
      ssr = true,
      postActionEnabled = false,
      cacheBreakEnabled = false,
    }: IAsyncActionWatchOptions = {}
  ) => {
    // Where we store the current response that will be returned from our hook
    const responseRef = useRef<TPullstateAsyncWatchResponse<R, T>>();

    // For comparisons to our previous "fingerprint" / key from args
    const prevKeyRef = useRef<string>();

    const key = _createKey(ordinal, args);

    let watchId: MutableRefObject<number> = useRef(-1);
    if (watchId.current === -1) {
      watchId.current = watchIdOrd++;
    }

    if (!shouldUpdate.hasOwnProperty(key)) {
      shouldUpdate[key] = {
        [watchId.current]: true,
      };
    } else {
      shouldUpdate[key][watchId.current] = true;
    }

    // console.log(`[${key}][${watchId.current}] Starting useWatch()`);

    const cache: IPullstateAsyncCache = onServer
      ? useContext(PullstateContext)!._asyncCache
      : clientAsyncCache;
    const stores = onServer ? (useContext(PullstateContext)!.stores as S) : clientStores;

    // only listen for updates when on client
    if (!onServer) {
      const onAsyncStateChanged = () => {
        /*console.log(`[${key}][${watchId.current}] should update: ${shouldUpdate[key][watchId.current]}`);
        console.log(
          `[${key}][${watchId.current}] will update?: ${!isEqual(
            responseRef.current,
            cache.results[key]
          )} - ${responseRef.current} !== ${cache.results[key]}`
        );
        console.log(responseRef.current);
        console.log(cache.results[key]);*/
        if (shouldUpdate[key][watchId.current] && !isEqual(responseRef.current, cache.results[key])) {
          responseRef.current = checkKeyAndReturnResponse(
            key,
            cache,
            initiate,
            ssr,
            args,
            stores,
            true,
            postActionEnabled,
            cacheBreakEnabled
          );

          setWatchUpdate(prev => {
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
          // console.log(`[${key}][${watchId}] Removing listener (before: ${Object.keys(cache.listeners[key]).length})`);
          delete cache.listeners[key][watchId.current];
          shouldUpdate[key][watchId.current] = false;
          // console.log(`[${key}][${watchId}] Removed listener (after: ${Object.keys(cache.listeners[key]).length})`);
        },
        [key]
      );
    }

    // Purely for forcing this hook to update
    const [_, setWatchUpdate] = useState<number>(0);

    /*// If we've run this before, and the keys are equal, quick return with the current set result
    if (prevKeyRef.current !== null && prevKeyRef.current === key) {
      return responseRef.current;
    }*/

    if (prevKeyRef.current !== key) {
      // console.log(`[${key}][${watchId}] KEYS MISMATCH old !== new [${prevKeyRef.current} !== ${key}]`);
      if (prevKeyRef.current !== null && shouldUpdate.hasOwnProperty(prevKeyRef.current!)) {
        delete cache.listeners[prevKeyRef.current!][watchId.current];
        shouldUpdate[prevKeyRef.current!][watchId.current] = false;
      }

      prevKeyRef.current = key;
      responseRef.current = checkKeyAndReturnResponse(
        key,
        cache,
        initiate,
        ssr,
        args,
        stores,
        false,
        postActionEnabled,
        cacheBreakEnabled
      );
    }

    // console.log(`[${key}][${watchId}] Returning from watch() [update no. ${_}] with response: ${JSON.stringify(responseRef.current)}`);
    return responseRef.current!;
  };

  // Same as watch - just initiated, so no need for "started" return value
  const useBeckon: TAsyncActionBeckon<A, R, T> = (
    args = {} as A,
    { ssr = true, postActionEnabled = true, cacheBreakEnabled = true }: IAsyncActionBeckonOptions = {}
  ) => {
    const result = useWatch(args, { initiate: true, ssr, postActionEnabled, cacheBreakEnabled });
    return [result[1], result[2], result[3]];
  };

  const run: TAsyncActionRun<A, R, T> = async (
    args = {} as A,
    {
      treatAsUpdate = false,
      ignoreShortCircuit = false,
      respectCache = false,
      _asyncCache = clientAsyncCache,
      _stores = clientStores,
    }: IAsyncActionRunOptions = {}
  ): Promise<TAsyncActionResult<R, T>> => {
    const key = _createKey(ordinal, args);
    // console.log(`[${key}] Running action`);

    if (_asyncCache.results.hasOwnProperty(key) && respectCache) {
      if (
        cacheBreakHook !== undefined &&
        cacheBreakHook({
          args,
          result: _asyncCache.results[key][2] as TAsyncActionResult<R, T>,
          stores: _stores,
          timeCached: _asyncCache.results[key][4],
        })
      ) {
        delete _asyncCache.results[key];
      } else {
        // if this is a "finished" cached result we need to run the post action hook with RUN_HIT_CACHE context
        if (_asyncCache.results[key][1]) {
          runPostActionHook(
            _asyncCache.results[key][2] as TAsyncActionResult<R, T>,
            args,
            _stores,
            EPostActionContext.RUN_HIT_CACHE
          );
          return _asyncCache.results[key][2] as TAsyncActionResult<R, T>;
        } else {
          return _asyncCache.results[key][2] as TAsyncActionResult<R, T>;
        }
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
        tags: [EAsyncEndTags.UNFINISHED],
      } as IAsyncActionResultNegative<T>,
      false,
      -1,
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
          tags: [EAsyncEndTags.UNFINISHED],
        } as IAsyncActionResultNegative<T>,
        false,
        -1,
      ];
    }

    notifyListeners(key);
    let currentActionOrd = actionOrdUpdate(_asyncCache, key);

    try {
      const result: TAsyncActionResult<R, T> = await action(args, _stores);

      if (currentActionOrd === _asyncCache.actionOrd[key]) {
        _asyncCache.results[key] = [true, true, result, false, Date.now()];
        runPostActionHook(result, args, _stores, EPostActionContext.DIRECT_RUN);
        notifyListeners(key);
      }

      return result;
    } catch (e) {
      console.error(e);

      const result: IAsyncActionResultNegative<T> = {
        error: true,
        message: e.message,
        tags: [EAsyncEndTags.THREW_ERROR],
        payload: null,
      };

      if (currentActionOrd === _asyncCache.actionOrd[key]) {
        _asyncCache.results[key] = [true, true, result, false, Date.now()];
        runPostActionHook(result, args, _stores, EPostActionContext.DIRECT_RUN);
        notifyListeners(key);
      }

      return result;
    }
  };

  const clearCache: TAsyncActionClearCache<A> = (args = {} as A) => {
    const key = _createKey(ordinal, args);
    clearActionCache(key);
  };

  const clearAllCache: TAsyncActionClearAllCache = () => {
    for (const key of Object.keys(clientAsyncCache.actionOrd)) {
      if (key.startsWith(`${ordinal}-`)) {
        clearActionCache(key);
      }
    }
  };

  const clearAllUnwatchedCache: TAsyncActionClearAllUnwatchedCache = () => {
    for (const key of Object.keys(shouldUpdate)) {
      if (!Object.values(shouldUpdate[key]).some(su => su)) {
        delete shouldUpdate[key];
        clearActionCache(key, false);
      }
    }
  };

  const setCached: TAsyncActionSetCached<A, R, T> = (args, result, options) => {
    const { notify = true } = options || {};
    const key = _createKey(ordinal, args);

    const cache: IPullstateAsyncCache = onServer
      ? useContext(PullstateContext)!._asyncCache
      : clientAsyncCache;

    cache.results[key] = [true, true, result, false, Date.now()];
    if (notify) {
      notifyListeners(key);
    }
  };

  const updateCached: TAsyncActionUpdateCached<A, R, T> = (
    args,
    updater,
    options,
  ) => {
    const { notify = true, resetTimeCached = true } = options || {};

    const key = _createKey(ordinal, args);

    const cache: IPullstateAsyncCache = onServer
      ? useContext(PullstateContext)!._asyncCache
      : clientAsyncCache;

    if (cache.results.hasOwnProperty(key) && !cache.results[key][2].error) {
      const currentCached: R = cache.results[key][2].payload;
      cache.results[key] = [
        true,
        true,
        {
          payload: produce(currentCached as any, s => updater(s, currentCached)),
          error: false,
          message: cache.results[key][2].message,
          tags: cache.results[key][2].tags,
        },
        cache.results[key][3],
        cache.results[key][4],
      ];
      // cache.results[key][2].payload = produce(currentCached as any, s => updater(s, currentCached));
      if (notify) {
        notifyListeners(key);
      }
    }
  };

  const getCached: TAsyncActionGetCached<A, R, T> = (args = {} as A, options) => {
    const { checkCacheBreak = false } = options || {};
    const key = _createKey(ordinal, args);

    let cacheBreakable = false;

    const cache: IPullstateAsyncCache = onServer
      ? useContext(PullstateContext)!._asyncCache
      : clientAsyncCache;

    if (cache.results.hasOwnProperty(key)) {
      if (checkCacheBreak && cacheBreakHook !== undefined) {
        const stores = onServer ? (useContext(PullstateContext)!.stores as S) : clientStores;

        if (
          cacheBreakHook({
            args,
            result: cache.results[key][2] as TAsyncActionResult<R, T>,
            stores,
            timeCached: cache.results[key][4],
          })
        ) {
          cacheBreakable = true;
        }
      }

      const [started, finished, result, updating, timeCached] = cache.results[key];
      return {
        started,
        finished,
        result: result as TAsyncActionResult<R, T>,
        existed: true,
        cacheBreakable,
        updating,
        timeCached,
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
        },
        updating: false,
        existed: false,
        cacheBreakable,
        timeCached: -1,
      };
    }
  };

  let delayedRunActionTimeout;

  const delayedRun: TAsyncActionDelayedRun<A> = (
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
        return () => {};
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

  return {
    useBeckon,
    useWatch,
    run,
    delayedRun,
    clearCache,
    clearAllCache,
    clearAllUnwatchedCache,
    getCached,
    setCached,
    updateCached,
  };
}
