// About page JS: submitSupport and modal helpers

function closeModal(){
  const m = document.getElementById('support-modal');
  if (!m) return;
  m.classList.add('hidden'); m.classList.remove('flex');
}

function submitSupport(){
  const n = document.getElementById('s-name')?.value.trim() || '';
  const e = document.getElementById('s-email')?.value.trim() || '';
  const msg = document.getElementById('s-msg')?.value.trim() || '';
  const err = document.getElementById('s-error');
  if (err) err.classList.add('hidden');
  if(!n||!e||!msg){ if(err){err.textContent='All fields are required';err.classList.remove('hidden');} return; }
  if(!e.includes('@')){ if(err){err.textContent='Please enter a valid email';err.classList.remove('hidden');} return; }
  closeModal();
  const form = document.getElementById('support-form'); if (form) form.reset();
  showToast('Message sent successfully');
}

if (document.getElementById('support-modal')) {
  document.getElementById('support-modal').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
