import { Store } from "./Store";
import { useEffect, useRef, useState } from "react";
import { IUpdateRef } from "./useStoreState";
import { ArrayHasIndex, DeepKeyOfArray, DeepTypeOfArray } from "./useStoreStateOpt-types";

let updateListenerOrd = 0;

function fastGet<S>(obj: S, path: any[]): any {
  return path.reduce((cur: any = obj, key: string | number) => {
    return cur[key];
  }, undefined);
}

function getSubStateFromPaths<S, P extends DeepKeyOfArray<S>[]>(store: Store<S>, paths: P): any[] {
  const state = store.getRawState();

  const resp = [];

  for (const path of paths) {
    resp.push(fastGet(state, path));
  }

  return resp;
}

// prettier-ignore
function useStoreStateOpt<
  S,
  P extends
    | [DeepKeyOfArray<S>]
    | [DeepKeyOfArray<S>, DeepKeyOfArray<S>]
    | [DeepKeyOfArray<S>, DeepKeyOfArray<S>, DeepKeyOfArray<S>]
    | [DeepKeyOfArray<S>, DeepKeyOfArray<S>, DeepKeyOfArray<S>, DeepKeyOfArray<S>]
    | [DeepKeyOfArray<S>, DeepKeyOfArray<S>, DeepKeyOfArray<S>, DeepKeyOfArray<S>, DeepKeyOfArray<S>]
    | [DeepKeyOfArray<S>, DeepKeyOfArray<S>, DeepKeyOfArray<S>, DeepKeyOfArray<S>, DeepKeyOfArray<S>, DeepKeyOfArray<S>]
    | [DeepKeyOfArray<S>, DeepKeyOfArray<S>, DeepKeyOfArray<S>, DeepKeyOfArray<S>, DeepKeyOfArray<S>, DeepKeyOfArray<S>, DeepKeyOfArray<S>]
    | [DeepKeyOfArray<S>, DeepKeyOfArray<S>, DeepKeyOfArray<S>, DeepKeyOfArray<S>, DeepKeyOfArray<S>, DeepKeyOfArray<S>, DeepKeyOfArray<S>, DeepKeyOfArray<S>]
    | [DeepKeyOfArray<S>, DeepKeyOfArray<S>, DeepKeyOfArray<S>, DeepKeyOfArray<S>, DeepKeyOfArray<S>, DeepKeyOfArray<S>, DeepKeyOfArray<S>, DeepKeyOfArray<S>, DeepKeyOfArray<S>]
    | [DeepKeyOfArray<S>, DeepKeyOfArray<S>, DeepKeyOfArray<S>, DeepKeyOfArray<S>, DeepKeyOfArray<S>, DeepKeyOfArray<S>, DeepKeyOfArray<S>, DeepKeyOfArray<S>, DeepKeyOfArray<S>, DeepKeyOfArray<S>]
>(
  store: Store<S>,
  paths: P
): [
  DeepTypeOfArray<S, P[0]>]
  | [DeepTypeOfArray<S, P[0]>, DeepTypeOfArray<S, P[1]>]
  | [DeepTypeOfArray<S, P[0]>, DeepTypeOfArray<S, P[1]>, DeepTypeOfArray<S, P[2]>] {
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
      setSubState(getSubStateFromPaths(store, paths));
    };
    store._addUpdateListenerOpt(updateRef.current.onStoreUpdate, updateRef.current.ordKey, paths);
  }

  useEffect(
    () => () => {
      // console.log(`removing opt listener ord:"${updateRef.current.ordKey}"`);
      updateRef.current.shouldUpdate = false;
      store._removeUpdateListenerOpt(updateRef.current.ordKey);
    },
    []
  );

  return subState;
}

export { useStoreStateOpt };

/*const obj = {
  inner: {
    something: "great",
    innerTwo: {
      isIt: true,
    },
  },
  innerArr: [{
    bogus: true,
  }],
};

const store = new Store(obj);

const [inner, innerTwo] = useStoreStateOpt(store, [
  ["inner", "something"],
  ["inner", "innerTwo", "isIt"]
]);*/

// if (inner === false) {
//
// }
//
// if (innerTwo.isIt) {
// }
