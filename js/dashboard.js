// Dashboard specific scripts (extracted from dashboard.html)

// ENFORCE AUTHENTICATION FIRST - Must be before any other code
if (!enforceAuthentication()) {
  redirectToLogin();
  return;
}

refreshIcons();

const BACKEND_URL = 'http://localhost:3000/api/auth';
const STORAGE_KEYS = {
  users: 'dm_users',
  currentUser: 'currentUser',
  authToken: 'authToken'
};

const LEVEL_CONFIG = {
  0: { name: 'Free', subscription: 0, taskPayout: 0.01, referralBonus: 0.5, minReferrals: 0, dailyBonus: 0.02, miningEnabled: false, requiredReferrals: 0 },
  1: { name: 'Alpha', subscription: 10, taskPayout: 0.16, referralBonus: 1, minReferrals: 3, dailyBonus: 0.033, miningEnabled: true, requiredReferrals: 3, accessRigs: ['Alpha Rig'] },
  2: { name: 'Beta', subscription: 15, taskPayout: 0.22, referralBonus: 1.5, minReferrals: 5, dailyBonus: 0.066, miningEnabled: true, requiredReferrals: 5, accessRigs: ['Alpha Rig', 'Alpha Rig Pro', 'Beta Rig'] },
  3: { name: 'Gamma', subscription: 25, taskPayout: 0.3, referralBonus: 2, minReferrals: 7, dailyBonus: 0.1667, miningEnabled: true, requiredReferrals: 7, accessRigs: ['Beta Rig', 'Beta Rig Pro', 'Gamma Rig'] },
  4: { name: 'Delta', subscription: 35, taskPayout: 0.45, referralBonus: 3, minReferrals: 10, dailyBonus: 0.25, miningEnabled: true, requiredReferrals: 10, accessRigs: ['Gamma Rig', 'Gamma Rig Pro'] },
  5: { name: 'Apex', subscription: 50, taskPayout: 0.6, referralBonus: 4, minReferrals: 12, dailyBonus: 0.3334, miningEnabled: true, requiredReferrals: 12, accessRigs: ['Delta Rig', 'Delta Rig Pro'] },
};

let cooldown = false;

// Load user data from backend
async function loadUserFromBackend() {
  try {
    const token = localStorage.getItem(STORAGE_KEYS.authToken);
    if (!token) {
      console.log('No auth token found, using local storage data');
      return null;
    }

    const response = await fetch(`${BACKEND_URL}/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.log('Backend request failed, using local storage');
      return null;
    }

    const data = await response.json();
    if (data.success && data.user) {
      // Update localStorage with latest data from backend
      localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(data.user));
      return data.user;
    }
  } catch (error) {
    console.log('Error loading user from backend:', error);
  }
  return null;
}

function isUserLoggedIn() {
  try {
    const token = localStorage.getItem(STORAGE_KEYS.authToken);
    const user = JSON.parse(localStorage.getItem(STORAGE_KEYS.currentUser) || 'null');
    return !!(token && user && user.email);
  } catch {
    return false;
  }
}

function sanitizeLegacyDemoState() {
  try {
    localStorage.removeItem('apexMineUser');
    localStorage.removeItem('dm_users');
  } catch (error) {
    console.log('Legacy storage cleanup failed:', error);
  }
}

function getCurrentUser() {
  try {
    const user = JSON.parse(localStorage.getItem(STORAGE_KEYS.currentUser) || 'null');
    if (!user) {
      return {
        name: 'Guest',
        email: null,
        level: 0,
        balance: 0,
        totalEarnings: 0,
        referralCode: 'N/A',
        qualifiedReferrals: 0,
        referrals: [],
        dailyBonusClaimed: false,
        welcomeBonusClaimed: false,
        lastLoginDate: null,
        lastMiningClaimAt: null,
        tasksCompletedToday: 0,
        lastDailyBonusClaimAt: null,
        transactionHistory: []
      };
    }

    const normalized = {
      ...user,
      balance: Number(user.balance || 0),
      totalEarnings: Number(user.totalEarnings || 0),
      totalWithdrawn: Number(user.totalWithdrawn || 0),
      transactionHistory: Array.isArray(user.transactionHistory) ? user.transactionHistory : []
    };

    const hasBonusValue = Number(normalized.balance || 0) >= 5 && Number(normalized.totalEarnings || 0) >= 5;
    const hasBonusEntry = normalized.transactionHistory.some((item) => {
      const label = String(item?.label || item?.description || '').toLowerCase();
      return item?.type === 'bonus' || label.includes('welcome bonus');
    });

    if (hasBonusValue && !hasBonusEntry) {
      normalized.transactionHistory = [{
        id: `TXN-${Date.now()}`,
        type: 'bonus',
        label: 'Welcome bonus',
        amount: 5,
        description: 'Welcome bonus applied on signup',
        date: new Date().toISOString(),
        status: 'Completed'
      }, ...normalized.transactionHistory];
      normalized.welcomeBonusClaimed = true;
      localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(normalized));
    }

    return normalized;
  } catch {
    return {
      name: 'Guest',
      email: null,
      level: 0,
      balance: 0,
      totalEarnings: 0,
      referralCode: 'N/A',
      qualifiedReferrals: 0,
      referrals: [],
      dailyBonusClaimed: false,
      welcomeBonusClaimed: false,
      lastLoginDate: null,
      lastMiningClaimAt: null,
      tasksCompletedToday: 0,
      lastDailyBonusClaimAt: null,
      transactionHistory: []
    };
  }
}

function appendTransactionToUser(user, entry) {
  const history = Array.isArray(user.transactionHistory) ? [...user.transactionHistory] : [];
  const formattedEntry = {
    id: entry.id || `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    type: entry.type || 'earning',
    label: entry.label || 'Transaction',
    amount: Number(entry.amount || 0),
    description: entry.description || entry.label || 'Transaction',
    date: entry.date || new Date().toISOString(),
    status: entry.status || 'Completed'
  };

  return {
    ...user,
    transactionHistory: [formattedEntry, ...history]
  };
}

function ensureImmediateSignupBonus() {
  const user = getCurrentUser();
  if (!user || !user.email) {
    return user;
  }

  const hasWelcomeBonusEntry = Array.isArray(user.transactionHistory) && user.transactionHistory.some((item) => {
    const label = String(item?.label || item?.description || '').toLowerCase();
    return item?.type === 'bonus' || label.includes('welcome bonus');
  });

  if (user.welcomeBonusClaimed || hasWelcomeBonusEntry) {
    return user;
  }

  const updatedUser = appendTransactionToUser({
    ...user,
    balance: Number(user.balance || 0),
    totalEarnings: Number(user.totalEarnings || 0),
    welcomeBonusClaimed: false,
    transactionHistory: Array.isArray(user.transactionHistory) ? [...user.transactionHistory] : []
  }, {
    type: 'bonus',
    label: 'Welcome bonus',
    amount: 5,
    description: 'Welcome bonus applied on signup',
    date: new Date().toISOString(),
    status: 'Completed'
  });

  updatedUser.balance = Number(updatedUser.balance || 0) + 5;
  updatedUser.totalEarnings = Number(updatedUser.totalEarnings || 0) + 5;
  updatedUser.welcomeBonusClaimed = true;

  localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(updatedUser));
  return updatedUser;
}

