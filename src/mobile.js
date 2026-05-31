import { storage } from './storage.js';
import { currency } from './currency.js';
import { analytics } from './analytics.js';

// Application State
let state = storage.load();

// Active states
let activeScreen = 'home';
let activeFilter = 'all';

// DOM Elements - Navigation and Screen toggles
const screens = {
  home: document.getElementById('screen-home'),
  history: document.getElementById('screen-history'),
  analytics: document.getElementById('screen-analytics'),
  limits: document.getElementById('screen-limits')
};

const navButtons = {
  home: document.getElementById('nav-home'),
  history: document.getElementById('nav-history'),
  analytics: document.getElementById('nav-analytics'),
  limits: document.getElementById('nav-limits')
};

// Global Stats Elements
const balanceEl = document.getElementById('total-balance');
const incomeEl = document.getElementById('total-income');
const expensesEl = document.getElementById('total-expenses');
const ratioEl = document.getElementById('expense-ratio');
const ratioProgressEl = document.getElementById('ratio-progress');
const expensesContainer = document.getElementById('expenses-container');
const expensesDot = document.getElementById('expenses-dot');
const expensesLabel = document.getElementById('expenses-label');

const currencySelect = document.getElementById('currency-selector');
const budgetBadge = document.getElementById('budget-badge');
const budgetBadgePeriod = document.getElementById('budget-badge-period');
const budgetBadgeVal = document.getElementById('budget-badge-val');
const budgetAlertContainer = document.getElementById('budget-alert-container');

// Screen 1: Home List
const recentTransactionsList = document.getElementById('recent-transactions-list');
const viewAllHistoryBtn = document.getElementById('view-all-history-btn');

// Screen 2: History Elements
const fullTransactionsList = document.getElementById('full-transactions-list');
const filterBtns = document.querySelectorAll('.filter-btn');
const customDateContainer = document.getElementById('custom-date-container');
const filterStartDateEl = document.getElementById('filter-start-date');
const filterEndDateEl = document.getElementById('filter-end-date');

// Screen 3: Analytics Elements
const insightTitleEl = document.getElementById('insight-title');
const insightMsgEl = document.getElementById('insight-message');
const insightIconEl = document.getElementById('insight-icon');
const categoryDistributionEl = document.getElementById('category-distribution');

// Screen 4: Limits Elements
const budgetForm = document.getElementById('budget-form');
const budgetAmountInput = document.getElementById('budget-amount');
const budgetCurrencyLabel = document.getElementById('budget-currency-label');

// Drawer Elements
const addBtn = document.getElementById('mobile-add-btn');
const drawerOverlay = document.getElementById('mobile-add-drawer');
const drawerSheet = document.getElementById('mobile-add-sheet');
const closeDrawerBtn = document.getElementById('close-mobile-drawer');
const transactionForm = document.getElementById('mobile-transaction-form');
const quickCategoriesEl = document.getElementById('quick-categories');
const categoryInput = document.getElementById('category');

// Income Popover Warning
const incomeAlertPopover = document.getElementById('income-alert-popover');
let incomeAlertTimeout = null;

// Categories Config with icons & background colors for Quick selection!
const QUICK_CATEGORIES = [
  { name: 'Зарплата', icon: '💰', bg: 'bg-green-50 text-green-600', border: 'border-green-100' },
  { name: 'Продукты', icon: '🛒', bg: 'bg-amber-50 text-amber-600', border: 'border-amber-100' },
  { name: 'Кафе', icon: '☕', bg: 'bg-orange-50 text-orange-600', border: 'border-orange-100' },
  { name: 'Транспорт', icon: '🚕', bg: 'bg-blue-50 text-blue-600', border: 'border-blue-100' },
  { name: 'Аренда', icon: '🏠', bg: 'bg-indigo-50 text-indigo-600', border: 'border-indigo-100' },
  { name: 'Одеяния', icon: '👕', bg: 'bg-purple-50 text-purple-600', border: 'border-purple-100' },
  { name: 'Здоровье', icon: '💊', bg: 'bg-red-50 text-red-600', border: 'border-red-100' },
  { name: 'Другое', icon: '✨', bg: 'bg-gray-100 text-gray-600', border: 'border-gray-200' }
];

