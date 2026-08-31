# ApexMine Earnings System - Developer API Reference

## Quick Start

### Include in Your Page
```html
<script src="js/earnings-system.js"></script>
<script src="js/common.js"></script>
```

### Get User Data
```javascript
const user = getUser();
console.log(user.balance, user.level, user.referralCode);
```

---

## Core API Functions

### User Management

#### `getUser() → Object`
Retrieves or creates the current user object.

**Returns:**
```javascript
{
  id: "user_1692624000000_abc123",
  username: "User_x5y8z",
  level: 0,                    // 0-5
  balance: 5.02,               // Current balance in USD
  totalEarned: 5.02,           // Lifetime earned
  totalWithdrawn: 0,           // Lifetime withdrawn
  referralCode: "A4X9K2BL",    // 8-character unique code
  referralLink: "https://...",  // Full referral URL
  referrals: 2,                // Total referred users
  qualifiedReferrals: 0,       // Referrals that subscribed
  createdAt: "2026-08-21T...", // ISO timestamp
  lastLoginBonus: null,        // Last bonus date
  welcomeBonusReceived: true,  // One-time welcome bonus
  minedToday: 0,               // Today's mining total
  tasksCompletedToday: 0,      // Tasks done today
  activeRigs: [],              // Active mining rigs
  totalMined: 0                // Lifetime mining total
}
```

**Usage:**
```javascript
const user = getUser();
if (user.level >= 1) {
  // Show mining options
}
```

---

#### `saveUser(user) → void`
Persists user data to localStorage.

**Parameters:**
- `user` (Object): User object to save

**Usage:**
```javascript
const user = getUser();
user.balance += 10;
saveUser(user); // Now persisted
```

---

#### `initializeNewUser() → Object`
Creates a new user with default values and $5 welcome bonus.

**Returns:** New user object

**Usage:**
```javascript
const newUser = initializeNewUser();
// User now has $5 in balance
// Has unique referral code
// Is at Level 0
```

---

### Earnings Functions

#### `claimMiningReward() → Object`
Claims the 6-hour mining reward (if available and Level 1+).

**Returns:**
```javascript
{
  success: boolean,
  amount: number,              // Amount earned (or 0 if failed)
  message: string              // User-friendly message
}
```

**Example Response:**
```javascript
// Success
{
  success: true,
  amount: 1.25,
  message: "Mining claim successful! +$1.25"
}

// Failure
{
  success: false,
  amount: 0,
  message: "Mining begins at Level 1. Upgrade your subscription to start mining."
}
```

**Usage:**
```javascript
const result = claimMiningReward();
if (result.success) {
  showToast(result.message);
  user = getUser(); // Refresh user
}
```

---

#### `claimDailyLoginBonus() → number`
Claims the daily login bonus (once per day, based on level).

**Returns:** Amount claimed (0 if already claimed today)

**Usage:**
```javascript
const bonus = claimDailyLoginBonus();
if (bonus > 0) {
  showToast(`Daily bonus claimed: +$${bonus.toFixed(2)}`);
}
```

---

#### `completeTask() → Object`
Completes a task and awards earnings (max 5 per day).

**Returns:**
```javascript
{
  success: boolean,
  amount: number,              // Task reward
  message: string              // User message
}
```

**Example Responses:**
```javascript
// Success
{
  success: true,
  amount: 0.16,
  message: "Task completed! +$0.16"
}

// Daily limit reached
{
  success: false,
  amount: 0,
  message: "You've completed all 5 daily tasks. Try again tomorrow!"
}
```

**Usage:**
```javascript
const result = completeTask();
if (result.success) {
  showToast(result.message);
} else {
  showToast(result.message); // Show why it failed
}
```

---

#### `calculateMiningEarningsPerClaim(level) → number`
Calculates the exact mining amount for a given subscription level.

**Parameters:**
- `level` (number): 0-5

**Returns:** Earnings per 6-hour claim in USD

**Example:**
```javascript
calculateMiningEarningsPerClaim(0)  // returns 0
calculateMiningEarningsPerClaim(1)  // returns 1.25
calculateMiningEarningsPerClaim(3)  // returns 3.00
calculateMiningEarningsPerClaim(5)  // returns 6.25
```

