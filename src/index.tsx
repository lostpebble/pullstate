import shallowEqual from "fbjs/lib/shallowEqual";
import immer from "immer";
import React, { useEffect, useState, useContext } from "react";

export type TPullstateUpdateListener = () => void;

export interface IStoreInternalOptions {
  ssr: boolean;
}

// S = State
class Store<S = any> {
  private updateListeners: TPullstateUpdateListener[] = [];
  private currentState: S;
  private readonly initialState: S;
  private ssr: boolean = false;

  constructor(initialState: S) {
    this.currentState = initialState;
    this.initialState = initialState;
  }

  _setInternalOptions({ ssr }: IStoreInternalOptions) {
    this.ssr = ssr;
  }

  _getInitialState(): S {
    return this.initialState;
  }

  _updateState(nextState: S) {
    this.currentState = nextState;
    if (!this.ssr) {
      this.updateListeners.forEach(listener => listener());
    }
  }

  _addUpdateListener(listener: TPullstateUpdateListener) {
    this.updateListeners.push(listener);
  }

  _removeUpdateListener(listener: TPullstateUpdateListener) {
    this.updateListeners = this.updateListeners.filter(f => f !== listener);
  }

  getRawState(): S {
    return this.currentState;
  }

  update(updater: (state: S) => void) {
    update(this, updater);
  }

  /*asyncUpdate(updater: (state: S) => Promise<void>): Promise<void> {
    return asyncUpdate(this, updater);
  }*/
}

/*async function asyncUpdate<S = any>(store: Store<S>, updater: (state: S) => Promise<void>): Promise<void> {
  const stateBeforeAsync: S = store._getState();
  const nextState: S = await immer(stateBeforeAsync as any, updater);
  const stateAfterAsync: S = store._getState();
  if (nextState !== stateAfterAsync) {
    store._updateState(nextState);
  }
}*/

function update<S = any>(store: Store<S>, updater: (state: S) => void) {
  const currentState: S = store.getRawState();
  const nextState: S = immer(currentState as any, updater);
  if (nextState !== currentState) {
    store._updateState(nextState);
  }
}

// S = State
// SS = Sub-state
function useStoreState<S = any>(store: Store<S>): S;
function useStoreState<S = any, SS = any>(store: Store<S>, getSubState: (state: S) => SS): SS;
function useStoreState(store: Store, getSubState?: (state) => any): any {
  const [subState, setSubState] = useState<any | null>(null);
  let shouldUpdate = true;

  function onStoreUpdate() {
    const nextSubState = getSubState ? getSubState(store.getRawState()) : store.getRawState();
    if (shouldUpdate && !shallowEqual(subState, nextSubState)) {
      setSubState(nextSubState);
    }
  }

  useEffect(() => {
    store._addUpdateListener(onStoreUpdate);

    return () => {
      shouldUpdate = false;
      store._removeUpdateListener(onStoreUpdate);
    };
  });

  if (subState === null) {
    return getSubState ? getSubState(store.getRawState()) : store.getRawState();
  }

  return subState;
}

export interface IPropsInjectStoreState<S extends any = any, SS extends any = any> {
  store: Store<S>;
  on?: (state: S) => SS;
  children: (output: SS) => React.ReactElement;
}

function InjectStoreState<S = any, SS = any>({
  store,
  on = s => s as any,
  children,
}: IPropsInjectStoreState<S, SS>): React.ReactElement {
  const state: SS = useStoreState(store, on);
  return children(state);
}

export interface IPullstateAllStores {
  [storeName: string]: Store<any>;
}

const PullstateContext = React.createContext<PullstateInstance | null>(null);

