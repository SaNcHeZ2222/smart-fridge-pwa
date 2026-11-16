import { normalizeText } from './utils.js';

const OPEN_FOOD_FACTS_ENDPOINT = 'https://world.openfoodfacts.org/api/v3/product';
const LOOKUP_FIELDS = [
  'code',
  'product_name',
  'product_name_ru',
  'generic_name_ru',
  'brands',
  'quantity',
  'categories_tags',
  'image_front_small_url'
].join(',');

export function productFromOpenFoodFacts(payload) {
  const product = payload?.product;
  if (!product || payload?.status === 'failure') return null;

  const name = String(
    product.product_name_ru || product.product_name || product.generic_name_ru || ''
  ).trim();
  if (!name) return null;

  return {
    name,
    brand: String(product.brands || '').trim(),
    packageQuantity: String(product.quantity || '').trim(),
    imageUrl: String(product.image_front_small_url || '').trim(),
    categories: Array.isArray(product.categories_tags) ? product.categories_tags : [],
    source: 'open-food-facts'
  };
}

export function inferIngredientId(product, ingredients) {
  const categoryText = (product?.categories || [])
    .map((category) => String(category).replace(/^[a-z]{2}:/i, '').replace(/-/g, ' '))
    .join(' ');
  const haystack = normalizeText(`${product?.name || ''} ${categoryText}`);

  for (const ingredient of ingredients || []) {
    if (ingredient.id === 'other') continue;
    if ((ingredient.keywords || []).some((keyword) => haystack.includes(normalizeText(keyword)))) {
      return ingredient.id;
    }
  }
  return 'other';
}

export async function lookupOpenFoodFacts(productCode, {
  fetchImpl = fetch,
  timeoutMs = 4500
} = {}) {
  const code = String(productCode || '').replace(/\D/g, '');
  if (!code) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const url = `${OPEN_FOOD_FACTS_ENDPOINT}/${encodeURIComponent(code)}?fields=${encodeURIComponent(LOOKUP_FIELDS)}&lc=ru&cc=ru`;

  try {
    const response = await fetchImpl(url, {
      headers: {
        'X-User-Agent': 'Svezho/0.2.0 (https://github.com/SaNcHeZ2222/smart-fridge-pwa)'
      },
      signal: controller.signal
    });
    if (!response.ok) return null;
    return productFromOpenFoodFacts(await response.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
