const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// In-memory user storage (would be database in production)
let usersDatabase = [
  {
    id: 1,
    name: 'Terraim Wilson',
    email: 'terraim@mail.co',
    password: 'password123', // In production, use bcrypt
    level: 0,
    balance: 0,
    totalEarnings: 0,
    referralCode: 'APX-7F8A',
    qualifiedReferrals: 0,
    referrals: [],
    dailyBonusClaimed: false,
    welcomeBonusClaimed: true,
    lastLoginDate: null,
    lastMiningClaimAt: null,
    tasksCompletedToday: 0,
    lastDailyBonusClaimAt: null,
    createdAt: new Date(),
    transactionHistory: []
  }
];

let authTokens = {}; // Simple token storage

function buildUserSnapshot(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    level: user.level,
    balance: Number(user.balance || 0),
    totalEarnings: Number(user.totalEarnings || 0),
    referralCode: user.referralCode,
    qualifiedReferrals: user.qualifiedReferrals || 0,
    referrals: Array.isArray(user.referrals) ? user.referrals : [],
    dailyBonusClaimed: Boolean(user.dailyBonusClaimed),
    welcomeBonusClaimed: Boolean(user.welcomeBonusClaimed),
    lastLoginDate: user.lastLoginDate,
    lastMiningClaimAt: user.lastMiningClaimAt,
    tasksCompletedToday: user.tasksCompletedToday || 0,
    lastDailyBonusClaimAt: user.lastDailyBonusClaimAt,
    transactionHistory: Array.isArray(user.transactionHistory) ? user.transactionHistory : []
  };
}

