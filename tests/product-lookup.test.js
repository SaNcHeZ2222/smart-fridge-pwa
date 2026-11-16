import test from 'node:test';
import assert from 'node:assert/strict';
import {
  inferIngredientId,
  lookupOpenFoodFacts,
  productFromOpenFoodFacts
} from '../src/product-lookup.js';

const saintSpringPayload = {
  status: 'success',
  product: {
    code: '4603934000779',
    product_name_ru: 'Вода питьевая «Святой Источник» негазированная',
    brands: 'Saint Spring, Святой Источник',
    quantity: '1,5 л',
    categories_tags: ['en:waters']
  }
};

test('maps a Russian Open Food Facts product', () => {
  assert.deepEqual(productFromOpenFoodFacts(saintSpringPayload), {
    name: 'Вода питьевая «Святой Источник» негазированная',
    brand: 'Saint Spring, Святой Источник',
    packageQuantity: '1,5 л',
    imageUrl: '',
    categories: ['en:waters'],
    source: 'open-food-facts'
  });
});

test('looks up a barcode through the injected fetch implementation', async () => {
  let requestedUrl = '';
  const product = await lookupOpenFoodFacts('4603934000779', {
    fetchImpl: async (url) => {
      requestedUrl = url;
      return { ok: true, json: async () => saintSpringPayload };
    }
  });
  assert.match(requestedUrl, /4603934000779/);
  assert.equal(product.name, 'Вода питьевая «Святой Источник» негазированная');
});

test('falls back cleanly when the external catalog has no product', async () => {
  const product = await lookupOpenFoodFacts('9999999999999', {
    fetchImpl: async () => ({ ok: false })
  });
  assert.equal(product, null);
});

test('infers a recipe category from a Russian product name', () => {
  const ingredients = [
    { id: 'other', keywords: [] },
    { id: 'egg', keywords: ['яйц'] },
    { id: 'tuna', keywords: ['тунец'] }
  ];
  assert.equal(inferIngredientId({ name: 'Яйца куриные С0' }, ingredients), 'egg');
  assert.equal(inferIngredientId({ name: 'Питьевая вода' }, ingredients), 'other');
});
