import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizePermissionCatalog, updateSelection } from './permissionLogic.ts'

const catalog = [
  { code: 'assets.view' }, { code: 'assets.create', requires: 'assets.view' },
  { code: 'allocations.view' }, { code: 'allocations.create', requires: 'allocations.view' },
]

test('selecting a mutation adds its view dependency', () => {
  assert.deepEqual([...updateSelection([], catalog, 'assets.create', true)].sort(), ['assets.create','assets.view'])
})
test('allocating also requires asset visibility', () => {
  assert.deepEqual([...updateSelection([], catalog, 'allocations.create', true)].sort(), ['allocations.create','allocations.view','assets.view'])
})
test('removing view access removes dependent mutations', () => {
  assert.deepEqual([...updateSelection(['assets.view','assets.create','allocations.create'], catalog, 'assets.view', false)], [])
})

test('legacy string catalogs receive visible names and groups', () => {
  const result = normalizePermissionCatalog([
    'dashboard.view',
    'assets.create',
    'master.manage',
  ])
  assert.deepEqual(result.map(item => [item.name, item.group]), [
    ['View Dashboard', 'Dashboard'],
    ['Create Assets', 'Assets'],
    ['Manage Master Data', 'Master Data'],
  ])
  assert.equal(result[1].requires, 'assets.view')
})

test('catalog normalization removes malformed and duplicate entries', () => {
  const result = normalizePermissionCatalog([
    'assets.view',
    { code: 'assets.view', name: '', group: '' },
    {},
  ])
  assert.equal(result.length, 1)
})
