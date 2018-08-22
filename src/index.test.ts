import { createSelectionContext, makeSelector, SelectionLogic } from './index'
import { memoize } from 'lodash'

test('basic selector', () => {
  const context = createSelectionContext<{ a: number }>()
  const selector = context.makeSelector(query => query(state => state.a))
  const firstState = { a: 1 }
  const firstStateNewPointer = { a: 1 }
  const secondState = { a: 2 }

  expect(selector(firstState)).toEqual(1)
  expect(selector(firstState)).toEqual(1)
  expect(selector.recomputations()).toEqual(1)
  expect(selector(firstStateNewPointer)).toEqual(1)
  expect(selector.recomputations()).toEqual(1)
  expect(selector(secondState)).toEqual(2)
  expect(selector.recomputations()).toEqual(2)
})

test('basic selector multiple keys', () => {
  const context = createSelectionContext<{ a: number; b: number }>()
  const selector = context.makeSelector(
    query => query(state => state.a) + query(state => state.b)
  )

  const state1 = { a: 1, b: 2 }
  expect(selector(state1)).toEqual(3)
  expect(selector(state1)).toEqual(3)
  expect(selector.recomputations()).toEqual(1)
  const state2 = { a: 3, b: 2 }
  expect(selector(state2)).toEqual(5)
  expect(selector(state2)).toEqual(5)
  expect(selector.recomputations()).toEqual(2)
})

test('malfunction selector throws', () => {
  const selector = makeSelector(query => 42)
  const state = { whatever: 'goes' }
  expect(() => selector(state)).toThrow(/query/)
})

test('query does not track duplicate dependencies and remembers results', () => {
  const context = createSelectionContext<{ a: number; b: number }>()
  let countA = 0
  let countB = 0
  const selectA = (state: { a: number }) => (countA++, state.a)
  const selectB = (state: { b: number }) => (countB++, state.b)
  const selector = context.makeSelector(query => {
    return query(selectA) + query(selectB) * query(selectA)
  })
  expect(selector({ a: 2, b: 3 })).toEqual(8)
  expect(countA).toEqual(1)
  expect(countB).toEqual(1)
})

test('introspecting', () => {
  let state = {
    onlineUserIds: [] as string[],
    users: {
      alice: { name: 'Alice' },
      bob: { name: 'Bob' },
      charlie: { name: 'Charlie' },
      dave: { name: 'Dave' },
      eve: { name: 'Eve' },
    } as { [k: string]: { name: string } },
  }

  const context = createSelectionContext<typeof state>()
  const log: string[] = []
  let depth = 0
  const runWithLog = <T>(text: string, f: () => T) => {
    depth++
    log.push('| '.repeat(depth) + text)
    try {
      return f()
    } finally {
      depth--
    }
  }

  const makeNamedSelector = <T>(
    name: string,
    logic: SelectionLogic<typeof state, T>
  ) => {
    return Object.assign(
      context.makeSelector(query => {
        return runWithLog(`COMPUTE ${name}`, () => logic(query))
      }),
      { displayName: name }
    )
  }

  const selectOnlineUserIds = makeNamedSelector('selectOnlineUserIds', query =>
    query(state => state.onlineUserIds)
  )
  const selectUserById = memoize((id: string) =>
    makeNamedSelector(`selectUserById(${id})`, query =>
      query(state => state.users[id])
    )
  )
  const selectOnlineUsers = makeNamedSelector('selectOnlineUsers', query =>
    query(selectOnlineUserIds).map(id => query(selectUserById(id)))
  )

  context.setWrapper((execute, selector) => {
    return runWithLog('INVOKE ' + (selector as any).displayName, execute)
  })

  log.push('Initial state (no one online)')
  selectOnlineUsers(state)

  log.push('Alice and Eve is online')
  state = { ...state, onlineUserIds: ['alice', 'eve'] }
  selectOnlineUsers(state)

  log.push('Bob’s info changed')
  state = {
    ...state,
    users: { ...state.users, bob: { name: 'Bobby Tables' } },
  }
  selectOnlineUsers(state)

  log.push('Eve is offline, Charlie is online')
  state = { ...state, onlineUserIds: ['alice', 'charlie'] }
  selectOnlineUsers(state)

  log.push('Alice info changed')
  state = {
    ...state,
    users: { ...state.users, alice: { name: 'Alice in wonderland' } },
  }
  selectOnlineUsers(state)

  expect(log).toMatchInlineSnapshot(`
Array [
  "Initial state (no one online)",
  "| INVOKE selectOnlineUsers",
  "| | COMPUTE selectOnlineUsers",
  "| | | INVOKE selectOnlineUserIds",
  "| | | | COMPUTE selectOnlineUserIds",
  "Alice and Eve is online",
  "| INVOKE selectOnlineUsers",
  "| | INVOKE selectOnlineUserIds",
  "| | | COMPUTE selectOnlineUserIds",
  "| | COMPUTE selectOnlineUsers",
  "| | | INVOKE selectOnlineUserIds",
  "| | | INVOKE selectUserById(alice)",
  "| | | | COMPUTE selectUserById(alice)",
  "| | | INVOKE selectUserById(eve)",
  "| | | | COMPUTE selectUserById(eve)",
  "Bob’s info changed",
  "| INVOKE selectOnlineUsers",
  "| | INVOKE selectOnlineUserIds",
  "| | INVOKE selectUserById(alice)",
  "| | INVOKE selectUserById(eve)",
  "Eve is offline, Charlie is online",
  "| INVOKE selectOnlineUsers",
  "| | INVOKE selectOnlineUserIds",
  "| | | COMPUTE selectOnlineUserIds",
  "| | COMPUTE selectOnlineUsers",
  "| | | INVOKE selectOnlineUserIds",
  "| | | INVOKE selectUserById(alice)",
  "| | | INVOKE selectUserById(charlie)",
  "| | | | COMPUTE selectUserById(charlie)",
  "Alice info changed",
  "| INVOKE selectOnlineUsers",
  "| | INVOKE selectOnlineUserIds",
  "| | INVOKE selectUserById(alice)",
  "| | | COMPUTE selectUserById(alice)",
  "| | COMPUTE selectOnlineUsers",
  "| | | INVOKE selectOnlineUserIds",
  "| | | INVOKE selectUserById(alice)",
  "| | | INVOKE selectUserById(charlie)",
]
`)
})
