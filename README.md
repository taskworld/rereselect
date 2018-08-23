# rereselect

[![npm package][npm-badge]][npm] [![CircleCI builds][build-badge]][build]  [![Codecov][cov-badge]][cov]

[build-badge]: https://img.shields.io/circleci/project/github/taskworld/rereselect/master.svg?style=for-the-badge
[build]: https://circleci.com/gh/taskworld/rereselect

[npm-badge]: https://img.shields.io/npm/v/@taskworld.com/rereselect.svg?style=for-the-badge
[npm]: https://www.npmjs.com/package/@taskworld.com/rereselect

[cov-badge]: https://img.shields.io/codecov/c/github/taskworld/rereselect/master.svg?style=for-the-badge
[cov]: https://codecov.io/gh/taskworld/rereselect

> Not to be confused with
> [Re-reselect](https://github.com/toomuchdesign/re-reselect) which is an
> enhancement to [Reselect](https://github.com/reduxjs/reselect). This is an
> entirely separate project.

A library that generates memoized selectors like
[Reselect](https://github.com/reduxjs/reselect) but:

- **Supports dynamic dependency tracking** à la Vue/VueX/MobX. See
  [my StackOverflow answer](https://stackoverflow.com/a/51973044) for the
  motivation why we need this.
- No need to declare upfront which selectors will be used.
- Introspection (hooks) API baked in to help debug performance problems.

**Design constraints:**

- Generated selector must be compatible with Reselect.

**Notes:**

- Requires an ES6 environment (or babel-polyfill).
- TypeScript typings require TypeScript 3.0.
- The state must be immutable.
- The selector logic must be pure and deterministic.
- rereselect’s selectors take 1 argument only — the state. If you need
  parameterized selectors, see the section
  [parameterized selectors](#parameterized-selectors).
- **No support.** This library is created to solve the problems we face. We
  open-source it in hope that it will be useful to others as well, but we have
  no plans in supporting it beyond our use cases. Therefore, feature requests
  are not accepted here.

## Differences from Reselect?

The Reselect “shopping cart” example:

```js
import { makeSelector } from '@taskworld.com/rereselect'

// “Simple” selectors are the same.
const shopItemsSelector = state => state.shop.items
const taxPercentSelector = state => state.shop.taxPercent

// Instead of `createSelector`, it is called `makeSelector`.
//
// Instead of declaring dependencies upfront, use the `query` function
// to invoke other selectors. In doing so, the dependency will
// automatically be tracked.
//
const subtotalSelector = makeSelector(query =>
  query(shopItemsSelector).reduce((acc, item) => acc + item.value, 0)
)
const taxSelector = makeSelector(
  query => query(subtotalSelector) * (query(taxPercentSelector) / 100)
)
const totalSelector = makeSelector(query => ({
  total: query(subtotalSelector) + query(taxSelector)
}))
```

Dynamic dependency tracking:

```js
let state = {
  fruits: {
    a: { name: 'Apple' },
    b: { name: 'Banana' },
    c: { name: 'Cantaloupe' }
  },
  selectedFruitIds: ['a', 'c']
}

// I want to query the selected fruits...
const selectSelectedFruits = makeSelector(query =>
  query(state => state.selectedFruitIds).map(id =>
    query(state => state.fruits[id])
  )
)

// Use like any other selectors:
console.log(selectSelectedFruits(state)) // [ { name: 'Apple' }, { name: 'Cantaloupe' } ]

// Since data selection is fine-grained, changes to unrelated parts
// of the state will not cause a recomputation.
state = {
  ...state,
  fruits: {
    ...state.fruits,
    b: { name: 'Blueberry' }
  }
}
console.log(selectSelectedFruits(state)) // [ { name: 'Apple' }, { name: 'Cantaloupe' } ]
console.log(selectSelectedFruits.recomputations()) // 1
```

## Parameterized selectors

This library is only concerned with creating a selector system that supports
dynamic dependency tracking. So, it is up to you to implement parameterized
selectors support.

This is how we do it (we also added `displayName` property to our selectors to
make them easier to debug):

```typescript
export function makeParameterizedSelector(
  displayName,
  selectionLogicGenerator
) {
  const memoized = new Map()
  return Object.assign(
    function selectorFactory(...args) {
      const key = args.join(',')
      if (memoized.has(key)) return memoized.get(key)!
      const name = `${displayName}(${key})`
      const selectionLogic = selectionLogicGenerator(...args)
      const selector = makeSelector(selectionLogic)
      selector.displayName = name
      memoized.set(key, selector)
      return selector
    },
    { displayName }
  )
}
```
