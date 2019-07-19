import { Store } from "./Store";
import { useCallback, useEffect, useRef, useState } from "react";
import { IUpdateRef } from "./useStoreState";

let updateListenerOrd = 0;

function getSubStateFromPaths(store: Store<any>, paths: string[][]): any {
  const state = store.getRawState();

}

// function useStoreStateOpt<S = any>(store: Store<S>): S;
function useStoreStateOpt<S = any, SS = any>(store: Store<S>, paths: string[][]): SS {
  const [subState, setSubState] = useState<any>(() =>
    getSubStateFromPaths(store, paths)
  );

  const updateRef = useRef<Partial<IUpdateRef & { ordKey: string; }>>({
    shouldUpdate: true,
    onStoreUpdate: null,
    currentSubState: null,
    ordKey: `_${updateListenerOrd++}`,
  });

  updateRef.current.currentSubState = subState;

  // const onStoreUpdate = useCallback(() => {
  //   setSubState(getSubStateFromPaths(store, paths));
  // }, []);

  if (updateRef.current.onStoreUpdate === null) {
    updateRef.current.onStoreUpdate = () => {
      setSubState(getSubStateFromPaths(store, paths));
    };
    store._addUpdateListenerOpt(updateRef.current.onStoreUpdate, updateRef.current.ordKey, paths);
  }

  useEffect(() => () => {
    updateRef.current.shouldUpdate = false;
    store._removeUpdateListenerOpt(updateRef.current.ordKey);
  }, []);

  return subState;
}
// function useStoreStateOpt(store: Store, getSubState?: (state) => any): any

export { useStoreStateOpt };
