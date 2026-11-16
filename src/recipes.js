export const INGREDIENTS = [
  { id: 'other', label: 'Другое', keywords: [] },
  { id: 'egg', label: 'Яйца', keywords: ['яйц'] },
  { id: 'lavash', label: 'Тонкий лаваш', keywords: ['лаваш'] },
  { id: 'tuna', label: 'Тунец', keywords: ['тунец', 'тунц'] },
  { id: 'cream-cheese', label: 'Творожный сыр', keywords: ['творожн сыр'] },
  { id: 'corn', label: 'Кукуруза', keywords: ['кукуруз'] },
  { id: 'green-onion', label: 'Зелёный лук', keywords: ['зелен лук', 'зелён лук'] },
  { id: 'fruit', label: 'Сезонные фрукты', keywords: ['фрукт', 'яблок', 'банан', 'груш'] },
  { id: 'bread', label: 'Цельнозерновой хлеб', keywords: ['хлеб', 'тост'] },
  { id: 'red-fish', label: 'Красная рыба', keywords: ['красн рыб', 'лосос', 'форел', 'семг'] },
  { id: 'avocado', label: 'Авокадо', keywords: ['авокад'] },
  { id: 'greens', label: 'Шпинат, салат или капуста', keywords: ['шпинат', 'салат', 'капуст', 'зелень'] },
  { id: 'radish', label: 'Редис', keywords: ['редис'] },
  { id: 'mushroom', label: 'Шампиньоны', keywords: ['шампинь', 'гриб'] },
  { id: 'hard-cheese', label: 'Твёрдый сыр', keywords: ['тверд сыр', 'твёрд сыр', 'сыр'] },
  { id: 'oil', label: 'Растительное масло', keywords: ['масл растит'] },
  { id: 'tomato', label: 'Помидоры', keywords: ['помидор', 'томат'] },
  { id: 'oatmeal', label: 'Овсяная каша', keywords: ['овсян', 'овсяная каша'] },
  { id: 'chia', label: 'Семена чиа', keywords: ['чиа'] },
  { id: 'plant-milk', label: 'Растительное молоко', keywords: ['растител молок', 'миндальн молок', 'овсян молок'] },
  { id: 'berries', label: 'Замороженные ягоды', keywords: ['ягод'] },
  { id: 'honey', label: 'Мёд', keywords: ['мед', 'мёд'] },
  { id: 'broccoli', label: 'Брокколи', keywords: ['броккол'] },
  { id: 'sunflower-seeds', label: 'Семечки', keywords: ['семеч'] },
  { id: 'buckwheat', label: 'Гречка', keywords: ['греч'] }
];

