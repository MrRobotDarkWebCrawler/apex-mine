/**
 * ApexMine Earnings & Subscription System
 * Manages subscription levels, earnings calculations, referrals, and withdrawals
 */

const EARNINGS_CONFIG = {
  // Daily login bonuses by level
  dailyLoginBonus: {
    0: 0.02,
    1: 0.033,
    2: 0.066,
    3: 0.1667,
    4: 0.25,
    5: 0.3334
  },
  
  // Subscription costs
  subscriptionCost: {
    0: 0,
    1: 10,
    2: 15,
    3: 25,
    4: 35,
    5: 50
  },
  
  // Earnings per task by level
  taskEarnings: {
    0: 0.01,
    1: 0.16,
    2: 0.22,
    3: 0.30,
    4: 0.45,
    5: 0.60
  },
  
  // Earnings per referral (only when referred user subscribes)
  referralEarnings: {
    0: 0.5,
    1: 1,
    2: 1.5,
    3: 2,
    4: 3,
    5: 4
  },
  
  // Expected monthly revenue
  expectedMonthlyRevenue: {
    0: 0,
    1: 25,
    2: 35,
    3: 50,
    4: 75,
    5: 100
  },
  
  // Withdrawal conditions
  withdrawalConditions: {
    0: { minReferrals: 0, minBalance: 25, enabled: false },
    1: { minReferrals: 3, minBalance: 25, enabled: true },
    2: { minReferrals: 5, minBalance: 25, enabled: true },
    3: { minReferrals: 7, minBalance: 25, enabled: true },
    4: { minReferrals: 10, minBalance: 25, enabled: true },
    5: { minReferrals: 12, minBalance: 25, enabled: true }
  },
  
  // Mining rig access by level
  rigAccess: {
    0: [], // No mining at level 0
    1: ['Alpha Rig'],
    2: ['Alpha Rig Pro', 'Beta Rig'],
    3: ['Beta Rig Pro', 'Gamma Rig'],
    4: ['Gamma Rig Pro'],
    5: ['Delta Rig', 'Delta Rig Pro']
  },
  
  // Mining rigs details
  miningRigs: {
    'Alpha Rig': {
      level: 1,
      cost: 0,
      efficiency: 1,
      dailyEarnings: 5,
      description: 'Entry-level mining rig'
    },
    'Alpha Rig Pro': {
      level: 2,
      cost: 20,
      efficiency: 1.5,
      dailyEarnings: 7.5,
      description: 'Enhanced Alpha rig with better efficiency'
    },
    'Beta Rig': {
      level: 2,
      cost: 35,
      efficiency: 2,
      dailyEarnings: 10,
      description: 'Advanced mining rig'
    },
    'Beta Rig Pro': {
      level: 3,
      cost: 60,
      efficiency: 2.5,
      dailyEarnings: 12.5,
      description: 'Professional Beta rig'
    },
    'Gamma Rig': {
      level: 3,
      cost: 75,
      efficiency: 3,
      dailyEarnings: 15,
      description: 'Professional-grade mining rig'
    },
    'Gamma Rig Pro': {
      level: 4,
      cost: 120,
      efficiency: 4,
      dailyEarnings: 20,
      description: 'Enterprise Gamma rig'
    },
    'Delta Rig': {
      level: 5,
      cost: 200,
      efficiency: 5,
      dailyEarnings: 25,
      description: 'Top-tier mining rig'
    },
    'Delta Rig Pro': {
      level: 5,
      cost: 350,
      efficiency: 6,
      dailyEarnings: 30,
      description: 'Ultimate mining rig'
    }
  },
  
  // Welcome bonus
  welcomeBonus: 0,
  
  // Daily tasks count
  dailyTasksCount: 5,
  
  // Minimum withdrawal
  minWithdrawal: 25,
  
  // Mining starts at level
  miningStartsAtLevel: 1
};

/**
 * Generate a unique referral code
 * @returns {string} Unique referral code
 */
function generateReferralCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Generate referral link
 * @param {string} code - Referral code
 * @returns {string} Full referral link
 */
function generateReferralLink(code) {
  const baseUrl = window.location.origin;
  return `${baseUrl}/register.html?ref=${code}`;
}

/**
 * Initialize user with default settings on first login
 * @returns {Object} User object
 */
