// @ts-ignore
import { applyPatches, Draft, enablePatches, Patch, PatchListener, produce, produceWithPatches } from "immer";
import { useStoreState } from "./useStoreState";

import { globalClientState } from "./globalClientState";
import { PathString, PathValue } from "./pathing.types";
import { TValueSelector, TSelectorTreeLeaf } from "./Store.types";

enablePatches();

export type TPullstateUpdateListener = () => void;

export interface IStoreInternalOptions<S extends object> {
  ssr: boolean;
}

/**
 * @typeParam S  Your store's state interface
 */
export class Store<S extends object = object> {
  private currentState: S;
  private readonly initialState: S;
  private readonly createInitialState: () => S;
  private internalOrdId: number;
  private batchState: S | undefined;
  private ssr: boolean = false;

  private selectorTree: TSelectorTreeLeaf = {};

  constructor(initialState: S | (() => S)) {
    if (initialState instanceof Function) {
      const state: S = initialState();
      this.currentState = state;
      this.initialState = state;
      this.createInitialState = initialState;
    } else {
      this.currentState = initialState;
      this.initialState = initialState;
      this.createInitialState = () => initialState;
    }
    this.internalOrdId = globalClientState.storeOrdinal++;
  }

  private _ensureSelector(pathParts: string[]): TValueSelector<PathValue<S, TPath>> {}

  select<TPath extends PathString<S>>(path: TPath): TValueSelector<PathValue<S, TPath>> {
    const pathParts = path.split(".");
    return this._ensureSelector(pathParts);
  }

  applyPatches(patches: Patch[]) {
    // applyPatchesToStore(this, patches);
  }
}
