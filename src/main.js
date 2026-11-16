import './styles.css';
import { registerSW } from 'virtual:pwa-register';
import {
  clearDatabase,
  exportDatabase,
  findInventoryForScan,
  getCatalogProduct,
  getInventoryItem,
  getSetting,
  importDatabase,
  listInventory,
  removeInventoryItem,
  saveInventoryItem,
  setSetting
} from './db.js';
import { INGREDIENTS, RECIPES } from './recipes.js';
import { beep, cameraSupported, startScanner, stopScanner } from './scanner.js';
import {
  addDaysISO,
  daysUntil,
  expiryMeta,
  formatAmount,
  normalizeText,
  parseGs1,
  productCodeFromScan,
  profileAmount,
  sumRecipeIngredients,
  toLocalISO
} from './utils.js';

const PROFILE_LABELS = {
  angelina: 'Ангелина',
  sasha: 'Саша',
  both: 'На двоих'
};

const state = {
  view: 'today',
  inventory: [],
  profile: 'both',
  search: '',
  zoneFilter: 'all',
  scanMode: 'add',
  facingMode: 'user',
  activeRecipeId: null,
  installPrompt: null,
  timers: readTimers(),
  shoppingChecked: new Set(JSON.parse(localStorage.getItem('svezho-shopping-checked') || '[]'))
};

const app = document.querySelector('#app');
app.innerHTML = shellMarkup();

const main = document.querySelector('#main-content');
const itemDialog = document.querySelector('#item-dialog');
const itemForm = document.querySelector('#item-form');
const scanDialog = document.querySelector('#scan-dialog');
const recipeDialog = document.querySelector('#recipe-dialog');
const importInput = document.querySelector('#import-file');

registerSW({
  onNeedRefresh() {
    showToast('Доступно обновление. Оно установится при следующем запуске.');
  },
  onOfflineReady() {
    showToast('Приложение готово работать без интернета.');
  }
});

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  state.installPrompt = event;
  render();
});

window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);
window.addEventListener('visibilitychange', () => {
  if (document.hidden) stopScanner();
  updateTimers();
});

bindStaticEvents();
initialize().catch((error) => {
  console.error(error);
  showToast('Не удалось открыть локальную базу. Перезапустите приложение.');
});

async function initialize() {
  state.profile = await getSetting('profile', 'both');
  await refreshInventory();
  updateNetworkStatus();
  renderTimers();
  setInterval(updateTimers, 1000);
}

async function refreshInventory() {
  state.inventory = await listInventory();
  state.inventory.sort((a, b) => {
    const expiry = String(a.expiresOn || '9999').localeCompare(String(b.expiresOn || '9999'));
    return expiry || a.name.localeCompare(b.name, 'ru');
  });
  render();
}

function render() {
  document.body.dataset.view = state.view;
  document.querySelectorAll('[data-nav]').forEach((button) => {
    const active = button.dataset.nav === state.view;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-current', active ? 'page' : 'false');
  });

  if (state.view === 'today') main.innerHTML = renderToday();
  if (state.view === 'inventory') main.innerHTML = renderInventory();
  if (state.view === 'recipes') main.innerHTML = renderRecipes();
  if (state.view === 'settings') main.innerHTML = renderSettings();
}

