import { Store } from "./Store";
import { useEffect, useRef, useState } from "react";
import { IUpdateRef } from "./useStoreState";
import { ObjectPath } from "./useStoreStateOpt-types";

let updateListenerOrd = 0;

function fastGet<S extends object>(obj: S, path: any[]): any {
  return path.reduce((cur: any = obj, key: string | number) => {
    return cur[key];
  }, undefined);
}

function getSubStateFromPaths<
  T extends readonly unknown[],
  S extends object = object,
  P extends ObjectPath<S, T> = T extends ObjectPath<S, T> ? T : never
>(store: Store<S>, paths: P): any[] {
  const state: any = store.getRawState();

  const resp: any[] = [];

  for (const path of paths) {
    resp.push(fastGet(state, path));
  }

  return resp;
}

function useStoreStateOpt<
  T extends readonly unknown[],
  S extends object = object,
  P extends ObjectPath<S, T> = T extends ObjectPath<S, T> ? T : never
>(store: Store<S>, paths: any) {
  const [subState, setSubState] = useState<any>(() => getSubStateFromPaths(store, paths));

  const updateRef = useRef<Partial<IUpdateRef & { ordKey: string }>>({
    shouldUpdate: true,
    onStoreUpdate: null,
    currentSubState: null,
    ordKey: `_${updateListenerOrd++}`,
  });

  updateRef.current.currentSubState = subState;

  if (updateRef.current.onStoreUpdate === null) {
    updateRef.current.onStoreUpdate = function onStoreUpdateOpt() {
      // console.log(`Running onStoreUpdate from useStoreStateOpt ${updateRef.current.ordKey}`);
      if (updateRef.current.shouldUpdate) {
        setSubState(getSubStateFromPaths(store, paths));
      }
    };
    // store._addUpdateListenerOpt(updateRef.current.onStoreUpdate, updateRef.current.ordKey!, paths);
  }

  useEffect(
    () => () => {
      // console.log(`removing opt listener ord:"${updateRef.current.ordKey}"`);
      updateRef.current.shouldUpdate = false;
      store._removeUpdateListenerOpt(updateRef.current.ordKey!);
    },
    []
  );

  return subState;
}

export { useStoreStateOpt };
