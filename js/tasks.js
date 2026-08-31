// Tasks page specific scripts (extracted from tasks.html)

// ENFORCE AUTHENTICATION FIRST - Must be before any other code
if (!enforceAuthentication()) {
  redirectToLogin();
  return;
}

refreshIcons();

const defaultTasks = [
  {id:1, platform:'tiktok', type:'watch', title:'Watch TikTok dance clip', desc:'Watch a 30-second dance video and keep it open for a moment.', reward:5, effort:'30s', status:'available', videoUrl:'https://www.tiktok.com/@tiktok/video/1234567890', accountUrl:'https://www.tiktok.com/@tiktok'},
  {id:2, platform:'youtube', type:'like', title:'Like YouTube tutorial', desc:'Like a short tech tutorial to support the creator.', reward:3, effort:'10s', status:'available', videoUrl:'https://www.youtube.com/watch?v=dQw4w9WgXcQ', accountUrl:'https://www.youtube.com/@youtube'},
  {id:3, platform:'instagram', type:'comment', title:'Comment on travel reel', desc:'Leave a genuine comment on a travel reel.', reward:8, effort:'1 min', status:'available', videoUrl:'https://www.instagram.com/reel/ABC123/', accountUrl:'https://www.instagram.com/travelgram/'},
  {id:4, platform:'tiktok', type:'follow', title:'Follow creator account', desc:'Follow @dancequeen and keep the profile active.', reward:10, effort:'15s', status:'available', videoUrl:'https://www.tiktok.com/@dancequeen/video/123', accountUrl:'https://www.tiktok.com/@dancequeen'},
  {id:5, platform:'youtube', type:'watch', title:'Watch product review', desc:'Watch a 45-second product review before finishing.', reward:6, effort:'45s', status:'available', videoUrl:'https://www.youtube.com/watch?v=JGwWNGJdvx8', accountUrl:'https://www.youtube.com/@reviewchannel'},
  {id:6, platform:'instagram', type:'like', title:'Like a fitness post', desc:'Like a fresh workout post and move on.', reward:4, effort:'10s', status:'available', videoUrl:'https://www.instagram.com/p/fitness123/', accountUrl:'https://www.instagram.com/fitnesshub/'},
  {id:7, platform:'tiktok', type:'comment', title:'Reply on cooking tutorial', desc:'Leave a helpful comment on a cooking tutorial.', reward:9, effort:'1 min', status:'in-progress', videoUrl:'https://www.tiktok.com/@cook/video/9876543210', accountUrl:'https://www.tiktok.com/@cook'},
  {id:8, platform:'instagram', type:'follow', title:'Follow fitness page', desc:'Follow a health and wellness account for a quick win.', reward:12, effort:'15s', status:'claimable', videoUrl:'https://www.instagram.com/reel/fit1/', accountUrl:'https://www.instagram.com/fitnesshub/'},
  {id:9, platform:'youtube', type:'watch', title:'Watch YouTube short', desc:'Watch a 60-second cooking short and enjoy it.', reward:5, effort:'1 min', status:'completed', videoUrl:'https://www.youtube.com/watch?v=aqz-KE-bpKQ', accountUrl:'https://www.youtube.com/@foodnetwork'},
  {id:10, platform:'instagram', type:'like', title:'Like fashion photo', desc:'Like a recent fashion photo post from a creator.', reward:3, effort:'10s', status:'completed', videoUrl:'https://www.instagram.com/p/fashion456/', accountUrl:'https://www.instagram.com/fashiondaily/'},
  {id:11, platform:'youtube', type:'follow', title:'Subscribe to gaming channel', desc:'Subscribe to a gaming creator for a bigger reward.', reward:12, effort:'20s', status:'locked', lockReason:'Complete 3 tasks first', videoUrl:'https://www.youtube.com/watch?v=abc123', accountUrl:'https://www.youtube.com/@gamingchannel'},
  {id:12, platform:'tiktok', type:'comment', title:'Comment on music clip', desc:'Comment on a trending music clip with a short reply.', reward:8, effort:'1 min', status:'locked', lockReason:'Reach level 2', videoUrl:'https://www.tiktok.com/@music/video/1112223334', accountUrl:'https://www.tiktok.com/@music'},
  {id:13, platform:'instagram', type:'watch', title:'Watch reel story', desc:'Watch a short reel to finish the task cycle.', reward:5, effort:'30s', status:'available', videoUrl:'https://www.instagram.com/reel/story789/', accountUrl:'https://www.instagram.com/storypage/'},
  {id:14, platform:'youtube', type:'comment', title:'Comment on DIY video', desc:'Share a quick thoughtful comment on a DIY video.', reward:7, effort:'1 min', status:'available', videoUrl:'https://www.youtube.com/watch?v=ScMzIvxBSi4', accountUrl:'https://www.youtube.com/@diychannel'}
];

let tasks = [];
let currentPlatform = 'all';
let currentType = 'all';
let completedCount = 0;