function initializeNewUser() {
  const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  const referralCode = generateReferralCode();
  
  const user = {
    id: userId,
    username: 'User_' + Math.random().toString(36).substr(2, 5),
    level: 0,
    balance: 0,
    totalEarned: 0,
    totalWithdrawn: 0,
    referralCode: referralCode,
    referralLink: generateReferralLink(referralCode),
    referrals: 0,
    qualifiedReferrals: 0, // Referrals that have subscribed
    createdAt: new Date().toISOString(),
    lastLoginBonus: null,
    welcomeBonusReceived: false,
    minedToday: 0,
    tasksCompletedToday: 0,
    activeRigs: [],
    totalMined: 0
  };
  
  // Give welcome bonus
  if (!user.welcomeBonusReceived) {
    user.balance += EARNINGS_CONFIG.welcomeBonus;
    user.totalEarned += EARNINGS_CONFIG.welcomeBonus;
    user.welcomeBonusReceived = true;
  }
  
  return user;
}

/**
 * Get user data from localStorage or initialize new user
 * @returns {Object} User object
 */
function getUser() {
  try {
    const current = localStorage.getItem('currentUser');
    if (current) {
      const parsed = JSON.parse(current);
      if (parsed && parsed.email) {
        return parsed;
      }
    }
  } catch (error) {
    console.log('Could not read currentUser, falling back to legacy account storage');
  }

  const stored = localStorage.getItem('apexMineUser');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.log('Could not parse legacy apexMineUser');
    }
  }
  return initializeNewUser();
}

/**
 * Save user data to localStorage
 * @param {Object} user - User object to save
 */
function saveUser(user) {
  const normalized = {
    ...user,
    balance: Number(user.balance || 0),
    totalEarned: Number(user.totalEarned || user.totalEarnings || 0),
    totalEarnings: Number(user.totalEarnings || user.totalEarned || 0),
    totalMined: Number(user.totalMined || user.totalEarned || user.totalEarnings || 0),
    transactionHistory: Array.isArray(user.transactionHistory) ? user.transactionHistory : []
  };

  localStorage.setItem('apexMineUser', JSON.stringify(normalized));
  localStorage.setItem('currentUser', JSON.stringify(normalized));

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('user-state-updated', { detail: normalized }));
  }
}

/**
 * Claim daily login bonus
 * @returns {number} Amount bonus claimed
 */
function claimDailyLoginBonus() {
  const user = getUser();
  if (typeof enforceAuthentication === 'function' && !enforceAuthentication()) { redirectToLogin(); return 0; }
  const today = new Date().toDateString();
  const lastBonus = localStorage.getItem('lastLoginBonusDate');
  
  // Check if already claimed today
  if (lastBonus === today) {
    return 0;
  }
  
  const bonusAmount = EARNINGS_CONFIG.dailyLoginBonus[user.level];
  user.balance += bonusAmount;
  user.totalEarned += bonusAmount;
  
  localStorage.setItem('lastLoginBonusDate', today);
  saveUser(user);
  
  return bonusAmount;
}

/**
 * Calculate mining earnings based on subscription level and rig
 * Divided into 6-hour segments (4 claims per day)
 * @param {number} level - User subscription level
 * @returns {number} Earnings per 6-hour claim
 */
function calculateMiningEarningsPerClaim(level) {
  // Daily earnings divided by 4 (6-hour intervals = 4 claims per day)
  const dailyEarnings = {
    0: 0,    // No mining
    1: 5,    // $5 per day = $1.25 per claim
    2: 8,    // $8 per day = $2 per claim
    3: 12,   // $12 per day = $3 per claim
    4: 18,   // $18 per day = $4.50 per claim
    5: 25    // $25 per day = $6.25 per claim
  };
  
  return (dailyEarnings[level] || 0) / 4;
}

/**
 * Claim mining reward
 * @returns {Object} { success: boolean, amount: number, message: string }
 */
function claimMiningReward() {
  if (typeof enforceAuthentication === 'function' && !enforceAuthentication()) { redirectToLogin(); return { success: false, amount: 0, message: 'Authentication required' }; }
  const user = getUser();
  
  if (user.level < EARNINGS_CONFIG.miningStartsAtLevel) {
    return {
      success: false,
      amount: 0,
      message: 'Mining begins at Level 1. Upgrade your subscription to start mining.'
    };
  }
  
  const claimAmount = calculateMiningEarningsPerClaim(user.level);
  user.balance += claimAmount;
  user.totalEarned += claimAmount;
  user.totalMined += claimAmount;
  user.minedToday += claimAmount;
  
  saveUser(user);
  
  return {
    success: true,
    amount: claimAmount,
    message: `Mining claim successful! +$${claimAmount.toFixed(2)}`
  };
}

