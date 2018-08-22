const { makeSelector } = require('../lib-es6')

// “Simple” selectors are the same.
const shopItemsSelector = state => state.shop.items
const taxPercentSelector = state => state.shop.taxPercent

// Instead of `createSelector`, it is called `makeSelector`.
//
// Instead of declaring dependencies upfront, use the `query` function
// can be used to invoke other selectors. In doing so, the dependency
// will automatically be tracked.
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

let exampleState = {
  shop: {
    taxPercent: 8,
    items: [{ name: 'apple', value: 1.2 }, { name: 'orange', value: 0.95 }]
  }
}

console.log(subtotalSelector(exampleState)) // 2.15
console.log(taxSelector(exampleState)) // 0.172
console.log(totalSelector(exampleState)) // { total: 2.322 }