// Switch Active Screen tab
function switchScreen(screenName) {
  if (!screens[screenName]) return;
  activeScreen = screenName;

  // Toggle visible sections
  Object.keys(screens).forEach(key => {
    if (key === screenName) {
      screens[key].classList.remove('hidden');
    } else {
      screens[key].classList.add('hidden');
    }
  });

  // Toggle nav classes
  Object.keys(navButtons).forEach(key => {
    if (key === screenName) {
      navButtons[key].classList.add('tab-active');
    } else {
      navButtons[key].classList.remove('tab-active');
    }
  });

  // Scrolling window safety
  window.scrollTo({ top: 0, behavior: 'instant' });
}

// Show Warning Popover
function showIncomeAlert() {
  if (incomeAlertPopover) {
    incomeAlertPopover.classList.remove('hidden');
    if (incomeAlertTimeout) clearTimeout(incomeAlertTimeout);
    incomeAlertTimeout = setTimeout(() => {
      hideIncomeAlert();
    }, 6500);
  }
}

// Hide Warning Popover
function hideIncomeAlert() {
  if (incomeAlertPopover) {
    incomeAlertPopover.classList.add('hidden');
  }
  if (incomeAlertTimeout) {
    clearTimeout(incomeAlertTimeout);
    incomeAlertTimeout = null;
  }
}

// Format amount helper
function getFormattedAmount(val, baseCurrency, targetCurrency) {
  const converted = currency.convert(val, baseCurrency, targetCurrency);
  return currency.format(converted, targetCurrency);
}

