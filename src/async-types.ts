import { IPullstateAllStores } from "./PullstateCore";
import { TUpdateFunction } from "./Store";

type TPullstateAsyncUpdateListener = () => void;

// [ started, finished, result, updating, timeCached ]
export type TPullstateAsyncWatchResponse<R = any, T extends string = string, N = any> = [
  boolean,
  boolean,
  TAsyncActionResult<R, T, N>,
  boolean,
  number
];

// export type TPullstateAsync

// [ started, finished, result, updating, postActionResult ]
// export type TPullstateAsyncResponseCacheFull<R, T extends string> = [
//   boolean,
//   boolean,
//   TAsyncActionResult<R, T>,
//   boolean,
//   TAsyncActionResult<R, T> | true | null
// ];

// [finished, result, updating]
export type TPullstateAsyncBeckonResponse<R = any, T extends string = string, N = any> = [
  boolean,
  TAsyncActionResult<R, T, N>,
  boolean
];
// [result]
export type TPullstateAsyncRunResponse<R = any, T extends string = string, N = any> = Promise<TAsyncActionResult<R, T, N>>;

export interface IPullstateAsyncResultState {
  [key: string]: TPullstateAsyncWatchResponse<any, string, any>;
}

export interface IPullstateAsyncActionOrdState {
  [key: string]: number;
}

export enum EAsyncEndTags {
  THREW_ERROR = "THREW_ERROR",
  RETURNED_ERROR = "RETURNED_ERROR",
  UNFINISHED = "UNFINISHED",
  DORMANT = "DORMANT",
}

interface IAsyncActionResultBase<T extends string> {
  message: string;
  tags: (EAsyncEndTags | T)[];
}

export interface IAsyncActionResultPositive<R, T extends string> extends IAsyncActionResultBase<T> {
  error: false;
  payload: R;
  errorPayload: null;
}

export interface IAsyncActionResultNegative<T extends string, N = unknown> extends IAsyncActionResultBase<T> {
  error: true;
  errorPayload: N;
  payload: null;
}

export type TAsyncActionResult<R, T extends string, N> =
  IAsyncActionResultPositive<R, T>
  | IAsyncActionResultNegative<T, N>;

// Order of new hook functions:

// shortCircuitHook = ({ args, stores }) => cachable response | false     - happens only on uncached action
// cacheBreakHook = ({ args, stores, result }) => true | false            - happens only on cached action
// postActionHook = ({ args, result, stores }) => void | new result       - happens on all actions, after the async / short circuit has resolved
// ----> postActionHook potentially needs a mechanism which allows it to run only once per new key change (another layer caching of some sorts expiring on key change)

export type TPullstateAsyncShortCircuitHook<A, R, T extends string, N, S extends IPullstateAllStores> = (inputs: {
  args: A;
  stores: S;
}) => TAsyncActionResult<R, T, N> | false;

export type TPullstateAsyncCacheBreakHook<A, R, T extends string, N, S extends IPullstateAllStores> = (inputs: {
  args: A;
  result: TAsyncActionResult<R, T, N>;
  stores: S;
  timeCached: number;
}) => boolean;

export enum EPostActionContext {
  WATCH_HIT_CACHE = "WATCH_HIT_CACHE",
  BECKON_HIT_CACHE = "BECKON_HIT_CACHE",
  RUN_HIT_CACHE = "RUN_HIT_CACHE",
  READ_HIT_CACHE = "READ_HIT_CACHE",
  READ_RUN = "READ_RUN",
  SHORT_CIRCUIT = "SHORT_CIRCUIT",
  DIRECT_RUN = "DIRECT_RUN",
  BECKON_RUN = "BECKON_RUN",
  CACHE_UPDATE = "CACHE_UPDATE",
}

export type TPullstateAsyncPostActionHook<A, R, T extends string, N, S extends IPullstateAllStores> = (inputs: {
  args: A;
  result: TAsyncActionResult<R, T, N>;
  stores: S;
  context: EPostActionContext;
}) => void;

export interface IAsyncActionReadOptions<A, R, T extends string, N, S extends IPullstateAllStores> {
  postActionEnabled?: boolean;
  cacheBreakEnabled?: boolean;
  key?: string;
  cacheBreak?: boolean | number | TPullstateAsyncCacheBreakHook<A, R, T, N, S>
}

export interface IAsyncActionBeckonOptions<A, R, T extends string, N, S extends IPullstateAllStores> extends IAsyncActionReadOptions<A, R, T, N, S> {
  ssr?: boolean;
  holdPrevious?: boolean;
  dormant?: boolean;
}

export interface IAsyncActionWatchOptions<A, R, T extends string, N, S extends IPullstateAllStores> extends IAsyncActionBeckonOptions<A, R, T, N, S> {
  initiate?: boolean;
}

