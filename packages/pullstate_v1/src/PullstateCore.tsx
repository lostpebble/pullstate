import React, { useContext } from "react";
import { Store, TUpdateFunction } from "./Store";
import { clientAsyncCache, createAsyncAction, createAsyncActionDirect } from "./async";
import {
  IAsyncActionRunOptions,
  ICreateAsyncActionOptions,
  IOCreateAsyncActionOutput,
  IPullstateAsyncActionOrdState,
  IPullstateAsyncCache,
  IPullstateAsyncResultState,
  TPullstateAsyncAction,
  TPullstateAsyncRunResponse
} from "./async-types";

export interface IPullstateAllStores {
  [storeName: string]: Store<any>;
}

export const PullstateContext = React.createContext<PullstateInstance<any> | null>(null);

export const PullstateProvider = <T extends IPullstateAllStores>(
  {
    instance,
    children
  }: {
    instance: PullstateInstance<T>;
    children?: any;
  }) => {
  return <PullstateContext.Provider value={instance}>{children}</PullstateContext.Provider>;
};

let singleton: PullstateSingleton<any> | null = null;

export const clientStores: {
  internalClientStores: true;
  stores: IPullstateAllStores;
  loaded: boolean;
} = {
  internalClientStores: true,
  loaded: false,
  stores: {}
};

export type TMultiStoreAction<P extends PullstateSingleton<S>,
  S extends IPullstateAllStores = P extends PullstateSingleton<infer ST> ? ST : any> = (update: TMultiStoreUpdateMap<S>) => void;

interface IPullstateSingletonOptions {
  asyncActions?: {
    defaultCachingSeconds?: number;
  };
}

export class PullstateSingleton<S extends IPullstateAllStores = IPullstateAllStores> {
  // private readonly originStores: S = {} as S;
  // private updatedStoresInAct = new Set<string>();
  // private actUpdateMap: TMultiStoreUpdateMap<S> | undefined;
  options: IPullstateSingletonOptions = {};

  constructor(allStores: S, options: IPullstateSingletonOptions = {}) {
    if (singleton !== null) {
      console.error(
        `Pullstate: createPullstate() - Should not be creating the core Pullstate class more than once! In order to re-use pull state, you need to call instantiate() on your already created object.`
      );
    }

    singleton = this;
    // this.originStores = allStores;
    clientStores.stores = allStores;
    clientStores.loaded = true;
    this.options = options;
  }

  instantiate(
    {
      hydrateSnapshot,
      ssr = false,
      customContext
    }: { hydrateSnapshot?: IPullstateSnapshot; ssr?: boolean, customContext?: any } = {}): PullstateInstance<S> {
    if (!ssr) {
      const instantiated = new PullstateInstance<S>(clientStores.stores as S, false, customContext);

      if (hydrateSnapshot != null) {
        instantiated.hydrateFromSnapshot(hydrateSnapshot);
      }

      instantiated.instantiateReactions();
      return instantiated as PullstateInstance<S>;
    }

    const newStores: IPullstateAllStores = {};

    for (const storeName of Object.keys(clientStores.stores)) {
      if (hydrateSnapshot == null) {
        newStores[storeName] = new Store(clientStores.stores[storeName]._getInitialState());
      } else if (hydrateSnapshot.hasOwnProperty(storeName)) {
        newStores[storeName] = new Store(hydrateSnapshot.allState[storeName]);
      } else {
        newStores[storeName] = new Store(clientStores.stores[storeName]._getInitialState());
        console.warn(
          `Pullstate (instantiate): store [${storeName}] didn't hydrate any state (data was non-existent on hydration object)`
        );
      }

      newStores[storeName]._setInternalOptions({
        ssr,
        reactionCreators: clientStores.stores[storeName]._getReactionCreators()
      });
    }

    return new PullstateInstance(newStores as S, true, customContext);
  }

  useStores(): S {
    // return useContext(PullstateContext)!.stores as S;
    return useStores<S>();
  }

  useInstance(): PullstateInstance<S> {
    return useInstance<S>();
  }

  /*actionSetup(): {
    action: (update: TMultiStoreAction<PullstateSingleton<S>, S>) => TMultiStoreAction<PullstateSingleton<S>, S>;
    act: (action: TMultiStoreAction<PullstateSingleton<S>, S>) => void;
    // act: (action: (update: TMultiStoreUpdateMap<S>) => void) => void;
  } {
    const actUpdateMap = {} as TMultiStoreUpdateMap<S>;
    const updatedStores = new Set<string>();

    for (const store of Object.keys(clientStores.stores)) {
      actUpdateMap[store as keyof S] = (updater) => {
        updatedStores.add(store);
        clientStores.stores[store].batch(updater);
      };
    }

    const action: (
      update: TMultiStoreAction<PullstateSingleton<S>, S>
    ) => TMultiStoreAction<PullstateSingleton<S>, S> = (action) => action;
    const act = (action: TMultiStoreAction<PullstateSingleton<S>, S>): void => {
      updatedStores.clear();
      action(actUpdateMap);
      for (const store of updatedStores) {
        clientStores.stores[store].flushBatch(true);
      }
    };

    return {
      action,
      act,
    };
  }*/

  createAsyncActionDirect<A extends any = any, R extends any = any, N extends any = any>(
    action: (args: A) => Promise<R>,
    options: ICreateAsyncActionOptions<A, R, string, N, S> = {}
  ): IOCreateAsyncActionOutput<A, R, string, N, S> {
    return createAsyncActionDirect(action, options);
    // return createAsyncAction<A, R, string, S>(async (args: A) => {
    //   return successResult(await action(args));
    // }, options);
  }

