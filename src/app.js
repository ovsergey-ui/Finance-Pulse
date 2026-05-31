import { storage } from './storage.js';
import { currency } from './currency.js';
import { analytics } from './analytics.js';

// Application State
let state = storage.load();

// DOM Elements
const balanceEl = document.getElementById('total-balance');
const incomeEl = document.getElementById('total-income');
const expensesEl = document.getElementById('total-expenses');
const ratioEl = document.getElementById('expense-ratio');
const ratioProgressEl = document.getElementById('ratio-progress');
const insightTitleEl = document.getElementById('insight-title');
const insightMsgEl = document.getElementById('insight-message');
const insightIconEl = document.getElementById('insight-icon');
const transactionListEl = document.getElementById('transaction-list');
const currencySelect = document.getElementById('currency-selector');
const transactionForm = document.getElementById('transaction-form');
const addBtn = document.getElementById('add-transaction-btn');
const modal = document.getElementById('transaction-modal');
const closeModalBtn = document.getElementById('close-modal');

// Income Alert Popover Elements & Helpers
const incomeAlertPopover = document.getElementById('income-alert-popover');
let incomeAlertTimeout = null;

function hideIncomeAlert() {
  if (incomeAlertPopover) {
    incomeAlertPopover.classList.add('hidden');
  }
  if (incomeAlertTimeout) {
    clearTimeout(incomeAlertTimeout);
    incomeAlertTimeout = null;
  }
}

function showIncomeAlert() {
  if (incomeAlertPopover) {
    incomeAlertPopover.classList.remove('hidden');
    
    // Auto-hide after 6 seconds
    if (incomeAlertTimeout) clearTimeout(incomeAlertTimeout);
    incomeAlertTimeout = setTimeout(() => {
      hideIncomeAlert();
    }, 6000);
  }
}

// Budget DOM Elements
const expensesContainer = document.getElementById('expenses-container');
const expensesLabel = document.getElementById('expenses-label');
const budgetLimitBtn = document.getElementById('budget-limit-btn');
const budgetLimitVal = document.getElementById('budget-limit-val');
const budgetModal = document.getElementById('budget-modal');
const closeBudgetModalBtn = document.getElementById('close-budget-modal');
const budgetForm = document.getElementById('budget-form');
const budgetAmountInput = document.getElementById('budget-amount');
const budgetCurrencyLabel = document.getElementById('budget-currency-label');
const budgetAlertContainer = document.getElementById('budget-alert-container');

// Filters DOM Elements
const customDateContainer = document.getElementById('custom-date-container');
const filterStartDateEl = document.getElementById('filter-start-date');
const filterEndDateEl = document.getElementById('filter-end-date');
const filterAllBtn = document.getElementById('filter-all');
const filterDayBtn = document.getElementById('filter-day');
const filterMonthBtn = document.getElementById('filter-month');
const filterYearBtn = document.getElementById('filter-year');
const filterCustomBtn = document.getElementById('filter-custom');

// State for active filter
let activeFilter = 'all';

// Initialize
function init() {
  updateUI();
  setupEventListeners();
  updateFilterTabsUI();
  currencySelect.value = state.preferences.currency;
}