**Usage:**
```javascript
const user = getUser();
const perClaim = calculateMiningEarningsPerClaim(user.level);
// "Earn $X every 6 hours"
document.querySelector('.earning-rate').textContent = 
  `$${perClaim.toFixed(2)} per 6 hours`;
```

---

### Referral Functions

#### `generateReferralCode() → string`
Generates a unique 8-character referral code.

**Returns:** Code (e.g., "A4X9K2BL")

**Usage:**
```javascript
const code = generateReferralCode();
console.log(code); // "X7Z2M9P5"
```

---

#### `generateReferralLink(code) → string`
Generates a shareable referral link.

**Parameters:**
- `code` (string): Referral code

**Returns:** Full URL with referral parameter

**Usage:**
```javascript
const link = generateReferralLink("A4X9K2BL");
// "https://example.com/register.html?ref=A4X9K2BL"

// Share to user
document.getElementById('referral-link').value = link;
```

---

#### `processReferralSignup(referralCode) → Object`
Registers referral code when a new user signs up.

**Parameters:**
- `referralCode` (string): Code from referring user

**Returns:**
```javascript
{
  success: boolean,
  message: string
}
```

**Usage:**
```javascript
// On registration page
const params = new URLSearchParams(window.location.search);
const ref = params.get('ref');
if (ref) {
  processReferralSignup(ref);
  // When user subscribes, they'll earn referral bonus
}
```

---

### Subscription Functions

#### `getSubscriptionDetails() → Object`
Gets all details about the current subscription level.

**Returns:**
```javascript
{
  level: 0,                        // Current level
  planName: "Level 0",            // Display name
  cost: 0,                        // Cost to upgrade to next level
  taskEarnings: 0.01,             // Per-task amount
  referralEarnings: 0.50,         // Per-referral amount
  dailyLoginBonus: 0.02,          // Daily bonus
  expectedMonthlyRevenue: 0,      // Projected 30-day earnings
  withdrawalConditions: {
    minReferrals: 0,              // Required qualified referrals
    minBalance: 25,               // Minimum balance to withdraw
    enabled: false                // Can withdraw at this level
  },
  availableRigs: [],              // Available mining rigs
  miningAvailable: false          // Is mining unlocked
}
```

**Usage:**
```javascript
const details = getSubscriptionDetails();

// Show plan info
document.querySelector('.plan-name').textContent = details.planName;
document.querySelector('.task-earning').textContent = 
  `$${details.taskEarnings}/task`;

// Check if mining is available
if (!details.miningAvailable) {
  document.querySelector('.mining-section').style.display = 'none';
}
```

---

#### `upgradeSubscription(newLevel) → Object`
Upgrades user to a higher subscription level (deducts balance).

**Parameters:**
- `newLevel` (number): Target level (1-5)

**Returns:**
```javascript
{
  success: boolean,
  message: string
}
```

**Example:**
```javascript
// Success
{
  success: true,
  message: "Upgraded to Level 2! Your earnings potential has increased."
}

// Insufficient balance
{
  success: false,
  message: "Insufficient balance. Cost: $15, Your balance: $10.50"
}
```

**Usage:**
```javascript
const result = upgradeSubscription(2);
if (result.success) {
  showToast(result.message);
  // Refresh dashboard with new earnings
  location.reload(); // or update dynamically
} else {
  showToast(result.message);
}
```

---

### Withdrawal Functions

#### `checkWithdrawalEligibility() → Object`
Verifies if user can withdraw funds.

**Returns:**
```javascript
{
  canWithdraw: boolean,
  reason: string  // Explanation (always provided)
}
```

**Examples:**
```javascript
// Eligible
{
  canWithdraw: true,
  reason: "You are eligible to withdraw."
}

// Not eligible - low level
{
  canWithdraw: false,
  reason: "Withdrawal not available at Level 0. Upgrade to Level 1 or higher."
}

// Not eligible - low balance
{
  canWithdraw: false,
  reason: "Minimum balance required: $25. Current: $10.50"
}

// Not eligible - not enough referrals
{
  canWithdraw: false,
  reason: "Minimum qualified referrals: 3. Current: 1"
}
```

