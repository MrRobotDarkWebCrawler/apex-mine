// Login page behavior

refreshIcons();

const tabSignin = document.getElementById('tab-signin');
const tabSignup = document.getElementById('tab-signup');
const panelSignin = document.getElementById('panel-signin');
const panelSignup = document.getElementById('panel-signup');
const signinSuccess = document.getElementById('signin-success');
const signupSuccess = document.getElementById('signup-success');

const BACKEND_URL = 'http://localhost:3000/api/auth';

function switchTab(tab) {
  if (signinSuccess) signinSuccess.classList.add('hidden');
  if (signupSuccess) signupSuccess.classList.add('hidden');
  const sf = document.getElementById('social-feedback'); if (sf) sf.classList.add('hidden');
  if (tab === 'signin') {
    if (tabSignin) { tabSignin.classList.replace('tab-inactive','tab-active'); tabSignin.setAttribute('aria-selected','true'); }
    if (tabSignup) { tabSignup.classList.replace('tab-active','tab-inactive'); tabSignup.setAttribute('aria-selected','false'); }
    if (panelSignin) panelSignin.classList.remove('hidden');
    if (panelSignup) panelSignup.classList.add('hidden');
  } else {
    if (tabSignup) { tabSignup.classList.replace('tab-inactive','tab-active'); tabSignup.setAttribute('aria-selected','true'); }
    if (tabSignin) { tabSignin.classList.replace('tab-active','tab-inactive'); tabSignin.setAttribute('aria-selected','false'); }
    if (panelSignup) panelSignup.classList.remove('hidden');
    if (panelSignin) panelSignin.classList.add('hidden');
  }
}
if (tabSignin) tabSignin.addEventListener('click', () => switchTab('signin'));
if (tabSignup) tabSignup.addEventListener('click', () => switchTab('signup'));

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function resolveReturnUrl() {
  const params = new URLSearchParams(window.location.search);
  const next = params.get('next');

  if (!next) return 'dashboard.html';
  if (next.startsWith('//') || /^https?:\/\//i.test(next) || next.startsWith('javascript:')) return 'dashboard.html';
  return next;
}

if (localStorage.getItem('authToken') && localStorage.getItem('currentUser')) {
  window.location.href = resolveReturnUrl();
}

// Sign in
const signinForm = document.getElementById('signin-form');
if (signinForm) {
  signinForm.addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('signin-email').value.trim();
    const password = document.getElementById('signin-password').value;
    const err = document.getElementById('signin-err');
    
    if (!email || !emailRe.test(email)) { 
      if (err) { 
        err.textContent = !email ? 'Email is required.' : 'Enter a valid email.'; 
        err.classList.remove('hidden'); 
      } 
      return; 
    }
    if (!password) { 
      if (err) { 
        err.textContent = 'Password is required.'; 
        err.classList.remove('hidden'); 
      } 
      return; 
    }
    
    if (err) err.classList.add('hidden');
    const btn = document.getElementById('signin-btn');
    if (btn) { 
      btn.classList.add('btn-loading'); 
      btn.textContent = 'Signing in…'; 
    }
    
    try {
      const response = await fetch(`${BACKEND_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (data.success) {
        const user = {
          ...(data.user || {}),
          balance: Number(data.user?.balance || 0),
          totalEarnings: Number(data.user?.totalEarnings || data.user?.totalEarned || 0),
          transactionHistory: Array.isArray(data.user?.transactionHistory) ? data.user.transactionHistory : []
        };

        const hasWelcomeBonus = user.welcomeBonusClaimed || user.transactionHistory.some(item => {
          const label = String(item?.label || item?.description || '').toLowerCase();
          return item?.type === 'bonus' || label.includes('welcome bonus');
        });

        if (!hasWelcomeBonus) {
          user.balance = Number(user.balance || 0) + 5;
          user.totalEarnings = Number(user.totalEarnings || 0) + 5;
          user.welcomeBonusClaimed = true;
          user.transactionHistory.unshift({
            id: `TXN-${Date.now()}`,
            type: 'bonus',
            label: 'Welcome bonus',
            amount: 5,
            description: 'Welcome bonus applied on signup',
            date: new Date().toISOString(),
            status: 'Completed'
          });
        }

        localStorage.removeItem('apexMineUser');
        localStorage.removeItem('dm_users');
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        if (err) err.classList.add('hidden');
        if (panelSignin) panelSignin.classList.add('hidden');
        if (signinSuccess) signinSuccess.classList.remove('hidden');
        
        // Redirect back to the requested page after 2 seconds
        setTimeout(() => {
          window.location.href = resolveReturnUrl();
        }, 2000);
      } else {
        if (err) { 
          err.textContent = data.error || 'Login failed. Please try again.'; 
          err.classList.remove('hidden'); 
        }
        if (btn) { 
          btn.classList.remove('btn-loading'); 
          btn.textContent = 'Continue with email'; 
        }
      }
    } catch (error) {
      if (err) { 
        err.textContent = 'Connection error. Is the server running?'; 
        err.classList.remove('hidden'); 
      }
      if (btn) { 
        btn.classList.remove('btn-loading'); 
        btn.textContent = 'Continue with email'; 
      }
    }
  });
}

const signinReset = document.getElementById('signin-reset');
if (signinReset) signinReset.addEventListener('click', () => {
  const emailInput = document.getElementById('signin-email'); if (emailInput) emailInput.value = '';
  if (signinSuccess) signinSuccess.classList.add('hidden');
  if (panelSignin) panelSignin.classList.remove('hidden');
});

// Sign up
const signupForm = document.getElementById('signup-form');
if (signupForm) {
  signupForm.addEventListener('submit', async e => {
    e.preventDefault();
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-password-confirm').value;
    const terms = document.getElementById('signup-terms').checked;
    const err = document.getElementById('signup-err');
    
    if (!name) { 
      if (err) { 
        err.textContent = 'Full name is required.'; 
        err.classList.remove('hidden'); 
      } 
      return; 
    }
    if (!email || !emailRe.test(email)) { 
      if (err) { 
        err.textContent = !email ? 'Email is required.' : 'Enter a valid email.'; 
        err.classList.remove('hidden'); 
      } 
      return; 
    }
    if (!password || password.length < 6) { 
      if (err) { 
        err.textContent = 'Password must be at least 6 characters.'; 
        err.classList.remove('hidden'); 
      } 
      return; 
    }
    if (!confirmPassword || password !== confirmPassword) { 
      if (err) { 
        err.textContent = 'Passwords do not match.'; 
        err.classList.remove('hidden'); 
      } 
      return; 
    }
    if (!terms) { 
      if (err) { 
        err.textContent = 'You must accept the terms.'; 
        err.classList.remove('hidden'); 
      } 
      return; 
    }
    
    if (err) err.classList.add('hidden');
    const btn = document.getElementById('signup-btn');
    if (btn) { 
      btn.classList.add('btn-loading'); 
      btn.textContent = 'Creating…'; 
    }
    
    try {
      const response = await fetch(`${BACKEND_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, password, confirmPassword })
      });
      
      const data = await response.json();
      
      if (data.success) {
        const user = {
          ...(data.user || {}),
          balance: Number(data.user?.balance || 0),
          totalEarnings: Number(data.user?.totalEarnings || data.user?.totalEarned || 0),
          transactionHistory: Array.isArray(data.user?.transactionHistory) ? data.user.transactionHistory : []
        };

        const hasWelcomeBonus = user.welcomeBonusClaimed || user.transactionHistory.some(item => {
          const label = String(item?.label || item?.description || '').toLowerCase();
          return item?.type === 'bonus' || label.includes('welcome bonus');
        });

        if (!hasWelcomeBonus) {
          user.balance = Number(user.balance || 0) + 5;
          user.totalEarnings = Number(user.totalEarnings || 0) + 5;
          user.welcomeBonusClaimed = true;
          user.transactionHistory.unshift({
            id: `TXN-${Date.now()}`,
            type: 'bonus',
            label: 'Welcome bonus',
            amount: 5,
            description: 'Welcome bonus applied on signup',
            date: new Date().toISOString(),
            status: 'Completed'
          });
        }

        localStorage.removeItem('apexMineUser');
        localStorage.removeItem('dm_users');
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        if (err) err.classList.add('hidden');
        if (panelSignup) panelSignup.classList.add('hidden');
        if (signupSuccess) signupSuccess.classList.remove('hidden');
        
        // Redirect back to the requested page after 2 seconds
        setTimeout(() => {
          window.location.href = resolveReturnUrl();
        }, 2000);
      } else {
        if (err) { 
          err.textContent = data.error || 'Registration failed. Please try again.'; 
          err.classList.remove('hidden'); 
        }
        if (btn) { 
          btn.classList.remove('btn-loading'); 
          btn.textContent = 'Create account'; 
        }
      }
    } catch (error) {
      if (err) { 
        err.textContent = 'Connection error. Is the server running?'; 
        err.classList.remove('hidden'); 
      }
      if (btn) { 
        btn.classList.remove('btn-loading'); 
        btn.textContent = 'Create account'; 
      }
    }
  });
}

const gotoSignin = document.getElementById('goto-signin');
if (gotoSignin) gotoSignin.addEventListener('click', () => switchTab('signin'));

// Social demo
['google-btn','apple-btn'].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('click', () => {
    const fb = document.getElementById('social-feedback');
    if (!fb) return;
    fb.textContent = 'Demo action — social sign-in is not connected.';
    fb.classList.remove('hidden');
    setTimeout(() => fb.classList.add('hidden'), 3000);
  });
});