async function fetchTasksFromServer() {
  try {
    const response = await fetch('http://localhost:3000/api/tasks', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) return null;
    const result = await response.json();
    const incoming = Array.isArray(result.data) ? result.data : null;
    if (!incoming || !incoming.length) return null;
    tasks = incoming;
    localStorage.setItem('dashboardTasks', JSON.stringify(tasks));
    return tasks;
  } catch (error) {
    return null;
  }
}

async function loadTasks() {
  try {
    const stored = JSON.parse(localStorage.getItem('dashboardTasks'));
    if (Array.isArray(stored) && stored.length) return stored;
  } catch (e) {}

  const fromServer = await fetchTasksFromServer();
  if (Array.isArray(fromServer) && fromServer.length) return fromServer;

  localStorage.setItem('dashboardTasks', JSON.stringify(defaultTasks));
  return defaultTasks;
}

function saveTasks() {
  localStorage.setItem('dashboardTasks', JSON.stringify(tasks));
  window.dispatchEvent(new CustomEvent('task-data-updated', { detail: tasks }));
  fetch('http://localhost:3000/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tasks })
  }).catch(() => {});
}

function applyIncomingTasks(incoming) {
  if (!Array.isArray(incoming) || !incoming.length) return;
  tasks = incoming;
  localStorage.setItem('dashboardTasks', JSON.stringify(tasks));
  showToast('✨ Tasks updated from admin');
  filterTasks();
  syncSummaryStats();
}

window.addEventListener('task-data-updated', (event) => {
  const incoming = Array.isArray(event.detail) ? event.detail : JSON.parse(localStorage.getItem('dashboardTasks') || '[]');
  applyIncomingTasks(incoming);
});

window.addEventListener('storage', (event) => {
  if (event.key === 'dashboardTasks' && event.newValue) {
    try {
      applyIncomingTasks(JSON.parse(event.newValue));
    } catch (error) {
      console.log('Task storage sync failed:', error);
    }
  }
});

async function pollForTaskUpdates() {
  try {
    const response = await fetch('http://localhost:3000/api/tasks', { headers: { 'Content-Type': 'application/json' } });
    if (!response.ok) return;
    const result = await response.json();
    const incoming = Array.isArray(result.data) ? result.data : [];
    if (incoming.length && JSON.stringify(incoming) !== JSON.stringify(tasks)) {
      applyIncomingTasks(incoming);
    }
  } catch (e) {
    console.log('Task polling unavailable');
  }
}

setInterval(pollForTaskUpdates, 30000);

async function initializeTasksPage() {
  tasks = await loadTasks();
  filterTasks();
  syncSummaryStats();
}

function syncSummaryStats() {
  const user = getUser();
  const balanceDisplay = document.getElementById('balance-display');
  if (balanceDisplay) balanceDisplay.textContent = '$' + user.balance.toFixed(2);

  const today = new Date().toDateString();
  const tasksCompletedKey = `tasksCompleted_${today}`;
  completedCount = parseInt(localStorage.getItem(tasksCompletedKey) || '0');
  
  const completedEl = document.getElementById('completed-today');
  if (completedEl) completedEl.textContent = completedCount + ' / 5';

  const availableEl = document.getElementById('available-earn');
  if (availableEl) {
    const subscription = getSubscriptionDetails();
initializeTasksPage();

    const maxTasks = 5 - completedCount;
    const availableReward = maxTasks * subscription.taskEarnings;
    availableEl.textContent = '$' + availableReward.toFixed(2);
  }
}

function setPlatform(p) {
  currentPlatform = p;
  document.querySelectorAll('.platform-btn').forEach(b => {
    b.classList.toggle('filter-active', b.dataset.platform === p);
    b.classList.toggle('text-gray-400', b.dataset.platform !== p);
  });
  filterTasks();
}

function setType(t) {
  currentType = t;
  document.querySelectorAll('.type-btn').forEach(b => {
    b.classList.toggle('filter-active', b.dataset.type === t);
    b.classList.toggle('text-gray-400', b.dataset.type !== t);
  });
  filterTasks();
}

