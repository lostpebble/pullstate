// @ts-ignore
import { Patch } from "immer";

const Immer = require("immer");

const produce = Immer.produce;
const applyPatches = Immer.applyPatches;

export type TPullstateUpdateListener = () => void;

export interface IStoreInternalOptions<S> {
  ssr: boolean;
  reactionCreators?: TReactionCreator<S>[];
}

type TUpdateFunction<S> = (draft: S, original: S) => void;
type TReactionFunction<S, T> = (draft: S, original: S, watched: T) => void;
type TRunReactionFunction = () => void;
type TReactionCreator<S> = (store: Store<S>) => TRunReactionFunction;

function makeReactionFunctionCreator<S, T>(watch: (state: S) => T, reaction: TReactionFunction<S, T>): TReactionCreator<S> {
  return (store) => {
    let lastWatchState: T = watch(store.getRawState());

    return () => {
      const currentState = store.getRawState();
      const nextWatchState = watch(currentState);

      if (nextWatchState !== lastWatchState) {
        lastWatchState = nextWatchState;
        const nextState: S = produce(currentState as any, (s) => reaction(s, currentState, nextWatchState));
        if (nextState !== currentState) {
          store._updateStateWithoutReaction(nextState);
        }
      }
    }
  }
}

export interface IStoreOptions {
  usingProvider?: boolean;
}

// S = State
export class Store<S = any> {
  private updateListeners: TPullstateUpdateListener[] = [];
  private currentState: S;
  private readonly initialState: S;
  private readonly usingProvider: boolean = false;
  private ssr: boolean = false;
  private reactions: TRunReactionFunction[] = [];
  private reactionCreators: TReactionCreator<S>[] = [];

  constructor(initialState: S, { usingProvider = false }: IStoreOptions = {}) {
    this.currentState = initialState;
    this.initialState = initialState;
    this.usingProvider = usingProvider;
  }

  _setInternalOptions({ ssr, reactionCreators = [] }: IStoreInternalOptions<S>) {
    this.ssr = ssr;
    this.reactionCreators = reactionCreators;
    this.reactions = reactionCreators.map(rc => rc(this));
  }

  _getReactionCreators(): TReactionCreator<S>[] {
    return this.reactionCreators;
  }

  _instantiateReactions() {
    this.reactions = this.reactionCreators.map(rc => rc(this));
  }

  _getInitialState(): S {
    return this.initialState;
  }

  _updateStateWithoutReaction(nextState: S) {
    this.currentState = nextState;
  }

  _updateState(nextState: S) {
    this.currentState = nextState;

    for (const runReaction of this.reactions) {
      runReaction();
    }

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

  createReaction<T>(watch: (state: S) => T, reaction: TReactionFunction<S, T>) {
    const creator = makeReactionFunctionCreator(watch, reaction);
    this.reactionCreators.push(creator);
    if (!this.usingProvider) {
      this.reactions.push(creator(this));
    }
  }

  getRawState(): S {
    return this.currentState;
  }

  update(updater: TUpdateFunction<S>, patchesCallback?: (patches: Patch[], inversePatches: Patch[]) => void) {
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

export function update<S = any>(store: Store<S>, updater: TUpdateFunction<S>, patchesCallback?: (patches: Patch[], inversePatches: Patch[]) => void) {
  const currentState: S = store.getRawState();
  const nextState: S = produce(currentState as any, (s) => updater(s, currentState), patchesCallback);
  if (nextState !== currentState) {
    store._updateState(nextState);
  }
}
