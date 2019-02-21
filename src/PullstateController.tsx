import React, { useEffect, useState, useContext } from "react";
import { Store } from "./index";
import { IPullstateAsyncCache, IPullstateAsyncState } from "./async";

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
    hydrateSnapshot = null,
    reuseStores = false,
    ssr = false,
  }: { hydrateSnapshot?: IPullstateSnapshot; reuseStores?: boolean; ssr?: boolean } = {}): PullstateInstance<T> {
    if (reuseStores) {
      if (ssr) {
        console.error(`Pullstate (instantiate): Can's set { ssr: true } when using reuseStores (client-side only)`);
      }

      const instantiated = new PullstateInstance(this.allInitialStores);

      if (hydrateSnapshot != null) {
        instantiated.hydrateFromSnapshot(hydrateSnapshot);
      }

      return instantiated;
    }

    const newStores = {} as T;

    for (const storeName of Object.keys(this.allInitialStores)) {
      if (hydrateSnapshot == null) {
        newStores[storeName] = new Store(this.allInitialStores[storeName]._getInitialState());
      } else if (hydrateSnapshot.hasOwnProperty(storeName)) {
        newStores[storeName] = new Store(hydrateSnapshot.allState[storeName]);
      } else {
        newStores[storeName] = new Store(this.allInitialStores[storeName]._getInitialState());
        console.warn(
          `Pullstate (instantiate): store [${storeName}] didn't hydrate any state (data was non-existent on hydration object)`
        );
      }

      newStores[storeName]._setInternalOptions({ ssr });
    }

    return new PullstateInstance(newStores);
  }

  useAsyncStateWatcher<ET extends string = string>(
    asyncAction: (stores: T) => Promise<Array<ET>>,
    keyValue: any
  ): IUseAsyncWatcherResponse<Array<ET>> {
    const key = JSON.stringify(keyValue);
    const [response, setResponse] = useState({ finished: true, error: false, endTags: [] });
    const pullstate = useContext(PullstateContext);

    let shouldUpdate = true;
    useEffect(() => () => {
      shouldUpdate = false;
    });

    if (pullstate._asyncCache.results.hasOwnProperty(keyValue)) {
      console.log(`Pullstate Async: [${keyValue}] Already been run - do nothing`);
      return [
        true,
        pullstate._asyncCache.results[keyValue].error,
        pullstate._asyncCache.results[keyValue].endTags as ET[],
      ];
    } else {
      console.log(`Pullstate Async: [${keyValue}] NEW async action`);
      if (typeof window === "undefined") {
        // on the server
        pullstate._asyncCache.actions[keyValue] = () => asyncAction(pullstate.stores as T);
      } else {
        // on the client
        asyncAction(pullstate.stores as T)
          .then(endTags => {
            if (shouldUpdate) {
              pullstate._asyncCache.results[keyValue] = { endTags, error: false };
              setResponse({ finished: true, error: false, endTags });
            }
          })
          .catch(() => {
            if (shouldUpdate) {
              pullstate._asyncCache.results[keyValue] = { endTags: [], error: true };
              setResponse({ finished: false, error: true, endTags: [] });
            }
          });
      }
    }

    return [response.finished, response.error, response.endTags];
  }

  useStores() {
    return useContext(PullstateContext).stores as T;
  }

  createAsyncAction() {
    return;
  }
}

/*interface IPullstateAsyncRegister<ET extends string = string> {
  [key: string]: {
    error: boolean;
    endTags: ET[];
  };
}*/

/*interface IPullstateAsync<ET extends string = string> {
  register: IPullstateAsyncRegister<ET>;
  actions: {
    [key: string]: () => Promise<Array<ET>>;
  };
}*/

interface IPullstateSnapshot {
  allState: { [storeName: string]: any };
  asyncRegister: IPullstateAsyncState;
}

class PullstateInstance<T extends IPullstateAllStores = IPullstateAllStores> {
  private readonly _stores: T = {} as T;
  _asyncCache: IPullstateAsyncCache = {
    // resolved: {},
    listeners: {},
    results: {},
    actions: {},
  };

  constructor(allStores: T) {
    this._stores = allStores;
  }

  getPullstateSnapshot(): IPullstateSnapshot {
    const allState = {};

    for (const storeName of Object.keys(this._stores)) {
      allState[storeName] = this._stores[storeName].getRawState();
    }

    return { allState, asyncRegister: this._asyncCache.results };
  }

  async resolveAsyncState() {
    const promises = Object.keys(this._asyncCache.actions).map(key =>
      this._asyncCache.actions[key]()
        .then(endTags => {
          this._asyncCache.results[key] = { error: false, endTags };
        })
        .catch(e => {
          this._asyncCache.results[key] = { error: true, endTags: [] };
        })
        .then(() => {
          console.log(`Should run after each promise error / success`);
          delete this._asyncCache.actions[key];
        })
    );

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

    this._asyncCache.results = snapshot.asyncRegister;
  }
}

export function createPullstate<T extends IPullstateAllStores = IPullstateAllStores>(allStores: T) {
  return new PullstateSingleton<T>(allStores);
}

export function useStores<T extends IPullstateAllStores = {}>() {
  return useContext(PullstateContext).stores as T;
}
