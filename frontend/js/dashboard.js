/**
 * Customer dashboard data layer — API only (no synthetic balances).
 */
(function () {
  const GTF = (window.GTF = window.GTF || {});

  GTF.dashboard = {
    async getSummary() {
      return GTF.api('/dashboard/summary');
    },

    async getAccounts() {
      const data = await GTF.api('/accounts');
      return { accounts: data.accounts || [] };
    },

    async getTransactions(params = {}) {
      const q = new URLSearchParams(params).toString();
      const data = await GTF.api('/transactions' + (q ? '?' + q : ''));
      return { transactions: data.transactions || [] };
    },

    statusBadge(status) {
      const map = {
        completed: 'badge-success',
        pending: 'badge-warning',
        failed: 'badge-danger',
        reversed: 'badge-neutral',
        active: 'badge-success',
        frozen: 'badge-warning',
        closed: 'badge-neutral'
      };
      return map[status] || 'badge-neutral';
    },

    typeLabel(type) {
      const map = {
        deposit: 'Deposit',
        withdrawal: 'Withdrawal',
        transfer_in: 'Transfer in',
        transfer_out: 'Transfer out',
        payment: 'Payment',
        fee: 'Fee',
        interest: 'Interest',
        reversal: 'Reversal'
      };
      return map[type] || type;
    }
  };
})();