// Update App interface and state
function updateUI() {
  const currentCurrency = state.preferences.currency;

  // Compute stats totals
  const totals = state.transactions.reduce((acc, t) => {
    const amtInCurr = currency.convert(t.amount, t.currency || 'USD', currentCurrency);
    if (t.type === 'income') {
      acc.income += amtInCurr;
    } else {
      acc.expenses += amtInCurr;
    }
    return acc;
  }, { income: 0, expenses: 0 });

  const balance = totals.income - totals.expenses;
  const ratio = analytics.getExpenseRatio(totals.income, totals.expenses);
  const insight = analytics.getInsight(totals.income, totals.expenses);

  // Stats Text Fill
  balanceEl.textContent = currency.format(balance, currentCurrency);
  incomeEl.textContent = currency.format(totals.income, currentCurrency);
  expensesEl.textContent = currency.format(totals.expenses, currentCurrency);
  ratioEl.textContent = `${ratio.toFixed(1)}%`;

  // Sleek ratio progress bar filling
  ratioProgressEl.style.width = `${Math.min(ratio, 100)}%`;
  const barColor = ratio > 90 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : ratio > 70 ? 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.3)]' : 'bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.3)]';
  ratioProgressEl.className = `h-full rounded-full transition-all duration-1000 ${barColor}`;
  ratioEl.className = `text-2xl font-black ${ratio > 90 ? 'text-red-600 animate-pulse' : ratio > 70 ? 'text-orange-500' : 'text-gray-950'}`;

  // --- Start Expense Limits Evaluation ---
  const now = new Date();
  const budgetPeriod = state.preferences.budgetPeriod || 'month';
  const budgetVal = state.preferences.monthlyBudget || 0;
  const budgetCurrency = state.preferences.monthlyBudgetCurrency || 'USD';
  const convertedBudget = currency.convert(budgetVal, budgetCurrency, currentCurrency);

  // Update budget period label
  const periodShortLabels = {
    day: 'На день:',
    week: 'На неделю:',
    month: 'Лимиты расходов:'
  };
  budgetBadgePeriod.textContent = periodShortLabels[budgetPeriod] || 'Лимит:';

  // Compute expenses for active limited window
  const currentPeriodExpenses = state.transactions.reduce((acc, t) => {
    if (t.type !== 'expense') return acc;
    const tDate = new Date(t.date);
    let isSamePeriod = false;

    if (budgetPeriod === 'day') {
      isSamePeriod = tDate.toDateString() === now.toDateString();
    } else if (budgetPeriod === 'week') {
      const getStartOfWeek = (d) => {
        const temp = new Date(d);
        const day = temp.getDay();
        const diff = temp.getDate() - day + (day === 0 ? -6 : 1);
        const start = new Date(temp.setDate(diff));
        start.setHours(0, 0, 0, 0);
        return start;
      };
      const startOfW = getStartOfWeek(now);
      const endOfW = new Date(startOfW);
      endOfW.setDate(startOfW.getDate() + 7);

      const tTime = tDate.getTime();
      isSamePeriod = tTime >= startOfW.getTime() && tTime < endOfW.getTime();
    } else {
      isSamePeriod = tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
    }

    if (isSamePeriod) {
      acc += currency.convert(t.amount, t.currency || 'USD', currentCurrency);
    }
    return acc;
  }, 0);

  // Set visual badges
  if (budgetBadge) {
    if (budgetVal > 0) {
      budgetBadgeVal.textContent = currency.format(convertedBudget, currentCurrency);

      if (currentPeriodExpenses > convertedBudget) {
        // Exceeded: Red badge
        budgetBadge.className = 'flex items-center gap-1.5 py-1 px-3 bg-red-600 text-white rounded-full border border-transparent font-black uppercase text-[9px] tracking-wider animate-pulse-subtle cursor-pointer';
        expensesContainer.className = 'space-y-1 bg-red-500/10 p-2.5 rounded-2xl border border-red-200/40 animate-pulse';
        expensesDot.className = 'w-2 h-2 rounded-full bg-red-500 shrink-0';
        expensesLabel.className = 'text-[9px] font-bold text-red-500 uppercase tracking-widest block';
      } else {
        // Normal Safe state
        budgetBadge.className = 'flex items-center gap-1.5 py-1 px-3 bg-blue-50/70 text-blue-600 rounded-full border border-blue-100/40 font-black uppercase text-[9px] tracking-wider cursor-pointer';
        expensesContainer.className = 'space-y-1';
        expensesDot.className = 'w-2 h-2 rounded-full bg-blue-500 shrink-0';
        expensesLabel.className = 'text-[9px] font-bold text-white/40 uppercase tracking-widest block';
      }
    } else {
      // Prompt set limit
      budgetBadgeVal.textContent = 'Установить';
      budgetBadge.className = 'flex items-center gap-1.5 py-1 px-3 bg-gradient-to-r from-blue-650 to-indigo-650 text-white rounded-full border border-transparent font-black uppercase text-[9px] tracking-wider animate-pulse-subtle cursor-pointer';
      expensesContainer.className = 'space-y-1';
      expensesDot.className = 'w-2 h-2 rounded-full bg-blue-500 shrink-0';
      expensesLabel.className = 'text-[9px] font-bold text-white/40 uppercase tracking-widest block';
    }
  }

  // Setup Notification Overrun Banner
  if (budgetAlertContainer) {
    if (budgetVal > 0 && currentPeriodExpenses > convertedBudget) {
      const overage = currentPeriodExpenses - convertedBudget;
      const periodLabelRu = {
        day: 'текущий день',
        week: 'текущую неделю',
        month: 'текущий месяц'
      }[budgetPeriod] || 'период';

      budgetAlertContainer.innerHTML = `
        <div class="bg-red-50 border border-red-200/60 p-4 rounded-2xl flex items-center justify-between gap-3 shadow-md shadow-red-500/5 animate-fade-up">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
            </div>
            <div>
              <h4 class="font-black text-red-950 uppercase text-[10px] tracking-wider">Превышен лимит!</h4>
              <p class="text-[9px] font-semibold text-red-500/90 mt-0.5 leading-relaxed">
                Траты за ${periodLabelRu} превышают бюджет на <span class="font-black text-red-600">${currency.format(overage, currentCurrency)}</span>!
              </p>
            </div>
          </div>
        </div>
      `;
      budgetAlertContainer.classList.remove('hidden');
    } else {
      budgetAlertContainer.classList.add('hidden');
      budgetAlertContainer.innerHTML = '';
    }
  }

  // Populate dynamic smart analytics
  insightTitleEl.textContent = insight.title;
  insightMsgEl.textContent = insight.message;
  
  const icons = {
    warning: '<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
    error: '<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>',
    success: '<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>',
    info: '<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>'
  };
  const colors = {
    warning: 'text-orange-500',
    error: 'text-red-500',
    success: 'text-green-500',
    info: 'text-blue-500'
  };
  insightIconEl.innerHTML = icons[insight.type] || icons.info;
  insightIconEl.className = `w-14 h-14 mb-4 transition-all animate-float ${colors[insight.type] || 'text-gray-400'}`;

  // Render recent & full transactions lists
  renderTransactions();
  renderCategoryAnalytics();

  // Save changes
  storage.save(state);
}