function renderToday() {
  const expiring = state.inventory.filter((item) => daysUntil(item.expiresOn) <= 3);
  const overdue = expiring.filter((item) => daysUntil(item.expiresOn) < 0);
  const today = expiring.filter((item) => daysUntil(item.expiresOn) === 0);
  const fridge = state.inventory.filter((item) => item.zone === 'fridge').length;
  const freezer = state.inventory.filter((item) => item.zone === 'freezer').length;
  const suggested = getSuggestedRecipe();
  const standalone = isStandalone();

  return `
    <section class="hero-card">
      <div>
        <p class="eyebrow">Домашний холодильник</p>
        <h1>${greeting()}, <span>всё свежее видно сразу</span></h1>
        <p class="hero-copy">Продуктов: ${state.inventory.length}. Просрочено: ${overdue.length}. На сегодня: ${today.length}.</p>
      </div>
      <div class="hero-actions">
        <button class="primary-button" data-action="scan-add"><span>⌁</span> Сканировать</button>
        <button class="secondary-button" data-action="manual-add">+ Вручную</button>
      </div>
    </section>

    ${!standalone ? `
      <section class="install-card">
        <div class="install-icon">↗</div>
        <div>
          <strong>Установите «Свежо» на экран iPhone</strong>
          <p>${state.installPrompt ? 'Можно установить прямо сейчас.' : 'В Safari нажмите «Поделиться» → «На экран Домой».'}</p>
        </div>
        ${state.installPrompt ? '<button class="tiny-button" data-action="install">Установить</button>' : ''}
      </section>
    ` : ''}

    <section class="stat-grid" aria-label="Состояние холодильника">
      ${statCard('Нужно проверить', overdue.length, overdue.length ? 'danger' : 'neutral', 'Просрочено')}
      ${statCard('Скоро использовать', expiring.filter((item) => daysUntil(item.expiresOn) >= 0).length, expiring.length ? 'warning' : 'neutral', 'До трёх дней')}
      ${statCard('Холодильник', fridge, 'cool', 'Упаковок')}
      ${statCard('Морозилка', freezer, 'ice', 'Запасов')}
    </section>

    <section class="section-block">
      <div class="section-heading">
        <div><p class="eyebrow">Сначала использовать</p><h2>Ближайшие сроки</h2></div>
        <button class="text-button" data-nav-jump="inventory">Все продукты →</button>
      </div>
      ${expiring.length ? `<div class="product-stack">${expiring.slice(0, 5).map(productRow).join('')}</div>` : emptyState('✓', 'Срочных продуктов нет', 'Добавьте сроки — здесь появится очередь на использование.')}
    </section>

    <section class="suggestion-card">
      <div class="suggestion-art">${suggested.emoji}</div>
      <div class="suggestion-body">
        <p class="eyebrow">Завтрак по запасам · ${PROFILE_LABELS[state.profile]}</p>
        <h2>${suggested.title}</h2>
        <p>${recipeAvailabilityText(suggested)} · ${suggested.duration} мин.</p>
        <button class="secondary-button" data-recipe="${suggested.id}">Открыть рецепт</button>
      </div>
    </section>
  `;
}

function renderInventory() {
  const query = normalizeText(state.search);
  const filtered = state.inventory.filter((item) => {
    const matchesZone = state.zoneFilter === 'all' || item.zone === state.zoneFilter;
    const matchesSearch = !query || normalizeText(item.name).includes(query);
    return matchesZone && matchesSearch;
  });

  return `
    <section class="page-heading">
      <div><p class="eyebrow">Локальная база</p><h1>Продукты</h1></div>
      <button class="primary-icon-button" data-action="manual-add" aria-label="Добавить продукт">+</button>
    </section>
    <label class="search-field">
      <span>⌕</span>
      <input id="inventory-search" type="search" placeholder="Найти продукт" value="${escapeHTML(state.search)}" autocomplete="off" />
    </label>
    <div class="segmented" role="group" aria-label="Место хранения">
      ${segmentButton('all', 'Все', state.zoneFilter)}
      ${segmentButton('fridge', 'Холодильник', state.zoneFilter)}
      ${segmentButton('freezer', 'Морозилка', state.zoneFilter)}
    </div>
    <div class="inventory-summary">Показано ${filtered.length} из ${state.inventory.length}</div>
    ${filtered.length ? `<div class="inventory-grid">${filtered.map(productCard).join('')}</div>` : emptyState('❄', 'Здесь пока пусто', 'Добавьте продукт вручную или отсканируйте упаковку.')}
    <button class="scan-fab" data-action="scan-menu" aria-label="Сканировать код"><span>⌁</span><b>Скан</b></button>
  `;
}

function renderRecipes() {
  const totals = sumRecipeIngredients(RECIPES, state.profile);
  return `
    <section class="page-heading recipes-heading">
      <div><p class="eyebrow">7 быстрых вариантов</p><h1>Завтраки</h1></div>
      <div class="profile-pill">${PROFILE_LABELS[state.profile]}</div>
    </section>
    ${profileSelector()}
    <div class="recipe-grid">
      ${RECIPES.map(recipeCard).join('')}
    </div>
    <section class="section-block shopping-section">
      <div class="section-heading">
        <div><p class="eyebrow">На всю неделю</p><h2>Список покупок</h2></div>
        <span class="count-badge">${totals.length}</span>
      </div>
      <p class="section-copy">Количество рассчитано для профиля «${PROFILE_LABELS[state.profile]}». Наличие проверяется по категориям продуктов.</p>
      <div class="shopping-list">
        ${totals.map(shoppingRow).join('')}
      </div>
    </section>
  `;
}

