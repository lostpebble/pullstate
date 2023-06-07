import React from "react";
import { Store } from "./Store";
import { useStoreStateOpt } from "./useStoreStateOpt";
import { ObjectPath } from "./useStoreStateOpt-types";
import type { GetWithPath } from "type-fest/get";

export interface IPropsInjectStoreStateOpt<
  T extends readonly unknown[],
  S extends object = object,
  P extends ObjectPath<S, T> = T extends ObjectPath<S, T> ? T : never
> {
  store: Store<S>;
  paths: P;
  children: (output: GetWithPath<S, P>) => React.ReactElement;
}

/*
import { DeepTypeOfArray, TAllPathsParameter } from "./useStoreStateOpt-types";

export interface IPropsInjectStoreStateOpt<
  S extends object = object,
  P extends TAllPathsParameter<S> = TAllPathsParameter<S>,
  O extends [
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
  ] = [
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
  ]
> {
  store: Store<S>;
  paths: P;
  children: (output: O) => React.ReactElement;
}*/

export function InjectStoreStateOpt<
  T extends readonly unknown[],
  S extends object = object,
  P extends ObjectPath<S, T> = T extends ObjectPath<S, T> ? T : never
>({ store, paths, children }: IPropsInjectStoreStateOpt<T, S, P>): React.ReactElement {
  const state = useStoreStateOpt(store, paths) as GetWithPath<S, P>;
  return children(state);
}