// Render dynamic Lists
function renderTransactions() {
  const currentCurrency = state.preferences.currency;

  // Filter list
  const filtered = state.transactions.filter(t => {
    const tDate = new Date(t.date);
    const now = new Date();

    if (activeFilter === 'day') {
      return tDate.toDateString() === now.toDateString();
    }
    if (activeFilter === 'week') {
      const startOfWeek = new Date();
      startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
      startOfWeek.setHours(0, 0, 0, 0);
      return tDate.getTime() >= startOfWeek.getTime();
    }
    if (activeFilter === 'month') {
      return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
    }
    if (activeFilter === 'custom') {
      const startVal = filterStartDateEl.value;
      const endVal = filterEndDateEl.value;
      const tTime = tDate.getTime();

      if (startVal) {
        const startLimit = new Date(startVal + 'T00:00:00').getTime();
        if (tTime < startLimit) return false;
      }
      if (endVal) {
        const endLimit = new Date(endVal + 'T23:59:59').getTime();
        if (tTime > endLimit) return false;
      }
    }
    return true;
  });

  // Sort descending
  const sorted = [...state.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
  const filteredSorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));

  // 1. POPULATE MOBILE HOME SCREEN TRANSACTION SNIPPET (MAX 4 RECENT)
  recentTransactionsList.innerHTML = '';
  if (sorted.length === 0) {
    recentTransactionsList.innerHTML = '<div class="text-[11px] text-gray-400 text-center py-6 italic font-medium">Нет недавних операций</div>';
  } else {
    sorted.slice(0, 4).forEach(t => {
      const displayAmount = currency.convert(t.amount, t.currency || 'USD', currentCurrency);
      const categoryConfig = QUICK_CATEGORIES.find(qc => qc.name.toLowerCase() === t.category.toLowerCase()) || { icon: '💼', bg: 'bg-indigo-50 text-indigo-500' };
      
      const div = document.createElement('div');
      div.className = 'flex items-center justify-between p-4 bg-white/60 rounded-2xl border border-gray-150/40 hover:bg-white active:scale-[0.99] transition-all duration-200';
      div.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 ${categoryConfig.bg} rounded-xl flex items-center justify-center text-sm font-semibold">
            ${categoryConfig.icon}
          </div>
          <div>
            <span class="text-[11px] font-black tracking-widest uppercase text-slate-900 leading-none">${t.category}</span>
            <span class="block text-[8px] font-bold text-gray-400 uppercase tracking-tighter mt-1">${new Date(t.date).toLocaleDateString('ru', { day: 'numeric', month: 'short' })}</span>
          </div>
        </div>
        <span class="text-sm font-black tracking-tighter ${t.type === 'income' ? 'text-green-500' : 'text-slate-950'}">
          ${t.type === 'income' ? '+' : '-'}${currency.format(displayAmount, currentCurrency)}
        </span>
      `;
      recentTransactionsList.appendChild(div);
    });
  }

  // 2. POPULATE HISTORY SCREEN FULL LIST
  fullTransactionsList.innerHTML = '';
  if (filteredSorted.length === 0) {
    fullTransactionsList.innerHTML = '<div class="text-[11px] text-gray-450 text-center py-12 italic font-medium">Ничего не найдено за этот отрезок времени</div>';
  } else {
    filteredSorted.forEach((t, i) => {
      const displayAmount = currency.convert(t.amount, t.currency || 'USD', currentCurrency);
      const categoryConfig = QUICK_CATEGORIES.find(qc => qc.name.toLowerCase() === t.category.toLowerCase()) || { icon: '💼', bg: 'bg-slate-50 text-slate-500' };

      const div = document.createElement('div');
      div.className = 'flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-150/40 shadow-sm animate-fade-up';
      div.style.animationDelay = `${i * 0.04}s`;
      
      div.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 ${categoryConfig.bg} rounded-xl flex items-center justify-center text-sm font-semibold">
            ${categoryConfig.icon}
          </div>
          <div>
            <span class="text-[11px] font-black tracking-widest uppercase text-slate-950 block">${t.category}</span>
            <span class="text-[8px] font-bold text-gray-400 mt-1 block uppercase tracking-tighter">${new Date(t.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
        </div>
        <div class="text-right flex items-center gap-3.5">
          <span class="text-sm font-black tracking-tighter ${t.type === 'income' ? 'text-green-500' : 'text-slate-950'}">
            ${t.type === 'income' ? '+' : '-'}${currency.format(displayAmount, currentCurrency)}
          </span>
          <button data-id="${t.id}" class="mobile-delete-btn w-7 h-7 bg-red-50 hover:bg-red-500 text-red-500 hover:text-white rounded-lg flex items-center justify-center transition-all cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>
        </div>
      `;
      fullTransactionsList.appendChild(div);
    });

    // Hook delete clicks
    fullTransactionsList.querySelectorAll('.mobile-delete-btn').forEach(btn => {
      btn.onclick = (e) => {
        const btnNode = e.currentTarget;
        const id = btnNode.dataset.id;
        state.transactions = state.transactions.filter(t => t.id !== id);
        updateUI();
      };
    });
  }
}

