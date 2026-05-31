/**
 * Currency Module
 * Handles currency formatting and conversion logic (mock rates for now).
 */

const RATES = {
  USD: 1,
  EUR: 0.92,
  RUB: 91.5
};

const SYMBOLS = {
  USD: '$',
  EUR: '€',
  RUB: '₽'
};

export const currency = {
  getRates() {
    return RATES;
  },

  getSymbols() {
    return SYMBOLS;
  },

  format(amount, currencyCode = 'USD') {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
    }).format(amount);
  },

  convert(amount, from, to) {
    if (from === to) return amount;
    const amountInUSD = amount / RATES[from];
    return amountInUSD * RATES[to];
  }
};
