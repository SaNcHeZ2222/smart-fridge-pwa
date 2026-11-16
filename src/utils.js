const GS = '\u001d';

export function uid(prefix = 'id') {
  if (globalThis.crypto?.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function toLocalISO(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function addDaysISO(days, from = new Date()) {
  const date = new Date(from);
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + Number(days));
  return toLocalISO(date);
}

export function daysUntil(dateISO, now = new Date()) {
  if (!dateISO) return Number.POSITIVE_INFINITY;
  const today = new Date(toLocalISO(now));
  const target = new Date(dateISO);
  return Math.round((target - today) / 86_400_000);
}

export function formatDate(dateISO) {
  if (!dateISO) return 'Без срока';
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: new Date(dateISO).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
  }).format(new Date(`${dateISO}T12:00:00`));
}

export function expiryMeta(dateISO) {
  const days = daysUntil(dateISO);
  if (!Number.isFinite(days)) return { tone: 'muted', label: 'Срок не указан', days };
  if (days < 0) return { tone: 'danger', label: `Просрочено ${Math.abs(days)} дн.`, days };
  if (days === 0) return { tone: 'danger', label: 'Сегодня', days };
  if (days === 1) return { tone: 'warning', label: 'Завтра', days };
  if (days <= 3) return { tone: 'warning', label: `Через ${days} дн.`, days };
  return { tone: 'good', label: formatDate(dateISO), days };
}

export function normalizeText(value = '') {
  return String(value)
    .toLocaleLowerCase('ru-RU')
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]+/gi, ' ')
    .trim();
}

function parseYYMMDD(value) {
  if (!/^\d{6}$/.test(value)) return null;
  const yy = Number(value.slice(0, 2));
  const month = Number(value.slice(2, 4));
  let day = Number(value.slice(4, 6));
  const currentYY = new Date().getFullYear() % 100;
  const century = yy > currentYY + 50 ? 1900 : 2000;
  const year = century + yy;
  if (month < 1 || month > 12) return null;
  if (day === 0) day = new Date(year, month, 0).getDate();
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function parseGs1(raw = '') {
  const original = String(raw);
  let value = original.replace(/^]d2/, '').replace(/^\u00e8/, '');
  const result = {
    raw: original,
    gtin: null,
    serial: null,
    expiration: null,
    bestBefore: null,
    isGs1: false
  };

  const parenthesized = value.matchAll(/\((\d{2,4})\)([^()]*)/g);
  for (const match of parenthesized) {
    result.isGs1 = true;
    const [, ai, data] = match;
    if (ai === '01') result.gtin = data.slice(0, 14);
    if (ai === '15') result.bestBefore = parseYYMMDD(data.slice(0, 6));
    if (ai === '17') result.expiration = parseYYMMDD(data.slice(0, 6));
    if (ai === '21') result.serial = data.split(GS)[0];
  }

  if (result.isGs1) return result;

  const fixedAIs = [
    ['01', 14, 'gtin'],
    ['15', 6, 'bestBefore'],
    ['17', 6, 'expiration']
  ];

  for (const [ai, length, key] of fixedAIs) {
    const index = value.indexOf(ai);
    if (index === -1) continue;
    const data = value.slice(index + ai.length, index + ai.length + length);
    if (!/^\d+$/.test(data)) continue;
    result.isGs1 = true;
    result[key] = key === 'gtin' ? data : parseYYMMDD(data);
  }

  const serialIndex = value.indexOf('21');
  if (serialIndex !== -1 && result.gtin) {
    const tail = value.slice(serialIndex + 2);
    const separatorIndex = tail.indexOf(GS);
    result.serial = (separatorIndex === -1 ? tail : tail.slice(0, separatorIndex)).slice(0, 24) || null;
  }

  return result;
}

export function productCodeFromScan(raw) {
  const gs1 = parseGs1(raw);
  if (gs1.gtin) return gs1.gtin.replace(/^0+/, '') || gs1.gtin;
  return String(raw).replace(/\D/g, '') || String(raw);
}

export function profileAmount(ingredient, profile) {
  const angelina = Number(ingredient.angelina || 0);
  const sasha = Number(ingredient.sasha || 0);
  const value = profile === 'angelina' ? angelina : profile === 'sasha' ? sasha : angelina + sasha;
  return `${formatAmount(value)} ${ingredient.unit}`.trim();
}

export function formatAmount(value) {
  return Number.isInteger(value) ? String(value) : String(value).replace('.', ',');
}

export function sumRecipeIngredients(recipes, profile) {
  const totals = new Map();
  for (const recipe of recipes) {
    for (const ingredient of recipe.ingredients) {
      const amount = profile === 'angelina'
        ? ingredient.angelina
        : profile === 'sasha'
          ? ingredient.sasha
          : ingredient.angelina + ingredient.sasha;
      const key = `${ingredient.id}:${ingredient.unit}`;
      const current = totals.get(key) || {
        id: ingredient.id,
        label: ingredient.label,
        unit: ingredient.unit,
        amount: 0
      };
      current.amount += Number(amount || 0);
      totals.set(key, current);
    }
  }
  return [...totals.values()].sort((a, b) => a.label.localeCompare(b.label, 'ru'));
}