// Render Categorized bar distribution (Screen 3)
function renderCategoryAnalytics() {
  const currentCurrency = state.preferences.currency;

  const expensesOnly = state.transactions.filter(t => t.type === 'expense');
  if (expensesOnly.length === 0) {
    categoryDistributionEl.innerHTML = '<div class="text-[11px] text-gray-400 text-center py-6 italic font-medium">Операций расходов пока нет</div>';
    return;
  }

  // Calculate total expense sum
  const totalExpenseSum = expensesOnly.reduce((sum, t) => {
    return sum + currency.convert(t.amount, t.currency || 'USD', currentCurrency);
  }, 0);

  // Group by category name
  const catMap = {};
  expensesOnly.forEach(t => {
    const amtConverted = currency.convert(t.amount, t.currency || 'USD', currentCurrency);
    catMap[t.category] = (catMap[t.category] || 0) + amtConverted;
  });

  // Sort by spent descending
  const sortedCategories = Object.keys(catMap).map(name => ({
    name,
    amount: catMap[name],
    percentage: (catMap[name] / totalExpenseSum) * 100
  })).sort((a,b) => b.amount - a.amount);

  categoryDistributionEl.innerHTML = '';
  sortedCategories.forEach(cat => {
    const config = QUICK_CATEGORIES.find(qc => qc.name.toLowerCase() === cat.name.toLowerCase()) || { icon: '📊', bg: 'bg-gray-100' };
    const progressDiv = document.createElement('div');
    progressDiv.className = 'space-y-1.5 animate-fade-up';
    progressDiv.innerHTML = `
      <div class="flex items-center justify-between text-[11px]">
        <div class="flex items-center gap-2">
          <span class="text-xs shrink-0">${config.icon}</span>
          <span class="font-black text-slate-900 uppercase tracking-widest">${cat.name}</span>
        </div>
        <div class="text-right font-black">
          <span class="text-slate-950">${currency.format(cat.amount, currentCurrency)}</span>
          <span class="text-gray-450 ml-1.5 text-[9px] font-bold">${cat.percentage.toFixed(0)}%</span>
        </div>
      </div>
      <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div class="h-full bg-blue-600 rounded-full transition-all duration-700" style="width: ${cat.percentage}%"></div>
      </div>
    `;
    categoryDistributionEl.appendChild(progressDiv);
  });
}

