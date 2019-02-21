import immer from "immer";

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

  update(updater: (state: S) => void) {
    update(this, updater);
  }
}

export function update<S = any>(store: Store<S>, updater: (state: S) => void) {
  const currentState: S = store.getRawState();
  const nextState: S = immer(currentState as any, updater);
  if (nextState !== currentState) {
    store._updateState(nextState);
  }
}
