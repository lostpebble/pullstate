import React, { useContext } from "react";
import { Store } from "./Store";
import {
  clientAsyncCache,
  createAsyncAction,
  EAsyncEndTags, ICreateAsyncActionOptions,
  IOCreateAsyncActionOutput,
  IPullstateAsyncActionOrdState,
  IPullstateAsyncCache,
  IPullstateAsyncResultState,
  TPullstateAsyncAction, TPullstateAsyncShortCircuitHook,
} from "./async";

type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;

export interface IPullstateAllStores {
  [storeName: string]: Store<any>;
}

export const PullstateContext = React.createContext<PullstateInstance | null>(null);

export const PullstateProvider = <T extends IPullstateAllStores = IPullstateAllStores>({
  instance,
  children,
}: {
  instance: PullstateInstance<T>;
  children?: any;
}) => {
  return <PullstateContext.Provider value={instance}>{children}</PullstateContext.Provider>;
};

export type IUseAsyncWatcherResponse<ET extends string[] = string[]> = [boolean, boolean, ET];

let singleton: PullstateSingleton | null = null;

export class PullstateSingleton<S extends IPullstateAllStores = IPullstateAllStores> {
  private readonly originStores: S = {} as S;

  constructor(allStores: S) {
    if (singleton !== null) {
      console.error(
        `Pullstate: createPullstate() - Should not be creating the core Pullstate class more than once! In order to re-use pull state, you need to call instantiate() on your already created object.`
      );
    }

    singleton = this;
    this.originStores = allStores;
  }

  instantiate({
    hydrateSnapshot = null,
    ssr = false,
  }: { hydrateSnapshot?: IPullstateSnapshot; ssr?: boolean } = {}): PullstateInstance<S> {
    if (!ssr) {
      const instantiated = new PullstateInstance(this.originStores);

      if (hydrateSnapshot != null) {
        instantiated.hydrateFromSnapshot(hydrateSnapshot);
      }

      instantiated.instantiateReactions();
      return instantiated;
    }

    const newStores = {} as S;

    for (const storeName of Object.keys(this.originStores)) {
      if (hydrateSnapshot == null) {
        newStores[storeName] = new Store(this.originStores[storeName]._getInitialState());
      } else if (hydrateSnapshot.hasOwnProperty(storeName)) {
        newStores[storeName] = new Store(hydrateSnapshot.allState[storeName]);
      } else {
        newStores[storeName] = new Store(this.originStores[storeName]._getInitialState());
        console.warn(
          `Pullstate (instantiate): store [${storeName}] didn't hydrate any state (data was non-existent on hydration object)`
        );
      }

      newStores[storeName]._setInternalOptions({ ssr, reactionCreators: this.originStores[storeName]._getReactionCreators() });
    }

    return new PullstateInstance(newStores);
  }

  useStores(): S {
    return useContext(PullstateContext).stores as S;
  }

  createAsyncAction<A = any, R = any, T extends string = string>(
    action: TPullstateAsyncAction<A, R, T, S>,
    options: Omit<ICreateAsyncActionOptions<A, R, T, S>, "clientStores"> = {},
  ): IOCreateAsyncActionOutput<A, R, T> {
    return createAsyncAction<A, R, T, S>(action, { clientStores: this.originStores, ...options });
  }
}

interface IPullstateSnapshot {
  allState: { [storeName: string]: any };
  asyncResults: IPullstateAsyncResultState;
  asyncActionOrd: IPullstateAsyncActionOrdState;
}

class PullstateInstance<T extends IPullstateAllStores = IPullstateAllStores> {
  private readonly _stores: T = {} as T;
  _asyncCache: IPullstateAsyncCache = {
    listeners: {},
    results: {},
    actions: {},
    actionOrd: {},
  };

  constructor(allStores: T) {
    this._stores = allStores;
  }

  private getAllUnresolvedAsyncActions(): Array<Promise<any>> {
    return Object.keys(this._asyncCache.actions).map(key =>
      this._asyncCache.actions[key]()
        .then(resp => {
          this._asyncCache.results[key] = [true, true, resp, false];
        })
        .catch(() => {
          this._asyncCache.results[key] = [
            true,
            true,
            { error: true, message: "", tags: [EAsyncEndTags.THREW_ERROR], payload: null },
            false,
          ];
        })
        .then(() => {
          delete this._asyncCache.actions[key];
        })
    );
  }

  instantiateReactions() {
    for (const storeName of Object.keys(this._stores)) {
      this._stores[storeName]._instantiateReactions();
    }
  }

  getPullstateSnapshot(): IPullstateSnapshot {
    const allState = {};

    for (const storeName of Object.keys(this._stores)) {
      allState[storeName] = this._stores[storeName].getRawState();
    }

    return { allState, asyncResults: this._asyncCache.results, asyncActionOrd: this._asyncCache.actionOrd };
  }

  async resolveAsyncState() {
    const promises = this.getAllUnresolvedAsyncActions();
    return Promise.all(promises);
  }

  hasAsyncStateToResolve(): boolean {
    return Object.keys(this._asyncCache.actions).length > 0;
  }

  get stores(): T {
    return this._stores;
  }

  hydrateFromSnapshot(snapshot: IPullstateSnapshot) {
    for (const storeName of Object.keys(this._stores)) {
      if (snapshot.allState.hasOwnProperty(storeName)) {
        this._stores[storeName]._updateState(snapshot.allState[storeName]);
      } else {
        console.warn(`${storeName} didn't hydrate any state (data was non-existent on hydration object)`);
      }
    }

    clientAsyncCache.results = snapshot.asyncResults;
    clientAsyncCache.actionOrd = snapshot.asyncActionOrd;
  }
}

export function createPullstateCore<T extends IPullstateAllStores = IPullstateAllStores>(allStores: T) {
  return new PullstateSingleton<T>(allStores);
}

export function useStores<T extends IPullstateAllStores = {}>() {
  return useContext(PullstateContext).stores as T;
}
