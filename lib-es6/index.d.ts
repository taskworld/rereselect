export declare type SelectorContext<State> = {
    /**
     * makeSelector creates a selector based on given selectionLogic.
     *
     * @param selectionLogic - The selection logic. It will be passed a
     * function `query` which you can call to invoke other selectors.
     * By doing so, the dependencies between selectors will be tracked
     * automatically.
     */
    makeSelector<Result>(selectionLogic: SelectionLogic<State, Result>): EnhancedSelector<State, Result>;
};
/**
 * Selector selects some data from the state tree.
 */
export declare type Selector<State, Result> = (state: State) => Result;
/**
 * EnhancedSelector is a selector function returned by `makeSelector`.
 * It comes with extra methods to help you introspect.
 */
export declare type EnhancedSelector<State, Result> = Selector<State, Result> & {
    selectionLogic: SelectionLogic<State, Result>;
    /**
     * recomputations returns the number of times this selector
     * has to recompute its output.
     */
    recomputations(): number;
    /**
     * resetRecomputations resets the recomputations counter to 0.
     */
    resetRecomputations(): number;
    /**
     * Like calling the selector, but instead of returning the selected
     * data, also return the internal state.
     */
    introspect(state: State): InternalSelectorState<State, Result>;
};
declare type InternalSelectorState<State, Result> = {
    stateVersion: number;
    value: Result;
    dependencies: Map<Selector<State, any>, any>;
};
/**
 * The selection logic to be passed to `makeSelector`. It will be passed a
 * function `query` which you can call to invoke other selectors.
 * By doing so, the dependencies between selectors will be tracked
 * automatically.
 */
export declare type SelectionLogic<State, Result> = (
/**
 * Executes another selector and mark it as a dependency.
 */
query: QueryFunction<State>) => Result;
/**
 * QueryFunction can be used to invoke another selector and mark
 * that selector as a dependency.
 */
export declare type QueryFunction<State> = (<Result>(selector: Selector<State, Result>) => Result);
/**
 * Selects the state.
 */
export declare const selectState: <State>(state: State) => State;
/**
 * Creates a new context for selection. Useful if you want a statically-typed
 * `makeSelector` function.
 */
export declare function createSelectionContext<State>(): SelectorContext<State>;
/**
 * makeSelector creates a selector based on given selectionLogic.
 *
 * @param selectionLogic - The selection logic. It will be passed a
 * function `query` which you can call to invoke other selectors.
 * By doing so, the dependencies between selectors will be tracked
 * automatically.
 */
export declare const makeSelector: <Result>(selectionLogic: SelectionLogic<any, Result>) => EnhancedSelector<any, Result>;
export {};
//# sourceMappingURL=index.d.ts.map