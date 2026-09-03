const { getServiceClient } = require('../supabase');

async function listForUser(user, { limit = 50 } = {}) {
  const db = getServiceClient();
  if (!db) return null;

  if (['admin', 'super_admin', 'manager', 'cashier'].includes(user.role)) {
    const { data, error } = await db
      .from('transactions')
      .select('id, type, amount, currency, status, description, reference, created_at, account_id, accounts(account_number)')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []).map(mapTx);
  }

  const { data: customer } = await db
    .from('customers')
    .select('id')
    .eq('profile_id', user.id)
    .maybeSingle();
  if (!customer) return [];

  const { data: accounts } = await db
    .from('accounts')
    .select('id')
    .eq('customer_id', customer.id);
  const ids = (accounts || []).map((a) => a.id);
  if (!ids.length) return [];

  const { data, error } = await db
    .from('transactions')
    .select('id, type, amount, currency, status, description, reference, created_at, account_id, accounts(account_number)')
    .in('account_id', ids)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []).map(mapTx);
}

function mapTx(row) {
  const num = row.accounts?.account_number || '';
  const masked = num.length > 4 ? '****' + num.slice(-4) : num;
  return {
    id: row.id,
    date: row.created_at,
    description: row.description || row.type,
    type: row.type,
    amount: Number(row.amount || 0),
    currency: row.currency || 'USD',
    status: row.status || 'completed',
    reference: row.reference || null,
    account: masked
  };
}

module.exports = { listForUser, mapTx };