// Update UI
function updateUI() {
  const currentCurrency = state.preferences.currency;
  
  // Calculate totals by converting each transaction to the current currency
  const totals = state.transactions.reduce((acc, t) => {
    const amountInSelected = currency.convert(t.amount, t.currency || 'USD', currentCurrency);
    if (t.type === 'income') {
      acc.income += amountInSelected;
    } else {
      acc.expenses += amountInSelected;
    }
    return acc;
  }, { income: 0, expenses: 0 });

  const balance = totals.income - totals.expenses;
  const ratio = analytics.getExpenseRatio(totals.income, totals.expenses);
  const insight = analytics.getInsight(totals.income, totals.expenses);

  // Stats
  balanceEl.textContent = currency.format(balance, currentCurrency);
  incomeEl.textContent = currency.format(totals.income, currentCurrency);
  expensesEl.textContent = currency.format(totals.expenses, currentCurrency);
  ratioEl.textContent = `${ratio.toFixed(1)}%`;
  
  // Ratio progress bar
  ratioProgressEl.style.width = `${Math.min(ratio, 100)}%`;
  
  // Dynamic color classes for progress bar
  const progressColor = ratio > 90 ? 'bg-red-500' : ratio > 70 ? 'bg-orange-500' : 'bg-blue-600';
  const progressShadow = ratio > 90 ? 'shadow-[0_0_15px_rgba(239,68,68,0.4)]' : ratio > 70 ? 'shadow-[0_0_15px_rgba(249,115,22,0.4)]' : 'shadow-[0_0_15px_rgba(37,99,235,0.4)]';
  
  ratioProgressEl.className = `h-full rounded-full transition-all duration-1000 ${progressColor} ${progressShadow}`;

  // Ratio text color
  ratioEl.className = `text-4xl font-black ${ratio > 90 ? 'text-red-600' : ratio > 70 ? 'text-orange-500' : 'text-gray-950'}`;

  // --- Start Budget & Overrun Logic ---
  const now = new Date();
  const budgetPeriod = state.preferences.budgetPeriod || 'month';
  const budgetVal = state.preferences.monthlyBudget || 0;
  const budgetCurrency = state.preferences.monthlyBudgetCurrency || 'USD';
  const convertedBudget = currency.convert(budgetVal, budgetCurrency, currentCurrency);

  // Update period label in card
  const budgetPeriodLabel = document.getElementById('budget-period-label');
  if (budgetPeriodLabel) {
    const periodLabels = {
      day: 'Лимит на день:',
      week: 'Лимит на неделю:',
      month: 'Лимиты расходов:'
    };
    budgetPeriodLabel.textContent = periodLabels[budgetPeriod] || 'Лимит:';
  }

  // Calculate expenses for matching chosen period: day, week, month
  const currentPeriodExpenses = state.transactions.reduce((acc, t) => {
    if (t.type !== 'expense') return acc;
    const tDate = new Date(t.date);
    let isSamePeriod = false;

    if (budgetPeriod === 'day') {
      isSamePeriod = tDate.toDateString() === now.toDateString();
    } else if (budgetPeriod === 'week') {
      // Find start of current week (Monday)
      const getStartOfWeek = (d) => {
        const temp = new Date(d);
        const day = temp.getDay();
        const diff = temp.getDate() - day + (day === 0 ? -6 : 1);
        const start = new Date(temp.setDate(diff));
        start.setHours(0, 0, 0, 0);
        return start;
      };
      const startOfWeek = getStartOfWeek(now);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);

      const tTime = tDate.getTime();
      isSamePeriod = tTime >= startOfWeek.getTime() && tTime < endOfWeek.getTime();
    } else {
      // Month
      isSamePeriod = tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
    }

    if (isSamePeriod) {
      return acc + currency.convert(t.amount, t.currency || 'USD', currentCurrency);
    }
    return acc;
  }, 0);

  // Set highly visible style for budget button based on status
  if (budgetLimitVal && budgetLimitBtn) {
    if (budgetVal > 0) {
      budgetLimitVal.textContent = currency.format(convertedBudget, currentCurrency);
      
      if (currentPeriodExpenses > convertedBudget) {
        // Exceeded: Red blinking badge
        budgetLimitBtn.className = 'cursor-pointer flex items-center gap-1.5 transition-all select-none font-black rounded-full px-2.5 py-1 text-[10px] uppercase border bg-red-600 text-white hover:bg-red-700 shadow-[0_4px_12px_rgba(220,38,38,0.25)] border-transparent duration-200 hover:scale-105 active:scale-95 animate-pulse-subtle';
      } else {
        // Safe: Gentle blue/gray badge
        budgetLimitBtn.className = 'cursor-pointer flex items-center gap-1.5 transition-all select-none font-black rounded-full px-2.5 py-1 text-[10px] uppercase border bg-blue-50/70 text-blue-600 hover:bg-blue-100/80 hover:text-blue-700 border-blue-200/50 shadow-sm duration-200 hover:scale-105 active:scale-95';
      }
    } else {
      // Not Set: Expressive bright pulsing button to prompt setting
      budgetLimitVal.textContent = 'Установить';
      budgetLimitBtn.className = 'cursor-pointer flex items-center gap-1.5 transition-all select-none font-black rounded-full px-3 py-1.5 text-[10px] uppercase border bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_4px_12px_rgba(37,99,235,0.3)] border-transparent hover:from-blue-700 hover:to-indigo-700 duration-200 hover:scale-105 active:scale-95 animate-pulse-subtle';
    }
  }

  if (budgetVal > 0 && currentPeriodExpenses > convertedBudget) {
    // Exceeded budget! Highlight card in red
    if (expensesContainer) {
      expensesContainer.className = 'bg-red-500/10 border-red-300 p-6 rounded-3xl border transition-all duration-300 relative overflow-hidden shadow-[0_0_20px_rgba(239,68,68,0.15)]';
    }
    if (expensesLabel) {
      expensesLabel.className = 'text-[10px] font-bold uppercase tracking-widest text-red-500/80 block mb-2 transition-colors';
    }
    if (expensesEl) {
      expensesEl.className = 'text-2xl font-black text-red-605 transition-colors';
    }

    // Show Alarm Notification Banner
    if (budgetAlertContainer) {
      const overage = currentPeriodExpenses - convertedBudget;
      const periodNameRu = {
        day: 'текущий день',
        week: 'текущую неделю',
        month: 'текущий месяц'
      }[budgetPeriod] || 'период';

      budgetAlertContainer.innerHTML = `
        <div class="bg-red-50 border border-red-200/60 p-5 rounded-[2rem] flex items-center justify-between gap-4 shadow-[0_15px_30px_rgba(239,68,68,0.06)] animate-fade-up">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center shrink-0 animate-pulse">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-alert-triangle"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
            </div>
            <div>
              <h4 class="font-black text-red-950 uppercase text-xs tracking-widest">Перерасход бюджета за ${budgetPeriod === 'day' ? 'день' : budgetPeriod === 'week' ? 'неделю' : 'месяц'}!</h4>
              <p class="text-[11px] font-bold text-red-500/85 mt-1 leading-relaxed">
                Сумма расходов за ${periodNameRu} (${currency.format(currentPeriodExpenses, currentCurrency)}) превышает установленный лимит (${currency.format(convertedBudget, currentCurrency)}) на <span class="text-red-600 font-extrabold">${currency.format(overage, currentCurrency)}</span>!
              </p>
            </div>
          </div>
        </div>
      `;
      budgetAlertContainer.classList.remove('hidden');
    }
  } else {
    // Normal style
    if (expensesContainer) {
      expensesContainer.className = 'bg-white/50 p-6 rounded-3xl border border-white/50 transition-all duration-300 relative overflow-hidden';
    }
    if (expensesLabel) {
      expensesLabel.className = 'text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-2 transition-colors';
    }
    if (expensesEl) {
      expensesEl.className = 'text-2xl font-black text-gray-900 transition-colors';
    }

    // Hide Alarm notification banner
    if (budgetAlertContainer) {
      budgetAlertContainer.classList.add('hidden');
      budgetAlertContainer.innerHTML = '';
    }
  }
  // --- End Budget & Overrun Logic ---

  // Insight
  insightTitleEl.textContent = insight.title;
  insightMsgEl.textContent = insight.message;
  
  const icons = {
    warning: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
    error: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>',
    success: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>',
    info: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>'
  };

  const colors = {
    warning: 'text-orange-500',
    error: 'text-red-500',
    success: 'text-green-500',
    info: 'text-blue-500'
  };

  insightIconEl.innerHTML = icons[insight.type] || icons.info;
  insightIconEl.className = `w-16 h-16 mb-6 transition-all animate-float ${colors[insight.type] || 'text-gray-400'}`;

  // Transactions
  renderTransactions();
  
  // Save
  storage.save(state);
}