function renderSettings() {
  const localSize = new Blob([JSON.stringify(state.inventory)]).size;
  return `
    <section class="page-heading">
      <div><p class="eyebrow">Данные на устройстве</p><h1>Настройки</h1></div>
      <div class="local-mark">◉ Локально</div>
    </section>
    <section class="settings-card">
      <h2>Порции рецептов</h2>
      <p>Переключатель меняет количество ингредиентов и недельный список покупок.</p>
      ${profileSelector()}
    </section>
    <section class="settings-card">
      <h2>Резервная копия</h2>
      <p>${state.inventory.length} продуктов · примерно ${formatBytes(localSize)}. Файл содержит только вашу локальную базу.</p>
      <div class="settings-actions">
        <button class="secondary-button" data-action="export">Экспортировать</button>
        <button class="ghost-button" data-action="import">Импортировать</button>
      </div>
    </section>
    <section class="settings-card">
      <h2>Проверка прототипа</h2>
      <p>Можно добавить несколько демонстрационных продуктов и посмотреть сроки, рецепты и список покупок.</p>
      <button class="ghost-button" data-action="demo">Добавить пример</button>
    </section>
    <section class="settings-card privacy-card">
      <h2>Приватность</h2>
      <ul>
        <li>Содержимое холодильника хранится в IndexedDB на этом устройстве.</li>
        <li>Камера включается только на экране сканирования.</li>
        <li>Фотографии и видео не сохраняются и никуда не отправляются.</li>
      </ul>
    </section>
    <section class="danger-zone">
      <h2>Очистить локальные данные</h2>
      <p>Перед очисткой рекомендуется сделать резервную копию.</p>
      <button class="danger-button" data-action="clear">Удалить все данные</button>
    </section>
    <p class="version-note">Свежо · MVP 0.1 · ${navigator.onLine ? 'в сети' : 'офлайн'}</p>
  `;
}

function bindStaticEvents() {
  document.querySelector('.bottom-nav').addEventListener('click', (event) => {
    const button = event.target.closest('[data-nav]');
    if (!button) return;
    state.view = button.dataset.nav;
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  main.addEventListener('click', handleMainClick);
  main.addEventListener('input', (event) => {
    if (event.target.id === 'inventory-search') {
      state.search = event.target.value;
      render();
      requestAnimationFrame(() => {
        const input = document.querySelector('#inventory-search');
        input?.focus();
        input?.setSelectionRange(state.search.length, state.search.length);
      });
    }
  });

  itemForm.addEventListener('submit', handleItemSubmit);
  itemDialog.addEventListener('click', handleDialogBackdrop);
  scanDialog.addEventListener('click', handleDialogBackdrop);
  recipeDialog.addEventListener('click', handleDialogBackdrop);
  scanDialog.addEventListener('close', stopScanner);

  document.querySelectorAll('[data-close-dialog]').forEach((button) => {
    button.addEventListener('click', () => button.closest('dialog').close());
  });

  document.querySelector('#scan-switch-camera').addEventListener('click', async () => {
    state.facingMode = state.facingMode === 'user' ? 'environment' : 'user';
    await runCamera();
  });
  document.querySelector('#scan-manual-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get('code')?.trim();
    if (value) handleScannedCode(value);
  });
  document.querySelector('#scan-retry').addEventListener('click', runCamera);
  document.querySelector('#quick-date-row').addEventListener('click', (event) => {
    const button = event.target.closest('[data-add-days]');
    if (!button) return;
    itemForm.elements.expiresOn.value = addDaysISO(button.dataset.addDays);
  });
  document.querySelector('#remove-item').addEventListener('click', async () => {
    const id = itemForm.elements.id.value;
    if (!id || !confirm('Убрать этот продукт из списка?')) return;
    await removeInventoryItem(id);
    itemDialog.close();
    showToast('Продукт убран.');
    await refreshInventory();
  });
  importInput.addEventListener('change', handleImport);
  document.querySelector('#timer-dock').addEventListener('click', (event) => {
    const button = event.target.closest('[data-cancel-timer]');
    if (!button) return;
    state.timers = state.timers.filter((timer) => timer.id !== button.dataset.cancelTimer);
    saveTimers();
    renderTimers();
  });
}

async function handleMainClick(event) {
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'manual-add') openItemDialog();
  if (action === 'scan-add') openScanner('add');
  if (action === 'scan-menu') openScanMenu();
  if (action === 'install') await installApp();
  if (action === 'export') await exportBackup();
  if (action === 'import') importInput.click();
  if (action === 'demo') await addDemoData();
  if (action === 'clear') await clearAllData();

  const navJump = event.target.closest('[data-nav-jump]');
  if (navJump) {
    state.view = navJump.dataset.navJump;
    render();
  }

  const filter = event.target.closest('[data-zone-filter]');
  if (filter) {
    state.zoneFilter = filter.dataset.zoneFilter;
    render();
  }

  const edit = event.target.closest('[data-edit-item]');
  if (edit) openItemDialog(await getInventoryItem(edit.dataset.editItem));

  const remove = event.target.closest('[data-remove-item]');
  if (remove && confirm('Убрать продукт из холодильника?')) {
    await removeInventoryItem(remove.dataset.removeItem);
    showToast('Продукт убран.');
    await refreshInventory();
  }

  const profile = event.target.closest('[data-profile]');
  if (profile) {
    state.profile = profile.dataset.profile;
    await setSetting('profile', state.profile);
    render();
  }

  const recipe = event.target.closest('[data-recipe]');
  if (recipe) openRecipe(recipe.dataset.recipe);

  const shopping = event.target.closest('[data-shopping-id]');
  if (shopping) {
    const id = shopping.dataset.shoppingId;
    if (state.shoppingChecked.has(id)) state.shoppingChecked.delete(id);
    else state.shoppingChecked.add(id);
    localStorage.setItem('svezho-shopping-checked', JSON.stringify([...state.shoppingChecked]));
    render();
  }
}