// Update filter visual state
function updateFilterTabsUI() {
  filterBtns.forEach(btn => {
    const btnFilter = btn.id.replace('filter-', '');
    if (btnFilter === activeFilter) {
      btn.className = 'filter-btn shrink-0 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider text-blue-600 bg-white shadow-sm transition-all';
    } else {
      btn.className = 'filter-btn shrink-0 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider text-gray-500 transition-all';
    }
  });

  if (activeFilter === 'custom') {
    customDateContainer.classList.remove('hidden');
    customDateContainer.classList.add('grid');
  } else {
    customDateContainer.classList.add('hidden');
    customDateContainer.classList.remove('grid');
  }
}

// Open Form Bottom Sheet Drawer
function openMobileDrawer() {
  hideIncomeAlert();
  drawerOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // Prefill current date
  const dateInput = document.getElementById('date');
  if (dateInput) {
    const d = new Date();
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    dateInput.value = `${yy}-${mm}-${dd}`;
  }

  // Sliding CSS Transition trigger animation
  setTimeout(() => {
    drawerSheet.classList.remove('translate-y-full');
  }, 30);
}

// Close Form Bottom Sheet Drawer
function closeMobileDrawer() {
  hideIncomeAlert();
  drawerSheet.classList.add('translate-y-full');
  setTimeout(() => {
    drawerOverlay.classList.add('hidden');
    document.body.style.overflow = '';
  }, 250);
}