function filterTasks() {
  const qEl = document.getElementById('search-input');
  const q = qEl ? qEl.value.toLowerCase() : '';
  const grid = document.getElementById('task-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const filtered = tasks.filter(t => {
    if (currentPlatform !== 'all' && t.platform !== currentPlatform) return false;
    if (currentType !== 'all' && t.type !== currentType) return false;
    if (q && !t.title.toLowerCase().includes(q) && !t.desc.toLowerCase().includes(q)) return false;
    return true;
  });
  filtered.forEach((t, i) => {
    const card = document.createElement('div');
    card.className = 'border border-[#1e293b] rounded-xl p-4 bg-[#111827] card-enter';
    card.style.animationDelay = (i * 50) + 'ms';
    card.dataset.taskId = t.id;
    const colors = {tiktok:'#22d3ee', youtube:'#f87171', instagram:'#e879f9'};
    const statusHTML = getStatusHTML(t);
    const videoLink = t.videoUrl && /^https?:\/\//i.test(t.videoUrl)
      ? '<a href="' + t.videoUrl + '" target="_blank" rel="noopener noreferrer" class="inline-flex items-center text-xs text-cyan-300 hover:text-cyan-200 underline mb-2">Open video URL</a>'
      : '<span class="inline-flex items-center text-xs text-gray-500 mb-2">No video URL</span>';
    const accountLink = t.accountUrl && /^https?:\/\//i.test(t.accountUrl)
      ? '<a href="' + t.accountUrl + '" target="_blank" rel="noopener noreferrer" class="inline-flex items-center text-xs text-violet-300 hover:text-violet-200 underline mb-3">Open account URL</a>'
      : '<span class="inline-flex items-center text-xs text-gray-500 mb-3">No account URL</span>';
    const progressBar = t.status === 'in-progress'
      ? '<div class="mt-2 h-1.5 rounded-full bg-[#1e293b] overflow-hidden"><div class="progress-bar h-full bg-[#a3e635] rounded-full" style="width:60%"></div></div>'
      : '';

    card.innerHTML = [
      '<div class="flex items-center justify-between mb-2">',
      '<span class="px-2 py-0.5 text-xs rounded-full font-medium" style="background:' + colors[t.platform] + '20;color:' + colors[t.platform] + '">' + t.platform + '</span>',
      '<span class="text-xs text-gray-500">' + t.effort + '</span>',
      '</div>',
      '<h4 class="text-sm font-semibold text-white mb-1">' + t.title + '</h4>',
      '<p class="text-xs text-gray-400 mb-2">' + t.desc + '</p>',
      videoLink,
      accountLink,
      '<div class="flex items-center justify-between">',
      '<span class="text-sm font-bold text-[#facc15]">+' + t.reward + '¢</span>',
      '<div class="task-action">' + statusHTML + '</div>',
      '</div>',
      progressBar
    ].join('');
    grid.appendChild(card);
  });
  refreshIcons();
}

function getStatusHTML(t) {
  const hasVideoUrl = Boolean(t.videoUrl && /^https?:\/\//i.test(t.videoUrl));

  if (t.status === 'available') {
    return hasVideoUrl
      ? `<button onclick="startTask(${t.id})" class="px-3 py-1.5 text-xs rounded-lg bg-[#a3e635] text-[#0a0f1a] font-bold hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-lime-400">Start task</button>`
      : `<span class="px-3 py-1.5 text-xs rounded-lg bg-gray-800 text-gray-500 font-medium">Link needed</span>`;
  }
  if (t.status === 'in-progress') {
    return hasVideoUrl
      ? `<button onclick="completeTask(${t.id})" class="px-3 py-1.5 text-xs rounded-lg bg-[#22d3ee] text-[#0a0f1a] font-bold hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-cyan-400">Complete</button>`
      : `<span class="px-3 py-1.5 text-xs rounded-lg bg-gray-800 text-gray-500 font-medium">Link needed</span>`;
  }
  if (t.status === 'claimable') return `<button onclick="claimReward(${t.id})" class="px-3 py-1.5 text-xs rounded-lg bg-[#facc15] text-[#0a0f1a] font-bold hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-yellow-400">Claim reward</button>`;
  if (t.status === 'completed') return `<span class="px-3 py-1.5 text-xs rounded-lg bg-emerald-900/50 text-emerald-400 font-medium">✓ Done</span>`;
  if (t.status === 'locked') return `<span class="px-3 py-1.5 text-xs rounded-lg bg-gray-800 text-gray-500 font-medium" title="${t.lockReason||''}">🔒 Locked</span>`;
  return '';
}

function startTask(id) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  if (!t.videoUrl || !/^https?:\/\//i.test(t.videoUrl)) {
    showToast('Add a valid video URL before starting this task.');
    return;
  }
  t.status = 'in-progress'; saveTasks(); filterTasks();
}

function completeTask(id) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  if (!t.videoUrl || !/^https?:\/\//i.test(t.videoUrl)) {
    showToast('This task cannot be completed without a valid video URL.');
    return;
  }
  t.status = 'claimable'; saveTasks(); filterTasks();
}

function claimReward(id) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  
  // Use the earnings system to process the task completion
  // Use the earnings system helper to award task earnings (avoids name collision)
  const result = (typeof awardTaskForUser === 'function') ? awardTaskForUser() : { success: false, amount: 0, message: 'Earnings system unavailable' };
  
  if (!result.success) {
    showToast(result.message);
    return;
  }
  
  // Mark task as completed
  t.status = 'completed';
  saveTasks();
  filterTasks();
  
  // Update display
  syncSummaryStats();
  
  // Show success message with actual earning amount
  showToast(`Task completed! +$${result.amount.toFixed(2)}`);
}

function toggleProfileMenu() {
  const el = document.getElementById('profile-menu');
  if (el) el.classList.toggle('hidden');
}

document.addEventListener('click', e => {
  if (!e.target.closest('#profile-btn') && !e.target.closest('#profile-menu')) {
    const pm = document.getElementById('profile-menu');
    if (pm) pm.classList.add('hidden');
  }
});

// Initialize
document.addEventListener('DOMContentLoaded', function() {
  syncSummaryStats();
  filterTasks();
});