function claimWelcomeBonusForCurrentUser() {
  const user = getCurrentUser();
  if (user.welcomeBonusClaimed) {
    return user;
  }

  const bonusAmount = 5;
  const updatedUser = appendTransactionToUser(
    {
      ...user,
      balance: Number(user.balance || 0),
      totalEarnings: Number(user.totalEarnings || 0),
      welcomeBonusClaimed: false,
      transactionHistory: Array.isArray(user.transactionHistory) ? [...user.transactionHistory] : []
    },
    {
      type: 'bonus',
      label: 'Welcome bonus',
      amount: bonusAmount,
      description: 'Welcome bonus claimed',
      date: new Date().toISOString(),
      status: 'Completed'
    }
  );

  updatedUser.balance = Number(updatedUser.balance || 0) + bonusAmount;
  updatedUser.totalEarnings = Number(updatedUser.totalEarnings || 0) + bonusAmount;
  updatedUser.welcomeBonusClaimed = true;

  localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(updatedUser));
  return updatedUser;
}

function getLevelConfig(level = getCurrentUser().level || 0) {
  return LEVEL_CONFIG[level] || LEVEL_CONFIG[0];
}

function generateReferralCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function buildReferralLink(code) {
  return `${window.location.origin}${window.location.pathname}?ref=${code}`;
}

function calculateMiningClaim(level) {
  const config = getLevelConfig(level);
  if (!config.miningEnabled) return 0;
  const perDay = config.taskPayout * 5;
  const per6Hours = perDay / 4;
  return Number(per6Hours.toFixed(4));
}

function getDailyLoginBonus(level) {
  return Number((LEVEL_CONFIG[level]?.dailyBonus ?? 0).toFixed(4));
}

function syncClaimButtonState() {
  const claimBtn = document.getElementById('claim-btn');
  const claimLabel = document.getElementById('claim-button-label');
  const amountLabel = document.getElementById('claim-amount');
  const user = getCurrentUser();
  const level = Number(user.level || 0);
  const loggedIn = isUserLoggedIn();

  if (!claimBtn || !claimLabel || !amountLabel) return;

    if (!loggedIn) {
    claimBtn.disabled = true;
    claimBtn.style.opacity = '0.5';
    claimBtn.style.cursor = 'not-allowed';
    claimLabel.textContent = 'Login';
    amountLabel.textContent = '$0.00';
    claimBtn.onclick = () => { redirectToLogin(); };
    return;
  }

  if (level < 1) {
    claimBtn.disabled = false;
    claimBtn.style.opacity = '1';
    claimBtn.style.cursor = 'pointer';
    claimLabel.textContent = 'Upgrade';
    amountLabel.textContent = '$0.00';
    claimBtn.onclick = openModal;
    return;
  }

  const nextClaimAt = user.lastMiningClaimAt ? new Date(user.lastMiningClaimAt).getTime() + 6 * 60 * 60 * 1000 : 0;
  const isReady = !nextClaimAt || Date.now() >= nextClaimAt;
  const amount = calculateMiningClaim(level);

  amountLabel.textContent = `$${amount.toFixed(4)}`;
  if (isReady) {
    claimBtn.disabled = false;
    claimBtn.style.opacity = '1';
    claimBtn.style.cursor = 'pointer';
    claimLabel.textContent = 'Claim';
    claimBtn.onclick = handleClaim;
  } else {
    claimBtn.disabled = true;
    claimBtn.style.opacity = '0.6';
    claimBtn.style.cursor = 'not-allowed';
    claimLabel.textContent = 'Locked';
    claimBtn.onclick = () => showToast('Mining claim is still cooling down.');
  }
}