function renderTransactions() {
  transactionListEl.innerHTML = '';
  
  if (state.transactions.length === 0) {
    transactionListEl.innerHTML = '<div class="text-center py-12 text-gray-400 font-medium italic animate-fade-up">Операций пока не добавлено...</div>';
    return;
  }

  // Filter transactions based on selected active filter
  const filtered = state.transactions.filter(t => {
    const tDate = new Date(t.date);
    const now = new Date();
    
    if (activeFilter === 'day') {
      return tDate.toDateString() === now.toDateString();
    }
    if (activeFilter === 'month') {
      return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
    }
    if (activeFilter === 'year') {
      return tDate.getFullYear() === now.getFullYear();
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

  if (filtered.length === 0) {
    transactionListEl.innerHTML = '<div class="text-center py-12 text-gray-400 font-medium italic animate-fade-up">Нет операций за выбранный период...</div>';
    return;
  }

  // Sort by date (desc)
  const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));

  sorted.forEach((t, index) => {
    const displayAmount = currency.convert(t.amount, t.currency || 'USD', state.preferences.currency);
    const div = document.createElement('div');
    // Staggered entry animation
    div.className = 'flex items-center justify-between p-5 glass-card rounded-3xl hover:shadow-md transition-all group animate-fade-up';
    div.style.animationDelay = `${index * 0.05}s`;
    
    div.innerHTML = `
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${t.type === 'income' ? 'bg-green-50 text-green-500 group-hover:bg-green-500 group-hover:text-white' : 'bg-red-50 text-red-500 group-hover:bg-red-500 group-hover:text-white'}">
          ${t.type === 'income' ? '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m19 12-7 7-7-7"/><path d="M12 19V5"/></svg>' : '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 5v14"/></svg>'}
        </div>
        <div>
          <h4 class="font-black text-gray-950 uppercase text-xs tracking-widest">${t.category}</h4>
          <p class="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-tighter">${new Date(t.date).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
        </div>
      </div>
      <div class="text-right flex flex-col items-end gap-1">
        <p class="font-black text-lg tracking-tighter ${t.type === 'income' ? 'text-green-500' : 'text-gray-950'}">
          ${t.type === 'income' ? '+' : '-'}${currency.format(displayAmount, state.preferences.currency)}
        </p>
        <button data-id="${t.id}" class="delete-btn text-[10px] font-black uppercase text-red-300 hover:text-red-500 transition-all tracking-widest opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0">
          Удалить
        </button>
      </div>
    `;
    transactionListEl.appendChild(div);
  });

  // Attach delete events
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.onclick = (e) => {
      const id = e.target.dataset.id;
      state.transactions = state.transactions.filter(t => t.id !== id);
      updateUI();
    };
  });
}

