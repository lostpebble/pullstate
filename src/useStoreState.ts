const isEqual = require("fast-deep-equal/es6");

// S = State
// SS = Sub-state
import { useEffect, useRef, useState } from "react";
import { Store } from "./Store";

export interface IUpdateRef {
  shouldUpdate: boolean;
  onStoreUpdate: (() => void) | null;
  getSubState: any;
  currentSubState: any;
}

function useStoreState<S = any>(store: Store<S>): S;
function useStoreState<S = any, SS = any>(store: Store<S>, getSubState: (state: S) => SS, deps?: ReadonlyArray<any>): SS;
function useStoreState(store: Store, getSubState?: (state) => any, deps?: ReadonlyArray<any>): any {
  const [subState, setSubState] = useState<any>(() =>
    getSubState ? getSubState(store.getRawState()) : store.getRawState()
  );

  const updateRef = useRef<IUpdateRef>({
    shouldUpdate: true,
    onStoreUpdate: null,
    getSubState,
    currentSubState: null,
  });

  updateRef.current.currentSubState = subState;
  updateRef.current.getSubState = getSubState;

  if (updateRef.current.onStoreUpdate === null) {
    updateRef.current.onStoreUpdate = function onStoreUpdate() {
      const nextSubState = updateRef.current.getSubState ? updateRef.current.getSubState(store.getRawState()) : store.getRawState();
      if (updateRef.current.shouldUpdate && !isEqual(updateRef.current.currentSubState, nextSubState)) {
        // final check again before actually running state update (might prevent no-op errors with React)
        if (updateRef.current.shouldUpdate) {
          setSubState(nextSubState);
        }
      }
    };
  }

  useEffect(() => {
    updateRef.current.shouldUpdate = true;
    store._addUpdateListener(updateRef.current.onStoreUpdate!);

    return () => {
      updateRef.current.shouldUpdate = false;
      store._removeUpdateListener(updateRef.current.onStoreUpdate!);
    };
  }, []);

  if (deps !== undefined) {
    const prevDeps = useRef<ReadonlyArray<any>>(deps);
    if (!isEqual(deps, prevDeps)) {
      updateRef.current.getSubState = getSubState;
      updateRef.current.currentSubState = getSubState!(store.getRawState());
    }
  }

  return updateRef.current.currentSubState;
}

export { useStoreState };