**Usage:**
```javascript
const eligible = checkWithdrawalEligibility();
const withdrawBtn = document.querySelector('[data-action="withdraw"]');

if (eligible.canWithdraw) {
  withdrawBtn.disabled = false;
  withdrawBtn.title = eligible.reason;
} else {
  withdrawBtn.disabled = true;
  withdrawBtn.title = eligible.reason;
}
```

---

#### `processWithdrawal(amount) → Object`
Processes a withdrawal request.

**Parameters:**
- `amount` (number): Amount to withdraw in USD

**Returns:**
```javascript
{
  success: boolean,
  message: string
}
```

**Examples:**
```javascript
// Success
{
  success: true,
  message: "Withdrawal of $50.00 processed successfully."
}

// Insufficient balance
{
  success: false,
  message: "Insufficient balance. Requested: $100, Available: $50.75"
}

// Not eligible
{
  success: false,
  message: "Minimum qualified referrals: 3. Current: 1"
}
```

**Usage:**
```javascript
const amount = parseFloat(document.querySelector('[data-amount]').value);
const result = processWithdrawal(amount);

if (result.success) {
  showToast(result.message);
  // Show withdrawal confirmation
  openWithdrawalModal();
} else {
  showToast(result.message);
}
```

---

### Mining Rig Functions

#### `getAvailableRigs() → Array`
Gets all mining rigs available for current level.

**Returns:** Array of rig objects
```javascript
[
  {
    name: "Alpha Rig",
    level: 1,
    cost: 0,
    efficiency: 1,
    dailyEarnings: 5,
    description: "Entry-level mining rig"
  },
  // ... more rigs
]
```

**Usage:**
```javascript
const rigs = getAvailableRigs();
rigs.forEach(rig => {
  const div = document.createElement('div');
  div.innerHTML = `
    <h3>${rig.name}</h3>
    <p>${rig.description}</p>
    <p>Cost: $${rig.cost}</p>
    <p>Daily Earnings: $${rig.dailyEarnings}</p>
  `;
  document.querySelector('.rig-list').appendChild(div);
});
```

---

#### `activateMiningRig(rigName) → Object`
Activates a mining rig for the user.

**Parameters:**
- `rigName` (string): Name of the rig

**Returns:**
```javascript
{
  success: boolean,
  message: string
}
```

**Examples:**
```javascript
// Success
{
  success: true,
  message: "Alpha Rig activated successfully!"
}

// No access
{
  success: false,
  message: "You do not have access to this rig."
}

// Insufficient funds
{
  success: false,
  message: "Insufficient balance. Rig cost: $35"
}
```

**Usage:**
```javascript
const result = activateMiningRig("Beta Rig");
if (result.success) {
  showToast(result.message);
  updateRigsList();
}
```

---

## Configuration Object

### `EARNINGS_CONFIG`
Global configuration object with all system parameters.

```javascript
EARNINGS_CONFIG = {
  // Daily login bonuses by level
  dailyLoginBonus: {
    0: 0.02, 1: 0.033, 2: 0.066, 3: 0.1667, 4: 0.25, 5: 0.3334
  },
  
  // Subscription costs
  subscriptionCost: {
    0: 0, 1: 10, 2: 15, 3: 25, 4: 35, 5: 50
  },
  
  // Task earnings
  taskEarnings: {
    0: 0.01, 1: 0.16, 2: 0.22, 3: 0.30, 4: 0.45, 5: 0.60
  },
  
  // Referral bonuses (only for subscribed referrals)
  referralEarnings: {
    0: 0.5, 1: 1, 2: 1.5, 3: 2, 4: 3, 5: 4
  },
  
  // Expected monthly revenue
  expectedMonthlyRevenue: {
    0: 0, 1: 25, 2: 35, 3: 50, 4: 75, 5: 100
  },
  
  // Withdrawal conditions
  withdrawalConditions: {
    0: { minReferrals: 0, minBalance: 25, enabled: false },
    1: { minReferrals: 3, minBalance: 25, enabled: true },
    // ... etc
  },
  
  // Other constants
  welcomeBonus: 5,
  dailyTasksCount: 5,
  minWithdrawal: 25,
  miningStartsAtLevel: 1
}
```

