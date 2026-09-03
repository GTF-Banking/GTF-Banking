const { getServiceClient, isConfigured } = require('../supabase');

async function listForUser(user) {
  const db = getServiceClient();
  if (!db) return null;

  if (['admin', 'super_admin', 'manager', 'cashier'].includes(user.role)) {
    const { data, error } = await db
      .from('accounts')
      .select('id, account_number, currency, balance, available_balance, status, opened_at, account_types(code, name), customers(id, customer_number, profiles(full_name, email))')
      .order('opened_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    return (data || []).map(mapAccount);
  }

  const { data: customer } = await db
    .from('customers')
    .select('id')
    .eq('profile_id', user.id)
    .maybeSingle();

  if (!customer) return [];

  const { data, error } = await db
    .from('accounts')
    .select('id, account_number, currency, balance, available_balance, status, opened_at, account_types(code, name)')
    .eq('customer_id', customer.id)
    .order('opened_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapAccount);
}

function mapAccount(row) {
  const type = row.account_types;
  const num = row.account_number || '';
  const masked = num.length > 4 ? '****' + num.slice(-4) : num;
  return {
    id: row.id,
    name: type?.name || type?.code || 'Account',
    type: type?.code || 'checking',
    accountNumber: masked,
    account_number_full: num,
    balance: Number(row.balance || 0),
    available: Number(row.available_balance ?? row.balance ?? 0),
    currency: row.currency || 'USD',
    status: row.status || 'active',
    openedAt: row.opened_at
  };
}

async function ensureStarterAccounts(userId) {
  const db = getServiceClient();
  if (!db) return;

  const { data: customer } = await db
    .from('customers')
    .select('id')
    .eq('profile_id', userId)
    .maybeSingle();
  if (!customer) return;

  const { count } = await db
    .from('accounts')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', customer.id);

  if (count && count > 0) return;

  const { data: types } = await db.from('account_types').select('id, code');
  const checking = types?.find((t) => t.code === 'checking');
  const savings = types?.find((t) => t.code === 'savings');
  if (!checking) return;

  const base = 'GTF' + Date.now().toString().slice(-8);
  const rows = [
    {
      customer_id: customer.id,
      account_type_id: checking.id,
      account_number: base + '01',
      currency: 'USD',
      balance: 0,
      available_balance: 0,
      status: 'active'
    }
  ];
  if (savings) {
    rows.push({
      customer_id: customer.id,
      account_type_id: savings.id,
      account_number: base + '02',
      currency: 'USD',
      balance: 0,
      available_balance: 0,
      status: 'active'
    });
  }
  await db.from('accounts').insert(rows);
}

module.exports = { listForUser, ensureStarterAccounts, mapAccount };