/**
 * Complete a task
 * @returns {Object} { success: boolean, amount: number, message: string }
 */
function completeTask() {
  if (typeof enforceAuthentication === 'function' && !enforceAuthentication()) { redirectToLogin(); return { success: false, amount: 0, message: 'Authentication required' }; }
  const user = getUser();
  const today = new Date().toDateString();
  const tasksCompletedKey = `tasksCompleted_${today}`;
  const tasksCompletedToday = parseInt(localStorage.getItem(tasksCompletedKey) || '0');
  
  if (tasksCompletedToday >= EARNINGS_CONFIG.dailyTasksCount) {
    return {
      success: false,
      amount: 0,
      message: `You've completed all ${EARNINGS_CONFIG.dailyTasksCount} daily tasks. Try again tomorrow!`
    };
  }
  
  const earnings = EARNINGS_CONFIG.taskEarnings[user.level];
  user.balance += earnings;
  user.totalEarned += earnings;
  
  localStorage.setItem(tasksCompletedKey, (tasksCompletedToday + 1).toString());
  saveUser(user);
  
  return {
    success: true,
    amount: earnings,
    message: `Task completed! +$${earnings.toFixed(2)}`
  };
}

  /**
   * Award task earnings to the authenticated user based on their level.
   * Returns { success, amount, message }
   */
  function awardTaskForUser() {
    if (typeof enforceAuthentication === 'function' && !enforceAuthentication()) { redirectToLogin(); return { success: false, amount: 0, message: 'Authentication required' }; }
    const user = getUser();
    const amount = EARNINGS_CONFIG.taskEarnings[user.level] || 0;
    user.balance += amount;
    user.totalEarned += amount;
    saveUser(user);
    return { success: true, amount: amount, message: `Task completed! +$${amount.toFixed(2)}` };
  }

/**
 * Process referral signup
 * @param {string} referralCode - Code from referring user
 * @returns {Object} { success: boolean, message: string }
 */
function processReferralSignup(referralCode) {
  // Find referring user (in real app, this would query backend)
  // For now, we'll store it in referrer data
  const referrerData = {
    code: referralCode,
    signupTime: new Date().toISOString()
  };
  
  localStorage.setItem('referrerInfo', JSON.stringify(referrerData));
  
  return {
    success: true,
    message: 'Referral code registered. Earn rewards when you subscribe!'
  };
}

/**
 * Upgrade subscription level
 * @param {number} newLevel - New subscription level
 * @returns {Object} { success: boolean, message: string }
 */
function upgradeSubscription(newLevel) {
  if (typeof enforceAuthentication === 'function' && !enforceAuthentication()) { redirectToLogin(); return { success: false, message: 'Authentication required' }; }
  const user = getUser();
  
  if (newLevel <= user.level) {
    return {
      success: false,
      message: 'You can only upgrade to a higher level.'
    };
  }
  
  const cost = EARNINGS_CONFIG.subscriptionCost[newLevel];
  
  if (user.balance < cost) {
    return {
      success: false,
      message: `Insufficient balance. Cost: $${cost}, Your balance: $${user.balance.toFixed(2)}`
    };
  }
  
  user.balance -= cost;
  user.level = newLevel;
  
  saveUser(user);
  
  return {
    success: true,
    message: `Upgraded to Level ${newLevel}! Your earnings potential has increased.`
  };
}

/**
 * Check if user can withdraw
 * @returns {Object} { canWithdraw: boolean, reason: string }
 */
function checkWithdrawalEligibility() {
  const user = getUser();
  const conditions = EARNINGS_CONFIG.withdrawalConditions[user.level];
  
  if (!conditions.enabled) {
    return {
      canWithdraw: false,
      reason: `Withdrawal not available at Level ${user.level}. Upgrade to Level 1 or higher.`
    };
  }
  
  if (user.balance < conditions.minBalance) {
    return {
      canWithdraw: false,
      reason: `Minimum balance required: $${conditions.minBalance}. Current: $${user.balance.toFixed(2)}`
    };
  }
  
  if (user.qualifiedReferrals < conditions.minReferrals) {
    return {
      canWithdraw: false,
      reason: `Minimum qualified referrals: ${conditions.minReferrals}. Current: ${user.qualifiedReferrals}`
    };
  }
  
  return {
    canWithdraw: true,
    reason: 'You are eligible to withdraw.'
  };
}

