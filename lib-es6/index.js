"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Selects the state.
 */
exports.selectState = state => state;
/**
 * Creates a new context for selection. Useful if you want a statically-typed
 * `makeSelector` function.
 */
function createSelectionContext() {
    let latestSelection;
    let wrapper;
    function makeSelector(selectionLogic) {
        let recomputations = 0;
        let cachedResult;
        function select(state) {
            if (!latestSelection) {
                latestSelection = { state: state, version: 1 };
            }
            if (latestSelection.state !== state) {
                latestSelection.state = state;
                latestSelection.version += 1;
            }
            const currentStateVersion = latestSelection.version;
            let reason;
            if (cachedResult) {
                if (currentStateVersion === cachedResult.stateVersion) {
                    return cachedResult.value;
                }
                if (!cachedResult.dependencies) {
                    return cachedResult.value;
                }
                let changed = false;
                for (const [selector, value] of cachedResult.dependencies.entries()) {
                    if (selector(state) !== value) {
                        changed = true;
                        reason = selector;
                        break;
                    }
                }
                if (!changed) {
                    return cachedResult.value;
                }
            }
            recomputations += 1;
            const dependencies = new Map();
            const query = Object.assign((selector) => {
                if (dependencies.has(selector))
                    return dependencies.get(selector);
                const value = selector(state);
                dependencies.set(selector, value);
                return value;
            }, { reason });
            const resultValue = selectionLogic(query);
            cachedResult = {
                stateVersion: currentStateVersion,
                dependencies,
                value: resultValue
            };
            return resultValue;
        }
        const enhancedSelector = Object.assign(function selector(state) {
            if (!wrapper) {
                return select(state);
            }
            return wrapper(() => select(state), enhancedSelector, state);
        }, {
            selectionLogic: selectionLogic,
            recomputations: () => recomputations,
            resetRecomputations: () => (recomputations = 0),
            introspect: () => cachedResult
        });
        return enhancedSelector;
    }
    return {
        makeSelector,
        setWrapper: fn => {
            wrapper = fn;
        }
    };
}
exports.createSelectionContext = createSelectionContext;
const defaultContext = createSelectionContext();
/**
 * makeSelector creates a selector based on given selectionLogic.
 *
 * @param selectionLogic - The selection logic. It will be passed a
 * function `query` which you can call to invoke other selectors.
 * By doing so, the dependencies between selectors will be tracked
 * automatically.
 */
exports.makeSelector = defaultContext.makeSelector;
//# sourceMappingURL=index.js.map