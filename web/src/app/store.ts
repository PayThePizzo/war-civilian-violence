/** Shared actor/week state and synchronous subscriptions, without UI dependencies. */
import { initialState } from "./state";
import type { AppState } from "./state";

export type StateListener = (state: Readonly<AppState>) => void;

export interface AppStore {
  /** Return a snapshot whose Date can be used without mutating the store. */
  getState(): Readonly<AppState>;
  /** Merge both fields atomically; omitted or undefined fields stay unchanged. */
  setState(patch: Partial<AppState>): void;
  /** Deliver the current state immediately, then changes; return unsubscribe. */
  subscribe(listener: StateListener): () => void;
  /** Restore the state supplied when this store was created. */
  reset(): void;
}

function copyState(state: Readonly<AppState>): AppState {
  return {
    selectedActorId: state.selectedActorId,
    focusWeek: state.focusWeek === null ? null : new Date(state.focusWeek.getTime()),
  };
}

function validateState(state: AppState): void {
  if (typeof state.selectedActorId !== "string" || state.selectedActorId.trim() === "") {
    throw new TypeError("selectedActorId must be a non-empty string");
  }
  if (state.focusWeek !== null
    && (!(state.focusWeek instanceof Date) || !Number.isFinite(state.focusWeek.getTime()))) {
    throw new TypeError("focusWeek must be a valid Date or null");
  }
}

/** Create an independent store; the default matches WEB.md's initialState. */
export function createStore(startState: AppState = initialState): AppStore {
  validateState(startState);
  const defaults = copyState(startState);
  let state = copyState(defaults);
  const listeners = new Set<StateListener>();
  const pending: AppState[] = [];
  let notifying = false;

  function getState(): Readonly<AppState> {
    return copyState(state);
  }

  function setState(patch: Partial<AppState>): void {
    const next: AppState = {
      selectedActorId: patch.selectedActorId === undefined ? state.selectedActorId : patch.selectedActorId,
      focusWeek: patch.focusWeek === undefined ? state.focusWeek : patch.focusWeek,
    };
    validateState(next);
    if (next.selectedActorId === state.selectedActorId
      && next.focusWeek?.getTime() === state.focusWeek?.getTime()) {
      return;
    }

    state = copyState(next);
    pending.push(state);
    if (notifying) return;

    // Finish delivering each change before changes requested by a listener.
    // Each listener receives its own Date copy so views cannot alter each other.
    notifying = true;
    const errors: unknown[] = [];
    try {
      while (pending.length > 0) {
        const snapshot = pending.shift()!;
        for (const listener of [...listeners]) {
          if (!listeners.has(listener)) continue;
          try {
            listener(copyState(snapshot));
          } catch (error) {
            // One failed view must not prevent the other views from updating.
            errors.push(error);
          }
        }
      }
    } finally {
      notifying = false;
    }
    if (errors.length > 0) {
      throw new AggregateError(errors, "State updated, but one or more subscribers failed");
    }
  }

  function subscribe(listener: StateListener): () => void {
    // Separate subscriptions remain independent even for the same callback.
    const subscription: StateListener = (snapshot) => listener(snapshot);
    listeners.add(subscription);
    try {
      subscription(getState());
    } catch (error) {
      listeners.delete(subscription);
      throw error;
    }
    return () => {
      listeners.delete(subscription);
    };
  }

  return {
    getState,
    setState,
    subscribe,
    reset: () => setState(defaults),
  };
}
