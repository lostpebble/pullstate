import type { Draft } from "immer";
import { Patch } from "immer";
import { SelectorLeafSymbol } from "./static";
import { PathStringConcat, Primitive } from "./pathing.types";

/**
 * @typeParam S  The store's state
 * @param draft  The mutable store state to change during this update (uses immer, which makes use of Proxies)
 * @param original  A readonly version of the store's state, for referencing during this update
 */
export type TUpdateFunction<S> = (draft: Draft<S>, original: S) => void;

export type TStoreActionUpdate<S extends object> = (
  updater: TUpdateFunction<S> | TUpdateFunction<S>[],
  patchesCallback?: (patches: Patch[], inversePatches: Patch[]) => void
) => void;

// --- Basic Selector functions ---

// --- Mutations ---

export type TReplace<S> = (replacement: S | ((previous: S) => S)) => void;
export type TUpdatePartial<S> = (partial: Partial<S>) => void;
export type TMutate<S> = (mutator: (draft: Draft<S>, original: S) => void) => void;

// --- Array Selector functions ---

export type TListWith<S extends Array<any>> = () => TValueSelector<any>;
export type TListOfProp<S extends Array<any>, O = S extends Array<infer AO> ? AO : never> = (
  prop: keyof O
) => TValueSelector<O[keyof O]>;

// --- Object Selector functions ---

type TSelectorMutateFunctions<S> = {
  replace: TReplace<S>;
} & (S extends Primitive
  ? {}
  : {
      updatePartial: TUpdatePartial<S>;
      mutate: TMutate<S>;
    });

export type TObjectValueSelector<S> = {
  pick: <K extends keyof S>(key: K) => TValueSelector<S[K]>;
};

export type TValueSelector<S> = TSelectorMutateFunctions<S> &
  (S extends Primitive
    ? {}
    : S extends Array<any>
    ? {
        listWith: TListWith<S>;
        listOfProp: TListOfProp<S>;
      }
    : TObjectValueSelector<S>);

export type TItemMatchSelector<S> = {};

interface ISelectorDefinition<S> {
  valueSelector: TValueSelector<S>;
}

export type TSelectorTreeLeaf = {
  [SelectorLeafSymbol]?: ISelectorDefinition<any>;
  string?: TSelectorTreeLeaf;
};
