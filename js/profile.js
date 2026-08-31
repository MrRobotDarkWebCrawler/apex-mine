// Profile page specific behaviors

// ENFORCE AUTHENTICATION FIRST - Must be before any other code
if (!enforceAuthentication()) {
  return;
}

refreshIcons();

function hydrateProfileIdentity() {
  try {
    const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (!user) return;

    const displayName = String(user.name || 'User').trim() || 'User';
    const displayEmail = String(user.email || '').trim();

    const profileName = document.getElementById('profile-name');
    if (profileName) profileName.textContent = displayName;

    const fieldName = document.getElementById('field-name');
    if (fieldName) fieldName.value = displayName;

    const fieldEmail = document.getElementById('field-email');
    if (fieldEmail) fieldEmail.value = displayEmail;

    const sidebarName = document.querySelector('[data-user-name]');
    if (sidebarName) sidebarName.textContent = displayName;

    const sidebarEmail = document.querySelector('[data-user-email]');
    if (sidebarEmail) sidebarEmail.textContent = displayEmail.length > 18 ? displayEmail.slice(0, 15) + '...' : displayEmail;

    const initials = document.querySelector('[data-user-initials]');
    if (initials) {
      const words = displayName.split(/\s+/).filter(Boolean);
      initials.textContent = words.length > 1 ? words.slice(0, 2).map(w => w[0]).join('').toUpperCase() : displayName.slice(0, 2).toUpperCase();
    }
  } catch (error) {
    console.log('Error hydrating profile identity:', error);
  }
}

hydrateProfileIdentity();

function copyAccountId() {
  navigator.clipboard.writeText('AMX-••••-4821').catch(() => {});
  showToast('Account ID copied');
}

function openModal(id) { const m = document.getElementById(id); if (!m) return; m.classList.remove('hidden'); m.classList.add('flex'); }
function closeModal(id) { const m = document.getElementById(id); if (!m) return; m.classList.add('hidden'); m.classList.remove('flex'); }

// Close modals on overlay click or Escape
document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => { if (e.target === e.currentTarget) { m.classList.add('hidden'); m.classList.remove('flex'); } });
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.querySelectorAll('.modal-overlay').forEach(m => { m.classList.add('hidden'); m.classList.remove('flex'); });
});

// Password modal submit
function submitPassword() {
  const cur = document.getElementById('pw-current').value;
  const nw = document.getElementById('pw-new').value;
  const conf = document.getElementById('pw-confirm').value;
  const err = document.getElementById('pw-error');
  if (!cur || !nw || !conf) { if (err) { err.textContent = 'All fields are required.'; err.classList.remove('hidden'); } return; }
  if (nw.length < 6) { if (err) { err.textContent = 'Password must be at least 6 characters.'; err.classList.remove('hidden'); } return; }
  if (nw !== conf) { if (err) { err.textContent = 'Passwords do not match.'; err.classList.remove('hidden'); } return; }
  if (err) err.classList.add('hidden');
  closeModal('password-modal');
  showToast('Password updated successfully');
  const form = document.getElementById('pw-form'); if (form) form.reset();
}

// Profile edit
let savedValues = {};
const fields = ['field-name','field-email','field-phone','field-country'];

function enableEdit() {
  fields.forEach(id => { const el = document.getElementById(id); if (!el) return; savedValues[id] = el.value; el.disabled = false; });
  const editBtn = document.getElementById('edit-btn'); if (editBtn) editBtn.classList.add('hidden');
  const saveBtn = document.getElementById('save-btn'); if (saveBtn) saveBtn.classList.remove('hidden');
  const cancelBtn = document.getElementById('cancel-btn'); if (cancelBtn) cancelBtn.classList.remove('hidden');
}

function cancelEdit() {
  fields.forEach(id => { const el = document.getElementById(id); if (!el) return; el.value = savedValues[id]; el.disabled = true; });
  const editBtn = document.getElementById('edit-btn'); if (editBtn) editBtn.classList.remove('hidden');
  const saveBtn = document.getElementById('save-btn'); if (saveBtn) saveBtn.classList.add('hidden');
  const cancelBtn = document.getElementById('cancel-btn'); if (cancelBtn) cancelBtn.classList.add('hidden');
}

function saveProfile() {
  const name = document.getElementById('field-name').value.trim();
  if (!name) { showToast('Full name is required'); return; }
  fields.forEach(id => { const el = document.getElementById(id); if (el) el.disabled = true; });
  const editBtn = document.getElementById('edit-btn'); if (editBtn) editBtn.classList.remove('hidden');
  const saveBtn = document.getElementById('save-btn'); if (saveBtn) saveBtn.classList.add('hidden');
  const cancelBtn = document.getElementById('cancel-btn'); if (cancelBtn) cancelBtn.classList.add('hidden');
  showToast('Profile updated successfully');
}

// Toggle switches
function toggleSwitch(el) {
  el.classList.toggle('active');
  el.classList.toggle('inactive');
}
