import { Store } from "./Store";
import { useEffect, useRef, useState } from "react";
import { IUpdateRefNew } from "./useStoreState";
import { DeepKeyOfArray, DeepTypeOfArray, TAllPathsParameter } from "./useStoreStateOpt-types";

/**
 * @internal
 */
let updateListenerOrd = 0;

/**
 * @internal
 *
 * @param obj
 * @param path
 */
function fastGet<S extends object>(obj: S, path: any[]): any {
  return path.reduce((cur: any = obj, key: string | number) => {
    return cur[key];
  }, undefined);
}

/**
 * @internal
 *
 * @param store
 * @param paths
 */
function getSubStateFromPaths<S extends object, P extends DeepKeyOfArray<S>[]>(store: Store<S>, paths: P): any[] {
  const state: any = store.getRawState();

  const resp: any[] = [];

  for (const path of paths) {
    resp.push(fastGet(state, path));
  }

  return resp;
}

/**
 * @deprecated
 * @internal
 *
 * @param store
 * @param paths
 */
function useStoreStateOpt<S extends object, P extends TAllPathsParameter<S>>(
  store: Store<S>,
  paths: P
): [
  DeepTypeOfArray<S, P[0]>,
  DeepTypeOfArray<S, P[1]>,
  DeepTypeOfArray<S, P[2]>,
  DeepTypeOfArray<S, P[3]>,
  DeepTypeOfArray<S, P[4]>,
  DeepTypeOfArray<S, P[5]>,
  DeepTypeOfArray<S, P[6]>,
  DeepTypeOfArray<S, P[7]>,
  DeepTypeOfArray<S, P[8]>,
  DeepTypeOfArray<S, P[9]>,
  DeepTypeOfArray<S, P[10]>
] {
  // const [subState, setSubState] = useState<any>(() => getSubStateFromPaths(store, paths));

  const updateRef = useRef<IUpdateRefNew & { ordKey: string }>({
    initialized: false,
    state: undefined,
    ordKey: `_${updateListenerOrd++}`
  });

  if (!updateRef.current.initialized) {
    updateRef.current.state = getSubStateFromPaths(store, paths);
    updateRef.current.initialized = true;
  }

  // useState with only a simple value to prevent double equality checks for the state
  const [, setUpdateTrigger] = useState(0);

  useEffect(() => {
    const effectState = { shouldUpdate: true };

    function update() {
      if (effectState.shouldUpdate) {
        updateRef.current.state = getSubStateFromPaths(store, paths);
        setUpdateTrigger((val) => val + 1);
      }
    }

    store._addUpdateListenerOpt(update, updateRef.current.ordKey!, paths);

    return () => {
      effectState.shouldUpdate = false;
      store._removeUpdateListenerOpt(updateRef.current.ordKey!);
    };
  }, paths);

  /*updateRef.current.currentSubState = subState;

  if (updateRef.current.onStoreUpdate === null) {
    updateRef.current.onStoreUpdate = function onStoreUpdateOpt() {
      // console.log(`Running onStoreUpdate from useStoreStateOpt ${updateRef.current.ordKey}`);
      if (updateRef.current.shouldUpdate) {
        setSubState(getSubStateFromPaths(store, paths));
      }
    };
    store._addUpdateListenerOpt(updateRef.current.onStoreUpdate, updateRef.current.ordKey!, paths);
  }

  useEffect(
    () => () => {
      // console.log(`removing opt listener ord:"${updateRef.current.ordKey}"`);
      updateRef.current.shouldUpdate = false;
      store._removeUpdateListenerOpt(updateRef.current.ordKey!);
    },
    []
  );*/

  return updateRef.current.state;
}

export { useStoreStateOpt };
