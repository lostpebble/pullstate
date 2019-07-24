// @ts-ignore
import { Patch } from "immer";
import { useStoreState } from "./useStoreState";
import { DeepKeyOfArray } from "./useStoreStateOpt-types";

const isEqual = require("fast-deep-equal");

const Immer = require("immer");

const produce = Immer.produce;
const applyPatches = Immer.applyPatches;

export type TPullstateUpdateListener = () => void;

export interface IStoreInternalOptions<S> {
  ssr: boolean;
  reactionCreators?: TReactionCreator<S>[];
}

export type TUpdateFunction<S> = (draft: S, original: S) => void;
type TReactionFunction<S, T> = (watched: T, draft: S, original: S, previousWatched: T) => void;
type TRunReactionFunction = () => string[];
type TRunSubscriptionFunction = () => void;
type TReactionCreator<S> = (store: Store<S>) => TRunReactionFunction;

function makeSubscriptionFunction<S, T>(
  store: Store<S>,
  watch: (state: S) => T,
  listener: (watched: T, allState: S, previousWatched: T) => void
): TRunSubscriptionFunction {
  let lastWatchState: T = watch(store.getRawState());

  return () => {
    const currentState = store.getRawState();
    const nextWatchState = watch(currentState);

    if (!isEqual(nextWatchState, lastWatchState)) {
      listener(nextWatchState, currentState, lastWatchState);
      lastWatchState = nextWatchState;
    }
  };
}

function makeReactionFunctionCreator<S, T>(
  watch: (state: S) => T,
  reaction: TReactionFunction<S, T>
): TReactionCreator<S> {
  return (store) => {
    let lastWatchState: T = watch(store.getRawState());

    return () => {
      const currentState = store.getRawState();
      const nextWatchState = watch(currentState);

      if (!isEqual(nextWatchState, lastWatchState)) {
        if (store._optListenerCount > 0) {
          let changePatches: Patch[];

          store._updateStateWithoutReaction(
            produce(currentState as any, s => reaction(nextWatchState, s, currentState, lastWatchState), (patches, inversePatches) => {
              changePatches = patches;
            })
          );
          lastWatchState = nextWatchState;

          if (changePatches.length > 0) {
            return getChangedPathsFromPatches(changePatches);
          }
        }

        store._updateStateWithoutReaction(
          produce(currentState as any, s => reaction(nextWatchState, s, currentState, lastWatchState))
        );
        lastWatchState = nextWatchState;
      }

      return [];
    };
  };
}

const optPathDivider = "~._.~";

// S = State
export class Store<S = any> {
  private updateListeners: TPullstateUpdateListener[] = [];
  private currentState: S;
  private readonly initialState: S;
  private ssr: boolean = false;
  private reactions: TRunReactionFunction[] = [];
  private clientSubscriptions: TRunSubscriptionFunction[] = [];
  private reactionCreators: TReactionCreator<S>[] = [];

  // Optimized listener / updates stuff
  private optimizedUpdateListeners: {
    [listenerOrd: string]: TPullstateUpdateListener;
  } = {};
  private optimizedUpdateListenerPaths: {
    [listenerOrd: string]: string[];
  } = {};
  private optimizedListenerPropertyMap: {
    [pathKey: string]: string[];
  } = {};
  public _optListenerCount = 0;

