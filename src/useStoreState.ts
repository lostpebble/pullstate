const isEqual = require("fast-deep-equal/es6");

// S = State
// SS = Sub-state
import { useEffect, useState } from "react";
import { Store } from "./Store";

export interface IUpdateRef {
  shouldUpdate: boolean;
  onStoreUpdate: (() => void) | null;
  getSubState: any;
  currentSubState: any;
}

function useStoreState<S = any>(store: Store<S>): S;
function useStoreState<S = any, SS = any>(
  store: Store<S>,
  getSubState: (state: S) => SS,
  deps?: ReadonlyArray<any>
): SS;
function useStoreState(
  store: Store,
  getSubState: (state: any) => any = state => state,
  deps: ReadonlyArray<any> = []
): any {
  const [subState, setSubState] = useState<any>(() => getSubState(store.getRawState()));

  useEffect(() => {
    let currentSubState = subState;

    function onStoreUpdate() {
      const nextSubState = getSubState(store.getRawState());
      if (!isEqual(currentSubState, nextSubState)) {
        setSubState(nextSubState);
        currentSubState = nextSubState;
      }
    }

    store._addUpdateListener(onStoreUpdate);
    return () => store._removeUpdateListener(onStoreUpdate);
  }, deps);

  return subState;
}

export { useStoreState };
