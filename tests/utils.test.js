import test from 'node:test';
import assert from 'node:assert/strict';
import { daysUntil, parseGs1, productCodeFromScan, profileAmount, sumRecipeIngredients } from '../src/utils.js';

test('parses a GS1 Data Matrix with GTIN, serial and expiration', () => {
  const value = `01046012345678901727123121ABC123\u001d93Z9K2`;
  const parsed = parseGs1(value);
  assert.equal(parsed.gtin, '04601234567890');
  assert.equal(parsed.expiration, '2027-12-31');
  assert.equal(parsed.serial, 'ABC123');
  assert.equal(productCodeFromScan(value), '4601234567890');
});

test('parses parenthesized GS1 values and best-before date', () => {
  const parsed = parseGs1('(01)04601234567890(15)270200(21)PACK7');
  assert.equal(parsed.gtin, '04601234567890');
  assert.equal(parsed.bestBefore, '2027-02-28');
  assert.equal(parsed.serial, 'PACK7');
});

test('calculates expiry relative to a fixed date', () => {
  assert.equal(daysUntil('2026-11-19', new Date('2026-11-16T12:00:00+04:00')), 3);
  assert.equal(daysUntil('2026-11-15', new Date('2026-11-16T12:00:00+04:00')), -1);
});

test('formats profile amounts', () => {
  const ingredient = { angelina: 2, sasha: 3, unit: 'шт.' };
  assert.equal(profileAmount(ingredient, 'angelina'), '2 шт.');
  assert.equal(profileAmount(ingredient, 'sasha'), '3 шт.');
  assert.equal(profileAmount(ingredient, 'both'), '5 шт.');
});

test('aggregates a weekly shopping list', () => {
  const recipes = [
    { ingredients: [{ id: 'egg', label: 'Яйца', angelina: 2, sasha: 3, unit: 'шт.' }] },
    { ingredients: [{ id: 'egg', label: 'Яйца', angelina: 1, sasha: 2, unit: 'шт.' }] }
  ];
  assert.deepEqual(sumRecipeIngredients(recipes, 'both'), [
    { id: 'egg', label: 'Яйца', amount: 8, unit: 'шт.' }
  ]);
});