function openScanMenu() {
  const add = confirm('Нажмите «OK», чтобы ДОБАВИТЬ продукт.\n«Отмена» — чтобы УБРАТЬ продукт.');
  openScanner(add ? 'add' : 'remove');
}

async function openScanner(mode) {
  state.scanMode = mode;
  document.querySelector('#scan-title').textContent = mode === 'add' ? 'Добавить сканированием' : 'Убрать сканированием';
  document.querySelector('#scan-copy').textContent = mode === 'add'
    ? 'Поднесите EAN или Data Matrix к рамке.'
    : 'Поднесите код продукта, который забираете.';
  document.querySelector('#scan-manual-form').reset();
  scanDialog.showModal();
  await runCamera();
}

async function runCamera() {
  const status = document.querySelector('#scan-status');
  const retry = document.querySelector('#scan-retry');
  const video = document.querySelector('#scan-video');
  video.classList.toggle('is-environment', state.facingMode === 'environment');
  retry.hidden = true;
  if (!cameraSupported()) {
    status.textContent = 'Камера недоступна. Введите код вручную.';
    retry.hidden = false;
    return;
  }
  try {
    await startScanner({
      video,
      facingMode: state.facingMode,
      onStatus: (message) => { status.textContent = message; },
      onResult: ({ text }) => handleScannedCode(text)
    });
  } catch (error) {
    status.textContent = cameraErrorMessage(error);
    retry.hidden = false;
  }
}

async function handleScannedCode(rawCode) {
  stopScanner();
  beep();
  const gs1 = parseGs1(rawCode);
  const productCode = productCodeFromScan(rawCode);
  const scanCode = gs1.gtin && gs1.serial ? `${gs1.gtin}:${gs1.serial}` : rawCode;

  if (state.scanMode === 'remove') {
    const item = await findInventoryForScan({ scanCode, productCode });
    if (!item) {
      showToast('Такого продукта в списке не найдено.');
      await runCamera();
      return;
    }
    if (confirm(`Убрать «${item.name}» из ${item.zone === 'freezer' ? 'морозилки' : 'холодильника'}?`)) {
      await removeInventoryItem(item.id);
      scanDialog.close();
      showToast(`Убрано: ${item.name}`);
      await refreshInventory();
    } else {
      await runCamera();
    }
    return;
  }

  const catalog = await getCatalogProduct(productCode);
  scanDialog.close();
  openItemDialog({
    name: catalog?.name || '',
    ingredientId: catalog?.ingredientId || 'other',
    unit: catalog?.unit || 'шт.',
    productCode,
    scanCode,
    serial: gs1.serial,
    expiresOn: gs1.expiration || gs1.bestBefore || ''
  });
  if (!gs1.expiration && !gs1.bestBefore) showToast('Код считан. Теперь укажите срок на упаковке.');
}

