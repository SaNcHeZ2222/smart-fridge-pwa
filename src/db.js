import { openDB } from 'idb';
import { uid } from './utils.js';

const DB_NAME = 'svezho-local';
const DB_VERSION = 1;

const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    const inventory = db.createObjectStore('inventory', { keyPath: 'id' });
    inventory.createIndex('by-zone', 'zone');
    inventory.createIndex('by-product-code', 'productCode');
    inventory.createIndex('by-scan-code', 'scanCode');
    inventory.createIndex('by-expiry', 'expiresOn');

    db.createObjectStore('catalog', { keyPath: 'productCode' });
    db.createObjectStore('settings', { keyPath: 'key' });
    db.createObjectStore('events', { keyPath: 'id' });
  }
});

export async function listInventory() {
  const db = await dbPromise;
  return db.getAll('inventory');
}

export async function saveInventoryItem(item) {
  const db = await dbPromise;
  const record = {
    id: item.id || uid('item'),
    name: item.name.trim(),
    ingredientId: item.ingredientId || 'other',
    zone: item.zone || 'fridge',
    quantity: Number(item.quantity || 1),
    unit: item.unit || 'шт.',
    expiresOn: item.expiresOn || null,
    opened: Boolean(item.opened),
    productCode: item.productCode || null,
    scanCode: item.scanCode || null,
    serial: item.serial || null,
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  await db.put('inventory', record);
  await logEvent(item.id ? 'update' : 'add', record);
  if (record.productCode) {
    await db.put('catalog', {
      productCode: record.productCode,
      name: record.name,
      ingredientId: record.ingredientId,
      unit: record.unit,
      updatedAt: record.updatedAt
    });
  }
  return record;
}

export async function removeInventoryItem(id) {
  const db = await dbPromise;
  const item = await db.get('inventory', id);
  if (!item) return null;
  await db.delete('inventory', id);
  await logEvent('remove', item);
  return item;
}

export async function getInventoryItem(id) {
  const db = await dbPromise;
  return db.get('inventory', id);
}

export async function findInventoryForScan({ scanCode, productCode }) {
  const db = await dbPromise;
  if (scanCode) {
    const exact = await db.getFromIndex('inventory', 'by-scan-code', scanCode);
    if (exact) return exact;
  }
  if (productCode) {
    const matches = await db.getAllFromIndex('inventory', 'by-product-code', productCode);
    return matches.sort((a, b) => String(a.expiresOn || '9999').localeCompare(String(b.expiresOn || '9999')))[0] || null;
  }
  return null;
}

export async function getCatalogProduct(productCode) {
  if (!productCode) return null;
  const db = await dbPromise;
  return db.get('catalog', productCode);
}

export async function getSetting(key, fallback = null) {
  const db = await dbPromise;
  const value = await db.get('settings', key);
  return value?.value ?? fallback;
}

export async function setSetting(key, value) {
  const db = await dbPromise;
  await db.put('settings', { key, value, updatedAt: new Date().toISOString() });
}

async function logEvent(type, payload) {
  const db = await dbPromise;
  await db.put('events', {
    id: uid('event'),
    type,
    payload,
    createdAt: new Date().toISOString()
  });
}

export async function exportDatabase() {
  const db = await dbPromise;
  return {
    schema: 1,
    app: 'Свежо',
    exportedAt: new Date().toISOString(),
    inventory: await db.getAll('inventory'),
    catalog: await db.getAll('catalog'),
    settings: await db.getAll('settings'),
    events: await db.getAll('events')
  };
}

export async function importDatabase(data) {
  if (!data || data.schema !== 1 || !Array.isArray(data.inventory)) {
    throw new Error('Файл не похож на резервную копию «Свежо».');
  }
  const db = await dbPromise;
  const tx = db.transaction(['inventory', 'catalog', 'settings', 'events'], 'readwrite');
  await Promise.all([
    tx.objectStore('inventory').clear(),
    tx.objectStore('catalog').clear(),
    tx.objectStore('settings').clear(),
    tx.objectStore('events').clear()
  ]);
  for (const item of data.inventory || []) await tx.objectStore('inventory').put(item);
  for (const item of data.catalog || []) await tx.objectStore('catalog').put(item);
  for (const item of data.settings || []) await tx.objectStore('settings').put(item);
  for (const item of data.events || []) await tx.objectStore('events').put(item);
  await tx.done;
}

export async function clearDatabase() {
  const db = await dbPromise;
  const tx = db.transaction(['inventory', 'catalog', 'settings', 'events'], 'readwrite');
  await Promise.all([...tx.objectStoreNames].map((name) => tx.objectStore(name).clear()));
  await tx.done;
}