  constructor(initialState: S) {
    this.currentState = initialState;
    this.initialState = initialState;
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

  _updateState(nextState: S, updateKeyedPaths: string[] = []) {
    this.currentState = nextState;

    for (const runReaction of this.reactions) {
      updateKeyedPaths.push(...runReaction());
    }

    if (!this.ssr) {
      for (const runSubscription of this.clientSubscriptions) {
        runSubscription();
      }
      this.updateListeners.forEach(listener => listener());

      if (updateKeyedPaths.length > 0) {
        // console.log(`Got update keyed paths: "${updateKeyedPaths.join(`", "`)}"`);
        const updateOrds = new Set<string>();

        for (const keyedPath of updateKeyedPaths) {
          if (this.optimizedListenerPropertyMap[keyedPath]) {
            for (const ord of this.optimizedListenerPropertyMap[keyedPath]) {
              updateOrds.add(ord);
            }
          }
        }

        for (const ord of updateOrds.values()) {
          // console.log(`Need to notify opt listener with ord: ${ord}`);
          this.optimizedUpdateListeners[ord]();
        }
      }
    }
  }

  _addUpdateListener(listener: TPullstateUpdateListener) {
    this.updateListeners.push(listener);
  }

  _addUpdateListenerOpt(listener: TPullstateUpdateListener, ordKey: string, paths: DeepKeyOfArray<S>[]) {
    this.optimizedUpdateListeners[ordKey] = listener;
    const listenerPathsKeyed = paths.map(path => path.join(optPathDivider));
    this.optimizedUpdateListenerPaths[ordKey] = listenerPathsKeyed;

    for (const keyedPath of listenerPathsKeyed) {
      if (this.optimizedListenerPropertyMap[keyedPath] == null) {
        this.optimizedListenerPropertyMap[keyedPath] = [ordKey];
      } else {
        this.optimizedListenerPropertyMap[keyedPath].push(ordKey);
      }
    }

    this._optListenerCount++;
  }

  _removeUpdateListener(listener: TPullstateUpdateListener) {
    this.updateListeners = this.updateListeners.filter(f => f !== listener);
  }

  _removeUpdateListenerOpt(ordKey: string) {
    const listenerPathsKeyed = this.optimizedUpdateListenerPaths[ordKey];

    for (const keyedPath of listenerPathsKeyed) {
      this.optimizedListenerPropertyMap[keyedPath] = this.optimizedListenerPropertyMap[keyedPath].filter(
        ord => ord !== ordKey
      );
    }

    delete this.optimizedUpdateListenerPaths[ordKey];
    delete this.optimizedUpdateListeners[ordKey];

    this._optListenerCount--;
  }

  subscribe<T>(
    watch: (state: S) => T,
    listener: (watched: T, allState: S, previousWatched: T) => void
  ): () => void {
    if (!this.ssr) {
      const func = makeSubscriptionFunction(this, watch, listener);
      this.clientSubscriptions.push(func);
      return () => {
        this.clientSubscriptions = this.clientSubscriptions.filter(f => f !== func);
      };
    }

    return () => {
      console.warn(
        `Pullstate: Subscriptions made on the server side are not registered - so therefor this call to unsubscribe does nothing.`
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

  useState<S = any>(): S;
  useState<S = any, SS = any>(getSubState: (state: S) => SS): SS;
  useState(getSubState?: (state) => any): any {
    return useStoreState(this, getSubState);
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

function getChangedPathsFromPatches(changePatches: Patch[]): string[] {
  const updateKeyedPathsMap: { [path: string]: 1 } = {};

  for (const patch of changePatches) {
    let curKey;

    for (const p of patch.path) {
      if (curKey) {
        curKey = `${curKey}${optPathDivider}${p}`;
      } else {
        curKey = p;
      }

      updateKeyedPathsMap[curKey] = 1;
    }
  }

  return Object.keys(updateKeyedPathsMap);
}

export function update<S = any>(
  store: Store<S>,
  updater: TUpdateFunction<S>,
  patchesCallback?: (patches: Patch[], inversePatches: Patch[]) => void
) {
  const currentState: S = store.getRawState();

  if (store._optListenerCount > 0) {
    let changePatches: Patch[];

    const nextState: S = produce(
      currentState as any,
      s => updater(s, currentState),
      (patches, inversePatches) => {
        if (patchesCallback) {
          patchesCallback(patches, inversePatches);
        }

        changePatches = patches;
      }
    );

    if (changePatches.length > 0) {
      store._updateState(nextState, getChangedPathsFromPatches(changePatches));
    }
  } else {
    const nextState: S = produce(currentState as any, s => updater(s, currentState), patchesCallback);
    if (nextState !== currentState) {
      store._updateState(nextState);
    }
  }
}
