/**
 * Storage Module
 * Handles persistence of finance data using localStorage.
 */

const STORAGE_KEY = 'finance_pulse_data';

const DEFAULT_DATA = {
  transactions: [],
  preferences: {
    currency: 'USD'
  }
};

export const storage = {
  save(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  },

  load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_DATA;
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      return DEFAULT_DATA;
    }
  },

  reset() {
    localStorage.removeItem(STORAGE_KEY);
    return DEFAULT_DATA;
  }
};