function updateDashboardMeta() {
  const user = getCurrentUser();
  const level = Number(user.level || 0);
  const config = getLevelConfig(level);
  const levelBadge = document.getElementById('level-badge');
  const dailyBonusEl = document.getElementById('daily-login-bonus');
  const claimAmountEl = document.getElementById('claim-amount-display');
  const referralReqEl = document.getElementById('referral-requirement');
  const referralCodeEl = document.getElementById('referral-code-display');
  const referralLinkEl = document.getElementById('referral-link-display');
  const qualifiedReferralsEl = document.getElementById('qualified-referrals');
  const dailyBtn = document.getElementById('daily-bonus-btn');

  if (levelBadge) levelBadge.textContent = `Level ${level} · ${config.name}`;
  if (dailyBonusEl) dailyBonusEl.textContent = `$${getDailyLoginBonus(level).toFixed(4)}`;
  if (claimAmountEl) claimAmountEl.textContent = `$${calculateMiningClaim(level).toFixed(4)} / 6h`;
  if (referralReqEl) referralReqEl.textContent = `${config.minReferrals} referrals`;
  if (referralCodeEl) referralCodeEl.textContent = user.referralCode || generateReferralCode();
  if (referralLinkEl) referralLinkEl.textContent = buildReferralLink(user.referralCode || referralCodeEl.textContent);
  if (qualifiedReferralsEl) qualifiedReferralsEl.textContent = user.qualifiedReferrals || 0;

  if (dailyBtn) {
    if (!isUserLoggedIn()) {
      dailyBtn.textContent = 'Login Required';
      dailyBtn.disabled = true;
      dailyBtn.style.opacity = '0.6';
      dailyBtn.style.cursor = 'not-allowed';
      dailyBtn.onclick = () => { redirectToLogin(); };
    } else {
      const lastClaim = user.lastDailyBonusClaimAt ? new Date(user.lastDailyBonusClaimAt).getTime() : 0;
      const oneDayMs = 24 * 60 * 60 * 1000;
      if (lastClaim && Date.now() - lastClaim < oneDayMs) {
        dailyBtn.textContent = 'Daily Bonus Claimed';
        dailyBtn.disabled = true;
        dailyBtn.style.opacity = '0.6';
        dailyBtn.style.cursor = 'not-allowed';
      } else {
        dailyBtn.textContent = 'Claim Daily Bonus';
        dailyBtn.disabled = false;
        dailyBtn.style.opacity = '1';
        dailyBtn.style.cursor = 'pointer';
      }
    }
  }

  const balanceEl = document.getElementById('balance-value');
  const earnedEl = document.getElementById('earned-value');
  const lifetimeEl = document.getElementById('lifetime-mined');
  if (balanceEl) balanceEl.textContent = `$${Number(user.balance || 0).toFixed(2)}`;
  if (earnedEl) earnedEl.textContent = `$${Number(user.totalEarnings || 0).toFixed(2)}`;
  if (lifetimeEl) lifetimeEl.textContent = `$${Number(user.totalEarnings || 0).toFixed(2)}`;

  renderRecentTransactions();
  syncClaimButtonState();
}

function renderRecentTransactions() {
  const list = document.getElementById('recent-transactions-list');
  if (!list) return;

  const user = getCurrentUser();
  const history = Array.isArray(user.transactionHistory) ? user.transactionHistory : [];

  if (!history.length) {
    if (Number(user.balance || 0) >= 5 || Number(user.totalEarnings || 0) >= 5) {
      const syntheticEntry = {
        id: `TXN-${Date.now()}`,
        type: 'bonus',
        label: 'Welcome bonus',
        amount: 5,
        description: 'Welcome bonus applied on signup',
        date: new Date().toISOString(),
        status: 'Completed'
      };
      user.transactionHistory = [syntheticEntry];
      user.welcomeBonusClaimed = true;
      localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(user));
    }
  }

  const finalHistory = Array.isArray(user.transactionHistory) ? user.transactionHistory : [];

  if (!finalHistory.length) {
    list.innerHTML = '<p class="text-sm text-gray-500 text-center py-4">No recent transactions</p>';
    return;
  }

  list.innerHTML = finalHistory.slice(0, 4).map((item) => {
    const amount = Number(item.amount || 0);
    const positive = amount >= 0;
    return `
      <div class="flex items-center justify-between text-sm">
       <div class="flex items-center gap-2">
        <div class="w-7 h-7 rounded-full ${positive ? 'bg-emerald-900/50' : 'bg-red-900/50'} flex items-center justify-center">
         <i data-lucide="${positive ? 'plus' : 'minus'}" style="width:12px;height:12px;" class="${positive ? 'text-emerald-400' : 'text-red-400'}"></i>
        </div>
        <span class="text-gray-300">${item.label || 'Transaction'}</span>
       </div>
       <span class="${positive ? 'text-emerald-400' : 'text-red-400'} font-medium">${positive ? '+' : '-'}$${Math.abs(amount).toFixed(2)}</span>
      </div>
    `;
  }).join('');

  refreshIcons();
}

function handleDailyLoginBonus() {
    const user = getCurrentUser();
    if (!isUserLoggedIn()) {
      redirectToLogin();
      return;
    }

    const lastClaim = user.lastDailyBonusClaimAt ? new Date(user.lastDailyBonusClaimAt).getTime() : 0;
    const oneDayMs = 24 * 60 * 60 * 1000;
    if (lastClaim && Date.now() - lastClaim < oneDayMs) {
        const mins = Math.ceil((oneDayMs - (Date.now() - lastClaim)) / 60000);
        showToast(`Daily bonus available in ${mins} min.`);
        return;
    }

    const bonus = getDailyLoginBonus(Number(user.level || 0));
    const nextUser = {
      ...user,
      balance: Number(user.balance || 0) + bonus,
      totalEarnings: Number(user.totalEarnings || 0) + bonus,
      dailyBonusClaimed: true,
      lastDailyBonusClaimAt: new Date().toISOString(),
      lastLoginDate: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(nextUser));
    updateDashboardMeta();
    showToast(`Daily login bonus claimed: +$${bonus.toFixed(4)}`);
}

function handleClaim() {
    const user = getCurrentUser();
    const level = Number(user.level || 0);
    if (!isUserLoggedIn()) {
      redirectToLogin();
      return;
    }
    if (level < 1) {
      openModal();
      showToast('Upgrade to unlock mining.');
      return;
    }

    const lastMining = user.lastMiningClaimAt ? new Date(user.lastMiningClaimAt).getTime() : 0;
    const sixHours = 6 * 60 * 60 * 1000;
    if (lastMining && Date.now() - lastMining < sixHours) {
      const remaining = sixHours - (Date.now() - lastMining);
      showToast(`Mining is cooling down. ${Math.ceil(remaining / 60000)} min remaining.`);
      updateDashboardMeta();
      return;
    }

    const amount = calculateMiningClaim(level);
    const nextUser = {
      ...user,
      balance: Number(user.balance || 0) + amount,
      totalEarnings: Number(user.totalEarnings || 0) + amount,
      lastMiningClaimAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(nextUser));

    const balanceEl = document.getElementById('balance-value');
    const earnedEl = document.getElementById('earned-value');
    const lifetimeEl = document.getElementById('lifetime-mined');
    if (balanceEl) balanceEl.textContent = `$${nextUser.balance.toFixed(2)}`;
    if (earnedEl) earnedEl.textContent = `$${nextUser.totalEarnings.toFixed(2)}`;
    if (lifetimeEl) lifetimeEl.textContent = `$${nextUser.totalEarnings.toFixed(2)}`;

    showToast(`Claim successful! +$${amount.toFixed(4)}`);
    updateDashboardMeta();
    startCooldown();
}

function formatTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function startCooldown() {
    cooldown = true;
    const btn = document.getElementById('claim-btn');
    if (btn) { btn.style.opacity = '0.5'; btn.style.pointerEvents = 'none'; }
    const bar = document.getElementById('progress-bar');
    const label = document.getElementById('cooldown-label');
    let seconds = 21600;
    if (label) label.textContent = formatTime(seconds);
    if (bar) bar.style.width = '0%';

    const interval = setInterval(() => {
        seconds--;
        const pct = ((21600 - seconds) / 21600) * 100;
        if (bar) bar.style.width = pct + '%';
        if (label) label.textContent = seconds > 0 ? formatTime(seconds) : 'Ready';
        if (seconds <= 0) {
            clearInterval(interval);
            cooldown = false;
            if (btn) { btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; }
            if (bar) bar.style.width = '100%';
        }
    }, 1000);
}

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', async function() {
  console.log('=== DASHBOARD INITIALIZATION ===');
  sanitizeLegacyDemoState();

  await loadUserFromBackend();

  const user = ensureImmediateSignupBonus();

  if (!isUserLoggedIn()) {
    console.log('User not logged in, some features will be limited');
  }

  updateDashboardMeta();

  console.log('📊 Current User Data:', {
    name: user?.name,
    email: user?.email,
    balance: user?.balance,
    level: user?.level,
    welcomeBonusClaimed: user?.welcomeBonusClaimed,
    transactionHistoryCount: Array.isArray(user?.transactionHistory) ? user.transactionHistory.length : 0
  });
  console.log('✅ Signup bonus applied immediately for new users.');
});

// Helper function to reset everything and test signup flow
window.resetAndTest = function() {
  console.log('🔄 Resetting localStorage and redirecting to login...');
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');
  localStorage.removeItem('dm_users');
  localStorage.clear();
  window.location.href = 'login.html';
};

// Helper to manually show welcome bonus (for debugging)
window.showWelcomeBonusManual = function() {
  console.log('🎁 Manually showing welcome bonus popup...');
  showWelcomeBonusPopup();
};

// Welcome bonus popup for new users
function showWelcomeBonusPopup() {
  console.log('🎁 Creating welcome bonus popup...');
  const user = getCurrentUser();
  
  // Create overlay div
  const overlay = document.createElement('div');
  overlay.id = 'welcome-bonus-overlay';
  overlay.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
  overlay.style.background = 'rgba(0, 0, 0, 0.8)';
  overlay.style.backdropFilter = 'blur(4px)';
  overlay.style.display = 'flex';
  
  // Create popup content
  const popup = document.createElement('div');
  popup.id = 'welcome-bonus-popup';
  popup.className = 'bg-[#111827] border border-[#1e293b] rounded-2xl max-w-md w-full p-6 relative';
  popup.style.maxHeight = '90vh';
  popup.style.overflowY = 'auto';
  
  popup.innerHTML = `
    <button class="absolute top-4 right-4 text-gray-400 hover:text-white p-1" onclick="closeWelcomeBonusPopup()" style="background:none;border:none;cursor:pointer;">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
    
    <div class="text-center mb-6">
      <div class="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mx-auto mb-4" style="display:flex;align-items:center;justify-content:center;">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="8" r="7"></circle>
          <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
        </svg>
      </div>
      <h2 style="font-size:1.875rem;font-weight:bold;color:white;margin-bottom:0.5rem;">Welcome to ApexMine!</h2>
      <p style="color:#9ca3af;margin-bottom:0.5rem;">Congratulations on joining our platform</p>
    </div>
    
    <div style="background:linear-gradient(to right, rgba(74,222,128,0.1), rgba(16,185,129,0.1));border:1px solid rgba(74,222,128,0.2);border-radius:0.5rem;padding:1rem;margin-bottom:1.5rem;">
      <p style="color:#9ca3af;font-size:0.875rem;margin-bottom:0.5rem;">Welcome Bonus:</p>
      <p style="font-size:2.25rem;font-weight:bold;color:#4ade80;">$5.00</p>
    </div>
    
    <button onclick="claimWelcomeBonusFromPopup()" id="welcome-claim-btn" style="width:100%;padding:0.75rem;border-radius:0.5rem;font-weight:600;font-size:0.875rem;background:rgb(250,204,21);color:rgb(17,24,39);border:none;cursor:pointer;transition:opacity 0.3s;">
      Claim Welcome Bonus
    </button>
    
    <p style="font-size:0.75rem;color:#6b7280;text-align:center;margin-top:1rem;">Start earning immediately! Your welcome bonus is now added to your balance.</p>
  `;
  
  overlay.appendChild(popup);
  document.body.appendChild(overlay);
  
  console.log('✅ Welcome bonus popup added to DOM');
}

function closeWelcomeBonusPopup() {
  console.log('❌ Closing welcome bonus popup...');
  const overlay = document.getElementById('welcome-bonus-overlay');
  const popup = document.getElementById('welcome-bonus-popup');
  
  if (overlay) overlay.remove();
  if (popup) popup.remove();
}