const PullstateProvider = <T extends IPullstateAllStores = IPullstateAllStores>({
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
    hydrateState = null,
    reuseStores = false,
    ssr = false,
  }: { hydrateState?: any; reuseStores?: boolean; ssr?: boolean } = {}): PullstateInstance<T> {
    if (reuseStores) {
      if (ssr) {
        console.error(`Pullstate (instantiate): Can's set { ssr: true } when using reuseStores (client-side only)`);
      }

      const instantiated = new PullstateInstance(this.allInitialStores);

      if (hydrateState != null) {
        instantiated.hydrateFromAllState(hydrateState);
      }

      return instantiated;
    }

    const newStores = {} as T;

    for (const storeName of Object.keys(this.allInitialStores)) {
      if (hydrateState == null) {
        newStores[storeName] = new Store(this.allInitialStores[storeName]._getInitialState());
      } else if (hydrateState.hasOwnProperty(storeName)) {
        newStores[storeName] = new Store(hydrateState[storeName]);
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
    // const [key, setKey] = useState(keyValue);
    // const [firstRun, setFirstRun] = useState(true);
    const [response, setResponse] = useState({ finished: true, error: false, endTags: [] });
    const pullstate = useContext(PullstateContext);

    let shouldUpdate = true;
    useEffect(() => () => {
      shouldUpdate = false;
    });

    if (pullstate._asyncContext.register.hasOwnProperty(keyValue)) {
      console.log(`Pullstate Async: [${keyValue}] Already been run - do nothing`);
      return [
        true,
        pullstate._asyncContext.register[keyValue].error,
        pullstate._asyncContext.register[keyValue].endTags as ET[],
      ];
    } else {
      console.log(`Pullstate Async: [${keyValue}] NEW async action`);
      if (typeof window === "undefined") {
        // on the server
        pullstate._asyncContext.actions[keyValue] = () => asyncAction(pullstate.stores as T);
      } else {
        // on the client
        asyncAction(pullstate.stores as T)
          .then((endTags) => {
            if (shouldUpdate) {
              setResponse({ finished: true, error: false, endTags });
            }
          })
          .catch(() => {
            if (shouldUpdate) {
              setResponse({ finished: false, error: true, endTags: [] });
            }
          });
      }
    }

    /*if (hasOrPromise === true) {
      return [false, false];
    } else if (firstRun || !shallowEqual(key, keyValue)) {
      setFirstRun(false);
      setKey(keyValue);

      if (typeof window === "undefined") {
        // on the server
        pullstate._asyncContext.registered[JSON.stringify(keyValue)] = () => hasOrPromise(pullstate.stores as T);
      } else {
        // on the client
        hasOrPromise(pullstate.stores as T)
          .then(() => {
            if (shouldUpdate) {
              setResponse({ loading: false, error: false });
            }
          })
          .catch(() => {
            if (shouldUpdate) {
              setResponse({ loading: false, error: true });
            }
          });
      }
    }*/

    // return [response.loading, response.error];
  }

  useStores() {
    return useContext(PullstateContext).stores as T;
  }

  createAsyncAction() {
    return;
  }
}

interface IPullstateAsyncRegister<ET extends string = string> {
  [key: string]: {
    error: boolean;
    endTags: ET[];
  };
}

interface IPullstateAsync<ET extends string = string> {
  register: IPullstateAsyncRegister<ET>;
  actions: {
    [key: string]: () => Promise<Array<ET>>;
  };
}

class PullstateInstance<T extends IPullstateAllStores = IPullstateAllStores> {
  private readonly _stores: T = {} as T;
  _asyncContext: IPullstateAsync = {
    // resolved: {},
    register: {},
    actions: {},
  };

  constructor(allStores: T) {
    this._stores = allStores;
  }

  getPullstateSnapshot(): { allState: { [storeName: string]: any }; asyncRegister: IPullstateAsyncRegister } {
    const allState = {};

    for (const storeName of Object.keys(this._stores)) {
      allState[storeName] = this._stores[storeName].getRawState();
    }

    return { allState, asyncRegister: this._asyncContext.register };
  }

  async resolveAsyncState() {
    const promises = Object.keys(this._asyncContext.actions).map(key =>
      this._asyncContext.actions[key]().then(endTags => {
        this._asyncContext.register[key].error = false;
        this._asyncContext.register[key].endTags = endTags;
      }).catch(e => {
        this._asyncContext.register[key].error = true;
      }).then(() => {
        console.log(`Should run after each promise error / success`);
        delete this._asyncContext.actions[key];
      })
    );

    return Promise.all(promises);
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

function createPullstate<T extends IPullstateAllStores = IPullstateAllStores>(allStores: T) {
  return new PullstateSingleton(allStores);
}

function useStores<T extends IPullstateAllStores = {}>() {
  return useContext(PullstateContext).stores as T;
}

export { useStoreState, update, Store, InjectStoreState, PullstateProvider, useStores, createPullstate };
