import shallowEqual from "fbjs/lib/shallowEqual";
import immer from "immer";
import React, { useEffect, useState, useContext } from "react";

export type TPullstateUpdateListener = () => void;

// S = State
class Store<S = any> {
  private updateListeners: TPullstateUpdateListener[] = [];
  private currentState: S;
  private readonly initialState: S;

  constructor(initialState: S) {
    console.log(`Constructing ${this.constructor.name}`);
    this.currentState = initialState;
    this.initialState = initialState;
  }

  _getState(): S {
    return this.currentState;
  }

  _updateState(nextState: S) {
    this.currentState = nextState;
    this.updateListeners.forEach(listener => listener());
  }

  _addUpdateListener(listener: TPullstateUpdateListener) {
    this.updateListeners.push(listener);
  }

  _removeUpdateListener(listener: TPullstateUpdateListener) {
    this.updateListeners = this.updateListeners.filter(f => f !== listener);
  }

  update(updater: (state: S) => void) {
    update(this, updater);
  }
}

function update<S = any>(store: Store<S>, updater: (state: S) => void) {
  const currentState: S = store._getState();
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
    const nextSubState = getSubState ? getSubState(store._getState()) : store._getState();
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
    return getSubState ? getSubState(store._getState()) : store._getState();
  }

  return subState;
}

export interface IPropsInjectStoreState<S extends any = any, SS extends any = any> {
  store: Store<S>;
  getSubState?: (state: S) => SS;
  children: (output: SS) => React.ReactElement;
}

function InjectStoreState<S = any, SS = any>({
  store,
  children,
  getSubState = s => s as any,
}: IPropsInjectStoreState<S, SS>) {
  const state: SS = useStoreState(store, getSubState);
  return children(state);
}

export interface IPullstateAllStores {
  [storeName: string]: Store<any>;
}

const PullstateContext = React.createContext<IPullstateAllStores>({});

const PullstateProvider = <T extends IPullstateAllStores = IPullstateAllStores>({
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

function createPullstate<T extends IPullstateAllStores = IPullstateAllStores>(allStores: T) {
  return new PullstateSingleton(allStores);
}

function useStores<T extends IPullstateAllStores = {}>() {
  return useContext(PullstateContext) as T;
}

export { useStoreState, update, Store, InjectStoreState, PullstateProvider, useStores, createPullstate };
