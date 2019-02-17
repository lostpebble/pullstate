import React, { useContext } from "react";
import { Store } from "./index";

export interface IPullstateAllStores {
  [storeName: string]: Store<any>;
}

const PullstateContext = React.createContext<IPullstateAllStores>({});

export const PullstateProvider = <T extends IPullstateAllStores = IPullstateAllStores>({
  stores,
  children,
}: {
  stores: T;
  children?: any;
}) => {
  return <PullstateContext.Provider value={stores}>{children}</PullstateContext.Provider>;
};

let singleton: PullstateSingleton | null = null;

export class PullstateSingleton<T extends IPullstateAllStores = IPullstateAllStores> {
  private readonly allInitialStores: T = {} as T;

  constructor(allStores: T) {
    if (singleton !== null) {
      console.error(
        `Pullstate: createPullstate() - Should not be creating the core Pullstate class more than once! In order to re-use pull state, you need to call instantiate() on your already created object.`
      );
    }

    singleton = this;
    this.allInitialStores = allStores;
  }

  instantiate({
    hydrateState = null,
    reuseStores = false,
  }: { hydrateState?: any; reuseStores?: boolean } = {}): PullstateInstance<T> {
    if (reuseStores) {
      const instantiated = new PullstateInstance(this.allInitialStores);

      if (hydrateState != null) {
        instantiated.hydrateFromAllState(hydrateState);
      }

      return instantiated;
    }

    const newStores = {} as T;

    for (const storeName of Object.keys(this.allInitialStores)) {
      if (hydrateState == null) {
        newStores[storeName] = new Store(this.allInitialStores[storeName]._getState());
      } else if (hydrateState.hasOwnProperty(storeName)) {
        newStores[storeName] = new Store(hydrateState[storeName]);
      } else {
        newStores[storeName] = new Store(this.allInitialStores[storeName]._getState());
        console.warn(
          `Pullstate (instantiate): store [${storeName}] didn't hydrate any state (data was non-existent on hydration object)`
        );
      }
    }

    return new PullstateInstance(newStores);
  }

  useStores() {
    return useContext(PullstateContext) as T;
  }
}

class PullstateInstance<T extends IPullstateAllStores = IPullstateAllStores> {
  private readonly _stores: T = {} as T;

  constructor(allStores: T) {
    this._stores = allStores;
  }

  getAllState(): { [storeName: string]: any } {
    const allState = {};

    for (const storeName of Object.keys(this._stores)) {
      allState[storeName] = this._stores[storeName]._getState();
    }

    return allState;
  }

  get stores(): T {
    return this._stores;
  }

  hydrateFromAllState(allState: any) {
    for (const storeName of Object.keys(this._stores)) {
      if (allState.hasOwnProperty(storeName)) {
        this._stores[storeName]._updateState(allState[storeName]);
      } else {
        console.warn(`${storeName} didn't hydrate any state (data was non-existent on hydration object)`);
      }
    }
  }
}

export function createPullstate<T extends IPullstateAllStores = IPullstateAllStores>(allStores: T) {
  return new PullstateSingleton(allStores);
}

export function useStores<T extends IPullstateAllStores = {}>() {
  return useContext(PullstateContext) as T;
}
