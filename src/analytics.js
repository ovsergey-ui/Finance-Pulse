/**
 * Analytics Module
 * Provides helper functions for calculating totals, ratios, and insights.
 */

export const analytics = {
  calculateTotals(transactions) {
    return transactions.reduce((acc, t) => {
      if (t.type === 'income') {
        acc.income += parseFloat(t.amount);
      } else {
        acc.expenses += parseFloat(t.amount);
      }
      return acc;
    }, { income: 0, expenses: 0 });
  },

  getExpenseRatio(income, expenses) {
    if (income === 0) return expenses > 0 ? 100 : 0;
    return (expenses / income) * 100;
  },

  getInsight(income, expenses) {
    const ratio = this.getExpenseRatio(income, expenses);
    
    if (income === 0 && expenses > 0) {
      return {
        title: 'Внимание',
        message: 'Доходы ещё не зарегистрированы, но расходы уже есть. Рекомендуем добавить поступления!',
        type: 'warning'
      };
    }

    if (ratio === 0) {
      return {
        title: 'Начало работы',
        message: 'Добавьте первые транзакции, чтобы увидеть здесь аналитику вашего бюджета.',
        type: 'info'
      };
    }

    if (ratio > 90) {
      return {
        title: 'Критический расход',
        message: 'Вы тратите более 90% своих доходов. Рекомендуется пересмотреть необязательные статьи расходов.',
        type: 'error'
      };
    }

    if (ratio > 70) {
      return {
        title: 'Бюджет под контролем',
        message: 'Вы тратите значительную часть своего дохода. Пожалуйста, внимательно следите за финансовым пульсом!',
        type: 'warning'
      };
    }

    if (ratio < 50) {
      return {
        title: 'Отличный пульс',
        message: 'Великолепно! Ваши расходы составляют менее половины доходов. Режим накопления активирован!',
        type: 'success'
      };
    }

    return {
      title: 'Стабильный баланс',
      message: 'Ваша финансовая ситуация выглядит стабильно. Продолжайте поддерживать это равновесие!',
      type: 'info'
    };
  }
};
