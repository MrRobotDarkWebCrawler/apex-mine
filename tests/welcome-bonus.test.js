const assert = require('node:assert/strict');

const serverModule = require('../backend/server.js');

const { createNewUser, applyWelcomeBonus } = serverModule;

assert.ok(createNewUser, 'createNewUser helper is required');

const freshUser = createNewUser({ name: 'Jane Doe', email: 'jane@example.com', password: 'pass123' });
assert.equal(freshUser.balance, 0, 'New users should start with a $0 balance');
assert.equal(freshUser.totalEarnings, 0, 'New users should start with $0 total earnings');
assert.deepEqual(freshUser.transactionHistory, [], 'New users should start with an empty transaction history');
assert.equal(freshUser.welcomeBonusClaimed, false, 'Welcome bonus should be unclaimed by default');

const claimed = applyWelcomeBonus({ ...freshUser, balance: 0, totalEarnings: 0, transactionHistory: [] });
assert.equal(claimed.user.balance, 5, 'Claiming the welcome bonus should add $5');
assert.equal(claimed.user.totalEarnings, 5, 'Claiming the welcome bonus should add $5 to total earnings');
assert.equal(claimed.user.welcomeBonusClaimed, true, 'Welcome bonus should be marked as claimed');
assert.equal(claimed.user.transactionHistory.length, 1, 'A bonus transaction should be recorded');
assert.equal(claimed.user.transactionHistory[0].amount, 5, 'The recorded transaction should be $5');

console.log('welcome-bonus tests passed');
