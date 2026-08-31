// Index page behaviours moved from inline script

refreshIcons();

// Header scroll
const header = document.getElementById('site-header');
if (header) {
  window.addEventListener('scroll', () => {
    header.classList.toggle('header-solid', window.scrollY > 40);
  });
}

// Mobile menu
const mobileBtn = document.getElementById('mobile-menu-btn');
if (mobileBtn) {
  mobileBtn.addEventListener('click', () => {
    const menu = document.getElementById('mobile-menu');
    if (menu) menu.classList.toggle('hidden');
  });
}

// Close mobile menu on link click
document.querySelectorAll('#mobile-menu a').forEach(a => a.addEventListener('click', () => {
  const menu = document.getElementById('mobile-menu');
  if (menu) menu.classList.add('hidden');
}));

// FAQ accordion
document.querySelectorAll('.faq-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item');
    const isOpen = item.classList.contains('faq-open');
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('faq-open'));
    document.querySelectorAll('.faq-btn').forEach(b => b.setAttribute('aria-expanded', 'false'));
    if (!isOpen) { item.classList.add('faq-open'); btn.setAttribute('aria-expanded', 'true'); }
  });
  btn.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); btn.click(); } });
});

// Modal helpers
function openModal(html) {
  const m = document.getElementById('modal-overlay');
  if (!m) return;
  const content = document.getElementById('modal-content');
  if (!content) return;
  content.innerHTML = html;
  m.classList.remove('hidden'); m.classList.add('flex');
  setTimeout(() => { const fi = m.querySelector('input'); if (fi) fi.focus(); }, 50);
  refreshIcons();
}
function closeModal() { const m = document.getElementById('modal-overlay'); if (!m) return; m.classList.add('hidden'); m.classList.remove('flex'); }
if (document.getElementById('modal-overlay')) {
  document.getElementById('modal-overlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });
}

afterLoad();

function afterLoad(){
  // Plans
  const plans = [
    { name: 'Level 0 / Starter', price: 'Free', details: 'Basic dashboard access with manual claim. Perfect for getting started.' },
    { name: 'Level 1 / Growth', price: '$19/mo', details: 'Enhanced dashboard with auto-claim scheduling and priority support.' },
    { name: 'Level 2 / Pro', price: '$49/mo', details: 'Full analytics suite, instant withdrawals, and a dedicated account manager.' }
  ];
  window.openPlanModal = function(i) { const p = plans[i]; openModal(`<button onclick="closeModal()" class="absolute top-4 right-4 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#a3e635] rounded" aria-label="Close"><i data-lucide="x" style="width:20px;height:20px"></i></button>
  <h2 class="text-lg font-bold text-white mb-1">${p.name}</h2>
  <p class="text-2xl font-bold text-[#facc15] mb-3">${p.price}</p>
  <p class="text-sm text-gray-400 mb-2">${p.details}</p>
  <p class="text-xs text-gray-500 mb-5">Demo plan information only.</p>
  <button onclick="closeModal();showToast('Plan selected (demo)')" class="w-full py-2.5 rounded-lg bg-[#facc15] text-[#111827] font-bold text-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-yellow-400">Continue</button>`); };

  // Contact
  window.openContactModal = function() {
    openModal(`<button onclick="closeModal()" class="absolute top-4 right-4 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#a3e635] rounded" aria-label="Close"><i data-lucide="x" style="width:20px;height:20px"></i></button>
    <h2 class="text-lg font-bold text-white mb-4">Contact support</h2>
    <form id="contact-form" class="space-y-3">
    <div><label class="text-xs text-gray-400 block mb-1" for="c-name">Name</label><input id="c-name" type="text" required class="w-full bg-[#0d1525] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#a3e635]"></div>
    <div><label class="text-xs text-gray-400 block mb-1" for="c-email">Email</label><input id="c-email" type="email" required class="w-full bg-[#0d1525] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#a3e635]"></div>
    <div><label class="text-xs text-gray-400 block mb-1" for="c-msg">Message</label><textarea id="c-msg" rows="3" required class="w-full bg-[#0d1525] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#a3e635] resize-none"></textarea></div>
    <p id="c-err" class="text-xs text-red-400 hidden"></p>
    <button type="submit" class="w-full py-2.5 rounded-lg bg-[#facc15] text-[#111827] font-bold text-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-yellow-400">Send message</button>
    </form>`);
    setTimeout(() => {
      const form = document.getElementById('contact-form');
      if (!form) return;
      form.addEventListener('submit', e => {
        e.preventDefault();
        const name = document.getElementById('c-name').value.trim();
        const email = document.getElementById('c-email').value.trim();
        const msg = document.getElementById('c-msg').value.trim();
        const err = document.getElementById('c-err');
        if (!name || !email || !msg) { if (err) { err.textContent = 'All fields required'; err.classList.remove('hidden'); } return; }
        closeModal(); showToast('Message sent successfully');
      });
    }, 60);
  };
}
