declare type SelectorContext<State> = {
    makeSelector<Result>(selectionLogic: SelectionLogic<State, Result>): EnhancedSelector<State, Result>;
};
declare type Selector<State, Result> = (state: State) => Result;
declare type EnhancedSelector<State, Result> = Selector<State, Result> & {
    selectionLogic: SelectionLogic<State, Result>;
    recomputations(): number;
    resetRecomputations(): number;
    introspect(state: State): InternalSelectorState<State, Result>;
};
declare type InternalSelectorState<State, Result> = {
    stateVersion: number;
    value: Result;
    dependencies: Map<Selector<State, any>, any>;
};
declare type SelectionLogic<State, Result> = (query: QueryFunction<State>) => Result;
declare type QueryFunction<State> = (<Result>(selector: Selector<State, Result>) => Result);
export declare const selectState: <State>(state: State) => State;
export declare function createSelectionContext<State>(): SelectorContext<State>;
export declare const makeSelector: <Result>(selectionLogic: SelectionLogic<any, Result>) => EnhancedSelector<any, Result>;
export {};
//# sourceMappingURL=index.d.ts.map