function claimWelcomeBonusFromPopup() {
  console.log('🎯 Claiming welcome bonus...');
  const claimBtn = document.getElementById('welcome-claim-btn');
  
  if (claimBtn) {
    claimBtn.disabled = true;
    claimBtn.textContent = '✓ Bonus Claimed!';
    claimBtn.style.opacity = '0.6';
    claimBtn.style.cursor = 'not-allowed';
  }

  const updatedUser = claimWelcomeBonusForCurrentUser();
  
  console.log('💾 Saved user with welcomeBonusClaimed: true');
  console.log('💰 Current balance:', updatedUser.balance);
  
  const balanceEl = document.getElementById('balance-value');
  if (balanceEl) {
    balanceEl.textContent = `$${Number(updatedUser.balance || 0).toFixed(2)}`;
  }
  
  updateDashboardMeta();
  showToast('Welcome bonus claimed: +$5.00');
  
  console.log('✅ Welcome bonus claimed successfully');
  
  setTimeout(() => {
    closeWelcomeBonusPopup();
  }, 500);
  
  setTimeout(() => {
    console.log('⏸️ Checking for daily bonus eligibility...');
    checkAndShowDailyBonusPopup();
  }, 2000);
}

// Daily bonus popup functionality
function checkAndShowDailyBonusPopup() {
  console.log('📅 Checking daily bonus eligibility...');
  const user = getCurrentUser();
  
  if (!isUserLoggedIn()) {
    console.log('⏭️ User not logged in, skipping daily bonus');
    return; // Don't show popup for non-logged-in users
  }
  
  const lastClaimTime = user.lastDailyBonusClaimAt ? new Date(user.lastDailyBonusClaimAt).getTime() : 0;
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  
  console.log('📊 Daily Bonus Check:', {
    lastClaimTime: lastClaimTime ? new Date(lastClaimTime).toLocaleString() : 'Never',
    now: new Date(now).toLocaleString(),
    hoursPassed: lastClaimTime ? (now - lastClaimTime) / (1000 * 60 * 60) : 'N/A'
  });
  
  // Check if 24 hours have passed
  if (!lastClaimTime || (now - lastClaimTime) >= oneDayMs) {
    console.log('✅ Daily bonus is eligible - showing popup');
    showDailyBonusPopup();
  } else {
    console.log('⏸️ Daily bonus not yet available');
  }
}

function showDailyBonusPopup() {
  console.log('🎁 Creating daily bonus popup...');
  const user = getCurrentUser();
  const level = Number(user.level || 0);
  
  // Daily bonus config
  const bonusConfig = {
    0: 0.02,
    1: 0.033,
    2: 0.066,
    3: 0.1667,
    4: 0.25,
    5: 0.3334
  };
  
  const bonusAmount = bonusConfig[level] || 0.02;
  const levelName = ['Free', 'Alpha', 'Beta', 'Gamma', 'Delta', 'Apex'][level] || 'Free';
  
  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'daily-bonus-overlay';
  overlay.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
  overlay.style.background = 'rgba(0, 0, 0, 0.8)';
  overlay.style.backdropFilter = 'blur(4px)';
  overlay.style.display = 'flex';
  
  // Create popup
  const popup = document.createElement('div');
  popup.id = 'daily-bonus-popup';
  popup.className = 'bg-[#111827] border border-[#1e293b] rounded-2xl max-w-md w-full p-6 relative';
  popup.style.maxHeight = '90vh';
  popup.style.overflowY = 'auto';
  
  popup.innerHTML = `
    <button class="absolute top-4 right-4 text-gray-400 hover:text-white p-1" onclick="closeDailyBonusPopup()" style="background:none;border:none;cursor:pointer;">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
    
    <div class="text-center mb-6">
      <div class="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mx-auto mb-4" style="display:flex;align-items:center;justify-content:center;">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20.84 4.61 5.17 20.28 3.26 18.37 18.93 2.7"></polyline><path d="M10.5 15.5L3.26 22.73"></path>
        </svg>
      </div>
      <h2 style="font-size:1.875rem;font-weight:bold;color:white;margin-bottom:0.5rem;">Daily Bonus Available!</h2>
      <p style="color:#9ca3af;margin-bottom:1rem;">Level ${level} ${levelName} Member</p>
    </div>
    
    <div style="background:linear-gradient(to right, rgba(250,204,21,0.1), rgba(249,115,22,0.1));border:1px solid rgba(250,204,21,0.2);border-radius:0.5rem;padding:1rem;margin-bottom:1.5rem;">
      <p style="color:#9ca3af;font-size:0.875rem;margin-bottom:0.5rem;">Your daily bonus:</p>
      <p style="font-size:2rem;font-weight:bold;color:#fbbf24;">$${bonusAmount.toFixed(4)}</p>
    </div>
    
    <button onclick="claimDailyBonusFromPopup()" id="daily-claim-btn" style="width:100%;padding:0.75rem;border-radius:0.5rem;font-weight:600;font-size:0.875rem;background:rgb(250,204,21);color:rgb(17,24,39);border:none;cursor:pointer;transition:opacity 0.3s;">
      Claim Bonus
    </button>
    
    <p style="font-size:0.75rem;color:#6b7280;text-align:center;margin-top:1rem;">Come back in 24 hours for another bonus!</p>
  `;
  
  overlay.appendChild(popup);
  document.body.appendChild(overlay);
  
  console.log('✅ Daily bonus popup added to DOM');
}

function closeDailyBonusPopup() {
  console.log('❌ Closing daily bonus popup...');
  const overlay = document.getElementById('daily-bonus-overlay');
  const popup = document.getElementById('daily-bonus-popup');
  
  if (overlay) overlay.remove();
  if (popup) popup.remove();
}

