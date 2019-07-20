import { Store } from "./Store";
import { useEffect, useRef, useState } from "react";
import { IUpdateRef } from "./useStoreState";

let updateListenerOrd = 0;

function fastGet<S>(obj: S, path: TInternalPath<S>): any {
  return path.reduce((cur: any = obj, key: string | number) => {
    return cur[key];
  }, undefined);
}

type TInternalPath<
  S,
  K1 extends Extract<keyof S, string | number> = Extract<keyof S, string | number>,
  K2 extends Extract<keyof S[K1], string | number> = Extract<keyof S[K1], string | number>,
  K3 extends Extract<keyof S[K1][K2], string | number> = Extract<keyof S[K1][K2], string | number>,
  K4 extends Extract<keyof S[K1][K2][K3], string | number> = Extract<keyof S[K1][K2][K3], string | number>,
  K5 extends Extract<keyof S[K1][K2][K3][K4], string | number> = Extract<
    keyof S[K1][K2][K3][K4],
    string | number
  >
> = [K1] | [K1, K2] | [K1, K2, K3] | [K1, K2, K3, K4] | [K1, K2, K3, K4, K5];

export type TPaths<S> =
  | [TInternalPath<S>]
  | [TInternalPath<S>, TInternalPath<S>]
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

type TKeyStringOrNumber<P extends string | number> = P;

type TPathResponseInternal<S, P extends (string | number)[]> = P extends []
  ? null
  : P extends [keyof S]
    ? S[P[0]]
    : P extends [keyof S, keyof S[keyof S]]
      ? S[P[0]][P[1]]
      : P extends [keyof S, keyof S[keyof S], keyof S[keyof S][keyof S[keyof S]]]
        ? S[P[0]][P[1]][P[2]]
        : null;

export type TPathResponse<S, P extends (string | number)[][]> = P extends [[]]
  ? []
  : P extends [TInternalPath<S>]
    ? [TPathResponseInternal<S, P[0]>]
    : P extends [TInternalPath<S>, TInternalPath<S>]
      ? [TPathResponseInternal<S, P[0]>, TPathResponseInternal<S, P[1]>]
      : P extends [TInternalPath<S>, TInternalPath<S>, TInternalPath<S>]
        ? [TPathResponseInternal<S, P[0]>, TPathResponseInternal<S, P[1]>, TPathResponseInternal<S, P[2]>]
        : [];

function getSubStateFromPaths<S>(store: Store<S>, paths: TPaths<S>): any[] {
  const state = store.getRawState();

  const resp = [];

  for (const path of paths) {
    resp.push(fastGet(state, path));
  }

  return resp;
}

function useStoreStateOpt<S = any, P extends (string | number)[][] = TPaths<S>>(
  store: Store<S>,
  paths: TPaths<S>
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
    updateRef.current.onStoreUpdate = () => {
      setSubState(getSubStateFromPaths(store, paths));
    };
    store._addUpdateListenerOpt(updateRef.current.onStoreUpdate, updateRef.current.ordKey, paths);
  }

  useEffect(
    () => () => {
      updateRef.current.shouldUpdate = false;
      store._removeUpdateListenerOpt(updateRef.current.ordKey);
    },
    []
  );

  return subState;
}

export { useStoreStateOpt };