// Function to update visual state of filter tabs
function updateFilterTabsUI() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    const btnFilter = btn.id.replace('filter-', '');
    if (btnFilter === activeFilter) {
      btn.className = 'filter-btn px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest text-blue-600 bg-white shadow-sm transition-all btn-hover';
    } else {
      btn.className = 'filter-btn px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-500 hover:text-gray-950 transition-all btn-hover flex items-center gap-2';
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

// Event Listeners
function setupEventListeners() {
  currencySelect.addEventListener('change', (e) => {
    state.preferences.currency = e.target.value;
    updateUI();
  });

  // Filters Event Listeners
  const filterButtons = [
    { el: filterAllBtn, filter: 'all' },
    { el: filterDayBtn, filter: 'day' },
    { el: filterMonthBtn, filter: 'month' },
    { el: filterYearBtn, filter: 'year' },
    { el: filterCustomBtn, filter: 'custom' }
  ];

  filterButtons.forEach(({ el, filter }) => {
    if (el) {
      el.addEventListener('click', () => {
        activeFilter = filter;
        updateFilterTabsUI();
        renderTransactions();
      });
    }
  });

  if (filterStartDateEl) {
    filterStartDateEl.addEventListener('change', () => {
      if (activeFilter === 'custom') {
        renderTransactions();
      }
    });
  }

  if (filterEndDateEl) {
    filterEndDateEl.addEventListener('change', () => {
      if (activeFilter === 'custom') {
        renderTransactions();
      }
    });
  }

  addBtn.addEventListener('click', () => {
    hideIncomeAlert();
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    const content = modal.querySelector('div');
    content.classList.remove('animate-scale-in');
    void content.offsetWidth; // Force reflow
    content.classList.add('animate-scale-in');
    document.body.style.overflow = 'hidden';

    const dateInput = document.getElementById('date');
    if (dateInput) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      dateInput.value = `${yyyy}-${mm}-${dd}`;
    }
  });

  closeModalBtn.addEventListener('click', () => {
    hideIncomeAlert();
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = '';
  });

  // Hide income alert when user interacts with input fields
  const amtInput = document.getElementById('amount');
  if (amtInput) {
    amtInput.addEventListener('input', hideIncomeAlert);
  }
  const typeInputs = transactionForm.querySelectorAll('input[name="type"]');
  typeInputs.forEach(input => {
    input.addEventListener('change', hideIncomeAlert);
  });

  transactionForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const formData = new FormData(transactionForm);
    const dateVal = formData.get('date');
    let transactionDate = new Date();
    if (dateVal) {
      const [year, month, day] = dateVal.split('-').map(Number);
      const now = new Date();
      transactionDate = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());
    }

    const newTransaction = {
      id: Date.now().toString(),
      type: formData.get('type'),
      amount: parseFloat(formData.get('amount')),
      currency: state.preferences.currency,
      category: formData.get('category'),
      date: transactionDate.toISOString()
    };

    if (isNaN(newTransaction.amount) || newTransaction.amount <= 0) {
      alert('Пожалуйста, введите корректную сумму');
      return;
    }

    if (newTransaction.type === 'expense') {
      const currentCurrency = state.preferences.currency;
      const totals = state.transactions.reduce((acc, t) => {
        const amountInSelected = currency.convert(t.amount, t.currency || 'USD', currentCurrency);
        if (t.type === 'income') {
          acc.income += amountInSelected;
        } else {
          acc.expenses += amountInSelected;
        }
        return acc;
      }, { income: 0, expenses: 0 });

      const currentBalance = totals.income - totals.expenses;
      if (newTransaction.amount > currentBalance) {
        showIncomeAlert();
        return;
      }
    }

    state.transactions.push(newTransaction);
    transactionForm.reset();
  
    // Balance pulse animation
    balanceEl.classList.remove('animate-fade-up');
    void balanceEl.offsetWidth; // Force reflow
    balanceEl.classList.add('scale-105', 'text-blue-600');
    setTimeout(() => {
      balanceEl.classList.remove('scale-105', 'text-blue-600');
    }, 300);

    // Quick close modal
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = '';

    updateUI();
  });

  // Budget Event Listeners
  if (budgetLimitBtn) {
    budgetLimitBtn.addEventListener('click', () => {
      budgetModal.classList.remove('hidden');
      budgetModal.classList.add('flex');
      const content = budgetModal.querySelector('div');
      content.classList.remove('animate-scale-in');
      void content.offsetWidth; // Force reflow
      content.classList.add('animate-scale-in');
      document.body.style.overflow = 'hidden';

      const currentCurrency = state.preferences.currency;
      if (budgetCurrencyLabel) {
        budgetCurrencyLabel.textContent = currentCurrency;
      }

      // Preselect the current period chosen by the user
      const activePeriod = state.preferences.budgetPeriod || 'month';
      const periodRadio = budgetModal.querySelector(`input[name="budget-period"][value="${activePeriod}"]`);
      if (periodRadio) {
        periodRadio.checked = true;
      }

      if (budgetAmountInput) {
        const budgetVal = state.preferences.monthlyBudget || 0;
        const budgetCurrency = state.preferences.monthlyBudgetCurrency || 'USD';
        const convertedBudget = currency.convert(budgetVal, budgetCurrency, currentCurrency);
        budgetAmountInput.value = budgetVal > 0 ? convertedBudget.toFixed(2) : '';
      }
    });
  }

  if (closeBudgetModalBtn) {
    closeBudgetModalBtn.addEventListener('click', () => {
      budgetModal.classList.add('hidden');
      budgetModal.classList.remove('flex');
      document.body.style.overflow = '';
    });
  }

  if (budgetForm) {
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

      // Quick close modal
      budgetModal.classList.add('hidden');
      budgetModal.classList.remove('flex');
      document.body.style.overflow = '';

      updateUI();
    });
  }

  // Close modal on escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!modal.classList.contains('hidden')) {
        closeModalBtn.click();
      }
      if (budgetModal && !budgetModal.classList.contains('hidden')) {
        closeBudgetModalBtn.click();
      }
    }
  });
}

init();
