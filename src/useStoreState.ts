import isEqual from "fast-deep-equal/es6";
// S = State
// SS = Sub-state
import { useEffect, useRef, useState } from "react";
import { Store } from "./Store";

// const isEqual = require("fast-deep-equal/es6");

export interface IUpdateRef {
  shouldUpdate: boolean;
  onStoreUpdate: (() => void) | null;
  getSubState?: (state: any) => any;
  currentSubState: any;
  setInitial: boolean;
}

export interface IUpdateRefNew {
  state: any;
  initialized: boolean;
}

const onServer = typeof window === "undefined";

function useStoreState<S extends object = any>(store: Store<S>): S;
function useStoreState<S extends object = any, SS = any>(
  store: Store<S>,
  getSubState: (state: S) => SS,
  deps?: ReadonlyArray<any>
): SS;
function useStoreState(store: Store, getSubState?: (state: any) => any, deps?: ReadonlyArray<any>): any {
  const updateRef = useRef<IUpdateRefNew>({ state: undefined, initialized: false });

  if (!updateRef.current.initialized) {
    updateRef.current.state = getSubState ? getSubState(store.getRawState()) : store.getRawState();
    updateRef.current.initialized = true;
  }

  // useState with only a simple value to prevent double equality checks for the state
  const [, setUpdateTrigger] = useState(0);

  // const [current, setCurrent] = useState(() => {
  //   return getSubState ? getSubState(store.getRawState()) : store.getRawState();
  // });
  // updateRef.current.state = current;

  useEffect(() => {
    const effectState = { shouldUpdate: true };

    function update() {
      if (effectState.shouldUpdate) {
        const nextSubState = getSubState
          ? getSubState(store.getRawState())
          : store.getRawState();

        if (!isEqual(updateRef.current.state, nextSubState)) {
          // final check again before actually running state update (might prevent no-op errors with React)
          if (effectState.shouldUpdate) {
            updateRef.current.state = nextSubState;
            setUpdateTrigger((val) => val + 1);
          }
        }
      }
    }

    store._addUpdateListener(update);

    return () => {
      effectState.shouldUpdate = false;
      store._removeUpdateListener(update);
    };
  }, deps ?? []);

  if (deps !== undefined) {
    const prevDeps = useRef<ReadonlyArray<any>>(deps);
    if (!isEqual(deps, prevDeps)) {
      updateRef.current.state = getSubState!(store.getRawState());
    }
  }

  return updateRef.current.state;
}

/*
function useStoreState(store: Store, getSubState?: (state: any) => any, deps?: ReadonlyArray<any>): any {
  const updateRef = useRef<IUpdateRef>({
    shouldUpdate: true,
    onStoreUpdate: null,
    getSubState,
    currentSubState: null,
    setInitial: false,
  });

  const [, setUpdateTrigger] = useState(0);

  if (!updateRef.current.setInitial) {
    updateRef.current.currentSubState = updateRef.current.getSubState
      ? updateRef.current.getSubState(store.getRawState())
      : store.getRawState();
    updateRef.current.setInitial = true;
  }

  if (updateRef.current.onStoreUpdate === null) {
    updateRef.current.onStoreUpdate = function onStoreUpdate() {
      const nextSubState = updateRef.current.getSubState
        ? updateRef.current.getSubState(store.getRawState())
        : store.getRawState();
      if (updateRef.current.shouldUpdate && !isEqual(updateRef.current.currentSubState, nextSubState)) {
        // final check again before actually running state update (might prevent no-op errors with React)
        if (updateRef.current.shouldUpdate) {
          updateRef.current.currentSubState = nextSubState;
          setUpdateTrigger((val) => val + 1);
        }
      }
    };

    if (!onServer) {
      store._addUpdateListener(updateRef.current.onStoreUpdate!);
    }
  }

  useEffect(() => {
    updateRef.current.shouldUpdate = true;

    return () => {
      updateRef.current.shouldUpdate = false;
      store._removeUpdateListener(updateRef.current.onStoreUpdate!);
    };
  }, []);

  if (deps !== undefined) {
    const prevDeps = useRef<ReadonlyArray<any>>(deps);
    if (!isEqual(deps, prevDeps)) {
      updateRef.current.getSubState = getSubState;
      updateRef.current.currentSubState = getSubState!(store.getRawState());
    }
  }

  console.log(updateRef.current);

  return updateRef.current.currentSubState;
}
*/

export { useStoreState };
