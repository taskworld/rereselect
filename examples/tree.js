const { makeSelector } = require('../lib-es6')
const { createSelector } = require('reselect')
const assert = require('assert')
const Immutable = require('immutable')

// Our binary tree. Each node points to the parent node.
const initialState = Immutable.Map({
  tree: Immutable.Map(
    Array(1023)
      .fill()
      .map((x, i) => [
        `node${i}`,
        Immutable.Map({
          parent: `node${i === 0 ? null : (i - 1) >> 1}`,
          value: Math.random(),
        }),
      ])
  ),
  currentNodeId: 'node999',
})

const reselectBreadcrumb = createSelector(
  state => state.get('tree'),
  state => state.get('currentNodeId'),
  (tree, currentNodeId) => {
    const breadcrumb = []
    for (
      let node = tree.get(currentNodeId);
      node;
      node = node.get('parent') && tree.get(node.get('parent'))
    ) {
      breadcrumb.push(node.get('value'))
    }
    return breadcrumb.reverse()
  }
)

const rereselectBreadcrumb = makeSelector(query => {
  const getNode = id => query(state => state.getIn(['tree', id]))
  const breadcrumb = []
  const currentNodeId = query(state => state.get('currentNodeId'))
  for (
    let node = getNode(currentNodeId);
    node;
    node = node.get('parent') && getNode(node.get('parent'))
  ) {
    breadcrumb.push(node.get('value'))
  }
  return breadcrumb.reverse()
})

let state = initialState

for (let i = 0; i < 10000; i++) {
  // Each iteration, a random part of the tree changed value.
  state = state.setIn(
    ['tree', `node${Math.floor(Math.random() * 1000)}`, 'value'],
    Math.random()
  )
  assert.deepEqual(reselectBreadcrumb(state), rereselectBreadcrumb(state))
}

console.log('Recomputations:')
console.log(' * Reselect:  ', reselectBreadcrumb.recomputations())
console.log(' * rereselect:', rereselectBreadcrumb.recomputations())