// Initialize Custom Event Listeners
function setupEventListeners() {
  // Navigation Tabs Listener
  Object.keys(navButtons).forEach(key => {
    navButtons[key].addEventListener('click', () => {
      switchScreen(key);
    });
  });

  // Home screen "See All" triggers redirection to operations
  if (viewAllHistoryBtn) {
    viewAllHistoryBtn.addEventListener('click', () => {
      switchScreen('history');
    });
  }

  // Budget Badge in dashboard directs to setting screen
  if (budgetBadge) {
    budgetBadge.addEventListener('click', () => {
      switchScreen('limits');
    });
  }

  // Main currency selector
  currencySelect.addEventListener('change', (e) => {
    state.preferences.currency = e.target.value;
    updateUI();
  });

  // History Tab Filter pills carousel
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      activeFilter = btn.id.replace('filter-', '');
      updateFilterTabsUI();
      renderTransactions();
    });
  });

  // Start Date / End Date logic
  filterStartDateEl.addEventListener('change', () => {
    if (activeFilter === 'custom') renderTransactions();
  });
  filterEndDateEl.addEventListener('change', () => {
    if (activeFilter === 'custom') renderTransactions();
  });

  // Drawer Action button triggers
  addBtn.addEventListener('click', openMobileDrawer);
  closeDrawerBtn.addEventListener('click', closeMobileDrawer);
  drawerOverlay.addEventListener('click', (e) => {
    if (e.target === drawerOverlay) {
      closeMobileDrawer();
    }
  });

  // Hide popover alert warning during user interactions
  const amtInput = document.getElementById('amount');
  if (amtInput) {
    amtInput.addEventListener('input', hideIncomeAlert);
  }
  const typeInputs = transactionForm.querySelectorAll('input[name="type"]');
  typeInputs.forEach(input => {
    input.addEventListener('change', hideIncomeAlert);
  });

  // Render Tappable category buttons into the grid inside the drawer
  quickCategoriesEl.innerHTML = '';
  QUICK_CATEGORIES.forEach(qc => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `p-2.5 border rounded-2xl flex flex-col items-center gap-1.5 transition-all text-[9px] font-black uppercase text-center cursor-pointer hover:bg-white active:scale-95 ${qc.bg} ${qc.border}`;
    btn.innerHTML = `
      <span class="text-lg">${qc.icon}</span>
      <span class="tracking-tight truncate w-full">${qc.name}</span>
    `;
    btn.addEventListener('click', () => {
      categoryInput.value = qc.name;
    });
    quickCategoriesEl.appendChild(btn);
  });

  // Add Transaction Submit
  transactionForm.addEventListener('submit', (e) => {
    e.preventDefault();
    hideIncomeAlert();

    const formData = new FormData(transactionForm);
    const dateVal = formData.get('date');
    let txnDate = new Date();
    if (dateVal) {
      const [year, month, day] = dateVal.split('-').map(Number);
      const nowNow = new Date();
      txnDate = new Date(year, month - 1, day, nowNow.getHours(), nowNow.getMinutes(), nowNow.getSeconds());
    }

    const newTxn = {
      id: Date.now().toString(),
      type: formData.get('type'),
      amount: parseFloat(formData.get('amount')),
      currency: state.preferences.currency,
      category: formData.get('category'),
      date: txnDate.toISOString()
    };

    if (isNaN(newTxn.amount) || newTxn.amount <= 0) {
      alert('Пожалуйста, введите корректную сумму');
      return;
    }

    // Verify expense has sufficient funds on account balance
    if (newTxn.type === 'expense') {
      const activeCurr = state.preferences.currency;
      const tsums = state.transactions.reduce((acc, t) => {
        const valueSelected = currency.convert(t.amount, t.currency || 'USD', activeCurr);
        if (t.type === 'income') {
          acc.income += valueSelected;
        } else {
          acc.expenses += valueSelected;
        }
        return acc;
      }, { income: 0, expenses: 0 });

      const currentBal = tsums.income - tsums.expenses;
      if (newTxn.amount > currentBal) {
        showIncomeAlert();
        return;
      }
    }

    // Push state & reset
    state.transactions.push(newTxn);
    transactionForm.reset();

    // Pulse action
    balanceEl.classList.remove('scale-105', 'text-blue-500');
    void balanceEl.offsetWidth;
    balanceEl.classList.add('scale-105', 'text-blue-500');
    setTimeout(() => {
      balanceEl.classList.remove('scale-105', 'text-blue-500');
    }, 300);

    closeMobileDrawer();
    updateUI();
  });

  // Limit Setting Forms (Screen 4)
  budgetForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const amount = parseFloat(budgetAmountInput.value);
    if (isNaN(amount) || amount < 0) {
      alert('Пожалуйста, введите корректную сумму лимита');
      return;
    }

    const formData = new FormData(budgetForm);
    const selectedPeriod = formData.get('budget-period') || 'month';

    state.preferences.monthlyBudget = amount;
    state.preferences.monthlyBudgetCurrency = state.preferences.currency;
    state.preferences.budgetPeriod = selectedPeriod;

    // Direct transition to home dashboard to instantly view feedback on mobile
    switchScreen('home');
    updateUI();
  });
}

// Load initialization parameters
function initMobileApp() {
  setupEventListeners();
  updateFilterTabsUI();

  // Pick currency prefill
  currencySelect.value = state.preferences.currency;

  if (budgetCurrencyLabel) {
    budgetCurrencyLabel.textContent = state.preferences.currency;
  }

  // Pre-select budget form fields
  const activePeriod = state.preferences.budgetPeriod || 'month';
  const periodRadio = budgetForm.querySelector(`input[name="budget-period"][value="${activePeriod}"]`);
  if (periodRadio) {
    periodRadio.checked = true;
  }
  
  const budgetVal = state.preferences.monthlyBudget || 0;
  budgetAmountInput.value = budgetVal > 0 ? budgetVal.toFixed(2) : '';

  // Initial render UI
  updateUI();
}

// Boot operations
initMobileApp();