function openItemDialog(item = null) {
  itemForm.reset();
  itemForm.elements.id.value = item?.id || '';
  itemForm.elements.name.value = item?.name || '';
  itemForm.elements.ingredientId.value = item?.ingredientId || 'other';
  itemForm.elements.zone.value = item?.zone || 'fridge';
  itemForm.elements.quantity.value = item?.quantity || 1;
  itemForm.elements.unit.value = item?.unit || 'шт.';
  itemForm.elements.expiresOn.value = item?.expiresOn || '';
  itemForm.elements.opened.checked = Boolean(item?.opened);
  itemForm.elements.productCode.value = item?.productCode || '';
  itemForm.elements.scanCode.value = item?.scanCode || '';
  itemForm.elements.serial.value = item?.serial || '';
  document.querySelector('#item-dialog-title').textContent = item?.id ? 'Изменить продукт' : 'Добавить продукт';
  document.querySelector('#remove-item').hidden = !item?.id;
  itemDialog.showModal();
  setTimeout(() => itemForm.elements.name.focus(), 80);
}

async function handleItemSubmit(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(itemForm));
  if (!data.name.trim()) return;
  const previous = data.id ? await getInventoryItem(data.id) : null;
  await saveInventoryItem({
    ...previous,
    ...data,
    opened: itemForm.elements.opened.checked,
    expiresOn: data.expiresOn || null
  });
  itemDialog.close();
  showToast(previous ? 'Изменения сохранены.' : 'Продукт добавлен.');
  await refreshInventory();
}

function openRecipe(id) {
  const recipe = RECIPES.find((item) => item.id === id);
  if (!recipe) return;
  state.activeRecipeId = id;
  const available = new Set(state.inventory.map((item) => item.ingredientId));
  recipeDialog.querySelector('.recipe-dialog-content').innerHTML = `
    <div class="recipe-dialog-hero">
      <div class="recipe-emoji">${recipe.emoji}</div>
      <div><p class="eyebrow">${recipe.day} · ${recipe.duration} мин.</p><h2>${recipe.title}</h2><p>${escapeHTML(recipe.note)}</p></div>
    </div>
    <div class="profile-inline">${profileSelector()}</div>
    <h3>Ингредиенты</h3>
    <div class="ingredient-list">
      ${recipe.ingredients.map((ingredient) => `
        <div class="ingredient-row ${available.has(ingredient.id) ? 'is-available' : ''}">
          <span class="ingredient-check">${available.has(ingredient.id) ? '✓' : '○'}</span>
          <span>${escapeHTML(ingredient.label)}</span>
          <b>${profileAmount(ingredient, state.profile)}</b>
        </div>
      `).join('')}
    </div>
    <h3>Как готовить</h3>
    <ol class="step-list">
      ${recipe.steps.map((step, index) => `
        <li>
          <span class="step-number">${index + 1}</span>
          <div><p>${escapeHTML(step.text)}</p>${step.timerSeconds ? `<button class="timer-button" data-timer="${step.timerSeconds}" data-timer-label="${escapeHTML(step.timerLabel || recipe.title)}">▶ Таймер ${formatTimer(step.timerSeconds)}</button>` : ''}</div>
        </li>
      `).join('')}
    </ol>
    ${recipe.substitutes.length ? `<div class="substitute-box"><strong>Можно заменить</strong>${recipe.substitutes.map((item) => `<p>${escapeHTML(item)}</p>`).join('')}</div>` : ''}
  `;
  if (!recipeDialog.open) recipeDialog.showModal();

  recipeDialog.querySelectorAll('[data-profile]').forEach((button) => {
    button.addEventListener('click', async () => {
      state.profile = button.dataset.profile;
      await setSetting('profile', state.profile);
      openRecipe(id);
      render();
    }, { once: true });
  });
  recipeDialog.querySelectorAll('[data-timer]').forEach((button) => {
    button.addEventListener('click', () => startTimer(Number(button.dataset.timer), button.dataset.timerLabel));
  });
}

function startTimer(seconds, label) {
  const timer = {
    id: `timer_${Date.now()}`,
    label,
    endAt: Date.now() + seconds * 1000
  };
  state.timers.push(timer);
  saveTimers();
  renderTimers();
  showToast(`Таймер «${label}» запущен.`);
}

function updateTimers() {
  const now = Date.now();
  const finished = state.timers.filter((timer) => timer.endAt <= now);
  if (finished.length) {
    finished.forEach((timer) => {
      beep({ frequency: 1040, duration: 0.3 });
      showToast(`Готово: ${timer.label}`);
    });
    state.timers = state.timers.filter((timer) => timer.endAt > now);
    saveTimers();
  }
  renderTimers();
}

