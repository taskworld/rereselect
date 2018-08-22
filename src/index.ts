export type SelectorContext<State> = {
  /**
   * makeSelector creates a selector based on given selectionLogic.
   *
   * @param selectionLogic - The selection logic. It will be passed a
   * function `query` which you can call to invoke other selectors.
   * By doing so, the dependencies between selectors will be tracked
   * automatically.
   */
  makeSelector<Result>(
    selectionLogic: SelectionLogic<State, Result>
  ): EnhancedSelector<State, Result>

  /**
   * Sets a wrapper function. This allows intercepting selector calls.
   * The wrapper function **MUST** return the result of calling
   * `executedSelector` function, or the whole thing will break down.
   *
   * For example:
   *
   *     context.setWrapper(executeSelector => {
   *       return executeSelector()
   *     })
   */
  setWrapper(wrapper: WrapperFunction<State>): void
}

/**
 * Selector selects some data from the state tree.
 */
export type Selector<State, Result> = (state: State) => Result

/**
 * EnhancedSelector is a selector function returned by `makeSelector`.
 * It comes with extra methods to help you introspect.
 */
export type EnhancedSelector<State, Result> = Selector<State, Result> & {
  selectionLogic: SelectionLogic<State, Result>

  /**
   * recomputations returns the number of times this selector
   * has to recompute its output.
   */
  recomputations(): number

  /**
   * resetRecomputations resets the recomputations counter to 0.
   */
  resetRecomputations(): number

  /**
   * Returns the internal state of the selector.
   * Internal state is generated after the selector is computed/recomputed.
   * For debugging purposes.
   */
  introspect(): InternalSelectorState<State, Result> | undefined
}

type InternalSelectorState<State, Result> = {
  stateVersion: number
  value: Result
  dependencies: Map<Selector<State, any>, any>
}

/**
 * The selection logic to be passed to `makeSelector`. It will be passed a
 * function `query` which you can call to invoke other selectors.
 * By doing so, the dependencies between selectors will be tracked
 * automatically.
 */
export type SelectionLogic<State, Result> = (
  /**
   * Executes another selector and mark it as a dependency.
   */
  query: QueryFunction<State>
) => Result

export type WrapperFunction<State> = (
  executeSelector: () => any,
  selector: EnhancedSelector<State, any>,
  state: State
) => any

/**
 * QueryFunction can be used to invoke another selector and mark
 * that selector as a dependency.
 */
export type QueryFunction<State> = {
  <Result>(selector: Selector<State, Result>): Result

  /**
   * The earliest selector that caused the selector result to be
   * invalidated.
   */
  reason: Selector<State, any> | undefined
}

/**
 * Selects the state.
 */
export const selectState: <State>(state: State) => State = state => state

/**
 * Creates a new context for selection. Useful if you want a statically-typed
 * `makeSelector` function.
 */
export function createSelectionContext<State>(): SelectorContext<State> {
  let latestSelection: { state: State; version: number } | undefined
  let wrapper: WrapperFunction<State> | undefined

  function makeSelector<Result>(
    selectionLogic: SelectionLogic<State, Result>
  ): EnhancedSelector<State, Result> {
    let recomputations = 0
    let cachedResult: InternalSelectorState<State, Result> | undefined

    function select(state: State): Result {
      if (!latestSelection) {
        latestSelection = { state: state, version: 1 }
      }
      if (latestSelection.state !== state) {
        latestSelection.state = state
        latestSelection.version += 1
      }
      const currentStateVersion = latestSelection.version
      let reason
      if (cachedResult) {
        if (currentStateVersion === cachedResult.stateVersion) {
          return cachedResult.value
        }
        if (!cachedResult.dependencies) {
          return cachedResult.value
        }
        let changed = false
        for (const [selector, value] of cachedResult.dependencies.entries()) {
          if (selector(state) !== value) {
            changed = true
            reason = selector
            break
          }
        }
        if (!changed) {
          return cachedResult.value
        }
      }
      recomputations += 1
      const dependencies = new Map<Selector<State, any>, any>()
      const query: QueryFunction<State> = Object.assign(
        (selector: Selector<State, any>) => {
          if (dependencies.has(selector)) return dependencies.get(selector)
          const value = selector(state)
          dependencies.set(selector, value)
          return value
        },
        { reason }
      )
      const resultValue = selectionLogic(query)
      cachedResult = {
        stateVersion: currentStateVersion,
        dependencies,
        value: resultValue
      }
      return resultValue
    }

    const enhancedSelector = Object.assign(
      function selector(state: State): Result {
        if (!wrapper) {
          return select(state)
        }
        return wrapper(() => select(state), enhancedSelector, state)
      },
      {
        selectionLogic: selectionLogic,
        recomputations: () => recomputations,
        resetRecomputations: () => (recomputations = 0),
        introspect: () => cachedResult
      }
    )

    return enhancedSelector
  }

  return {
    makeSelector,
    setWrapper: fn => {
      wrapper = fn
    }
  }
}

const defaultContext = createSelectionContext<any>()

/**
 * makeSelector creates a selector based on given selectionLogic.
 *
 * @param selectionLogic - The selection logic. It will be passed a
 * function `query` which you can call to invoke other selectors.
 * By doing so, the dependencies between selectors will be tracked
 * automatically.
 */
export const makeSelector = defaultContext.makeSelector
