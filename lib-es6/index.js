"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectState = state => state;
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
                        break;
                    }
                }
                if (!changed) {
                    return cachedResult.value;
                }
            }
            recomputations += 1;
            const dependencies = new Map();
            const query = selector => {
                if (dependencies.has(selector))
                    return dependencies.get(selector);
                const value = selector(state);
                dependencies.set(selector, value);
                return value;
            };
            const resultValue = selectionLogic(query);
            cachedResult = {
                stateVersion: currentStateVersion,
                dependencies,
                value: resultValue
            };
            return resultValue;
        }
        function selector(state) {
            if (!wrapper) {
                return select(state);
            }
            return wrapper(() => select(state), selectionLogic, selector);
        }
        return Object.assign(selector, {
            selectionLogic: selectionLogic,
            recomputations: () => recomputations,
            resetRecomputations: () => (recomputations = 0),
            introspect: (state) => {
                selector(state);
                return cachedResult;
            }
        });
    }
    return {
        makeSelector
    };
}
exports.createSelectionContext = createSelectionContext;
const defaultContext = createSelectionContext();
exports.makeSelector = defaultContext.makeSelector;
//# sourceMappingURL=index.js.map