function renderTimers() {
  const dock = document.querySelector('#timer-dock');
  if (!state.timers.length) {
    dock.hidden = true;
    dock.innerHTML = '';
    return;
  }
  dock.hidden = false;
  dock.innerHTML = state.timers.map((timer) => {
    const seconds = Math.max(0, Math.ceil((timer.endAt - Date.now()) / 1000));
    return `<div class="active-timer"><span>◷</span><div><small>${escapeHTML(timer.label)}</small><b>${formatTimer(seconds)}</b></div><button data-cancel-timer="${timer.id}" aria-label="Отменить таймер">×</button></div>`;
  }).join('');
}

async function exportBackup() {
  const data = await exportDatabase();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const fileName = `svezho-backup-${toLocalISO()}.json`;
  const file = new File([blob], fileName, { type: blob.type });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ title: 'Резервная копия «Свежо»', files: [file] });
    return;
  }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function handleImport(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!confirm('Импорт заменит текущие локальные данные. Продолжить?')) return;
    await importDatabase(data);
    showToast('Резервная копия восстановлена.');
    await refreshInventory();
  } catch (error) {
    alert(error.message || 'Не удалось прочитать файл.');
  } finally {
    event.target.value = '';
  }
}

async function addDemoData() {
  const samples = [
    { name: 'Яйца', ingredientId: 'egg', zone: 'fridge', quantity: 10, unit: 'шт.', expiresOn: addDaysISO(8) },
    { name: 'Шампиньоны', ingredientId: 'mushroom', zone: 'fridge', quantity: 250, unit: 'г', expiresOn: addDaysISO(2) },
    { name: 'Красная рыба', ingredientId: 'red-fish', zone: 'fridge', quantity: 240, unit: 'г', expiresOn: addDaysISO(1), opened: true },
    { name: 'Брокколи замороженная', ingredientId: 'broccoli', zone: 'freezer', quantity: 250, unit: 'г', expiresOn: addDaysISO(90) },
    { name: 'Тонкий лаваш', ingredientId: 'lavash', zone: 'fridge', quantity: 300, unit: 'г', expiresOn: addDaysISO(5) }
  ];
  for (const sample of samples) await saveInventoryItem(sample);
  showToast('Добавлены демонстрационные продукты.');
  await refreshInventory();
}

async function clearAllData() {
  if (!confirm('Точно удалить все продукты, каталог и настройки с этого устройства?')) return;
  if (!confirm('Это действие нельзя отменить без резервной копии. Удалить?')) return;
  await clearDatabase();
  state.profile = 'both';
  state.shoppingChecked.clear();
  localStorage.removeItem('svezho-shopping-checked');
  showToast('Локальная база очищена.');
  await refreshInventory();
}

async function installApp() {
  if (!state.installPrompt) return;
  await state.installPrompt.prompt();
  state.installPrompt = null;
  render();
}

function getSuggestedRecipe() {
  const scored = RECIPES.map((recipe) => ({ recipe, score: recipeScore(recipe) }));
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.recipe || RECIPES[0];
}

function recipeScore(recipe) {
  const available = new Set(state.inventory.map((item) => item.ingredientId));
  const urgency = new Map(
    state.inventory.map((item) => [item.ingredientId, Math.max(0, 4 - Math.max(0, daysUntil(item.expiresOn)))])
  );
  return recipe.ingredients.reduce((score, ingredient) => {
    return score + (available.has(ingredient.id) ? 3 : 0) + (urgency.get(ingredient.id) || 0);
  }, 0);
}

function recipeAvailability(recipe) {
  const available = new Set(state.inventory.map((item) => item.ingredientId));
  const count = recipe.ingredients.filter((ingredient) => available.has(ingredient.id)).length;
  return { count, total: recipe.ingredients.length };
}

function recipeAvailabilityText(recipe) {
  const { count, total } = recipeAvailability(recipe);
  if (count === total) return 'Всё есть';
  if (count === 0) return 'Запасы не отмечены';
  return `Есть ${count} из ${total}`;
}

function hasIngredient(id) {
  return state.inventory.some((item) => item.ingredientId === id);
}

function productRow(item) {
  const expiry = expiryMeta(item.expiresOn);
  return `
    <button class="product-row" data-edit-item="${item.id}">
      <span class="product-zone ${item.zone}">${item.zone === 'freezer' ? '❄' : '●'}</span>
      <span class="product-main"><b>${escapeHTML(item.name)}</b><small>${item.quantity} ${escapeHTML(item.unit)}${item.opened ? ' · открыто' : ''}</small></span>
      <span class="expiry-badge ${expiry.tone}">${expiry.label}</span>
    </button>
  `;
}