/**
 * Process withdrawal
 * @param {number} amount - Amount to withdraw
 * @returns {Object} { success: boolean, message: string }
 */
function processWithdrawal(amount) {
  if (typeof enforceAuthentication === 'function' && !enforceAuthentication()) { return { success: false, message: 'Authentication required' }; }
  const user = getUser();
  const eligibility = checkWithdrawalEligibility();
  
  if (!eligibility.canWithdraw) {
    return {
      success: false,
      message: eligibility.reason
    };
  }
  
  if (amount < EARNINGS_CONFIG.minWithdrawal) {
    return {
      success: false,
      message: `Minimum withdrawal amount: $${EARNINGS_CONFIG.minWithdrawal}`
    };
  }
  
  if (amount > user.balance) {
    return {
      success: false,
      message: `Insufficient balance. Requested: $${amount}, Available: $${user.balance.toFixed(2)}`
    };
  }
  
  user.balance -= amount;
  user.totalWithdrawn += amount;
  
  const withdrawal = {
    id: 'withdraw_' + Date.now(),
    amount: amount,
    timestamp: new Date().toISOString(),
    status: 'pending'
  };
  
  let withdrawals = JSON.parse(localStorage.getItem('withdrawalHistory') || '[]');
  withdrawals.push(withdrawal);
  localStorage.setItem('withdrawalHistory', JSON.stringify(withdrawals));
  
  saveUser(user);
  
  return {
    success: true,
    message: `Withdrawal of $${amount.toFixed(2)} processed successfully.`
  };
}

/**
 * Get user subscription details
 * @returns {Object} Subscription details
 */
function getSubscriptionDetails() {
  const user = getUser();
  const level = user.level;
  
  return {
    level: level,
    planName: `Level ${level}`,
    cost: EARNINGS_CONFIG.subscriptionCost[level],
    taskEarnings: EARNINGS_CONFIG.taskEarnings[level],
    referralEarnings: EARNINGS_CONFIG.referralEarnings[level],
    dailyLoginBonus: EARNINGS_CONFIG.dailyLoginBonus[level],
    expectedMonthlyRevenue: EARNINGS_CONFIG.expectedMonthlyRevenue[level],
    withdrawalConditions: EARNINGS_CONFIG.withdrawalConditions[level],
    availableRigs: EARNINGS_CONFIG.rigAccess[level],
    miningAvailable: level >= EARNINGS_CONFIG.miningStartsAtLevel
  };
}

/**
 * Get available rigs for current user
 * @returns {Array} Available mining rigs
 */
function getAvailableRigs() {
  const user = getUser();
  const availableRigNames = EARNINGS_CONFIG.rigAccess[user.level] || [];
  
  return availableRigNames.map(rigName => ({
    name: rigName,
    ...EARNINGS_CONFIG.miningRigs[rigName]
  }));
}

/**
 * Activate a mining rig
 * @param {string} rigName - Name of the rig to activate
 * @returns {Object} { success: boolean, message: string }
 */
function activateMiningRig(rigName) {
  const user = getUser();
  const availableRigs = EARNINGS_CONFIG.rigAccess[user.level] || [];
  
  if (!availableRigs.includes(rigName)) {
    return {
      success: false,
      message: 'You do not have access to this rig.'
    };
  }
  
  if (user.activeRigs.includes(rigName)) {
    return {
      success: false,
      message: 'This rig is already active.'
    };
  }
  
  const rig = EARNINGS_CONFIG.miningRigs[rigName];
  if (rig.cost > 0 && user.balance < rig.cost) {
    return {
      success: false,
      message: `Insufficient balance. Rig cost: $${rig.cost}`
    };
  }
  
  if (rig.cost > 0) {
    user.balance -= rig.cost;
  }
  
  user.activeRigs.push(rigName);
  saveUser(user);
  
  return {
    success: true,
    message: `${rigName} activated successfully!`
  };
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    EARNINGS_CONFIG,
    generateReferralCode,
    generateReferralLink,
    initializeNewUser,
    getUser,
    saveUser,
    claimDailyLoginBonus,
    calculateMiningEarningsPerClaim,
    claimMiningReward,
    completeTask,
    processReferralSignup,
    upgradeSubscription,
    checkWithdrawalEligibility,
    processWithdrawal,
    getSubscriptionDetails,
    getAvailableRigs,
    activateMiningRig
  };
}
