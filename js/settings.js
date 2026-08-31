// Settings page behavior (moved from inline script)

// ENFORCE AUTHENTICATION FIRST - Must be before any other code
if (!enforceAuthentication()) {
  redirectToLogin();
  return;
}

refreshIcons();

let dirty = false;
function markDirty(){ if(!dirty){ dirty = true; const sb = document.getElementById('save-bar'); if (sb) sb.classList.remove('hidden'); } }
function clearDirty(){ dirty = false; const sb = document.getElementById('save-bar'); if (sb) sb.classList.add('hidden'); }
function saveAll(){ showToast('Settings saved successfully'); clearDirty(); }
function discardChanges(){ clearDirty(); showToast('Changes discarded'); }
function saveSection(name){ showToast(name + ' saved successfully'); clearDirty(); }

// Tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => { b.classList.remove('tab-active'); b.classList.add('text-gray-400'); });
    btn.classList.add('tab-active'); btn.classList.remove('text-gray-400');
    document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
    const panel = document.getElementById('panel-' + btn.dataset.tab);
    if (panel) panel.classList.remove('hidden');
  });
});

function copyId(){ navigator.clipboard && navigator.clipboard.writeText('AMX-XXXX-4821'); showToast('Account ID copied'); }

function setAccent(color, el){ document.documentElement.style.setProperty('--accent', color); document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active')); if (el) el.classList.add('active'); markDirty(); showToast('Accent color updated'); }

function setDensity(d){
  const a = document.getElementById('density-comfortable');
  const b = document.getElementById('density-compact');
  if (a && b) {
    a.classList.toggle('border-[#a3e635]', d === 'comfortable');
    a.classList.toggle('text-[#a3e635]', d === 'comfortable');
    a.classList.toggle('border-[#1e293b]', d !== 'comfortable');
    a.classList.toggle('text-gray-400', d !== 'comfortable');
    b.classList.toggle('border-[#a3e635]', d === 'compact');
    b.classList.toggle('text-[#a3e635]', d === 'compact');
    b.classList.toggle('border-[#1e293b]', d !== 'compact');
    b.classList.toggle('text-gray-400', d !== 'compact');
  }
  markDirty();
}

function resetNotifDefaults(){
  document.querySelectorAll('#notif-toggles .toggle-track').forEach((t, i) => { if (i < 4) t.classList.add('on'); else t.classList.remove('on'); });
  markDirty(); showToast('Notification defaults restored');
}

// Modal helpers
function openModal(html){
  const m = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');
  if (!m || !content) return;
  content.innerHTML = html;
  m.classList.remove('hidden'); m.classList.add('flex');
  setTimeout(() => { const fi = m.querySelector('input'); if (fi) fi.focus(); }, 50);
  refreshIcons();
}
function closeModal(){ const m = document.getElementById('modal-overlay'); if (!m) return; m.classList.add('hidden'); m.classList.remove('flex'); }

if (document.getElementById('modal-overlay')) {
  document.getElementById('modal-overlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
}

function showPasswordModal(){
  openModal(`<button onclick="closeModal()" class="absolute top-4 right-4 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#a3e635] rounded" aria-label="Close"><i data-lucide="x" style="width:20px;height:20px;"></i></button>
  <h2 class="text-lg font-bold text-white mb-4">Change password</h2>
  <form onsubmit="return false;" class="space-y-3">
  <div><label class="text-xs text-gray-400 block mb-1" for="pw-cur">Current password</label><input id="pw-cur" type="password" class="w-full bg-[#0d1525] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#a3e635]"></div>
  <div><label class="text-xs text-gray-400 block mb-1" for="pw-new">New password</label><input id="pw-new" type="password" class="w-full bg-[#0d1525] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#a3e635]"></div>
  <div><label class="text-xs text-gray-400 block mb-1" for="pw-conf">Confirm password</label><input id="pw-conf" type="password" class="w-full bg-[#0d1525] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#a3e635]"></div>
  <p id="pw-err" class="text-xs text-red-400 hidden"></p>
  <button type="button" onclick="submitPassword()" class="w-full py-2.5 rounded-lg bg-[#facc15] text-[#111827] font-bold text-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-yellow-400">Update password</button>
  </form>`);
}
function submitPassword(){
  const c = document.getElementById('pw-cur')?.value; const n = document.getElementById('pw-new')?.value; const cf = document.getElementById('pw-conf')?.value; const err = document.getElementById('pw-err');
  if (err) err.classList.add('hidden');
  if (!c || !n || !cf) { if (err) { err.textContent = 'All fields required'; err.classList.remove('hidden'); } return; }
  if (n.length < 6) { if (err) { err.textContent = 'Min 6 characters'; err.classList.remove('hidden'); } return; }
  if (n !== cf) { if (err) { err.textContent = 'Passwords do not match'; err.classList.remove('hidden'); } return; }
  closeModal(); showToast('Password updated successfully');
}

function show2FAModal(){
  openModal(`<button onclick="closeModal()" class="absolute top-4 right-4 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#a3e635] rounded" aria-label="Close"><i data-lucide="x" style="width:20px;height:20px;"></i></button>
  <h2 class="text-lg font-bold text-white mb-2">Enable 2FA</h2>
  <p class="text-sm text-gray-400 mb-4">Two-factor authentication adds an extra layer of security. Enter the code from your authenticator app to confirm.</p>
  <div><label class="text-xs text-gray-400 block mb-1" for="tfa-code">Verification code</label><input id="tfa-code" type="text" maxlength="6" placeholder="000000" class="w-full bg-[#0d1525] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-white tracking-widest focus:outline-none focus:border-[#a3e635]"></div>
  <p id="tfa-err" class="text-xs text-red-400 hidden mt-2"></p>
  <div class="flex gap-3 mt-4">
  <button onclick="closeModal()" class="flex-1 py-2 rounded-lg border border-[#1e293b] text-gray-300 text-sm hover:text-white focus:outline-none focus:ring-2 focus:ring-[#a3e635]">Cancel</button>
  <button onclick="confirm2FA()" class="flex-1 py-2 rounded-lg bg-[#a3e635] text-[#0a0f1a] font-bold text-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-lime-400">Confirm enable</button>
  </div>`);
}
function confirm2FA(){ const c = document.getElementById('tfa-code')?.value.trim(); const err = document.getElementById('tfa-err'); if (c && c.length < 6) { if (err) { err.textContent = 'Enter a 6-digit code'; err.classList.remove('hidden'); } return; } closeModal(); showToast('2FA enabled successfully'); }

function showSignOutModal(){ openModal(`<button onclick="closeModal()" class="absolute top-4 right-4 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#a3e635] rounded" aria-label="Close"><i data-lucide="x" style="width:20px;height:20px;"></i></button>
  <h2 class="text-lg font-bold text-white mb-2">Sign out</h2>
  <p class="text-sm text-gray-400 mb-4">Are you sure you want to sign out of ApexMine?</p>
  <div class="flex gap-3">
  <button onclick="closeModal()" class="flex-1 py-2 rounded-lg border border-[#1e293b] text-gray-300 text-sm hover:text-white focus:outline-none focus:ring-2 focus:ring-[#a3e635]">Cancel</button>
  <button onclick="closeModal();logout()" class="flex-1 py-2 rounded-lg bg-red-600 text-white font-bold text-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-red-400">Sign out</button>
  </div>`); }

function showDeactivateModal(){ openModal(`<button onclick="closeModal()" class="absolute top-4 right-4 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#a3e635] rounded" aria-label="Close"><i data-lucide="x" style="width:20px;height:20px;"></i></button>
  <h2 class="text-lg font-bold text-red-400 mb-2">Deactivate account</h2>
  <p class="text-sm text-gray-400 mb-3">This action is irreversible. Type <strong class="text-white">DEACTIVATE</strong> to confirm.</p>
  <input id="deact-input" type="text" placeholder="Type DEACTIVATE" class="w-full bg-[#0d1525] border border-red-900 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500">
  <p id="deact-err" class="text-xs text-red-400 hidden mt-2"></p>
  <div class="flex gap-3 mt-4">
  <button onclick="closeModal()" class="flex-1 py-2 rounded-lg border border-[#1e293b] text-gray-300 text-sm hover:text-white focus:outline-none focus:ring-2 focus:ring-[#a3e635]">Cancel</button>
  <button onclick="confirmDeactivate()" class="flex-1 py-2 rounded-lg bg-red-600 text-white font-bold text-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-red-400">Deactivate</button>
  </div>`); }
function confirmDeactivate(){ const v = document.getElementById('deact-input')?.value.trim(); const err = document.getElementById('deact-err'); if (v !== 'DEACTIVATE') { if (err) { err.textContent = 'Please type DEACTIVATE to confirm'; err.classList.remove('hidden'); } return; } closeModal(); showToast('Account deactivated (demo)'); }

function showClearDataModal(){ openModal(`<button onclick="closeModal()" class="absolute top-4 right-4 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#a3e635] rounded" aria-label="Close"><i data-lucide="x" style="width:20px;height:20px;"></i></button>
  <h2 class="text-lg font-bold text-white mb-2">Clear local demo data</h2>
  <p class="text-sm text-gray-400 mb-4">This will reset all demo preferences to defaults. Continue?</p>
  <div class="flex gap-3">
  <button onclick="closeModal()" class="flex-1 py-2 rounded-lg border border-[#1e293b] text-gray-300 text-sm hover:text-white focus:outline-none focus:ring-2 focus:ring-[#a3e635]">Cancel</button>
  <button onclick="closeModal();showToast('Demo data cleared')" class="flex-1 py-2 rounded-lg bg-red-600 text-white font-bold text-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-red-400">Clear data</button>
  </div>`); }

function confirmDeactivate(){
  const v=document.getElementById('deact-input').value.trim(),err=document.getElementById('deact-err');
  if(v!=='DEACTIVATE'){err.textContent='Please type DEACTIVATE to confirm';err.classList.remove('hidden');return;} closeModal();showToast('Account deactivated (demo)');
}

*** End Patch