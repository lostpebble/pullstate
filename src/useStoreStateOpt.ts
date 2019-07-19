import { Store } from "./Store";
import { useEffect, useRef, useState } from "react";
import { IUpdateRef } from "./useStoreState";

let updateListenerOrd = 0;

function fastGet(obj, path: (string|number)[]): any {
  return path.reduce((cur = obj, key: string) => {
    return cur[key];
  }, undefined);
}

function getSubStateFromPaths(store: Store<any>, paths: (string|number)[][]): any[] {
  const state = store.getRawState();

  const resp = [];

  for (const path of paths) {
    resp.push(fastGet(state, path));
  }

  return resp;
}

function useStoreStateOpt<S = any>(store: Store<S>, paths: (string|number)[][]): any[] {
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

export { useStoreStateOpt };
