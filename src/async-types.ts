import { IPullstateAllStores } from "./PullstateCore";

type TPullstateAsyncUpdateListener = () => void;

// [ started, finished, result, updating ]
export type TPullstateAsyncWatchResponse<R = any, T extends string = string> = [
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
export type TPullstateAsyncBeckonResponse<R = any, T extends string = string> = [
  boolean,
  TAsyncActionResult<R, T>,
  boolean
];
// [result]
export type TPullstateAsyncRunResponse<R = any, T extends string = string> = Promise<
  TAsyncActionResult<R, T>
>;

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

// Order of new hook functions:

// shortCircuitHook = ({ args, stores }) => cachable response | false     - happens only on uncached action
// cacheBreakHook = ({ args, stores, result }) => true | false            - happens only on cached action
// postActionHook = ({ args, result, stores }) => void | new result       - happens on all actions, after the async / short circuit has resolved
// ----> postActionHook potentially needs a mechanism which allows it to run only once per new key change (another layer caching of some sorts expiring on key change)

export type TPullstateAsyncShortCircuitHook<A, R, T extends string, S extends IPullstateAllStores> = (
  inputs: {
    args: A;
    stores: S;
  }
) => TAsyncActionResult<R, T> | false;

export type TPullstateAsyncCacheBreakHook<A, R, T extends string, S extends IPullstateAllStores> = (
  inputs: {
    args: A;
    result: TAsyncActionResult<R, T>,
    stores: S;
  }
) => boolean;

export enum EPostActionContext {
  WATCH_HIT_CACHE = "WATCH_HIT_CACHE",
  RUN_HIT_CACHE = "RUN_HIT_CACHE",
  SHORT_CIRCUIT = "SHORT_CIRCUIT",
  DIRECT_RUN = "DIRECT_RUN",
  BECKON_RUN = "BECKON_RUN",
}

export type TPullstateAsyncPostActionHook<A, R, T extends string, S extends IPullstateAllStores> = (
  inputs: {
    args: A;
    result: TAsyncActionResult<R, T>,
    stores: S;
    context: EPostActionContext;
  }
) => void;

export interface IAsyncActionBeckonOptions {
  ssr?: boolean;
}

export interface IAsyncActionWatchOptions extends IAsyncActionBeckonOptions {
  initiate?: boolean;
}

export interface IAsyncActionRunOptions<S extends IPullstateAllStores = any> {
  treatAsUpdate?: boolean;
  ignoreShortCircuit?: boolean;
  respectCache?: boolean;
  _asyncCache?: IPullstateAsyncCache;
  _stores?: S;
}

export type TAsyncActionBeckon<A, R, T extends string> = (
  args?: A,
  options?: IAsyncActionBeckonOptions
) => TPullstateAsyncBeckonResponse<R, T>;
export type TAsyncActionWatch<A, R, T extends string> = (
  args?: A,
  options?: IAsyncActionWatchOptions
) => TPullstateAsyncWatchResponse<R, T>;
export type TAsyncActionRun<A, R, T extends string> = (
  args?: A,
  options?: IAsyncActionRunOptions
) => TPullstateAsyncRunResponse<R, T>;
export type TAsyncActionClearCache<A> = (args?: A) => void;
export type TAsyncActionClearAllCache = () => void;

export interface IOCreateAsyncActionOutput<A = any, R = any, T extends string = string> {
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

export type TPullstateAsyncAction<A, R, T extends string, S extends IPullstateAllStores> = (
  args: A,
  stores: S
) => Promise<TAsyncActionResult<R, T>>;

export interface ICreateAsyncActionOptions<A, R, T extends string, S extends IPullstateAllStores> {
  clientStores?: S;
  shortCircuitHook?: TPullstateAsyncShortCircuitHook<A, R, T, S>;
  cacheBreakHook?: TPullstateAsyncCacheBreakHook<A, R, T, S>;
  postActionHook?: TPullstateAsyncPostActionHook<A, R, T, S>;
}
