// Withdraw page behavior (extracted from withdraw.html inline script)

// Require auth and zero balances
if (typeof enforceAuthentication === 'function' && !enforceAuthentication()) {
  redirectToLogin();
  return;
}

refreshIcons();

let balance = 0;
let lifetimeWithdrawn = 0;
let transactions = [];
let currentFilter = 'all';
let pendingAmount = 0;
let pendingAddress = '';

function hydrateWithdrawState() {
  try {
    const user = JSON.parse(localStorage.getItem('currentUser') || 'null') || {};
    balance = Number(user.balance || 0);
    lifetimeWithdrawn = Number(user.totalWithdrawn || 0);
    transactions = Array.isArray(user.transactionHistory) ? user.transactionHistory.map(tx => ({
      id: tx.id || `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
      date: tx.date || new Date().toISOString().slice(0, 10),
      dest: tx.destination || '0x7A••••91C4',
      amount: Number(tx.amount || 0),
      status: tx.status || 'completed'
    })) : [];
  } catch (error) {
    balance = 0;
    lifetimeWithdrawn = 0;
    transactions = [];
  }
}

function persistWithdrawState() {
  try {
    const user = JSON.parse(localStorage.getItem('currentUser') || 'null') || {};
    localStorage.setItem('currentUser', JSON.stringify({
      ...user,
      balance,
      totalWithdrawn: lifetimeWithdrawn,
      transactionHistory: transactions.map(tx => ({
        id: tx.id,
        amount: tx.amount,
        date: tx.date,
        description: `Withdrawal request`,
        status: tx.status,
        type: 'withdrawal'
      }))
    }));
  } catch (error) {
    console.log('Withdraw state persistence failed:', error);
  }
}

function renderTx() {
  const list = document.getElementById('tx-list');
  const empty = document.getElementById('tx-empty');
  if (!list) return;
  const filtered = currentFilter === 'all' ? transactions : transactions.filter(t => t.status === currentFilter);
  if (filtered.length === 0) { list.innerHTML = ''; if (empty) empty.classList.remove('hidden'); return; }
  if (empty) empty.classList.add('hidden');
  list.innerHTML = filtered.map(t => {
    const badge = t.status === 'completed' ? 'bg-emerald-900/50 text-emerald-400' : t.status === 'pending' ? 'bg-yellow-900/50 text-yellow-400' : 'bg-red-900/50 text-red-400';
    return `<div class="flex items-center justify-between p-3 bg-[#0d1525] rounded-lg border border-[#1e293b]">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2"><span class="text-sm text-white font-medium">-$${t.amount.toFixed(2)}</span><span class="text-xs px-2 py-0.5 rounded-full font-medium ${badge}">${t.status}</span></div>
        <p class="text-xs text-gray-500 mt-0.5">${t.date} · ${t.dest} · ${t.id}</p>
      </div>
    </div>`;
  }).join('');
  refreshIcons();
}

function filterTx(f, btn) {
  currentFilter = f;
  document.querySelectorAll('.filter-btn').forEach(b => { b.classList.remove('filter-active'); b.classList.add('text-gray-400'); });
  if (btn) { btn.classList.add('filter-active'); btn.classList.remove('text-gray-400'); }
  renderTx();
}

function fillMax() { const el = document.getElementById('amount-input'); if (!el) return; el.value = balance.toFixed(2); updateFee(); }

function updateFee() {
  const v = parseFloat(document.getElementById('amount-input').value) || 0;
  const feeAmount = document.getElementById('fee-amount'); if (feeAmount) feeAmount.textContent = `$${v.toFixed(2)}`;
  const feeReceive = document.getElementById('fee-receive'); if (feeReceive) feeReceive.textContent = `$${v.toFixed(2)}`;
}
const amtInput = document.getElementById('amount-input'); if (amtInput) amtInput.addEventListener('input', updateFee);

function reviewWithdrawal() {
  const amtEl = document.getElementById('amount-input');
  const addrEl = document.getElementById('address-input');
  const amtErr = document.getElementById('amount-error');
  const addrErr = document.getElementById('address-error');
  if (amtErr) amtErr.classList.add('hidden'); if (addrErr) addrErr.classList.add('hidden');
  let valid = true;
  const amt = parseFloat(amtEl.value);
  if (!amtEl.value || isNaN(amt) || amt <= 0) { if (amtErr) { amtErr.textContent = 'Enter a valid amount'; amtErr.classList.remove('hidden'); } valid = false; }
  else if (amt < 10) { if (amtErr) { amtErr.textContent = 'Minimum withdrawal is $10.00'; amtErr.classList.remove('hidden'); } valid = false; }
  else if (amt > balance) { if (amtErr) { amtErr.textContent = 'Insufficient balance'; amtErr.classList.remove('hidden'); } valid = false; }
  const addr = addrEl.value.trim();
  if (!addr) { if (addrErr) { addrErr.textContent = 'Enter a wallet address'; addrErr.classList.remove('hidden'); } valid = false; }
  else if (!/^0x[a-fA-F0-9]{8,}$/.test(addr)) { if (addrErr) { addrErr.textContent = 'Invalid wallet address format'; addrErr.classList.remove('hidden'); } valid = false; }
  if (!valid) return;
  pendingAmount = amt; pendingAddress = addr;
  const details = document.getElementById('review-details');
  if (!details) return;
  const masked = addr.slice(0,4) + '••••' + addr.slice(-4);
  details.innerHTML = `<div class="flex justify-between"><span class="text-gray-400">Amount</span><span class="text-white font-medium">$${amt.toFixed(2)}</span></div>
    <div class="flex justify-between"><span class="text-gray-400">Destination</span><span class="text-white font-mono text-xs">${masked}</span></div>
    <div class="flex justify-between"><span class="text-gray-400">Network fee</span><span class="text-white">$0.00</span></div>
    <div class="border-t border-[#1e293b] pt-2 flex justify-between font-semibold"><span class="text-gray-300">You receive</span><span class="text-[#a3e635]">$${amt.toFixed(2)}</span></div>`;
  const modal = document.getElementById('review-modal'); if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); modal.querySelector('button')?.focus(); }
}

function confirmWithdrawal() {
  balance -= pendingAmount; lifetimeWithdrawn += pendingAmount;
  persistWithdrawState();
  const avail = document.getElementById('available-balance'); if (avail) avail.textContent = `$${balance.toFixed(2)}`;
  const life = document.getElementById('lifetime-withdrawn'); if (life) life.textContent = `$${lifetimeWithdrawn.toFixed(2)}`;
  const masked = pendingAddress.slice(0,4) + '••••' + pendingAddress.slice(-4);
  transactions.unshift({ id:'TXN-' + String(Math.floor(Math.random()*99999)).padStart(5,'0'), date: new Date().toISOString().slice(0,10), dest: masked, amount: pendingAmount, status:'pending' });
  persistWithdrawState();
  const amtIn = document.getElementById('amount-input'); if (amtIn) amtIn.value = '';
  const addrIn = document.getElementById('address-input'); if (addrIn) addrIn.value = '';
  updateFee(); renderTx();
  const review = document.getElementById('review-modal'); if (review) { review.classList.add('hidden'); review.classList.remove('flex'); }
  showToast('Withdrawal request submitted');
}

function useSavedAddress() { const addrEl = document.getElementById('address-input'); if (addrEl) addrEl.value = '0x7A3B9F2E8D1C4A6B0E5F7D9C2A4B6E8F1D3C91C4'; }

function copyAddress() { navigator.clipboard.writeText('0x7A3B9F2E8D1C4A6B0E5F7D9C2A4B6E8F1D3C91C4').then(() => showToast('Wallet address copied')); }

// Close modals on Escape/backdrop
document.addEventListener('keydown', e => { if (e.key === 'Escape') { const r = document.getElementById('review-modal'); if (r) { r.classList.add('hidden'); r.classList.remove('flex'); } const t = document.getElementById('tfa-modal'); if (t) { t.classList.add('hidden'); t.classList.remove('flex'); } const rm = document.getElementById('remove-modal'); if (rm) { rm.classList.add('hidden'); rm.classList.remove('flex'); } } });
['review-modal','tfa-modal','remove-modal'].forEach(id => { const el = document.getElementById(id); if (!el) return; el.addEventListener('click', e => { if (e.target === e.currentTarget) { el.classList.add('hidden'); el.classList.remove('flex'); } }); });

// Initialize
hydrateWithdrawState();
renderTx();