function productCard(item) {
  const expiry = expiryMeta(item.expiresOn);
  return `
    <article class="product-card">
      <button class="product-card-main" data-edit-item="${item.id}">
        <span class="category-icon">${ingredientIcon(item.ingredientId)}</span>
        <span><b>${escapeHTML(item.name)}</b><small>${item.zone === 'freezer' ? 'Морозилка' : 'Холодильник'} · ${item.quantity} ${escapeHTML(item.unit)}</small></span>
      </button>
      <div class="product-card-footer">
        <span class="expiry-badge ${expiry.tone}">${expiry.label}</span>
        <button class="remove-circle" data-remove-item="${item.id}" aria-label="Убрать ${escapeHTML(item.name)}">−</button>
      </div>
    </article>
  `;
}

function recipeCard(recipe) {
  const availability = recipeAvailability(recipe);
  const percent = Math.round((availability.count / availability.total) * 100);
  return `
    <button class="recipe-card" data-recipe="${recipe.id}">
      <div class="recipe-art"><span>${recipe.emoji}</span><small>${recipe.day}</small></div>
      <div class="recipe-card-body">
        <div class="recipe-meta"><span>${recipe.duration} мин.</span><span>${availability.count}/${availability.total} есть</span></div>
        <h2>${recipe.title}</h2>
        <div class="availability-bar"><i style="width:${percent}%"></i></div>
      </div>
    </button>
  `;
}

function shoppingRow(item) {
  const id = `${item.id}:${item.unit}`;
  const checked = state.shoppingChecked.has(id);
  const present = hasIngredient(item.id);
  return `
    <button class="shopping-row ${checked ? 'is-checked' : ''}" data-shopping-id="${id}">
      <span class="shopping-check">${checked ? '✓' : ''}</span>
      <span><b>${escapeHTML(item.label)}</b><small>${present ? 'Есть дома — проверьте остаток' : 'Не найдено в запасах'}</small></span>
      <strong>${formatAmount(item.amount)} ${item.unit}</strong>
    </button>
  `;
}

function profileSelector() {
  return `
    <div class="segmented profile-selector" role="group" aria-label="Порция">
      ${profileButton('angelina', 'Ангелина')}
      ${profileButton('sasha', 'Саша')}
      ${profileButton('both', 'На двоих')}
    </div>
  `;
}

function profileButton(id, label) {
  return `<button class="${state.profile === id ? 'is-active' : ''}" data-profile="${id}">${label}</button>`;
}

function segmentButton(id, label, current) {
  return `<button class="${current === id ? 'is-active' : ''}" data-zone-filter="${id}">${label}</button>`;
}

function statCard(title, value, tone, caption) {
  return `<article class="stat-card ${tone}"><span>${title}</span><b>${value}</b><small>${caption}</small></article>`;
}

function emptyState(icon, title, copy) {
  return `<div class="empty-state"><span>${icon}</span><h3>${title}</h3><p>${copy}</p></div>`;
}

function ingredientIcon(id) {
  const icons = {
    egg: '🥚', tuna: '🐟', 'red-fish': '🐟', lavash: '🫓', bread: '🍞', fruit: '🍎',
    greens: '🥬', mushroom: '🍄', broccoli: '🥦', tomato: '🍅', avocado: '🥑',
    oatmeal: '🥣', buckwheat: '🥣', berries: '🫐', 'hard-cheese': '🧀', 'cream-cheese': '🧀'
  };
  return icons[id] || '◌';
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Доброе утро';
  if (hour < 18) return 'Добрый день';
  return 'Добрый вечер';
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function updateNetworkStatus() {
  const badge = document.querySelector('#network-status');
  badge.textContent = navigator.onLine ? 'онлайн' : 'офлайн';
  badge.classList.toggle('is-offline', !navigator.onLine);
}

function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => { toast.hidden = true; }, 3200);
}

function handleDialogBackdrop(event) {
  if (event.target === event.currentTarget) event.currentTarget.close();
}

function cameraErrorMessage(error) {
  if (error?.name === 'NotAllowedError') return 'Доступ к камере запрещён. Разрешите его в настройках Safari.';
  if (error?.name === 'NotFoundError') return 'Камера не найдена.';
  return 'Не удалось запустить камеру. Можно ввести код вручную.';
}