function appendTransactionEntry(user, transaction) {
  const safeHistory = Array.isArray(user.transactionHistory) ? user.transactionHistory : [];
  const entry = {
    id: transaction.id || `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    type: transaction.type || 'earning',
    label: transaction.label || 'Transaction',
    amount: Number(transaction.amount || 0),
    description: transaction.description || transaction.label || 'Transaction',
    date: transaction.date || new Date().toISOString(),
    status: transaction.status || 'Completed'
  };
  user.transactionHistory = [entry, ...safeHistory];
  return entry;
}

function createNewUser({ name, email, password, id }) {
  const nextUser = {
    id: id || usersDatabase.length + 1,
    name,
    email,
    password,
    level: 0,
    balance: 0,
    totalEarnings: 0,
    referralCode: 'APX-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
    qualifiedReferrals: 0,
    referrals: [],
    dailyBonusClaimed: false,
    welcomeBonusClaimed: false,
    lastLoginDate: new Date().toISOString(),
    lastMiningClaimAt: null,
    tasksCompletedToday: 0,
    lastDailyBonusClaimAt: null,
    createdAt: new Date(),
    transactionHistory: []
  };

  return nextUser;
}

function applyWelcomeBonus(user) {
  const nextUser = {
    ...user,
    balance: Number(user.balance || 0),
    totalEarnings: Number(user.totalEarnings || 0),
    transactionHistory: Array.isArray(user.transactionHistory) ? [...user.transactionHistory] : []
  };

  if (nextUser.welcomeBonusClaimed) {
    return { user: nextUser, bonusAmount: 0, bonusApplied: false };
  }

  const bonusAmount = 5;
  nextUser.balance += bonusAmount;
  nextUser.totalEarnings += bonusAmount;
  nextUser.welcomeBonusClaimed = true;

  const entry = appendTransactionEntry(nextUser, {
    type: 'bonus',
    label: 'Welcome bonus',
    amount: bonusAmount,
    description: 'Welcome bonus claimed',
    date: new Date().toISOString(),
    status: 'Completed'
  });

  return { user: nextUser, bonusAmount, bonusApplied: true, transaction: entry };
}

// Helper to generate token
function generateToken() {
  return 'token_' + Math.random().toString(36).substr(2, 9) + Date.now();
}

// Authentication endpoints
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;
    
    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({ success: false, error: 'All fields are required' });
    }
    
    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, error: 'Passwords do not match' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }
    
    const existingUser = usersDatabase.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Email already registered' });
    }
    
    let newUser = createNewUser({
      id: usersDatabase.length + 1,
      name,
      email,
      password
    });

    const signupBonusResult = applyWelcomeBonus(newUser);
    newUser = signupBonusResult.user;
    
    usersDatabase.push(newUser);
    
    const token = generateToken();
    authTokens[token] = newUser.id;
    
    res.json({
      success: true,
      message: 'Account created successfully',
      token,
      user: buildUserSnapshot(newUser)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }
    
    const user = usersDatabase.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }
    
    if (user.password !== password) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }
    
    const token = generateToken();
    authTokens[token] = user.id;
    
    user.lastLoginDate = new Date();
    
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: buildUserSnapshot(user)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/auth/profile', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token || !authTokens[token]) {
      return res.status(401).json({ success: false, error: 'Unauthorized - no valid token' });
    }
    
    const userId = authTokens[token];
    const user = usersDatabase.find(u => u.id === userId);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    res.json({
      success: true,
      user: buildUserSnapshot(user)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/auth/profile', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token || !authTokens[token]) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    
    const userId = authTokens[token];
    const userIndex = usersDatabase.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const updates = req.body;
    Object.assign(usersDatabase[userIndex], updates);
    if (!Array.isArray(usersDatabase[userIndex].transactionHistory)) {
      usersDatabase[userIndex].transactionHistory = [];
    }
    
    res.json({
      success: true,
      user: buildUserSnapshot(usersDatabase[userIndex])
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/auth/claim-welcome-bonus', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token || !authTokens[token]) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const userId = authTokens[token];
    const userIndex = usersDatabase.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const result = applyWelcomeBonus(usersDatabase[userIndex]);
    usersDatabase[userIndex] = result.user;

    if (!result.bonusApplied) {
      return res.status(400).json({ success: false, error: 'Welcome bonus already claimed' });
    }

    res.json({
      success: true,
      message: 'Welcome bonus claimed',
      bonusAmount: result.bonusAmount,
      user: buildUserSnapshot(usersDatabase[userIndex])
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Daily login bonus endpoint
const DAILY_BONUS_CONFIG = {
  0: 0.02,
  1: 0.033,
  2: 0.066,
  3: 0.1667,
  4: 0.25,
  5: 0.3334
};

app.post('/api/auth/claim-daily-bonus', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token || !authTokens[token]) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    
    const userId = authTokens[token];
    const userIndex = usersDatabase.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const user = usersDatabase[userIndex];
    const lastClaimTime = user.lastDailyBonusClaimAt ? new Date(user.lastDailyBonusClaimAt).getTime() : 0;
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    
    // Check if 24 hours have passed
    if (lastClaimTime && (now - lastClaimTime) < oneDayMs) {
      const timeUntilNextBonus = oneDayMs - (now - lastClaimTime);
      return res.status(400).json({ 
        success: false, 
        error: 'Daily bonus already claimed',
        timeUntilNextBonus 
      });
    }
    
    // Calculate bonus based on level
    const level = user.level || 0;
    const bonusAmount = DAILY_BONUS_CONFIG[level] || 0.02;
    
    // Update user
    usersDatabase[userIndex].balance = Number(user.balance || 0) + bonusAmount;
    usersDatabase[userIndex].totalEarnings = Number(user.totalEarnings || 0) + bonusAmount;
    usersDatabase[userIndex].lastDailyBonusClaimAt = new Date().toISOString();
    usersDatabase[userIndex].lastLoginDate = new Date().toISOString();
    
    res.json({
      success: true,
      message: `Daily bonus of $${bonusAmount.toFixed(4)} claimed!`,
      bonusAmount: bonusAmount,
      user: {
        id: usersDatabase[userIndex].id,
        balance: usersDatabase[userIndex].balance,
        totalEarnings: usersDatabase[userIndex].totalEarnings,
        lastDailyBonusClaimAt: usersDatabase[userIndex].lastDailyBonusClaimAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// In-memory rig storage (would be database in production)
const defaultRigsData = [
  { id: 1, name: 'Alpha Rig', subscription: 10, daily: 0.75, cycle: 100, total: 75, levelRequired: 1 },
  { id: 2, name: 'Alpha Rig Pro', subscription: 15, daily: 1, cycle: 100, total: 100, levelRequired: 2 },
  { id: 3, name: 'Beta Rig', subscription: 25, daily: 1.3, cycle: 90, total: 125, levelRequired: 2 },
  { id: 4, name: 'Beta Rig Pro', subscription: 30, daily: 1.67, cycle: 90, total: 150, levelRequired: 3 },
  { id: 5, name: 'Gamma Rig', subscription: 50, daily: 5, cycle: 60, total: 300, levelRequired: 3 },
  { id: 6, name: 'Gamma Rig Pro', subscription: 75, daily: 8.33, cycle: 60, total: 500, levelRequired: 4 },
  { id: 7, name: 'Delta Rig', subscription: 100, daily: 16.67, cycle: 45, total: 750, levelRequired: 5 },
  { id: 8, name: 'Delta Rig Pro', subscription: 150, daily: 22.22, cycle: 45, total: 1000, levelRequired: 5 }
];

let rigsData = JSON.parse(JSON.stringify(defaultRigsData));

const defaultWithdrawalSettings = {
  enabled: true,
  minimumWithdrawal: 10,
  dailyLimit: 1000,
  processingWindowHours: 24,
  scheduleByLevel: {
    1: { enabled: true, frequency: 'weekly', day: 'Monday', time: '09:00' },
    2: { enabled: true, frequency: 'weekly', day: 'Tuesday', time: '09:00' },
    3: { enabled: true, frequency: 'weekly', day: 'Wednesday', time: '09:00' },
    4: { enabled: true, frequency: 'weekly', day: 'Thursday', time: '09:00' },
    5: { enabled: true, frequency: 'weekly', day: 'Friday', time: '09:00' }
  }
};

let withdrawalSettingsData = JSON.parse(JSON.stringify(defaultWithdrawalSettings));

const defaultTasksData = [
  {id:1, platform:'tiktok', type:'watch', title:'Watch TikTok dance clip', desc:'Watch a 30-second dance video and keep it open for a moment.', reward:5, effort:'30s', status:'available'},
  {id:2, platform:'youtube', type:'like', title:'Like YouTube tutorial', desc:'Like a short tech tutorial to support the creator.', reward:3, effort:'10s', status:'available'},
  {id:3, platform:'instagram', type:'comment', title:'Comment on travel reel', desc:'Leave a genuine comment on a travel reel.', reward:8, effort:'1 min', status:'available'},
  {id:4, platform:'tiktok', type:'follow', title:'Follow creator account', desc:'Follow @dancequeen and keep the profile active.', reward:10, effort:'15s', status:'available'},
  {id:5, platform:'youtube', type:'watch', title:'Watch product review', desc:'Watch a 45-second product review before finishing.', reward:6, effort:'45s', status:'available'},
  {id:6, platform:'instagram', type:'like', title:'Like a fitness post', desc:'Like a fresh workout post and move on.', reward:4, effort:'10s', status:'available'},
  {id:7, platform:'tiktok', type:'comment', title:'Reply on cooking tutorial', desc:'Leave a helpful comment on a cooking tutorial.', reward:9, effort:'1 min', status:'in-progress'},
  {id:8, platform:'instagram', type:'follow', title:'Follow fitness page', desc:'Follow a health and wellness account for a quick win.', reward:12, effort:'15s', status:'claimable'},
  {id:9, platform:'youtube', type:'watch', title:'Watch YouTube short', desc:'Watch a 60-second cooking short and enjoy it.', reward:5, effort:'1 min', status:'completed'},
  {id:10, platform:'instagram', type:'like', title:'Like fashion photo', desc:'Like a recent fashion photo post from a creator.', reward:3, effort:'10s', status:'completed'},
  {id:11, platform:'youtube', type:'follow', title:'Subscribe to gaming channel', desc:'Subscribe to a gaming creator for a bigger reward.', reward:12, effort:'20s', status:'locked', lockReason:'Complete 3 tasks first'},
  {id:12, platform:'tiktok', type:'comment', title:'Comment on music clip', desc:'Comment on a trending music clip with a short reply.', reward:8, effort:'1 min', status:'locked', lockReason:'Reach level 2'},
  {id:13, platform:'instagram', type:'watch', title:'Watch reel story', desc:'Watch a short reel to finish the task cycle.', reward:5, effort:'30s', status:'available'},
  {id:14, platform:'youtube', type:'comment', title:'Comment on DIY video', desc:'Share a quick thoughtful comment on a DIY video.', reward:7, effort:'1 min', status:'available'}
];

let tasksData = JSON.parse(JSON.stringify(defaultTasksData));

// Polling endpoint - returns current rig data
app.get('/api/rigs', (req, res) => {
  res.json({
    success: true,
    data: rigsData,
    timestamp: new Date().toISOString()
  });
});

// Update rigs endpoint (for admin panel)
app.post('/api/rigs', (req, res) => {
  try {
    const { rigs } = req.body;
    if (!Array.isArray(rigs)) {
      return res.status(400).json({ success: false, error: 'rigs must be an array' });
    }
    rigsData = rigs;
    res.json({ success: true, message: 'Rigs updated', data: rigsData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/tasks', (req, res) => {
  res.json({
    success: true,
    data: tasksData,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/withdrawal-settings', (req, res) => {
  res.json({
    success: true,
    data: withdrawalSettingsData,
    timestamp: new Date().toISOString()
  });
});

app.post('/api/withdrawal-settings', (req, res) => {
  try {
    const settings = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ success: false, error: 'settings must be an object' });
    }

    withdrawalSettingsData = {
      ...defaultWithdrawalSettings,
      ...settings,
      scheduleByLevel: {
        ...defaultWithdrawalSettings.scheduleByLevel,
        ...(settings.scheduleByLevel || {})
      }
    };

    res.json({ success: true, message: 'Withdrawal settings updated', data: withdrawalSettingsData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = {
  app,
  usersDatabase,
  buildUserSnapshot,
  createNewUser,
  applyWelcomeBonus,
  appendTransactionEntry
};

app.post('/api/tasks', (req, res) => {
  try {
    const { tasks } = req.body;
    if (!Array.isArray(tasks)) {
      return res.status(400).json({ success: false, error: 'tasks must be an array' });
    }
    tasksData = tasks;
    res.json({ success: true, message: 'Tasks updated', data: tasksData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`ApexMine server running on http://localhost:${PORT}`);
  });
}