  createAsyncAction<A = any, R = any, T extends string = string, N extends any = any>(
    action: TPullstateAsyncAction<A, R, T, N, S>,
    // options: Omit<ICreateAsyncActionOptions<A, R, T, S>, "clientStores"> = {}
    options: ICreateAsyncActionOptions<A, R, T, N, S> = {}
  ): IOCreateAsyncActionOutput<A, R, T, N, S> {
    // options.clientStores = this.originStores;
    if (this.options.asyncActions?.defaultCachingSeconds && !options.cacheBreakHook) {
      options.cacheBreakHook = (inputs) =>
        inputs.timeCached < Date.now() - this.options.asyncActions!.defaultCachingSeconds! * 1000;
    }

    return createAsyncAction<A, R, T, N, S>(action, options);
  }
}

type TMultiStoreUpdateMap<S extends IPullstateAllStores> = {
  [K in keyof S]: (updater: TUpdateFunction<S[K] extends Store<infer T> ? T : any>) => void;
};

interface IPullstateSnapshot {
  allState: { [storeName: string]: any };
  asyncResults: IPullstateAsyncResultState;
  asyncActionOrd: IPullstateAsyncActionOrdState;
}

export interface IPullstateInstanceConsumable<T extends IPullstateAllStores = IPullstateAllStores> {
  stores: T;

  hasAsyncStateToResolve(): boolean;

  resolveAsyncState(): Promise<void>;

  getPullstateSnapshot(): IPullstateSnapshot;

  hydrateFromSnapshot(snapshot: IPullstateSnapshot): void;

  runAsyncAction<A, R, X extends string, N>(
    asyncAction: IOCreateAsyncActionOutput<A, R, X, N, T>,
    args?: A,
    runOptions?: Pick<IAsyncActionRunOptions<A, R, X, N, T>, "ignoreShortCircuit" | "respectCache">
  ): TPullstateAsyncRunResponse<R, X, N>;
}

class PullstateInstance<T extends IPullstateAllStores = IPullstateAllStores>
  implements IPullstateInstanceConsumable<T> {
  private _ssr: boolean = false;
  private _customContext: any;
  private readonly _stores: T = {} as T;
  _asyncCache: IPullstateAsyncCache = {
    listeners: {},
    results: {},
    actions: {},
    actionOrd: {}
  };

  constructor(allStores: T, ssr: boolean, customContext: any) {
    this._stores = allStores;
    this._ssr = ssr;
    this._customContext = customContext;
    /*if (!ssr) {
      // console.log(`Instantiating Stores`, allStores);
      clientStores.stores = allStores;
      clientStores.loaded = true;
    }*/
  }

  private getAllUnresolvedAsyncActions(): Array<Promise<any>> {
    return Object.keys(this._asyncCache.actions).map((key) => this._asyncCache.actions[key]());
  }

  instantiateReactions() {
    for (const storeName of Object.keys(this._stores)) {
      this._stores[storeName]._instantiateReactions();
    }
  }

  getPullstateSnapshot(): IPullstateSnapshot {
    const allState = {} as IPullstateSnapshot["allState"];

    for (const storeName of Object.keys(this._stores)) {
      allState[storeName] = this._stores[storeName].getRawState();
    }

    return { allState, asyncResults: this._asyncCache.results, asyncActionOrd: this._asyncCache.actionOrd };
  }

  async resolveAsyncState() {
    const promises = this.getAllUnresolvedAsyncActions();
    await Promise.all(promises);
  }

  hasAsyncStateToResolve(): boolean {
    return Object.keys(this._asyncCache.actions).length > 0;
  }

  get stores(): T {
    return this._stores;
  }

  get customContext(): any {
    return this._customContext;
  }

  async runAsyncAction<A, R, X extends string, N>(
    asyncAction: IOCreateAsyncActionOutput<A, R, X, N, T>,
    args: A = {} as A,
    runOptions: Pick<IAsyncActionRunOptions<A, R, X, N, T>, "ignoreShortCircuit" | "respectCache"> = {}
  ): TPullstateAsyncRunResponse<R, X, N> {
    if (this._ssr) {
      (runOptions as IAsyncActionRunOptions<A, R, X, N, T>)._asyncCache = this._asyncCache;
      (runOptions as IAsyncActionRunOptions<A, R, X, N, T>)._stores = this._stores;
      (runOptions as IAsyncActionRunOptions<A, R, X, N, T>)._customContext = this._customContext;
    }

    return await asyncAction.run(args, runOptions);
  }

  hydrateFromSnapshot(snapshot: IPullstateSnapshot) {
    for (const storeName of Object.keys(this._stores)) {
      if (snapshot.allState.hasOwnProperty(storeName)) {
        this._stores[storeName]._updateStateWithoutReaction(snapshot.allState[storeName]);
      } else {
        console.warn(`${storeName} didn't hydrate any state (data was non-existent on hydration object)`);
      }
    }

    clientAsyncCache.results = snapshot.asyncResults || {};
    clientAsyncCache.actionOrd = snapshot.asyncActionOrd || {};
  }
}

export function createPullstateCore<T extends IPullstateAllStores = IPullstateAllStores>(
  allStores: T = {} as T,
  options: IPullstateSingletonOptions = {}
) {
  return new PullstateSingleton<T>(allStores, options);
}

export function useStores<T extends IPullstateAllStores = {}>() {
  return useContext(PullstateContext)!.stores as T;
}

export function useInstance<T extends IPullstateAllStores = IPullstateAllStores>(): PullstateInstance<T> {
  return useContext(PullstateContext)! as PullstateInstance<T>;
}