function formatTimer(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} Б`;
  return `${(bytes / 1024).toFixed(1).replace('.', ',')} КБ`;
}

function readTimers() {
  try {
    return JSON.parse(localStorage.getItem('svezho-timers') || '[]');
  } catch {
    return [];
  }
}

function saveTimers() {
  localStorage.setItem('svezho-timers', JSON.stringify(state.timers));
}

function escapeHTML(value = '') {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);
}

function shellMarkup() {
  const options = INGREDIENTS.map((item) => `<option value="${item.id}">${item.label}</option>`).join('');
  return `
    <header class="app-header">
      <a class="brand" href="./" aria-label="Свежо — главная"><span class="brand-mark">С</span><span>Свежо</span></a>
      <div id="network-status" class="network-status">онлайн</div>
    </header>
    <main id="main-content" tabindex="-1"></main>
    <nav class="bottom-nav" aria-label="Основное меню">
      <button data-nav="today"><span>⌂</span><small>Сегодня</small></button>
      <button data-nav="inventory"><span>▦</span><small>Продукты</small></button>
      <button data-nav="recipes"><span>⌘</span><small>Завтраки</small></button>
      <button data-nav="settings"><span>⚙</span><small>Ещё</small></button>
    </nav>

    <dialog id="item-dialog" class="sheet-dialog">
      <form id="item-form" method="dialog" class="sheet-card">
        <div class="sheet-handle"></div>
        <div class="dialog-heading"><h2 id="item-dialog-title">Добавить продукт</h2><button type="button" data-close-dialog aria-label="Закрыть">×</button></div>
        <input type="hidden" name="id" />
        <input type="hidden" name="productCode" />
        <input type="hidden" name="scanCode" />
        <input type="hidden" name="serial" />
        <label class="field"><span>Название</span><input name="name" required placeholder="Например, молоко" autocomplete="off" /></label>
        <label class="field"><span>Категория для рецептов</span><select name="ingredientId">${options}</select></label>
        <div class="field-grid">
          <label class="field"><span>Где лежит</span><select name="zone"><option value="fridge">Холодильник</option><option value="freezer">Морозилка</option></select></label>
          <label class="field"><span>Количество</span><div class="quantity-field"><input name="quantity" type="number" min="0" step="0.1" value="1" /><select name="unit"><option>шт.</option><option>г</option><option>кг</option><option>мл</option><option>л</option><option>уп.</option></select></div></label>
        </div>
        <label class="field"><span>Годен до</span><input name="expiresOn" type="date" /></label>
        <div id="quick-date-row" class="quick-dates"><button type="button" data-add-days="1">+1 день</button><button type="button" data-add-days="3">+3</button><button type="button" data-add-days="7">+7</button><button type="button" data-add-days="14">+14</button></div>
        <label class="check-field"><input name="opened" type="checkbox" /><span>Упаковка уже открыта</span></label>
        <div class="dialog-actions"><button id="remove-item" class="danger-link" type="button" hidden>Убрать</button><button class="primary-button" type="submit">Сохранить</button></div>
      </form>
    </dialog>

    <dialog id="scan-dialog" class="camera-dialog">
      <div class="camera-shell">
        <div class="camera-topbar"><button data-close-dialog aria-label="Закрыть">×</button><div><h2 id="scan-title">Сканирование</h2><p id="scan-copy">Поднесите код к рамке.</p></div><button id="scan-switch-camera" aria-label="Сменить камеру">↻</button></div>
        <div class="camera-stage"><video id="scan-video" autoplay muted playsinline></video><div class="scan-frame"><i></i><i></i><i></i><i></i></div><div class="screen-light"></div></div>
        <div class="camera-controls"><p id="scan-status">Запускаю камеру…</p><button id="scan-retry" class="tiny-button" type="button" hidden>Повторить</button><form id="scan-manual-form"><input name="code" placeholder="Или введите код" inputmode="numeric" /><button>Готово</button></form></div>
      </div>
    </dialog>

    <dialog id="recipe-dialog" class="sheet-dialog recipe-dialog">
      <div class="sheet-card">
        <div class="sheet-handle"></div>
        <div class="dialog-heading"><span></span><button type="button" data-close-dialog aria-label="Закрыть">×</button></div>
        <div class="recipe-dialog-content"></div>
      </div>
    </dialog>

    <input id="import-file" type="file" accept="application/json,.json" hidden />
    <div id="timer-dock" class="timer-dock" hidden></div>
    <div id="toast" class="toast" role="status" aria-live="polite" hidden></div>
  `;
}