export interface IAsyncActionUseOptions<A, R, T extends string, N, S extends IPullstateAllStores> extends IAsyncActionWatchOptions<A, R, T, N, S> {
  onSuccess?: (result: R, args: A) => void;
}

export interface IAsyncActionUseDeferOptions<A, R, T extends string, N, S extends IPullstateAllStores> extends Omit<IAsyncActionReadOptions<A, R, T, N, S>, "key"> {
  key?: string;
  holdPrevious?: boolean;
  onSuccess?: (result: R, args: A) => void;
  clearOnSuccess?: boolean;
}

export interface IAsyncActionRunOptions<A, R, T extends string, N, S extends IPullstateAllStores> {
  treatAsUpdate?: boolean;
  ignoreShortCircuit?: boolean;
  respectCache?: boolean;
  key?: string;
  cacheBreak?: boolean | number | TPullstateAsyncCacheBreakHook<A, R, T, N, S>
  _asyncCache?: IPullstateAsyncCache;
  _stores?: S;
  _customContext?: any;
}

export interface IAsyncActionGetCachedOptions {
  checkCacheBreak?: boolean;
  key?: string;
}

export interface IGetCachedResponse<R, T extends string, N = any> {
  started: boolean;
  finished: boolean;
  result: TAsyncActionResult<R, T, N>;
  updating: boolean;
  existed: boolean;
  cacheBreakable: boolean;
  timeCached: number;
}

export interface IAsyncClearCacheOptions {
  notify?: boolean;
}

export interface IAsyncActionSetOrClearCachedValueOptions extends IAsyncClearCacheOptions {
  key?: string;
}

export interface IAsyncActionUpdateCachedOptions extends IAsyncActionSetOrClearCachedValueOptions {
  resetTimeCached?: boolean;
  runPostActionHook?: boolean;
}

export type TAsyncActionUse<A, R, T extends string, N, S extends IPullstateAllStores> = (
  args?: A,
  options?: IAsyncActionUseOptions<A, R, T, N, S>
) => TUseResponse<A, R, T, N, S>;

export type TAsyncActionUseDefer<A, R, T extends string, N, S extends IPullstateAllStores> = (
  options?: IAsyncActionUseDeferOptions<A, R, T, N, S>
) => TUseDeferResponse<A, R, T, N, S>;

export type TAsyncActionBeckon<A, R, T extends string, N, S extends IPullstateAllStores> = (
  args?: A,
  options?: IAsyncActionBeckonOptions<A, R, T, N, S>
) => TPullstateAsyncBeckonResponse<R, T, N>;

export type TAsyncActionWatch<A, R, T extends string, N, S extends IPullstateAllStores> = (
  args?: A,
  options?: IAsyncActionWatchOptions<A, R, T, N, S>
) => TPullstateAsyncWatchResponse<R, T, N>;

export type TAsyncActionRun<A, R, T extends string, N, S extends IPullstateAllStores> = (
  args?: A,
  options?: IAsyncActionRunOptions<A, R, T, N, S>
) => TPullstateAsyncRunResponse<R, T, N>;

export type TAsyncActionClearCache<A> = (args?: A, options?: IAsyncActionSetOrClearCachedValueOptions) => void;

export type TAsyncActionClearAllCache = (options?: IAsyncClearCacheOptions) => void;

export type TAsyncActionClearAllUnwatchedCache = (options?: IAsyncClearCacheOptions) => void;

export type TAsyncActionGetCached<A, R, T extends string, N> = (
  args?: A,
  options?: IAsyncActionGetCachedOptions
) => IGetCachedResponse<R, T, N>;

export type TAsyncActionSetCached<A, R, T extends string, N> = (
  args: A,
  result: TAsyncActionResult<R, T, N>,
  options?: IAsyncActionSetOrClearCachedValueOptions
) => void;

export type TAsyncActionSetCachedPayload<A, R> = (args: A, payload: R, options?: IAsyncActionSetOrClearCachedValueOptions) => void;

export type TAsyncActionUpdateCached<A, R> = (
  args: A,
  updater: TUpdateFunction<R>,
  options?: IAsyncActionUpdateCachedOptions
) => void;
export type TAsyncActionRead<A, R, T extends string, N, S extends IPullstateAllStores> = (args?: A, options?: IAsyncActionReadOptions<A, R, T, N, S>) => R;

export type TAsyncActionDelayedRun<A, R, T extends string, N, S extends IPullstateAllStores> = (
  args: A,
  options: IAsyncActionRunOptions<A, R, T, N, S> & { delay: number; clearOldRun?: boolean; immediateIfCached?: boolean }
) => () => void;

