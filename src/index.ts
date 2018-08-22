type SelectorContext<State> = {
  makeSelector<Result>(
    selectionLogic: SelectionLogic<State, Result>
  ): EnhancedSelector<State, Result>
}

type Selector<State, Result> = (state: State) => Result

type EnhancedSelector<State, Result> = Selector<State, Result> & {
  selectionLogic: SelectionLogic<State, Result>
  recomputations(): number
  resetRecomputations(): number
  introspect(state: State): InternalSelectorState<State, Result>
}

type InternalSelectorState<State, Result> = {
  stateVersion: number
  value: Result
  dependencies: Map<Selector<State, any>, any>
}

type SelectionLogic<State, Result> = (query: QueryFunction<State>) => Result

type WrapperFunction<State> = <Result>(
  executeSelector: () => Result,
  selectionLogic: SelectionLogic<State, Result>,
  selector: Selector<State, Result>
) => Result

type QueryFunction<State> = (<Result>(
  selector: Selector<State, Result>
) => Result)

export const selectState: <State>(state: State) => State = state => state

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
            break
          }
        }
        if (!changed) {
          return cachedResult.value
        }
      }
      recomputations += 1
      const dependencies = new Map<Selector<State, any>, any>()
      const query: QueryFunction<State> = selector => {
        if (dependencies.has(selector)) return dependencies.get(selector)
        const value = selector(state)
        dependencies.set(selector, value)
        return value
      }
      const resultValue = selectionLogic(query)
      cachedResult = {
        stateVersion: currentStateVersion,
        dependencies,
        value: resultValue
      }
      return resultValue
    }
    function selector(state: State): Result {
      if (!wrapper) {
        return select(state)
      }
      return wrapper(() => select(state), selectionLogic, selector)
    }
    return Object.assign(selector, {
      selectionLogic: selectionLogic,
      recomputations: () => recomputations,
      resetRecomputations: () => (recomputations = 0),
      introspect: (state: State) => {
        selector(state)
        return cachedResult!
      }
    })
  }

  return {
    makeSelector
  }
}

const defaultContext = createSelectionContext<any>()
export const { makeSelector } = defaultContext