**Usage:**
```javascript
// Get any configuration value
const dailyBonus = EARNINGS_CONFIG.dailyLoginBonus[user.level];
const taskCost = EARNINGS_CONFIG.subscriptionCost[2];
const minRef = EARNINGS_CONFIG.withdrawalConditions[1].minReferrals;
```

---

## LocalStorage Keys

### `apexMineUser` (JSON Object)
Complete user object, persisted across sessions.

### `lastLoginBonusDate` (String)
Date string (YYYY-MM-DD) tracking daily login bonus.

### `tasksCompleted_YYYY-MM-DD` (String)
Integer count of tasks completed on specific date.

### `withdrawalHistory` (JSON Array)
Array of withdrawal records with timestamps.

### `referrerInfo` (JSON Object)
Referral code and signup info for new users.

---

## Example: Complete User Flow

```javascript
// Page load
document.addEventListener('DOMContentLoaded', () => {
  let user = getUser();
  
  // Display user info
  document.querySelector('.balance').textContent = 
    `$${user.balance.toFixed(2)}`;
  document.querySelector('.level').textContent = 
    `Level ${user.level}`;
  
  // Show referral info
  document.querySelector('.ref-code').textContent = user.referralCode;
  document.querySelector('.ref-link').value = user.referralLink;
  
  // Check for daily login bonus
  const bonus = claimDailyLoginBonus();
  if (bonus > 0) {
    showToast(`Daily bonus: +$${bonus.toFixed(2)}`);
  }
});

// Mining button click
document.querySelector('[data-action="mine"]').addEventListener('click', () => {
  const result = claimMiningReward();
  if (result.success) {
    user = getUser();
    showToast(result.message);
    document.querySelector('.balance').textContent = 
      `$${user.balance.toFixed(2)}`;
  }
});

// Upgrade button click
document.querySelector('[data-action="upgrade"]').addEventListener('click', () => {
  const result = upgradeSubscription(user.level + 1);
  if (result.success) {
    user = getUser();
    location.reload(); // Refresh to show new earnings
  }
});

// Withdraw button click
document.querySelector('[data-action="withdraw"]').addEventListener('click', () => {
  const eligible = checkWithdrawalEligibility();
  if (!eligible.canWithdraw) {
    showToast(eligible.reason);
    return;
  }
  
  const amount = prompt('Amount to withdraw:');
  if (amount) {
    const result = processWithdrawal(parseFloat(amount));
    showToast(result.message);
  }
});
```

---

## Error Handling

All functions that interact with system logic return status objects:

```javascript
// Standard response format
{
  success: boolean,     // Operation succeeded
  message: string,      // Human-readable message
  amount?: number       // Optional: amount involved
}
```

**Best Practice:**
```javascript
const result = someEarningsFunction();

if (result.success) {
  // Handle success
  showToast(result.message);
  refreshUI();
} else {
  // Handle failure
  showError(result.message);
  // Don't update UI
}
```

---

## Integration Checklist

- [ ] Include earnings-system.js before using functions
- [ ] Call getUser() to initialize/retrieve user
- [ ] Save user after any balance changes
- [ ] Display messages from function return values
- [ ] Refresh UI after successful operations
- [ ] Check eligibility before allowing actions
- [ ] Handle errors appropriately
- [ ] Test with localStorage cleared (new user)
- [ ] Test with existing user (reload page)

---

## Support & Documentation

- **Main Guide**: EARNINGS_SYSTEM_README.md
- **Deployment Info**: DEPLOYMENT_SUMMARY.md
- **Code Reference**: This document
- **Questions**: Check comments in earnings-system.js

---

**Last Updated**: August 21, 2026
**System Version**: 1.0.0
**Status**: Production Ready
