/** Shared scope for all four views; visualization controls stay local. */
export interface AppState {
  selectedActorId: string;
  focusWeek: Date | null;
}

/** Start with conflict-wide totals and the map's full-period overview. */
export const initialState: AppState = {
  selectedActorId: "__ALL__",
  focusWeek: null,
};
