import { Store } from "./Store";
import { useEffect, useRef, useState } from "react";
import { IUpdateRef } from "./useStoreState";

let updateListenerOrd = 0;

function fastGet<S>(obj: S, path: any[]): any {
  return path.reduce((cur: any = obj, key: string | number) => {
    return cur[key];
  }, undefined);
}

export type TPath = (string|number|symbol)[];

/*
type TOneKey<S, K1 extends keyof S = keyof S> = [K1];
type TTwoKey<S, K1 extends keyof S = keyof S, S2 extends any = S[K1], K2 extends keyof S2 = keyof S2> = [K1, K2];
type TThreeKey<
  S,
  K1 extends keyof S = keyof S,
  K2 extends keyof S[K1] = keyof S[K1],
  K3 extends keyof S[K1][K2] = keyof S[K1][K2]
> = [K1, K2, K3];



interface ITestStoreInterface {
  count: number;
  something: {
    good: {
      here: boolean;
      other: string;
    };
  };
}

export type TPaths<S> =
  | [TInternalPath<S>]
  | [TInternalPath<S>, TInternalPath<S>]
  | [TInternalPath<S>, TInternalPath<S>, TInternalPath<S>]
  | [TInternalPath<S>, TInternalPath<S>, TInternalPath<S>, TInternalPath<S>]
  | [TInternalPath<S>, TInternalPath<S>, TInternalPath<S>, TInternalPath<S>, TInternalPath<S>]
  | [
      TInternalPath<S>,
      TInternalPath<S>,
      TInternalPath<S>,
      TInternalPath<S>,
      TInternalPath<S>,
      TInternalPath<S>
    ];

type TPathResponseInternal<S, P extends TInternalPath<S>> = P extends []
  ? null
  : P extends [keyof S]
    ? S[P[0]]
    : P extends [keyof S, keyof S[keyof S]]
      ? S[P[0]][P[1]]
      : P extends [keyof S, keyof S[keyof S], keyof S[keyof S][keyof S[keyof S]]]
        ? S[P[0]][P[1]][P[2]]
        : null;

export type TPathResponse<S, P extends (string | number | symbol)[][]> = P extends [[]]
  ? []
  : P extends [TInternalPath<S>]
    ? [TPathResponseInternal<S, P[0]>]
    : P extends [TInternalPath<S>, TInternalPath<S>]
      ? [TPathResponseInternal<S, P[0]>, TPathResponseInternal<S, P[1]>]
      : P extends [TInternalPath<S>, TInternalPath<S>, TInternalPath<S>]
        ? [TPathResponseInternal<S, P[0]>, TPathResponseInternal<S, P[1]>, TPathResponseInternal<S, P[2]>]
        : [];*/

function getSubStateFromPaths<S, P extends TPath[]>(store: Store<S>, paths: P): any[] {
  const state = store.getRawState();

  const resp = [];

  for (const path of paths) {
    resp.push(fastGet(state, path));
  }

  return resp;
}

function useStoreStateOpt<S = any>(
  store: Store<S>,
  paths: TPath[]
): any[] {
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
