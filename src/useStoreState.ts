const isEqual = require("fast-deep-equal");

// S = State
// SS = Sub-state
import { useCallback, useEffect, useRef, useState } from "react";
import { Store } from "./Store";

interface IUpdateRef {
  shouldUpdate: boolean;
  onStoreUpdate: () => void;
  getSubState: any;
  currentSubState: any;
}

function useStoreState<S = any>(store: Store<S>): S;
function useStoreState<S = any, SS = any>(store: Store<S>, getSubState: (state: S) => SS): SS;
function useStoreState(store: Store, getSubState?: (state) => any): any {
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

  const onStoreUpdate = useCallback(() => {
    const nextSubState = updateRef.current.getSubState ? updateRef.current.getSubState(store.getRawState()) : store.getRawState();
    if (updateRef.current.shouldUpdate && !isEqual(updateRef.current.currentSubState, nextSubState)) {
      setSubState(nextSubState);
    }
  }, []);

  if (updateRef.current.onStoreUpdate === null) {
    updateRef.current.onStoreUpdate = onStoreUpdate;
    store._addUpdateListener(updateRef.current.onStoreUpdate);
  }

  useEffect(() => () => {
      updateRef.current.shouldUpdate = false;
      store._removeUpdateListener(onStoreUpdate);
  }, []);

  return subState;
}

export { useStoreState };