export const RECIPES = [
  {
    id: 'tuna-roll',
    day: 'Понедельник',
    title: 'Ролл с тунцом',
    duration: 3,
    emoji: '🌯',
    note: 'Яйца сварить на 2–3 дня заранее.',
    ingredients: [
      { id: 'lavash', label: 'Тонкий лаваш', angelina: 50, sasha: 65, unit: 'г' },
      { id: 'tuna', label: 'Тунец без жидкости', angelina: 90, sasha: 130, unit: 'г' },
      { id: 'cream-cheese', label: 'Творожный сыр', angelina: 20, sasha: 25, unit: 'г' },
      { id: 'corn', label: 'Кукуруза', angelina: 15, sasha: 20, unit: 'г' },
      { id: 'egg', label: 'Варёные яйца', angelina: 1, sasha: 1, unit: 'шт.' },
      { id: 'green-onion', label: 'Зелёный лук', angelina: 5, sasha: 7, unit: 'г' },
      { id: 'fruit', label: 'Сезонный фрукт', angelina: 150, sasha: 200, unit: 'г' }
    ],
    steps: [
      { text: 'Смешайте тунца, творожный сыр, кукурузу, рубленое яйцо и зелёный лук.' },
      { text: 'Выложите начинку на лаваш, сверните и разрежьте.' },
      { text: 'Фрукт подайте отдельно.' }
    ],
    substitutes: ['Тунец можно заменить заранее приготовленной курицей: 100 г для Ангелины и 130 г для Саши.']
  },
  {
    id: 'salmon-toast',
    day: 'Вторник',
    title: 'Тост с красной рыбой и яйцами',
    duration: 3,
    emoji: '🥑',
    note: 'Яйца сварить заранее; рыбу взять небольшой упаковкой на два завтрака.',
    ingredients: [
      { id: 'bread', label: 'Цельнозерновой хлеб', angelina: 50, sasha: 75, unit: 'г' },
      { id: 'red-fish', label: 'Красная рыба', angelina: 50, sasha: 70, unit: 'г' },
      { id: 'avocado', label: 'Авокадо', angelina: 70, sasha: 70, unit: 'г' },
      { id: 'egg', label: 'Варёные яйца', angelina: 2, sasha: 2, unit: 'шт.' },
      { id: 'greens', label: 'Шпинат', angelina: 30, sasha: 40, unit: 'г' },
      { id: 'radish', label: 'Редис и зелёный лук', angelina: 35, sasha: 47, unit: 'г' },
      { id: 'fruit', label: 'Сезонный фрукт', angelina: 150, sasha: 200, unit: 'г' }
    ],
    steps: [
      { text: 'Разомните авокадо и намажьте на хлеб.' },
      { text: 'Сверху положите шпинат, редис, зелёный лук и красную рыбу.' },
      { text: 'Подайте с варёными яйцами и фруктом.' }
    ],
    substitutes: ['Если красная рыба дорогая, замените её тунцом в собственном соку в том же весе.']
  },
  {
    id: 'mushroom-scramble',
    day: 'Среда',
    title: 'Скрэмбл с грибами и шпинатом',
    duration: 5,
    emoji: '🍳',
    note: 'Грибы можно нарезать вечером или купить уже нарезанными.',
    ingredients: [
      { id: 'egg', label: 'Яйца', angelina: 2, sasha: 3, unit: 'шт.' },
      { id: 'mushroom', label: 'Шампиньоны', angelina: 100, sasha: 130, unit: 'г' },
      { id: 'greens', label: 'Шпинат', angelina: 30, sasha: 40, unit: 'г' },
      { id: 'hard-cheese', label: 'Твёрдый сыр', angelina: 15, sasha: 20, unit: 'г' },
      { id: 'oil', label: 'Растительное масло', angelina: 5, sasha: 7, unit: 'г' },
      { id: 'fruit', label: 'Сезонный фрукт', angelina: 150, sasha: 200, unit: 'г' }
    ],
    steps: [
      { text: 'На горячей сковороде обжарьте грибы.', timerSeconds: 120, timerLabel: 'Грибы' },
      { text: 'Добавьте шпинат, затем влейте яйца и перемешивайте.', timerSeconds: 90, timerLabel: 'Скрэмбл' },
      { text: 'Посыпьте сыром и подайте с фруктом.' }
    ],
    substitutes: ['Шпинат можно заменить тонко нашинкованной капустой, салатом или другой зеленью.']
  },
  {
    id: 'egg-quesadilla',
    day: 'Четверг',
    title: 'Яичная кесадилья',
    duration: 5,
    emoji: '🫓',
    note: 'Сыр натереть, овощи нарезать вечером.',
    ingredients: [
      { id: 'lavash', label: 'Тонкий лаваш', angelina: 80, sasha: 100, unit: 'г' },
      { id: 'egg', label: 'Яйца', angelina: 1, sasha: 2, unit: 'шт.' },
      { id: 'hard-cheese', label: 'Твёрдый сыр', angelina: 25, sasha: 30, unit: 'г' },
      { id: 'tomato', label: 'Помидор', angelina: 100, sasha: 130, unit: 'г' },
      { id: 'greens', label: 'Шпинат или капуста', angelina: 30, sasha: 40, unit: 'г' },
      { id: 'green-onion', label: 'Зелёный лук', angelina: 5, sasha: 7, unit: 'г' },
      { id: 'fruit', label: 'Сезонный фрукт', angelina: 150, sasha: 200, unit: 'г' }
    ],
    steps: [
      { text: 'Положите лаваш на горячую сухую сковороду. Распределите яйцо, зелень, помидор и сыр.' },
      { text: 'Накройте вторым листом и готовьте под крышкой.', timerSeconds: 120, timerLabel: 'Первая сторона' },
      { text: 'Переверните и готовьте ещё минуту.', timerSeconds: 60, timerLabel: 'Вторая сторона' }
    ],
    substitutes: ['Шпинат можно заменить капустой или салатом.']
  },
  {
    id: 'overnight-oats',
    day: 'Пятница',
    title: 'Овсянка с чиа из банки и яйца',
    duration: 2,
    emoji: '🫙',
    note: 'Собрать банку вечером за одну минуту; утром готовить не нужно.',
    ingredients: [
      { id: 'oatmeal', label: 'Готовая овсяная каша', angelina: 100, sasha: 130, unit: 'г' },
      { id: 'chia', label: 'Семена чиа', angelina: 20, sasha: 25, unit: 'г' },
      { id: 'plant-milk', label: 'Растительное молоко', angelina: 150, sasha: 200, unit: 'мл' },
      { id: 'berries', label: 'Замороженные ягоды', angelina: 80, sasha: 100, unit: 'г' },
      { id: 'honey', label: 'Мёд', angelina: 5, sasha: 7, unit: 'г' },
      { id: 'egg', label: 'Варёные яйца', angelina: 2, sasha: 3, unit: 'шт.' },
      { id: 'greens', label: 'Салат или капуста', angelina: 30, sasha: 40, unit: 'г' }
    ],
    steps: [
      { text: 'Вечером смешайте кашу, чиа, молоко и ягоды в контейнере.' },
      { text: 'Уберите в холодильник на ночь.' },
      { text: 'Утром добавьте мёд и подайте с яйцами и зеленью.' }
    ],
    substitutes: ['Ягоды можно заменить яблоком.', 'Овсянку можно приготовить на воде.']
  },
  {
    id: 'broccoli-eggs',
    day: 'Суббота',
    title: 'Яичница с брокколи и хлебом',
    duration: 5,
    emoji: '🥦',
    note: 'Брокколи удобно хранить в морозилке отдельными порциями.',
    ingredients: [
      { id: 'egg', label: 'Яйца', angelina: 2, sasha: 3, unit: 'шт.' },
      { id: 'broccoli', label: 'Брокколи', angelina: 100, sasha: 130, unit: 'г' },
      { id: 'tomato', label: 'Помидор', angelina: 100, sasha: 130, unit: 'г' },
      { id: 'bread', label: 'Цельнозерновой хлеб', angelina: 50, sasha: 65, unit: 'г' },
      { id: 'sunflower-seeds', label: 'Семечки', angelina: 15, sasha: 20, unit: 'г' },
      { id: 'fruit', label: 'Сезонный фрукт', angelina: 150, sasha: 200, unit: 'г' }
    ],
    steps: [
      { text: 'Поставьте брокколи в микроволновку.', timerSeconds: 210, timerLabel: 'Брокколи' },
      { text: 'Параллельно пожарьте яйца.' },
      { text: 'Подайте с помидором, хлебом, семечками и фруктом.' }
    ],
    substitutes: []
  },
  {
    id: 'buckwheat-salmon-bowl',
    day: 'Воскресенье',
    title: 'Гречневый боул с красной рыбой',
    duration: 3,
    emoji: '🥣',
    note: 'Гречку и яйца приготовить заранее; открытую рыбу хранить по инструкции на упаковке.',
    ingredients: [
      { id: 'buckwheat', label: 'Готовая гречка', angelina: 100, sasha: 150, unit: 'г' },
      { id: 'red-fish', label: 'Красная рыба', angelina: 50, sasha: 70, unit: 'г' },
      { id: 'avocado', label: 'Авокадо', angelina: 70, sasha: 70, unit: 'г' },
      { id: 'egg', label: 'Варёные яйца', angelina: 1, sasha: 2, unit: 'шт.' },
      { id: 'greens', label: 'Листья салата', angelina: 30, sasha: 40, unit: 'г' },
      { id: 'fruit', label: 'Сезонный фрукт', angelina: 150, sasha: 200, unit: 'г' }
    ],
    steps: [
      { text: 'Разогрейте гречку.', timerSeconds: 120, timerLabel: 'Гречка' },
      { text: 'Нарежьте рыбу, авокадо и варёные яйца.' },
      { text: 'Соберите боул: гречка, салат, авокадо, рыба и яйца. Фрукт подайте отдельно.' }
    ],
    substitutes: ['Красную рыбу можно заменить тунцом в собственном соку в том же весе.']
  }
];

export function ingredientById(id) {
  return INGREDIENTS.find((item) => item.id === id) || INGREDIENTS[0];
}
