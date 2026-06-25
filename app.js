/**
 * WaiterFlow — Главный модуль ресторанного ассистента
 * 
 * Архитектура:
 * - Event Emitter + Proxy State Manager (реактивность)
 * - SPA-роутер на hash-навигации
 * - Интеграция VoiceManager для голосовых команд официанта
 * - localStorage для персистентности
 */
;(function() {
  'use strict';

  const STORAGE_KEY = 'waiterflow-state';
  const PAGES = ['home', 'orders', 'settings'];
  const TABLE_COUNT = 12;

  /** Статусы заказа и их мета */
  const ORDER_STATUSES = {
    new:     { label: 'Новый',      next: 'kitchen',  class: 'status-new',     icon: '📝' },
    kitchen: { label: 'На кухне',   next: 'ready',    class: 'status-kitchen', icon: '🍳' },
    ready:   { label: 'Готов',      next: 'served',   class: 'status-ready',   icon: '✅' },
    served:  { label: 'Подан',      next: 'paid',     class: 'status-served',  icon: '🍽️' },
    paid:    { label: 'Оплачен',    next: null,        class: 'status-paid',    icon: '💳' }
  };

  /** Меню ресторана — категории и блюда */
  const MENU = [
    { id: 'borsch',     name: 'Борщ',             category: 'soups',    price: 320,  emoji: '🥣' },
    { id: 'solyanka',   name: 'Солянка',           category: 'soups',    price: 350,  emoji: '🥣' },
    { id: 'cream_soup', name: 'Крем-суп грибной',  category: 'soups',    price: 380,  emoji: '🍄' },
    { id: 'steak',      name: 'Стейк рибай',       category: 'hot',      price: 1890, emoji: '🥩' },
    { id: 'salmon',     name: 'Лосось на гриле',   category: 'hot',      price: 1450, emoji: '🐟' },
    { id: 'chicken',    name: 'Куриная грудка',     category: 'hot',      price: 780,  emoji: '🍗' },
    { id: 'pasta',      name: 'Паста карбонара',    category: 'hot',      price: 650,  emoji: '🍝' },
    { id: 'burger',     name: 'Бургер классический',category: 'hot',      price: 590,  emoji: '🍔' },
    { id: 'caesar',     name: 'Салат Цезарь',       category: 'salads',   price: 520,  emoji: '🥗' },
    { id: 'greek',      name: 'Греческий салат',    category: 'salads',   price: 450,  emoji: '🥗' },
    { id: 'bruschetta', name: 'Брускетта',          category: 'starters', price: 380,  emoji: '🥖' },
    { id: 'nachos',     name: 'Начос с соусом',     category: 'starters', price: 420,  emoji: '🌮' },
    { id: 'coffee',     name: 'Капучино',           category: 'drinks',   price: 250,  emoji: '☕' },
    { id: 'latte',      name: 'Латте',              category: 'drinks',   price: 280,  emoji: '☕' },
    { id: 'tea',        name: 'Чай (выбор)',         category: 'drinks',   price: 200,  emoji: '🍵' },
    { id: 'lemonade',   name: 'Лимонад домашний',    category: 'drinks',   price: 300,  emoji: '🍋' },
    { id: 'wine_glass', name: 'Вино (бокал)',        category: 'drinks',   price: 550,  emoji: '🍷' },
    { id: 'beer',       name: 'Пиво (0.5л)',         category: 'drinks',   price: 350,  emoji: '🍺' },
    { id: 'tiramisu',   name: 'Тирамису',            category: 'desserts', price: 420,  emoji: '🍰' },
    { id: 'cheesecake', name: 'Чизкейк',             category: 'desserts', price: 380,  emoji: '🧁' },
    { id: 'icecream',   name: 'Мороженое',           category: 'desserts', price: 280,  emoji: '🍦' },
  ];

  const MENU_CATEGORIES = {
    soups:    { label: 'Супы',     emoji: '🥣' },
    salads:   { label: 'Салаты',   emoji: '🥗' },
    starters: { label: 'Закуски',  emoji: '🥖' },
    hot:      { label: 'Горячее',  emoji: '🔥' },
    drinks:   { label: 'Напитки',  emoji: '🥤' },
    desserts: { label: 'Десерты',  emoji: '🍰' },
  };

  // ==================== Event Emitter ====================
  const Emitter = {
    _events: {},
    on(event, fn) { (this._events[event] = this._events[event] || []).push(fn); return this; },
    off(event, fn) { if (this._events[event]) this._events[event] = this._events[event].filter(f => f !== fn); return this; },
    emit(event, ...args) {
      (this._events[event] || []).forEach(fn => { try { fn(...args); } catch(e) { console.error(`[Emitter] Error in "${event}":`, e); } });
      return this;
    }
  };

  // ==================== State Manager ====================
  const defaultState = {
    theme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    currentPage: 'home',
    orders: [],
    currentOrderItems: [], // Текущий формируемый заказ
    currentTable: null,
    voiceEnabled: true,
    voiceRate: 1.0,
    filter: 'active', // all | active | kitchen | ready | served | paid
    isListening: false,
    menuCategory: 'hot'
  };

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...defaultState, ...parsed, isListening: false, currentOrderItems: [], currentTable: null };
      }
    } catch(e) { console.error('[Store] Load failed:', e); }
    return { ...defaultState };
  }

  function saveState(data) {
    try {
      const toSave = { ...data, isListening: false, currentOrderItems: [], currentTable: null };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch(e) { console.error('[Store] Save failed:', e); }
  }

  const state = new Proxy(loadState(), {
    set(target, prop, value) {
      const old = target[prop];
      target[prop] = value;
      saveState(target);
      Emitter.emit('state:change', { prop, value, old });
      Emitter.emit(`state:${prop}`, { prop, value, old });
      return true;
    },
    get(target, prop) { return target[prop]; }
  });

  // ==================== Router ====================
  function navigate(page) {
    if (!PAGES.includes(page)) return;
    state.currentPage = page;
  }

  function setupRouter() {
    document.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => navigate(btn.dataset.nav));
    });
    window.addEventListener('popstate', () => {
      const hash = location.hash.replace('#', '') || 'home';
      if (PAGES.includes(hash)) state.currentPage = hash;
    });
    const hash = location.hash.replace('#', '') || state.currentPage;
    if (PAGES.includes(hash)) state.currentPage = hash;
  }

  // ==================== Rendering ====================
  
  function renderPage() {
    const current = state.currentPage;
    document.querySelectorAll('[data-page]').forEach(page => {
      const isTarget = page.dataset.page === current;
      const wasActive = page.classList.contains('active');
      if (isTarget) { page.classList.remove('leaving'); page.classList.add('active'); }
      else if (wasActive) { page.classList.remove('active'); page.classList.add('leaving'); setTimeout(() => page.classList.remove('leaving'), 300); }
    });
    document.querySelectorAll('[data-nav]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.nav === current);
    });
    history.replaceState(null, '', `#${current}`);
    switch(current) {
      case 'home': renderHome(); break;
      case 'orders': renderOrders(); break;
      case 'settings': renderSettings(); break;
    }
  }

  /** Рендеринг главной — дашборд зала */
  function renderHome() {
    // Приветствие
    const greetEl = document.getElementById('greeting-text');
    const subEl = document.getElementById('greeting-sub');
    if (greetEl) greetEl.textContent = getGreeting();
    if (subEl) {
      const d = new Date();
      subEl.textContent = d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
    }

    // Статистика
    const activeOrders = state.orders.filter(o => o.status !== 'paid');
    const kitchenOrders = state.orders.filter(o => o.status === 'kitchen');
    const readyOrders = state.orders.filter(o => o.status === 'ready');
    const todayRevenue = state.orders.filter(o => o.status === 'paid').reduce((s, o) => s + o.total, 0);

    const el1 = document.getElementById('stat-active');
    const el2 = document.getElementById('stat-kitchen');
    const el3 = document.getElementById('stat-ready');
    const el4 = document.getElementById('stat-revenue');
    if (el1) el1.textContent = activeOrders.length;
    if (el2) el2.textContent = kitchenOrders.length;
    if (el3) el3.textContent = readyOrders.length;
    if (el4) el4.textContent = fmtPrice(todayRevenue);

    // Столы
    renderTables();

    // Последние заказы
    const recentEl = document.getElementById('recent-orders');
    if (recentEl) {
      const recent = state.orders.filter(o => o.status !== 'paid').slice(-4).reverse();
      if (recent.length === 0) {
        recentEl.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🍽️</div><p class="empty-state-text">Активных заказов нет. Создайте новый заказ!</p></div>';
      } else {
        recentEl.innerHTML = recent.map(o => renderOrderCard(o)).join('');
        bindOrderEvents(recentEl);
      }
    }
  }

  /** Рендеринг сетки столов */
  function renderTables() {
    const grid = document.getElementById('tables-grid');
    if (!grid) return;

    let html = '';
    for (let i = 1; i <= TABLE_COUNT; i++) {
      const tableOrder = state.orders.find(o => o.table === i && o.status !== 'paid');
      let cls = 'table-free';
      if (tableOrder) {
        if (tableOrder.status === 'ready') cls = 'table-ready';
        else cls = 'table-busy';
      }
      html += `<button class="table-cell ${cls}" data-table="${i}" type="button" aria-label="Стол ${i}${tableOrder ? ', ' + ORDER_STATUSES[tableOrder.status].label : ', свободен'}">
        <span class="table-num">${i}</span>
        <span class="table-status-dot"></span>
      </button>`;
    }
    grid.innerHTML = html;

    // Клик по столу → создание заказа
    grid.querySelectorAll('[data-table]').forEach(cell => {
      cell.addEventListener('click', () => {
        const table = parseInt(cell.dataset.table);
        const existing = state.orders.find(o => o.table === table && o.status !== 'paid');
        if (existing) {
          navigate('orders');
          state.filter = 'active';
        } else {
          state.currentTable = table;
          navigate('orders');
          state.filter = 'active';
          speak(`Стол ${table}. Добавьте блюда`);
        }
      });
    });
  }

  /** Рендеринг страницы заказов */
  function renderOrders() {
    const listEl = document.getElementById('order-list');
    if (!listEl) return;

    // Фильтрация
    let filtered = state.orders;
    if (state.filter === 'active') filtered = state.orders.filter(o => o.status !== 'paid');
    else if (state.filter !== 'all') filtered = state.orders.filter(o => o.status === state.filter);

    // Обновляем вкладки
    document.querySelectorAll('[data-filter]').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.filter === state.filter);
    });

    // Форма добавления
    renderOrderForm();

    if (filtered.length === 0) {
      const msgs = {
        all: 'Заказов пока нет',
        active: 'Нет активных заказов',
        kitchen: 'Нет заказов на кухне',
        ready: 'Нет готовых заказов',
        served: 'Нет поданных заказов',
        paid: 'Нет оплаченных заказов'
      };
      listEl.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🍽️</div><p class="empty-state-text">${msgs[state.filter] || msgs.all}</p></div>`;
      return;
    }

    // Сначала показываем готовые (ready), потом на кухне, потом остальные
    const priority = { ready: 0, kitchen: 1, new: 2, served: 3, paid: 4 };
    const sorted = [...filtered].sort((a, b) => (priority[a.status] ?? 5) - (priority[b.status] ?? 5));

    listEl.innerHTML = sorted.map(o => renderOrderCard(o)).join('');
    bindOrderEvents(listEl);
  }

  /** Рендеринг формы создания заказа */
  function renderOrderForm() {
    const tableSelect = document.getElementById('order-table-select');
    const menuGrid = document.getElementById('menu-quick-grid');
    const cartEl = document.getElementById('cart-items');
    const cartTotalEl = document.getElementById('cart-total-value');
    const cartCountEl = document.getElementById('cart-count');
    const menuCatLabel = document.getElementById('menu-category-label');
    const submitBtn = document.getElementById('submit-order-btn');

    if (tableSelect) {
      // Показываем только свободные столы + текущий выбранный
      let opts = '<option value="">Выберите стол</option>';
      for (let i = 1; i <= TABLE_COUNT; i++) {
        const busy = state.orders.find(o => o.table === i && o.status !== 'paid');
        const selected = state.currentTable === i ? ' selected' : '';
        opts += `<option value="${i}"${selected}${busy ? ' disabled' : ''}>Стол ${i}${busy ? ' (занят)' : ''}</option>`;
      }
      tableSelect.innerHTML = opts;
    }

    // Быстрое меню
    if (menuGrid) {
      const cat = state.menuCategory;
      const items = MENU.filter(m => m.category === cat);
      if (menuCatLabel) menuCatLabel.textContent = MENU_CATEGORIES[cat]?.emoji + ' ' + MENU_CATEGORIES[cat]?.label || cat;

      // Кнопки категорий
      document.querySelectorAll('[data-menu-cat]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.menuCat === cat);
      });

      menuGrid.innerHTML = items.map(item => 
        `<button class="menu-quick-item" data-add-item="${item.id}" type="button">
          <span class="item-emoji">${item.emoji}</span>
          <span>${item.name}</span>
          <span class="item-price">${fmtPrice(item.price)}</span>
        </button>`
      ).join('');

      menuGrid.querySelectorAll('[data-add-item]').forEach(btn => {
        btn.addEventListener('click', () => addToCurrentOrder(btn.dataset.addItem));
      });
    }

    // Корзина
    if (cartEl) {
      if (state.currentOrderItems.length === 0) {
        cartEl.innerHTML = '<div style="text-align:center;padding:var(--space-4);color:var(--color-text-muted);font-size:var(--text-sm);">Добавьте блюда из меню</div>';
      } else {
        cartEl.innerHTML = state.currentOrderItems.map((item, idx) =>
          `<div class="cart-item">
            <span class="cart-item-name">${item.emoji} ${item.name} ×${item.qty}</span>
            <span class="cart-item-price">${fmtPrice(item.price * item.qty)}</span>
            <button class="cart-item-remove" data-remove-item="${idx}" type="button" aria-label="Удалить ${item.name}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>`
        ).join('');
        cartEl.querySelectorAll('[data-remove-item]').forEach(btn => {
          btn.addEventListener('click', () => removeFromCurrentOrder(parseInt(btn.dataset.removeItem)));
        });
      }
    }

    const total = state.currentOrderItems.reduce((s, i) => s + i.price * i.qty, 0);
    if (cartTotalEl) cartTotalEl.textContent = fmtPrice(total);
    if (cartCountEl) cartCountEl.textContent = state.currentOrderItems.length;
    if (submitBtn) submitBtn.disabled = state.currentOrderItems.length === 0;
  }

  /** Рендеринг карточки заказа */
  function renderOrderCard(order) {
    const statusMeta = ORDER_STATUSES[order.status];
    const nextStatus = statusMeta.next;
    const items = order.items.map(i => 
      `<div class="order-item">
        <span class="order-item-name">${i.emoji} ${i.name}</span>
        <span class="order-item-qty">×${i.qty}</span>
        <span class="order-item-price">${fmtPrice(i.price * i.qty)}</span>
      </div>`
    ).join('');

    const nextBtn = nextStatus ? `<button class="order-action-btn btn-next-status" data-next-status="${order.id}" type="button">${ORDER_STATUSES[nextStatus].icon} ${ORDER_STATUSES[nextStatus].label}</button>` : '';
    const deleteBtn = order.status !== 'paid' ? `<button class="order-action-btn btn-delete-order" data-delete-order="${order.id}" type="button">✕ Удалить</button>` : '';

    return `
      <article class="order-card" data-order-id="${order.id}">
        <div class="order-card-header">
          <div class="order-table-badge">
            <span class="table-icon">🪑</span> Стол ${order.table}
          </div>
          <span class="order-status-badge ${statusMeta.class}">${statusMeta.icon} ${statusMeta.label}</span>
        </div>
        <div class="order-items">${items}</div>
        <div class="order-footer">
          <div class="order-total"><span>Итого:</span> ${fmtPrice(order.total)}</div>
          <div class="order-actions">${nextBtn}${deleteBtn}</div>
        </div>
      </article>`;
  }

  /** Привязать события к заказам */
  function bindOrderEvents(container) {
    container.querySelectorAll('[data-next-status]').forEach(btn => {
      btn.addEventListener('click', () => advanceOrderStatus(Number(btn.dataset.nextStatus)));
    });
    container.querySelectorAll('[data-delete-order]').forEach(btn => {
      btn.addEventListener('click', () => deleteOrder(Number(btn.dataset.deleteOrder)));
    });
  }

  /** Рендеринг настроек */
  function renderSettings() {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) { themeToggle.classList.toggle('active', state.theme === 'dark'); themeToggle.setAttribute('aria-checked', state.theme === 'dark'); }

    const voiceToggle = document.getElementById('voice-toggle');
    if (voiceToggle) { voiceToggle.classList.toggle('active', state.voiceEnabled); voiceToggle.setAttribute('aria-checked', state.voiceEnabled); }

    const voiceRate = document.getElementById('voice-rate');
    const voiceRateValue = document.getElementById('voice-rate-value');
    if (voiceRate) voiceRate.value = state.voiceRate;
    if (voiceRateValue) voiceRateValue.textContent = state.voiceRate.toFixed(1) + 'x';

    const orderCountEl = document.getElementById('settings-order-count');
    if (orderCountEl) orderCountEl.textContent = state.orders.length;

    const voiceStatus = document.getElementById('voice-status');
    if (voiceStatus) {
      const ok = window.VoiceManager && VoiceManager.isSupported;
      voiceStatus.textContent = ok ? 'Доступно ✓' : 'Не поддерживается';
      voiceStatus.style.color = ok ? 'var(--color-success)' : 'var(--color-danger)';
    }

    const installBtn = document.getElementById('install-settings-btn');
    if (installBtn) installBtn.style.display = deferredPrompt ? '' : 'none';

    // Голос в сайдбаре
    const vDot = document.querySelector('.sidebar-footer .voice-dot');
    const vText = document.querySelector('.sidebar-footer span:last-child');
    const ok = window.VoiceManager && VoiceManager.isSupported;
    if (vDot) vDot.classList.toggle('inactive', !ok);
    if (vText) vText.textContent = ok ? 'Голос: доступен' : 'Голос: недоступен';
  }

  // ==================== Order CRUD ====================

  function addToCurrentOrder(itemId) {
    const menuItem = MENU.find(m => m.id === itemId);
    if (!menuItem) return;
    const existing = state.currentOrderItems.find(i => i.id === itemId);
    if (existing) {
      existing.qty++;
    } else {
      state.currentOrderItems = [...state.currentOrderItems, { ...menuItem, qty: 1 }];
    }
    renderOrderForm();
  }

  function removeFromCurrentOrder(idx) {
    state.currentOrderItems = state.currentOrderItems.filter((_, i) => i !== idx);
    renderOrderForm();
  }

  function submitOrder() {
    const tableSelect = document.getElementById('order-table-select');
    const table = tableSelect ? parseInt(tableSelect.value) : state.currentTable;
    if (!table || isNaN(table)) { showToast('Выберите стол', 'warning'); return; }
    if (state.currentOrderItems.length === 0) { showToast('Добавьте блюда', 'warning'); return; }
    const busy = state.orders.find(o => o.table === table && o.status !== 'paid');
    if (busy) { showToast(`Стол ${table} уже занят`, 'error'); return; }

    const total = state.currentOrderItems.reduce((s, i) => s + i.price * i.qty, 0);
    const order = {
      id: Date.now() + Math.random(),
      table: table,
      items: [...state.currentOrderItems],
      total: total,
      status: 'new',
      createdAt: new Date().toISOString()
    };

    state.orders = [...state.orders, order];
    state.currentOrderItems = [];
    state.currentTable = null;

    showToast(`Заказ для стола ${table} создан!`, 'success');
    speak(`Заказ для стола ${table} принят`);
    renderOrders();
  }

  function advanceOrderStatus(orderId) {
    state.orders = state.orders.map(o => {
      if (o.id === orderId) {
        const next = ORDER_STATUSES[o.status]?.next;
        if (next) {
          const newOrder = { ...o, status: next };
          // Озвучиваем смену статуса
          const msg = {
            kitchen: 'Заказ передан на кухню',
            ready: 'Заказ готов!',
            served: 'Заказ подан',
            paid: 'Заказ оплачен'
          };
          if (msg[next]) { speak(msg[next]); showToast(msg[next], next === 'ready' ? 'success' : 'info'); }
          return newOrder;
        }
      }
      return o;
    });
  }

  function deleteOrder(orderId) {
    state.orders = state.orders.filter(o => o.id !== orderId);
    showToast('Заказ удалён', 'info');
    speak('Заказ удалён');
  }

  function clearAllOrders() {
    state.orders = [];
    showToast('Все заказы удалены', 'info');
  }

  // ==================== Theme ====================
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = state.theme === 'dark' ? '#1c1917' : '#f5f5f4';
  }

  function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
  }

  // ==================== Voice Commands ====================
  /**
   * Голосовые команды официанта:
   * - "Заказ стол 5 борщ" — создать заказ
   * - "Готово стол 3" / "Подан стол 7" — сменить статус
   * - "Оплатить стол 5" — отметить оплаченным
   * - "Удалить стол 2" — удалить заказ
   * - "Открыть заказы" / "Главная" / "Настройки" — навигация
   * - "Поменяй тему" — смена темы
   */
  function processVoiceCommand(transcript) {
    const cmd = transcript.toLowerCase().trim();
    console.log('[Voice] Command:', cmd);

    // ---- Навигация ----
    if (cmd.match(/главн|домой|home|зал/)) { navigate('home'); speak('Открываю зал'); showToast('Зал', 'info'); return; }
    if (cmd.match(/заказ|debt|ордер/)) { navigate('orders'); speak('Открываю заказы'); showToast('Заказы', 'info'); return; }
    if (cmd.match(/настройк|параметр|settings/)) { navigate('settings'); speak('Настройки'); showToast('Настройки', 'info'); return; }

    // ---- Тема ----
    if (cmd.match(/поменяй\s*тем|смени\s*тем|переключи\s*тем|тёмная\s*тем|светлая\s*тем/) || cmd === 'тема') {
      toggleTheme();
      speak(`Тема ${state.theme === 'dark' ? 'тёмная' : 'светлая'}`);
      return;
    }

    // ---- Оплатить стол N ----
    const payMatch = cmd.match(/(?:оплат|оплатить|расчёт|рассчитать)\s*(?:стол\s*)?(\d+)/i);
    if (payMatch) {
      const table = parseInt(payMatch[1]);
      const order = state.orders.find(o => o.table === table && o.status !== 'paid');
      if (order) {
        // Переводим сразу в paid
        state.orders = state.orders.map(o => o.id === order.id ? { ...o, status: 'paid' } : o);
        speak(`Стол ${table} оплачен`);
        showToast(`Стол ${table} оплачен`, 'success');
      } else {
        speak(`Стол ${table} не найден среди активных`);
        showToast(`Стол ${table} не найден`, 'warning');
      }
      return;
    }

    // ---- Готово / Подан / На кухню — стол N ----
    const statusMatch = cmd.match(/(готово|подан|на кухн|передай\s*на\s*кухн)\s*(?:стол\s*)?(\d+)/i);
    if (statusMatch) {
      const table = parseInt(statusMatch[2]);
      const order = state.orders.find(o => o.table === table && o.status !== 'paid');
      if (order) {
        let targetStatus;
        const kw = statusMatch[1].toLowerCase();
        if (kw.includes('готов')) targetStatus = 'ready';
        else if (kw.includes('подан')) targetStatus = 'served';
        else targetStatus = 'kitchen';

        state.orders = state.orders.map(o => o.id === order.id ? { ...o, status: targetStatus } : o);
        speak(`Стол ${table}: ${ORDER_STATUSES[targetStatus].label}`);
        showToast(`Стол ${table} → ${ORDER_STATUSES[targetStatus].label}`, 'info');
      } else {
        speak(`Стол ${table} не найден`);
        showToast(`Стол ${table} не найден`, 'warning');
      }
      return;
    }

    // ---- Новый заказ: "Заказ стол 5 борщ салат" ----
    const orderMatch = cmd.match(/(?:заказ|новый\s*заказ|добавь\s*заказ)\s*(?:стол\s*)?(\d+)\s*(.*)/i);
    if (orderMatch) {
      const table = parseInt(orderMatch[1]);
      const itemsText = orderMatch[2].trim();
      const items = [];
      
      // Ищем блюда по названию в тексте
      MENU.forEach(menuItem => {
        const nameLow = menuItem.name.toLowerCase();
        const words = itemsText.toLowerCase().split(/[\s,]+/);
        // Проверяем полное или частичное совпадение
        if (words.some(w => nameLow.includes(w) || w.includes(menuItem.id.replace('_', '')))) {
          items.push({ ...menuItem, qty: 1 });
        }
      });

      if (items.length > 0) {
        const busy = state.orders.find(o => o.table === table && o.status !== 'paid');
        if (busy) {
          speak(`Стол ${table} уже занят`);
          showToast(`Стол ${table} занят`, 'error');
        } else {
          const total = items.reduce((s, i) => s + i.price, 0);
          const order = { id: Date.now() + Math.random(), table, items, total, status: 'new', createdAt: new Date().toISOString() };
          state.orders = [...state.orders, order];
          const itemNames = items.map(i => i.name).join(', ');
          speak(`Заказ для стола ${table}: ${itemNames}`);
          showToast(`Стол ${table}: заказ создан!`, 'success');
          navigate('orders');
        }
      } else {
        // Не нашли блюда — открываем форму заказа
        state.currentTable = table;
        navigate('orders');
        speak(`Стол ${table}. Добавьте блюда из меню`);
        showToast(`Стол ${table}: выберите блюда`, 'info');
      }
      return;
    }

    // ---- Удалить заказ стола ----
    const delMatch = cmd.match(/(?:удали|удалить|отмени|отменить)\s*(?:стол\s*)?(\d+)/i);
    if (delMatch) {
      const table = parseInt(delMatch[1]);
      const before = state.orders.length;
      state.orders = state.orders.filter(o => !(o.table === table && o.status !== 'paid'));
      if (state.orders.length < before) {
        speak(`Заказ стола ${table} удалён`);
        showToast(`Стол ${table} удалён`, 'info');
      } else {
        speak(`Стол ${table} не найден`);
      }
      return;
    }

    // ---- Команда не распознана ----
    speak('Команда не распознана');
    showToast('Команда не распознана', 'warning');
  }

  function speak(text) {
    if (state.voiceEnabled && window.VoiceManager) VoiceManager.speak(text, state.voiceRate);
  }

  // ==================== Toast ====================
  function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, duration);
  }

  // ==================== Install ====================
  let deferredPrompt = null;

  function setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      const banner = document.getElementById('install-banner');
      if (banner) banner.classList.remove('hidden');
    });

    const installBtn = document.getElementById('install-btn');
    if (installBtn) {
      installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') { showToast('Приложение установлено!', 'success'); speak('Приложение установлено'); }
        deferredPrompt = null;
        const banner = document.getElementById('install-banner');
        if (banner) banner.classList.add('hidden');
      });
    }

    const dismissBtn = document.getElementById('install-dismiss');
    if (dismissBtn) dismissBtn.addEventListener('click', () => {
      const banner = document.getElementById('install-banner');
      if (banner) banner.classList.add('hidden');
    });

    const installSettingsBtn = document.getElementById('install-settings-btn');
    if (installSettingsBtn) {
      installSettingsBtn.addEventListener('click', async () => {
        if (!deferredPrompt) { showToast('Уже установлено или не поддерживается', 'info'); return; }
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') { showToast('Установлено!', 'success'); speak('Установлено'); }
        deferredPrompt = null;
      });
    }

    window.addEventListener('appinstalled', () => { deferredPrompt = null; const b = document.getElementById('install-banner'); if(b) b.classList.add('hidden'); });
  }

  // ==================== Voice Integration ====================
  function setupVoice() {
    const vm = window.VoiceManager;
    if (!vm) return;
    if (!vm.isSupported) {
      const fab = document.getElementById('voice-fab');
      if (fab) fab.style.display = 'none';
      return;
    }

    vm.init();
    vm.setRate(state.voiceRate);

    const fab = document.getElementById('voice-fab');
    if (fab) fab.addEventListener('click', () => vm.isListening ? vm.stopListening() : vm.startListening());

    const voiceOrderBtn = document.getElementById('voice-order-btn');
    if (voiceOrderBtn) voiceOrderBtn.addEventListener('click', () => vm.isListening ? vm.stopListening() : vm.startListening());

    vm.onStateChange((isListening) => {
      state.isListening = isListening;
      const fabEl = document.getElementById('voice-fab');
      const overlay = document.getElementById('voice-overlay');
      const voiceOrderBtn = document.getElementById('voice-order-btn');
      if (fabEl) fabEl.classList.toggle('listening', isListening);
      if (overlay) overlay.classList.toggle('active', isListening);
      if (voiceOrderBtn) voiceOrderBtn.classList.toggle('active', isListening);
      if (isListening) { const t = document.getElementById('voice-transcript'); if(t) t.textContent = 'Слушаю...'; }
    });

    vm.onResult(({ transcript, isFinal }) => {
      const t = document.getElementById('voice-transcript');
      if (t) t.textContent = transcript || 'Слушаю...';
      if (isFinal && transcript) {
        setTimeout(() => {
          processVoiceCommand(transcript);
          const overlay = document.getElementById('voice-overlay');
          if (overlay) overlay.classList.remove('active');
        }, 600);
      }
    });

    vm.onError((error) => {
      const msgs = {
        'not-allowed': 'Доступ к микрофону запрещён',
        'no-speech': 'Речь не обнаружена',
        'audio-capture': 'Микрофон не найден',
        'network': 'Ошибка сети. Голос требует интернет',
        'service-not-allowed': 'Сервис распознавания недоступен'
      };
      showToast(msgs[error] || `Ошибка: ${error}`, 'error', 4000);
    });
  }

  // ==================== Event Handlers ====================
  function setupEventHandlers() {
    // Тема
    ['header-theme-toggle', 'header-theme-toggle-orders', 'header-theme-toggle-settings'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', toggleTheme);
    });

    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);

    // Голос
    const voiceToggle = document.getElementById('voice-toggle');
    if (voiceToggle) voiceToggle.addEventListener('click', () => {
      state.voiceEnabled = !state.voiceEnabled;
      showToast(state.voiceEnabled ? 'Голос включён' : 'Голос выключен', 'info');
    });

    const voiceRate = document.getElementById('voice-rate');
    if (voiceRate) voiceRate.addEventListener('input', () => {
      state.voiceRate = parseFloat(voiceRate.value);
      if (window.VoiceManager) VoiceManager.setRate(state.voiceRate);
    });

    // Отправка заказа
    const submitBtn = document.getElementById('submit-order-btn');
    if (submitBtn) submitBtn.addEventListener('click', submitOrder);

    // Фильтры
    document.querySelectorAll('[data-filter]').forEach(tab => {
      tab.addEventListener('click', () => { state.filter = tab.dataset.filter; });
    });

    // Категории меню
    document.querySelectorAll('[data-menu-cat]').forEach(btn => {
      btn.addEventListener('click', () => { state.menuCategory = btn.dataset.menuCat; renderOrders(); });
    });

    // Очистить все заказы
    const clearBtn = document.getElementById('clear-all-orders');
    if (clearBtn) clearBtn.addEventListener('click', () => {
      if (state.orders.length === 0) { showToast('Список заказов пуст', 'info'); return; }
      if (confirm('Удалить все заказы?')) { clearAllOrders(); speak('Все заказы удалены'); }
    });

    // Экспорт
    const exportBtn = document.getElementById('export-data');
    if (exportBtn) exportBtn.addEventListener('click', () => {
      const data = JSON.stringify({ orders: state.orders, theme: state.theme }, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `waiterflow-${new Date().toISOString().slice(0,10)}.json`;
      a.click(); URL.revokeObjectURL(url);
      showToast('Данные экспортированы', 'success');
    });
  }

  // ==================== State Listeners ====================
  function setupStateListeners() {
    Emitter.on('state:currentPage', () => renderPage());
    Emitter.on('state:orders', () => { renderHome(); renderOrders(); renderSettings(); });
    Emitter.on('state:theme', ({ value }) => { applyTheme(); renderSettings(); showToast(value === 'dark' ? 'Тёмная тема 🌙' : 'Светлая тема ☀️', 'info'); });
    Emitter.on('state:filter', () => renderOrders());
    Emitter.on('state:voiceRate', () => renderSettings());
    Emitter.on('state:voiceEnabled', () => renderSettings());
    Emitter.on('state:menuCategory', () => {});
  }

  // ==================== Utility ====================
  function getGreeting() {
    const h = new Date().getHours();
    if (h < 6) return 'Ночная смена! 🌙';
    if (h < 12) return 'Доброе утро! ☀️';
    if (h < 18) return 'Добрый день! 👋';
    return 'Добрый вечер! 🌆';
  }

  function fmtPrice(val) {
    return val.toLocaleString('ru-RU') + ' ₽';
  }

  // ==================== Init ====================
  function init() {
    console.log('[App] WaiterFlow initializing...');
    applyTheme();
    setupRouter();
    setupStateListeners();
    setupEventHandlers();
    setupInstallPrompt();
    renderPage();
    setTimeout(() => setupVoice(), 200);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./service-worker.js')
        .then(reg => {
          console.log('[SW] Registered');
          reg.addEventListener('updatefound', () => {
            const nw = reg.installing;
            nw.addEventListener('statechange', () => {
              if (nw.state === 'activated') showToast('Обновление доступно!', 'info', 5000);
            });
          });
        })
        .catch(err => console.error('[SW] Failed:', err));
    }

    console.log('[App] WaiterFlow ready');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
