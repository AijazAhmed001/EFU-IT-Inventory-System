import assert from "node:assert/strict"
import test from "node:test"
import { itemTotal, money } from "./types.ts"

test("purchase order display totals apply discount before tax", () => {
  assert.equal(itemTotal({ itemName:"Laptop", unitPrice:100, quantity:2, taxRate:15, discountType:"PERCENT", discountValue:10 }), 207)
})

test("money values round deterministically to two decimals", () => {
  assert.equal(money(10.005), 10.01)
})

