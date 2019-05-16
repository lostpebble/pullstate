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
type TReactionFunction<S, T> = (watched: T, draft: S, original: S) => void;
type TRunReactionFunction = () => void;
type TReactionCreator<S> = (store: Store<S>) => TRunReactionFunction;

function makeSubscriptionFunction<S, T>(
  store: Store<S>,
  watch: (state: S) => T,
  listener: (watched: T, allState: S) => void
): TRunReactionFunction {
  let lastWatchState: T = watch(store.getRawState());

  return () => {
    const currentState = store.getRawState();
    const nextWatchState = watch(currentState);

    if (nextWatchState !== lastWatchState) {
      lastWatchState = nextWatchState;
      listener(nextWatchState, currentState);
    }
  };
}

function makeReactionFunctionCreator<S, T>(
  watch: (state: S) => T,
  reaction: TReactionFunction<S, T>
): TReactionCreator<S> {
  return store => {
    let lastWatchState: T = watch(store.getRawState());

    return () => {
      const currentState = store.getRawState();
      const nextWatchState = watch(currentState);

      if (nextWatchState !== lastWatchState) {
        lastWatchState = nextWatchState;
        store._updateStateWithoutReaction(
          produce(currentState as any, s => reaction(nextWatchState, s, currentState))
        );
      }
    };
  };
}

// S = State
export class Store<S = any> {
  private updateListeners: TPullstateUpdateListener[] = [];
  private currentState: S;
  private readonly initialState: S;
  // private readonly usingProvider: boolean = false;
  private ssr: boolean = false;
  private reactions: TRunReactionFunction[] = [];
  private clientSubscriptions: TRunReactionFunction[] = [];
  private reactionCreators: TReactionCreator<S>[] = [];

  constructor(initialState: S) {
    this.currentState = initialState;
    this.initialState = initialState;
    // this.usingProvider = usingProvider;
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
      for (const runSubscription of this.clientSubscriptions) {
        runSubscription();
      }
      this.updateListeners.forEach(listener => listener());
    }
  }

  _addUpdateListener(listener: TPullstateUpdateListener) {
    this.updateListeners.push(listener);
  }

  _removeUpdateListener(listener: TPullstateUpdateListener) {
    this.updateListeners = this.updateListeners.filter(f => f !== listener);
  }

  subscribe<T>(watch: (state: S) => T, listener: (watched: T, allState: S) => void): () => void {
    if (!this.ssr) {
      const func = makeSubscriptionFunction(this, watch, listener);
      this.clientSubscriptions.push(func);
      return () => {
        this.clientSubscriptions = this.clientSubscriptions.filter(f => f !== func);
      }
    }

    return () => {
      console.warn(
        `Subscriptions made on the server side are not registered - so therefor this call to unsubscribe does nothing.`
      );
    };
  }

  createReaction<T>(watch: (state: S) => T, reaction: TReactionFunction<S, T>): () => void {
    const creator = makeReactionFunctionCreator(watch, reaction);
    this.reactionCreators.push(creator);
    const func = creator(this);
    this.reactions.push(func);
    return () => {
      this.reactions = this.reactions.filter(f => f !== func);
    };
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

export function update<S = any>(
  store: Store<S>,
  updater: TUpdateFunction<S>,
  patchesCallback?: (patches: Patch[], inversePatches: Patch[]) => void
) {
  const currentState: S = store.getRawState();
  const nextState: S = produce(currentState as any, s => updater(s, currentState), patchesCallback);
  if (nextState !== currentState) {
    store._updateState(nextState);
  }
}