async function claimDailyBonusFromPopup() {
  console.log('🎯 Claiming daily bonus...');
  const token = localStorage.getItem('authToken');
  if (!token) {
    console.log('⚠️ No auth token, redirecting to login');
    redirectToLogin();
    return;
  }
  
  const claimBtn = document.getElementById('daily-claim-btn');
  if (claimBtn) {
    claimBtn.disabled = true;
    claimBtn.style.opacity = '0.6';
    claimBtn.style.cursor = 'not-allowed';
  }
  
  // Get current user data
  const user = getCurrentUser();
  const level = Number(user.level || 0);
  const bonusConfig = {
    0: 0.02,
    1: 0.033,
    2: 0.066,
    3: 0.1667,
    4: 0.25,
    5: 0.3334
  };
  const bonusAmount = bonusConfig[level] || 0.02;
  
  console.log('💰 Bonus Amount:', bonusAmount);
  
  // Optimistic update - update immediately
  user.balance = Number(user.balance || 0) + bonusAmount;
  user.totalEarnings = Number(user.totalEarnings || 0) + bonusAmount;
  user.lastDailyBonusClaimAt = new Date().toISOString();
  localStorage.setItem('currentUser', JSON.stringify(user));
  
  console.log('💾 Optimistic update saved');
  
  // Update balance display in real-time
  const balanceEl = document.getElementById('balance-value');
  if (balanceEl) {
    balanceEl.textContent = `$${Number(user.balance).toFixed(2)}`;
  }
  
  const earnedEl = document.getElementById('earned-value');
  if (earnedEl) {
    earnedEl.textContent = `$${Number(user.totalEarnings).toFixed(2)}`;
  }
  
  // Refresh all dashboard elements
  updateDashboardMeta();
  
  // Show success message
  showToast(`Daily bonus claimed: +$${bonusAmount.toFixed(4)}`);
  
  console.log('✅ Daily bonus claimed successfully');
  
  // Close popup immediately
  setTimeout(() => {
    closeDailyBonusPopup();
  }, 500);
  
  // Send to backend in the background (non-blocking)
  try {
    const response = await fetch('http://localhost:3000/api/auth/claim-daily-bonus', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (!data.success) {
      console.log('⚠️ Backend failed to claim bonus, reverting...');
      // If backend fails, revert the optimistic update
      user.balance = Number(user.balance || 0) - bonusAmount;
      user.totalEarnings = Number(user.totalEarnings || 0) - bonusAmount;
      user.lastDailyBonusClaimAt = null;
      localStorage.setItem('currentUser', JSON.stringify(user));
      
      // Update display
      if (balanceEl) {
        balanceEl.textContent = `$${Number(user.balance).toFixed(2)}`;
      }
      if (earnedEl) {
        earnedEl.textContent = `$${Number(user.totalEarnings).toFixed(2)}`;
      }
      
      updateDashboardMeta();
      showToast('Failed to claim bonus. Please try again.');
    }
  } catch (error) {
    console.log('❌ Network error claiming daily bonus:', error);
    // If network error, revert the optimistic update
    user.balance = Number(user.balance || 0) - bonusAmount;
    user.totalEarnings = Number(user.totalEarnings || 0) - bonusAmount;
    user.lastDailyBonusClaimAt = null;
    localStorage.setItem('currentUser', JSON.stringify(user));
    
    if (balanceEl) {
      balanceEl.textContent = `$${Number(user.balance).toFixed(2)}`;
    }
    if (earnedEl) {
      earnedEl.textContent = `$${Number(user.totalEarnings).toFixed(2)}`;
    }
    
    updateDashboardMeta();
    showToast('Network error. Please try again later.');
  }
}

function getLevelConfig(level = getCurrentUser().level || 0) {
  return LEVEL_CONFIG[level] || LEVEL_CONFIG[0];
}

function generateReferralCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function buildReferralLink(code) {
  return `${window.location.origin}${window.location.pathname}?ref=${code}`;
}

function calculateMiningClaim(level) {
  const config = getLevelConfig(level);
  if (!config.miningEnabled) return 0;
  const perDay = config.taskPayout * 5;
  const per6Hours = perDay / 4;
  return Number(per6Hours.toFixed(4));
}

function getDailyLoginBonus(level) {
  return Number((LEVEL_CONFIG[level]?.dailyBonus ?? 0).toFixed(4));
}

function syncClaimButtonState() {
  const claimBtn = document.getElementById('claim-btn');
  const claimLabel = document.getElementById('claim-button-label');
  const amountLabel = document.getElementById('claim-amount');
  const user = getCurrentUser();
  const level = Number(user.level || 0);
  const loggedIn = isUserLoggedIn();

  if (!claimBtn || !claimLabel || !amountLabel) return;

  if (!loggedIn) {
    claimBtn.disabled = true;
    claimBtn.style.opacity = '0.5';
    claimBtn.style.cursor = 'not-allowed';
    claimLabel.textContent = 'Login';
    amountLabel.textContent = '$0.00';
    claimBtn.onclick = () => { redirectToLogin(); };
    return;
  }

  if (level < 1) {
    claimBtn.disabled = false;
    claimBtn.style.opacity = '1';
    claimBtn.style.cursor = 'pointer';
    claimLabel.textContent = 'Upgrade';
    amountLabel.textContent = '$0.00';
    claimBtn.onclick = openModal;
    return;
  }

  const nextClaimAt = user.lastMiningClaimAt ? new Date(user.lastMiningClaimAt).getTime() + 6 * 60 * 60 * 1000 : 0;
  const isReady = !nextClaimAt || Date.now() >= nextClaimAt;
  const amount = calculateMiningClaim(level);

  amountLabel.textContent = `$${amount.toFixed(4)}`;
  if (isReady) {
    claimBtn.disabled = false;
    claimBtn.style.opacity = '1';
    claimBtn.style.cursor = 'pointer';
    claimLabel.textContent = 'Claim';
    claimBtn.onclick = handleClaim;
  } else {
    claimBtn.disabled = true;
    claimBtn.style.opacity = '0.6';
    claimBtn.style.cursor = 'not-allowed';
    claimLabel.textContent = 'Locked';
    claimBtn.onclick = () => showToast('Mining claim is still cooling down.');
  }
}

function updateDashboardMeta() {
  const user = getCurrentUser();
  const level = Number(user.level || 0);
  const config = getLevelConfig(level);
  const levelBadge = document.getElementById('level-badge');
  const dailyBonusEl = document.getElementById('daily-login-bonus');
  const claimAmountEl = document.getElementById('claim-amount-display');
  const referralReqEl = document.getElementById('referral-requirement');
  const referralCodeEl = document.getElementById('referral-code-display');
  const referralLinkEl = document.getElementById('referral-link-display');
  const qualifiedReferralsEl = document.getElementById('qualified-referrals');
  const dailyBtn = document.getElementById('daily-bonus-btn');

  if (levelBadge) levelBadge.textContent = `Level ${level} · ${config.name}`;
  if (dailyBonusEl) dailyBonusEl.textContent = `$${getDailyLoginBonus(level).toFixed(4)}`;
  if (claimAmountEl) claimAmountEl.textContent = `$${calculateMiningClaim(level).toFixed(4)} / 6h`;
  if (referralReqEl) referralReqEl.textContent = `${config.minReferrals} referrals`;
  if (referralCodeEl) referralCodeEl.textContent = user.referralCode || generateReferralCode();
  if (referralLinkEl) referralLinkEl.textContent = buildReferralLink(user.referralCode || referralCodeEl.textContent);
  if (qualifiedReferralsEl) qualifiedReferralsEl.textContent = user.qualifiedReferrals || 0;

  if (dailyBtn) {
    if (!isUserLoggedIn()) {
      dailyBtn.textContent = 'Login Required';
      dailyBtn.disabled = true;
      dailyBtn.style.opacity = '0.6';
      dailyBtn.style.cursor = 'not-allowed';
    } else {
      const lastClaim = user.lastDailyBonusClaimAt ? new Date(user.lastDailyBonusClaimAt).getTime() : 0;
      const oneDayMs = 24 * 60 * 60 * 1000;
      if (lastClaim && Date.now() - lastClaim < oneDayMs) {
        dailyBtn.textContent = 'Daily Bonus Claimed';
        dailyBtn.disabled = true;
        dailyBtn.style.opacity = '0.6';
        dailyBtn.style.cursor = 'not-allowed';
      } else {
        dailyBtn.textContent = 'Claim Daily Bonus';
        dailyBtn.disabled = false;
        dailyBtn.style.opacity = '1';
        dailyBtn.style.cursor = 'pointer';
      }
    }
  }

  const balanceEl = document.getElementById('balance-value');
  const earnedEl = document.getElementById('earned-value');
  const lifetimeEl = document.getElementById('lifetime-mined');
  if (balanceEl) balanceEl.textContent = `$${Number(user.balance || 0).toFixed(2)}`;
  if (earnedEl) earnedEl.textContent = `$${Number(user.totalEarnings || 0).toFixed(2)}`;
  if (lifetimeEl) lifetimeEl.textContent = `$${Number(user.totalEarnings || 0).toFixed(2)}`;

  syncClaimButtonState();
}

function handleDailyLoginBonus() {
    const user = getCurrentUser();
    if (!isUserLoggedIn()) {
      redirectToLogin();
      return;
    }

    const lastClaim = user.lastDailyBonusClaimAt ? new Date(user.lastDailyBonusClaimAt).getTime() : 0;
    const oneDayMs = 24 * 60 * 60 * 1000;
    if (lastClaim && Date.now() - lastClaim < oneDayMs) {
        const mins = Math.ceil((oneDayMs - (Date.now() - lastClaim)) / 60000);
        showToast(`Daily bonus available in ${mins} min.`);
        return;
    }

    const bonus = getDailyLoginBonus(Number(user.level || 0));
    const nextUser = {
      ...user,
      balance: Number(user.balance || 0) + bonus,
      totalEarnings: Number(user.totalEarnings || 0) + bonus,
      dailyBonusClaimed: true,
      lastDailyBonusClaimAt: new Date().toISOString(),
      lastLoginDate: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(nextUser));
    updateDashboardMeta();
    showToast(`Daily login bonus claimed: +$${bonus.toFixed(4)}`);
}

function handleClaim() {
    const user = getCurrentUser();
    const level = Number(user.level || 0);
    if (!isUserLoggedIn()) {
      redirectToLogin();
      return;
    }
    if (level < 1) {
      openModal();
      showToast('Upgrade to unlock mining.');
      return;
    }

    const lastMining = user.lastMiningClaimAt ? new Date(user.lastMiningClaimAt).getTime() : 0;
    const sixHours = 6 * 60 * 60 * 1000;
    if (lastMining && Date.now() - lastMining < sixHours) {
      const remaining = sixHours - (Date.now() - lastMining);
      showToast(`Mining is cooling down. ${Math.ceil(remaining / 60000)} min remaining.`);
      updateDashboardMeta();
      return;
    }

    const amount = calculateMiningClaim(level);
    const nextUser = {
      ...user,
      balance: Number(user.balance || 0) + amount,
      totalEarnings: Number(user.totalEarnings || 0) + amount,
      lastMiningClaimAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(nextUser));

    const balanceEl = document.getElementById('balance-value');
    const earnedEl = document.getElementById('earned-value');
    const lifetimeEl = document.getElementById('lifetime-mined');
    if (balanceEl) balanceEl.textContent = `$${nextUser.balance.toFixed(2)}`;
    if (earnedEl) earnedEl.textContent = `$${nextUser.totalEarnings.toFixed(2)}`;
    if (lifetimeEl) lifetimeEl.textContent = `$${nextUser.totalEarnings.toFixed(2)}`;

    showToast(`Claim successful! +$${amount.toFixed(4)}`);
    updateDashboardMeta();
    startCooldown();
}

function formatTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function startCooldown() {
    cooldown = true;
    const btn = document.getElementById('claim-btn');
    if (btn) { btn.style.opacity = '0.5'; btn.style.pointerEvents = 'none'; }
    const bar = document.getElementById('progress-bar');
    const label = document.getElementById('cooldown-label');
    let seconds = 21600;
    if (label) label.textContent = formatTime(seconds);
    if (bar) bar.style.width = '0%';

    const interval = setInterval(() => {
        seconds--;
        const pct = ((21600 - seconds) / 21600) * 100;
        if (bar) bar.style.width = pct + '%';
        if (label) label.textContent = seconds > 0 ? formatTime(seconds) : 'Ready';
        if (seconds <= 0) {
            clearInterval(interval);
            cooldown = false;
            if (btn) { btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; }
            if (bar) bar.style.width = '100%';
        }
    }, 1000);
}

function openModal() {
    const modal = document.getElementById('upgrade-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}
function closeModal() {
    const modal = document.getElementById('upgrade-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}
if (document.getElementById('upgrade-modal')) {
  document.getElementById('upgrade-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
}

updateDashboardMeta();

/* --------- Rig modal + subscription wiring --------- */
function getRigsFromStorage() {
  const defaultRigs = [
    { name: 'Alpha Rig', subscription: 10, daily: 0.75, cycle: 100, total: 75, levelRequired: 1 },
    { name: 'Alpha Rig Pro', subscription: 15, daily: 1, cycle: 100, total: 100, levelRequired: 2 },
    { name: 'Beta Rig', subscription: 25, daily: 1.3, cycle: 90, total: 125, levelRequired: 2 },
    { name: 'Beta Rig Pro', subscription: 30, daily: 1.67, cycle: 90, total: 150, levelRequired: 3 },
    { name: 'Gamma Rig', subscription: 50, daily: 5, cycle: 60, total: 300, levelRequired: 3 },
    { name: 'Gamma Rig Pro', subscription: 75, daily: 8.33, cycle: 60, total: 500, levelRequired: 4 },
    { name: 'Delta Rig', subscription: 100, daily: 16.67, cycle: 45, total: 750, levelRequired: 5 },
    { name: 'Delta Rig Pro', subscription: 150, daily: 22.22, cycle: 45, total: 1000, levelRequired: 5 }
  ];

  try {
    const stored = JSON.parse(localStorage.getItem('dashboardRigs'));
    if (Array.isArray(stored) && stored.length) {
      const normalized = stored.map((rig) => ({
        ...rig,
        subscription: Number(rig.subscription || rig.price || 0),
        daily: Number(rig.daily || 0),
        cycle: Number(rig.cycle || 0),
        total: Number(rig.total || 0),
        levelRequired: Number(rig.levelRequired || 1)
      }));

      const hasWrongCycle = normalized.some((rig) => Number(rig.cycle) === 6);
      if (hasWrongCycle) {
        localStorage.setItem('dashboardRigs', JSON.stringify(defaultRigs));
        return defaultRigs;
      }

      return normalized;
    }
  } catch (e) {}

  if (typeof rigData !== 'undefined') {
    const mapped = Object.entries(rigData).map(([name, r]) => ({ name, subscription: r.price || r.subscription || 0, daily: r.daily || 0, cycle: r.cycle || 0, total: r.total || 0, levelRequired: r.levelRequired || 1 }));
    const hasWrongCycle = mapped.some((rig) => Number(rig.cycle) === 6);
    if (hasWrongCycle) {
      localStorage.setItem('dashboardRigs', JSON.stringify(defaultRigs));
      return defaultRigs;
    }
    return mapped;
  }

  localStorage.setItem('dashboardRigs', JSON.stringify(defaultRigs));
  return defaultRigs;
}

function openRigModal() {
  const modal = document.getElementById('rig-modal');
  if (!modal) return;
  // Always render fresh when opening
  renderRigModal();
  modal.classList.remove('hidden'); 
  modal.classList.add('flex');
}

function closeRigModal() {
  const modal = document.getElementById('rig-modal');
  if (!modal) return; 
  modal.classList.add('hidden'); 
  modal.classList.remove('flex');
}

function renderRigModal() {
  const body = document.getElementById('rig-modal-body');
  if (!body) return;
  
  const rigs = getRigsFromStorage();
  const user = getCurrentUser();
  
  // Clear existing content first
  body.innerHTML = '';
  
  if (!rigs || rigs.length === 0) {
    body.innerHTML = '<div class="p-4 text-center text-gray-400">No mining rigs available</div>';
    return;
  }
  
  // Re-render all rigs
  body.innerHTML = rigs.map((r, i) => {
    const levelReq = r.levelRequired || 1;
    const canAccess = (user.level || 0) >= levelReq;
    const btnLabel = canAccess ? `Subscribe $${Number(r.subscription).toFixed(2)}` : `Requires L${levelReq}`;
    const disabled = !canAccess ? 'disabled' : '';
    return `
      <div class="p-3 rounded-lg border border-[#1e293b] flex items-center justify-between">
        <div>
          <div class="font-semibold text-white">${r.name} <span style="color:var(--muted);font-weight:600;font-size:12px">(L${levelReq})</span></div>
          <div class="text-xs text-gray-400">$${Number(r.daily).toFixed(2)} daily · ${r.cycle}d cycle · total $${Number(r.total).toFixed(2)}</div>
        </div>
        <div class="flex flex-col items-end gap-2">
          <div class="text-sm text-[#a3e635] font-bold">$${Number(r.subscription).toFixed(2)}</div>
          <button onclick="subscribeToRig(${i})" ${disabled} class="px-3 py-1 rounded-md bg-[#a3e635] text-[#071617] font-semibold">${btnLabel}</button>
        </div>
      </div>`;
  }).join('');
}

function subscribeToRig(index) {
  const rigs = getRigsFromStorage();
  const rig = rigs[index];
  if (!rig) return showToast('Rig not found');
  const user = getCurrentUser();
  const levelReq = rig.levelRequired || 1;
  if ((user.level || 0) < levelReq) { showToast('Your level does not allow this rig'); return; }
  const price = Number(rig.subscription || rig.price || 0);
  if ((user.balance || 0) < price) { showToast('Insufficient balance to subscribe'); return; }
  // Deduct and add subscription
  const nextUser = { ...user };
  nextUser.balance = Number(nextUser.balance || 0) - price;
  nextUser.totalEarnings = Number(nextUser.totalEarnings || 0);
  nextUser.subscribedRigs = nextUser.subscribedRigs || [];
  nextUser.subscribedRigs.push({ rigName: rig.name, purchasedAt: new Date().toISOString(), lastClaimAt: new Date().toISOString(), quantity: 1 });
  localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(nextUser));
  showToast(`Subscribed to ${rig.name} — $${price.toFixed(2)}`);
  closeRigModal();
  updateDashboardMeta();
}
