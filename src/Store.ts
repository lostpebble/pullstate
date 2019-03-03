// @ts-ignore
import { Patch } from "immer";

const Immer = require("immer");

const produce = Immer.produce;
const applyPatches = Immer.applyPatches;

export type TPullstateUpdateListener = () => void;

export interface IStoreInternalOptions {
  ssr: boolean;
}

// S = State
export class Store<S = any> {
  private updateListeners: TPullstateUpdateListener[] = [];
  private currentState: S;
  private readonly initialState: S;
  private ssr: boolean = false;

  constructor(initialState: S) {
    this.currentState = initialState;
    this.initialState = initialState;
  }

  _setInternalOptions({ ssr }: IStoreInternalOptions) {
    this.ssr = ssr;
  }

  _getInitialState(): S {
    return this.initialState;
  }

  _updateState(nextState: S) {
    this.currentState = nextState;
    if (!this.ssr) {
      this.updateListeners.forEach(listener => listener());
    }
  }

  _addUpdateListener(listener: TPullstateUpdateListener) {
    this.updateListeners.push(listener);
  }

  _removeUpdateListener(listener: TPullstateUpdateListener) {
    this.updateListeners = this.updateListeners.filter(f => f !== listener);
  }

  getRawState(): S {
    return this.currentState;
  }

  update(updater: (state: S, original?: S) => void, patchesCallback?: (patches: Patch[], inversePatches: Patch[]) => void) {
    update(this, updater, patchesCallback);
  }

  applyPatches(patches: Patch[]) {
    applyPatchesToStore(this, patches);
  }
}

export function applyPatchesToStore<S = any>(store: Store<S>, patches: Patch[]) {
  const currentState: S = store.getRawState();
  const nextState = applyPatches(currentState, patches);
  if (nextState !== currentState) {
    store._updateState(nextState);
  }
}

export function update<S = any>(store: Store<S>, updater: (draft: S, original?: S) => void, patchesCallback?: (patches: Patch[], inversePatches: Patch[]) => void) {
  const currentState: S = store.getRawState();
  const nextState: S = produce(currentState as any, (s) => updater(s, currentState), patchesCallback);
  if (nextState !== currentState) {
    store._updateState(nextState);
  }
}
