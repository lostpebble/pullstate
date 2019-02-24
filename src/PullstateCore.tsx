import React, { useContext } from "react";
import { Store } from "./Store";
import {
  clientAsyncCache,
  createAsyncAction,
  IOCreateAsyncActionOutput, IPullstateAsyncActionOrdState,
  IPullstateAsyncCache,
  IPullstateAsyncResultState,
  TPullstateAsyncAction,
} from "./async";

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

export class PullstateSingleton<T extends IPullstateAllStores = IPullstateAllStores> {
  private readonly originStores: T = {} as T;

  constructor(allStores: T) {
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
  }: { hydrateSnapshot?: IPullstateSnapshot; ssr?: boolean } = {}): PullstateInstance<T> {
    if (!ssr) {
      const instantiated = new PullstateInstance(this.originStores);

      if (hydrateSnapshot != null) {
        instantiated.hydrateFromSnapshot(hydrateSnapshot);
      }

      return instantiated;
    }

    const newStores = {} as T;

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

      newStores[storeName]._setInternalOptions({ ssr });
    }

    return new PullstateInstance(newStores);
  }

  useStores(): T {
    return useContext(PullstateContext).stores as T;
  }

  createAsyncAction<A = any, R = any>(
    action: TPullstateAsyncAction<A, R, T>,
    defaultArgs: A = {} as A
  ): IOCreateAsyncActionOutput<A, R> {
    return createAsyncAction<A, R, T>(action, defaultArgs, this.originStores);
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

  getPullstateSnapshot(): IPullstateSnapshot {
    const allState = {};

    for (const storeName of Object.keys(this._stores)) {
      allState[storeName] = this._stores[storeName].getRawState();
    }

    return { allState, asyncResults: this._asyncCache.results, asyncActionOrd: this._asyncCache.actionOrd };
  }

  async resolveAsyncState() {
    const promises = Object.keys(this._asyncCache.actions).map(key => {
      if (!this._asyncCache.actionOrd.hasOwnProperty(key)) {
        this._asyncCache.actionOrd[key] = 0;
      } else {
        this._asyncCache.actionOrd[key] += 1;
      }

      let currentActionOrd = this._asyncCache.actionOrd[key];

      this._asyncCache.actions[key]()
        .then(resp => {
          this._asyncCache.results[key] = [true, true, resp, false];
        })
        .catch(() => {
          this._asyncCache.results[key] = [true, true, null, false];
        })
        .then(() => {
          // console.log(`Should run after each promise error / success`);
          delete this._asyncCache.actions[key];
        });
    });

    return Promise.all(promises);
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

export function createPullstate<T extends IPullstateAllStores = IPullstateAllStores>(allStores: T) {
  return new PullstateSingleton<T>(allStores);
}

export function useStores<T extends IPullstateAllStores = {}>() {
  return useContext(PullstateContext).stores as T;
}
