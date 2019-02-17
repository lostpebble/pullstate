import shallowEqual from "fbjs/lib/shallowEqual";
import immer from "immer";
import React, { useEffect, useState } from "react";
import { createPullstate, useStores, PullstateProvider } from "./serverRenderingUtils";

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

export { useStoreState, update, Store, InjectStoreState, PullstateProvider, useStores, createPullstate };
