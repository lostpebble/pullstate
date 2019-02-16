import shallowEqual from "fbjs/lib/shallowEqual";
import immer from "immer";
import { useEffect, useState } from "react";

export type TUpdateListener = () => void;

// S = State
class Store<S = any> {
  private updateListeners: TUpdateListener[] = [];
  private currentState: S;
  private readonly initialState: S;

  constructor(initialState: S) {
    this.currentState = initialState;
    this.initialState = initialState;
  }

  getState(): S {
    return this.currentState;
  }

  updateState(nextState: S) {
    this.currentState = nextState;
    this.updateListeners.forEach(listener => listener());
  }

  addUpdateListener(listener: TUpdateListener) {
    this.updateListeners.push(listener);
  }

  removeUpdateListener(listener: TUpdateListener) {
    this.updateListeners = this.updateListeners.filter(f => f !== listener);
  }

  resetStore() {
    this.currentState = this.initialState;
  }
}

function update<S = any>(store: Store<S>, updater: (state: S) => void) {
  const currentState: S = store.getState();
  const nextState: S = immer(currentState as any, updater);
  if (nextState !== currentState) {
    store.updateState(nextState);
  }
}

// S = State
// SS = Sub-state
function useStore<S = any>(store: Store<S>): S;
function useStore<S = any, SS = any>(store: Store<S>, getSubState: (state: S) => SS): SS;
function useStore(store: Store, getSubState?: (state) => any): any {
  const [subState, setSubState] = useState<any | null>(null);
  let shouldUpdate = true;

  function onStoreUpdate() {
    const nextSubState = getSubState ? getSubState(store.getState()) : store.getState();
    if (shouldUpdate && !shallowEqual(subState, nextSubState)) {
      setSubState(nextSubState);
    }
  }

  useEffect(() => {
    store.addUpdateListener(onStoreUpdate);

    return () => {
      shouldUpdate = false;
      store.removeUpdateListener(onStoreUpdate);
    };
  });

  if (subState === null) {
    return getSubState ? getSubState(store.getState()) : store.getState();
  }

  return subState;
}

export { useStore, update, Store };
