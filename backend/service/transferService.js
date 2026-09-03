const crypto = require('crypto');
const { getServiceClient } = require('../supabase');

async function createTransfer(user, { fromId, to, amount, description }) {
  const db = getServiceClient();
  if (!db) {
    const err = new Error('Database not configured');
    err.status = 503;
    throw err;
  }

  const amt = Number(amount);
  if (!(amt > 0)) {
    const err = new Error('Amount must be positive');
    err.status = 400;
    throw err;
  }

  const { data: customer } = await db
    .from('customers')
    .select('id')
    .eq('profile_id', user.id)
    .maybeSingle();
  if (!customer) {
    const err = new Error('Customer profile not found');
    err.status = 400;
    throw err;
  }

  const { data: fromAcc, error: fromErr } = await db
    .from('accounts')
    .select('*')
    .eq('id', fromId)
    .eq('customer_id', customer.id)
    .single();

  if (fromErr || !fromAcc) {
    const err = new Error('Source account not found');
    err.status = 404;
    throw err;
  }

  if (Number(fromAcc.available_balance) < amt) {
    const err = new Error('Insufficient available balance');
    err.status = 400;
    throw err;
  }

  const reference = 'TRF-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  const newBal = Number(fromAcc.balance) - amt;
  const newAvail = Number(fromAcc.available_balance) - amt;

  const { error: upErr } = await db
    .from('accounts')
    .update({ balance: newBal, available_balance: newAvail, updated_at: new Date().toISOString() })
    .eq('id', fromAcc.id);
  if (upErr) throw upErr;

  const { data: tx, error: txErr } = await db
    .from('transactions')
    .insert({
      account_id: fromAcc.id,
      type: 'transfer_out',
      amount: amt,
      currency: fromAcc.currency || 'USD',
      balance_after: newBal,
      description: description || `Transfer to ${to}`,
      reference,
      status: 'completed',
      processed_at: new Date().toISOString(),
      metadata: { to }
    })
    .select()
    .single();

  if (txErr) throw txErr;

  await db.from('audit_logs').insert({
    actor_id: user.id,
    actor_role: user.role,
    action: 'transfer_create',
    resource: 'transaction',
    resource_id: tx.id,
    result: 'success',
    metadata: { reference, amount: amt, to }
  });

  return {
    success: true,
    reference,
    status: 'completed',
    transactionId: tx.id
  };
}

module.exports = { createTransfer };
