const shallowEqual = require("fbjs/lib/shallowEqual");

// S = State
// SS = Sub-state
import { useEffect, useState } from "react";
import { Store } from "./Store";

function useStoreState<S = any>(store: Store<S>): S;
function useStoreState<S = any, SS = any>(store: Store<S>, getSubState: (state: S) => SS): SS;
function useStoreState(store: Store, getSubState?: (state) => any): any {
  const [subState, setSubState] = useState<any>(() =>
    getSubState ? getSubState(store.getRawState()) : store.getRawState()
  );
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
  }, [getSubState]);

  return subState;
}

export { useStoreState };
