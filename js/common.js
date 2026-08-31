// Common utilities for all pages

// Authentication guard - redirects to login if not authenticated
function enforceAuthentication() {
  try {
    const token = localStorage.getItem('authToken');
    const currentUser = localStorage.getItem('currentUser');
    
    // Check if both token and user data exist
    if (!token || !currentUser) {
      console.log('Authentication required - redirecting to login');
      redirectToLogin();
      return false;
    }
    
    // Verify user data is valid
    const user = JSON.parse(currentUser);
    if (!user || !user.email || !user.id) {
      console.log('Invalid user data - redirecting to login');
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUser');
      redirectToLogin();
      return false;
    }
    
    return true;
  } catch (error) {
    console.log('Authentication check failed:', error);
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    redirectToLogin();
    return false;
  }
}

// Redirect helper that preserves return URL
function getLoginRedirectTarget(nextUrl) {
  const fallbackTarget = '/dashboard.html';
  const currentPath = window.location.pathname + window.location.search;
  const next = nextUrl || currentPath;

  if (!next || next === 'login.html' || next === '/login.html') {
    return fallbackTarget;
  }

  if (/^https?:\/\//i.test(next)) {
    return fallbackTarget;
  }

  return next;
}

function redirectToLogin(nextUrl) {
  try {
    const next = getLoginRedirectTarget(nextUrl);
    const dest = 'login.html?next=' + encodeURIComponent(next);
    window.location.href = dest;
  } catch (e) {
    window.location.href = 'login.html?next=' + encodeURIComponent('/dashboard.html');
  }
}

// Logout function
function logout() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');
  window.location.href = 'login.html';
}

// Create lucide icons if available
if (typeof lucide !== 'undefined') {
  lucide.createIcons();
}

// Toast helper
function showToast(msg) {
  return;
}

// Toggle sidebar (used by header buttons)
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  // Mirror original behavior in some pages: toggle visibility and positioning classes
  sidebar.classList.toggle('hidden');
  sidebar.classList.toggle('fixed');
  sidebar.classList.toggle('inset-y-0');
  sidebar.classList.toggle('left-0');
  sidebar.classList.toggle('z-30');
  sidebar.classList.toggle('flex');
}

// Small helper to safely call lucide.createIcons later
function refreshIcons() {
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Polling for rig updates (30-second interval)
const RIG_POLL_INTERVAL = 30000; // 30 seconds
let cachedRigsHash = null;

function hashRigs(rigs) {
  return JSON.stringify(rigs);
}

async function pollForRigUpdates() {
  try {
    const response = await fetch('http://localhost:3000/api/rigs', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) return; // Silent fail, will retry in 30s
    
    const result = await response.json();
    const newRigs = result.data;
    const newHash = hashRigs(newRigs);
    
    if (cachedRigsHash !== newHash) {
      // Rigs have been updated by admin
      cachedRigsHash = newHash;
      localStorage.setItem('dashboardRigs', JSON.stringify(newRigs));
      showToast('✨ Mining rigs updated! Check the Upgrade Mining Rig panel');
      
      // Refresh modal if it's currently visible
      const modal = document.getElementById('rig-modal');
      if (modal && !modal.classList.contains('hidden')) {
        if (typeof renderRigModal === 'function') {
          renderRigModal();
        }
      }
    }
  } catch (error) {
    // Polling will retry silently in 30s if server unavailable
    console.log('Rig polling unavailable (server offline)');
  }
}

// Start polling when page loads
document.addEventListener('DOMContentLoaded', function() {
  // Enforce authentication for protected pages (login/register/index/about/sample are public)
  try {
    const publicPages = ['login.html', 'index.html', 'sample_regPage.html', 'sample.html', 'aboutUs.html', 'register.html'];
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    if (!publicPages.includes(currentPage)) {
      enforceAuthentication();
      // If enforceAuthentication redirected, further JS will stop executing in this page.
    }
  } catch (e) {
    console.log('Auth enforcement check failed:', e);
  }

  // Initial poll
  pollForRigUpdates();
  // Then poll every 30 seconds
  setInterval(pollForRigUpdates, RIG_POLL_INTERVAL);
});
