// Wallet page behavior (moved from inline script)

// ENFORCE AUTHENTICATION FIRST - Must be before any other code
if (!enforceAuthentication()) {
  redirectToLogin();
  return;
}

refreshIcons();

const STORAGE_KEY = 'currentUser';
let balance = 0;
let totalEarned = 0;
let totalWithdrawn = 0;
let transactions = [];
let currentFilter = 'all';

function normaliseNumber(value) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num : 0;
}

function normaliseTransaction(item) {
  return {
    id: item?.id || `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    type: item?.type || 'earning',
    label: item?.label || item?.description || 'Transaction',
    amount: normaliseNumber(item?.amount),
    date: item?.date || new Date().toISOString(),
    status: item?.status || 'Completed'
  };
}

function hydrateWalletState() {
  try {
    const user = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || {};
    balance = normaliseNumber(user.balance);
    totalEarned = normaliseNumber(user.totalEarnings);
    totalWithdrawn = normaliseNumber(user.totalWithdrawn);
    transactions = Array.isArray(user.transactionHistory) ? user.transactionHistory.map(normaliseTransaction) : [];
  } catch (error) {
    balance = 0;
    totalEarned = 0;
    totalWithdrawn = 0;
    transactions = [];
  }
}

function persistWalletState() {
  try {
    const existingUser = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || {};
    const nextUser = {
      ...existingUser,
      balance,
      totalEarnings: totalEarned,
      totalWithdrawn,
      transactionHistory: transactions.map(tx => ({
        id: tx.id,
        type: tx.type,
        label: tx.label,
        amount: tx.amount,
        description: tx.label,
        date: tx.date,
        status: tx.status
      }))
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
  } catch (error) {
    console.log('Wallet state persistence failed:', error);
  }
}

function renderTx() {
  const list = document.getElementById('tx-list');
  const empty = document.getElementById('tx-empty');
  const filtered = currentFilter === 'all' ? transactions : transactions.filter(t => t.type === currentFilter);
  if (filtered.length === 0) {
    if (list) list.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }
  if (empty) empty.classList.add('hidden');
  if (!list) return;
  list.innerHTML = filtered.map(t => {
    const isPositive = t.type !== 'withdrawal';
    const icon = t.type === 'withdrawal' ? 'arrow-up-right' : t.type === 'deposit' ? 'arrow-down-left' : 'pickaxe';
    const colorClass = isPositive ? 'text-emerald-400' : 'text-red-400';
    const bgClass = isPositive ? 'bg-emerald-900/50' : 'bg-red-900/50';
    return `<div class="flex items-center justify-between text-sm">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-full ${bgClass} flex items-center justify-center"><i data-lucide="${icon}" style="width:14px;height:14px;" class="${colorClass}"></i></div>
        <div><p class="text-gray-200">${t.label}</p><p class="text-xs text-gray-500">${new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p></div>
      </div>
      <div class="text-right">
        <p class="${colorClass} font-medium">${isPositive ? '+' : '-'}$${normaliseNumber(t.amount).toFixed(2)}</p>
        <span class="text-xs text-gray-500">${t.status || 'Completed'}</span>
      </div>
    </div>`;
  }).join('');
  refreshIcons();
}

function filterTx(type, btn) {
  currentFilter = type;
  document.querySelectorAll('#filter-tabs button').forEach(b => {
    b.classList.remove('filter-active');
    b.classList.add('text-gray-400');
  });
  if (btn) { btn.classList.add('filter-active'); btn.classList.remove('text-gray-400'); }
  renderTx();
}

function updateUI() {
  const mainBalance = document.getElementById('main-balance'); if (mainBalance) mainBalance.textContent = `$${balance.toFixed(2)}`;
  const earnedEl = document.getElementById('stat-earned-val'); if (earnedEl) earnedEl.textContent = `$${totalEarned.toFixed(2)}`;
  const withdrawnEl = document.getElementById('stat-withdrawn-val'); if (withdrawnEl) withdrawnEl.textContent = `$${totalWithdrawn.toFixed(2)}`;
  const pendingEl = document.getElementById('stat-pending-val'); if (pendingEl) pendingEl.textContent = '$0.00';
  const avail = document.getElementById('withdraw-avail'); if (avail) avail.textContent = balance.toFixed(2);
}

function openDeposit() { const m = document.getElementById('deposit-modal'); if (!m) return; m.classList.remove('hidden'); m.classList.add('flex'); }
function closeDeposit() { const m = document.getElementById('deposit-modal'); if (!m) return; m.classList.add('hidden'); m.classList.remove('flex'); const err = document.getElementById('deposit-error'); if (err) err.classList.add('hidden'); }
function openWithdraw() { const m = document.getElementById('withdraw-modal'); if (!m) return; const avail = document.getElementById('withdraw-avail'); if (avail) avail.textContent = balance.toFixed(2); m.classList.remove('hidden'); m.classList.add('flex'); }
function closeWithdraw() { const m = document.getElementById('withdraw-modal'); if (!m) return; m.classList.add('hidden'); m.classList.remove('flex'); const err = document.getElementById('withdraw-error'); if (err) err.classList.add('hidden'); const addrErr = document.getElementById('withdraw-addr-error'); if (addrErr) addrErr.classList.add('hidden'); }

function confirmDeposit() {
  const amt = parseFloat(document.getElementById('deposit-amount').value);
  const depositError = document.getElementById('deposit-error');
  if (!amt || amt <= 0) { if (depositError) depositError.classList.remove('hidden'); return; }
  balance += amt; totalEarned += amt; transactions.unshift(normaliseTransaction({ type: 'deposit', label: 'Deposit', amount: amt, date: new Date().toISOString(), status: 'Completed' }));
  persistWalletState();
  updateUI(); renderTx(); closeDeposit();
  const input = document.getElementById('deposit-amount'); if (input) input.value = '';
  showToast(`Deposited $${amt.toFixed(2)} successfully`);
}

function confirmWithdraw() {
  const amt = parseFloat(document.getElementById('withdraw-amount').value);
  const addr = document.getElementById('withdraw-address').value.trim();
  const errEl = document.getElementById('withdraw-error');
  const addrErr = document.getElementById('withdraw-addr-error');
  if (errEl) errEl.classList.add('hidden'); if (addrErr) addrErr.classList.add('hidden');
  if (!amt || amt <= 0) { if (errEl) { errEl.textContent = 'Please enter a valid amount'; errEl.classList.remove('hidden'); } return; }
  if (amt > balance) { if (errEl) { errEl.textContent = 'Insufficient balance'; errEl.classList.remove('hidden'); } return; }
  if (!addr) { if (addrErr) addrErr.classList.remove('hidden'); return; }
  balance -= amt; totalWithdrawn += amt; transactions.unshift(normaliseTransaction({ type: 'withdrawal', label: 'Withdrawal', amount: amt, date: new Date().toISOString(), status: 'Completed' }));
  persistWalletState();
  updateUI(); renderTx(); closeWithdraw();
  const wa = document.getElementById('withdraw-amount'); if (wa) wa.value = '';
  const wadd = document.getElementById('withdraw-address'); if (wadd) wadd.value = '';
  showToast(`Withdrew $${amt.toFixed(2)} successfully`);
}

function copyAddress() { navigator.clipboard.writeText('0x7a3f...b92e'); showToast('Address copied'); }

['deposit-modal','withdraw-modal'].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('click', e => { if (e.target === e.currentTarget) { id === 'deposit-modal' ? closeDeposit() : closeWithdraw(); } });
});

hydrateWalletState();
updateUI();
renderTx();