export interface IOCreateAsyncActionOutput<A = any, R = any, T extends string = string, N = any, S extends IPullstateAllStores = IPullstateAllStores> {
  use: TAsyncActionUse<A, R, T, N, S>;
  useDefer: TAsyncActionUseDefer<A, R, T, N, S>;
  read: TAsyncActionRead<A, R, T, N, S>;
  useBeckon: TAsyncActionBeckon<A, R, T, N, S>;
  useWatch: TAsyncActionWatch<A, R, T, N, S>;
  run: TAsyncActionRun<A, R, T, N, S>;
  delayedRun: TAsyncActionDelayedRun<A, R, T, N, S>;
  getCached: TAsyncActionGetCached<A, R, T, N>;
  setCached: TAsyncActionSetCached<A, R, T, N>;
  setCachedPayload: TAsyncActionSetCachedPayload<A, R>;
  updateCached: TAsyncActionUpdateCached<A, R>;
  clearCache: TAsyncActionClearCache<A>;
  clearAllCache: TAsyncActionClearAllCache;
  clearAllUnwatchedCache: TAsyncActionClearAllUnwatchedCache;
}

export interface IPullstateAsyncCache {
  results: IPullstateAsyncResultState;
  listeners: {
    [key: string]: {
      [watchId: string]: TPullstateAsyncUpdateListener;
    };
  };
  actions: {
    [key: string]: () => Promise<TAsyncActionResult<any, string, any>>;
  };
  actionOrd: IPullstateAsyncActionOrdState;
}

export type TPullstateAsyncAction<A, R, T extends string, N, S extends IPullstateAllStores> = (
  args: A,
  stores: S,
  customContext: any
) => Promise<TAsyncActionResult<R, T, N>>;

export interface ICreateAsyncActionOptions<A, R, T extends string, N, S extends IPullstateAllStores> {
  forceContext?: boolean;
  // clientStores?: S;
  shortCircuitHook?: TPullstateAsyncShortCircuitHook<A, R, T, N, S>;
  cacheBreakHook?: TPullstateAsyncCacheBreakHook<A, R, T, N, S>;
  postActionHook?: TPullstateAsyncPostActionHook<A, R, T, N, S>;
  subsetKey?: (args: A) => any;
  actionId?: string | number;
}

// action.use() types

export type TRunWithPayload<R> = (func: (payload: R) => any) => any;

export interface IBaseObjResponseUse<A, R, T extends string, N, S extends IPullstateAllStores> {
  execute: (runOptions?: IAsyncActionRunOptions<A, R, T, N, S>) => TPullstateAsyncRunResponse<R, T, N>;
}

export interface IBaseObjResponseUseDefer<A, R, T extends string, N, S extends IPullstateAllStores> {
  execute: (args?: A, runOptions?: Omit<IAsyncActionRunOptions<A, R, T, N, S>, "key" | "cacheBreak">) => TPullstateAsyncRunResponse<R, T, N>;
  unwatchExecuted: () => void;
  args: A;
  key: string;
}

export interface IBaseObjResponse<R, T extends string, N> {
  isLoading: boolean;
  isFinished: boolean;
  isUpdating: boolean;
  isStarted: boolean;
  // isSuccess: boolean;
  // isFailure: boolean;
  clearCached: () => void;
  updateCached: (updater: TUpdateFunction<R>, options?: IAsyncActionUpdateCachedOptions) => void;
  setCached: (result: TAsyncActionResult<R, T, N>, options?: IAsyncActionSetOrClearCachedValueOptions) => void;
  setCachedPayload: (payload: R, options?: IAsyncActionSetOrClearCachedValueOptions) => void;
  endTags: (T | EAsyncEndTags)[];
  renderPayload: TRunWithPayload<R>;
  message: string;
  raw: TPullstateAsyncWatchResponse<R, T, N>;
}

export interface IBaseObjSuccessResponse<R, T extends string, N> extends IBaseObjResponse<R, T, N> {
  payload: R;
  errorPayload: null;
  error: false;
  isSuccess: true;
  isFailure: false;
}

export interface IBaseObjErrorResponse<R, T extends string, N> extends IBaseObjResponse<R, T, N> {
  payload: null;
  errorPayload: N;
  error: true;
  isFailure: true;
  isSuccess: false;
}

export type TUseResponse<A = any, R = any, T extends string = string, N = any, S extends IPullstateAllStores = IPullstateAllStores> =
  (IBaseObjSuccessResponse<R, T, N>
    | IBaseObjErrorResponse<R, T, N>) & IBaseObjResponseUse<A, R, T, N, S>;

export type TUseDeferResponse<A = any, R = any, T extends string = string, N = any, S extends IPullstateAllStores = IPullstateAllStores> =
  (IBaseObjSuccessResponse<R, T, N>
    | IBaseObjErrorResponse<R, T, N>) & IBaseObjResponseUseDefer<A, R, T, N, S>;
