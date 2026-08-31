// Navbar active state management
function setActiveNav(currentPage) {
    // Map pages to their sidebar and top nav equivalents
    const navMap = {
        'dashboard.html': { sidebar: 'Dashboard', topnav: 'Dashboard' },
        'tasks.html': { sidebar: 'Tasks', topnav: 'Tasks' },
        'wallet.html': { sidebar: 'Wallet', topnav: 'Wallet' },
        'profile.html': { sidebar: 'Profile', topnav: 'Profile' },
        'settings.html': { sidebar: 'Settings', topnav: 'Dashboard' },
        'withdraw.html': { sidebar: 'Withdraw', topnav: 'Dashboard' },
        'aboutUs.html': { sidebar: 'Dashboard', topnav: 'About Us' },
        'notification.html': { sidebar: 'Dashboard', topnav: 'Dashboard' },
        'index.html': { sidebar: 'Dashboard', topnav: 'Dashboard' },
        'login.html': { sidebar: 'Dashboard', topnav: 'Dashboard' },
        'register.html': { sidebar: 'Dashboard', topnav: 'Dashboard' }
    };

    const pageConfig = navMap[currentPage] || { sidebar: 'Dashboard', topnav: 'Dashboard' };

    // Set sidebar active state
    const sidebarLinks = document.querySelectorAll('aside nav a');
    sidebarLinks.forEach(link => {
        link.classList.remove('nav-active');
        link.style.fontWeight = '';
        
        const text = link.textContent.trim();
        if (text === pageConfig.sidebar) {
            link.classList.add('nav-active');
            link.style.fontWeight = '500';
        }
    });

    // Set top nav active state
    const topNavLinks = document.querySelectorAll('header div.hidden.lg\\:flex a');
    topNavLinks.forEach(link => {
        link.classList.remove('top-nav-active');
        
        const text = link.textContent.trim();
        if (text === pageConfig.topnav) {
            link.classList.add('top-nav-active');
        }
    });
}

function getUserDisplayName(user) {
    return String(user?.name || 'User').trim() || 'User';
}

function getUserDisplayEmail(email) {
    const value = String(email || '').trim();
    if (!value) return 'No email';
    return value.length > 18 ? value.slice(0, 15) + '...' : value;
}

function getUserInitials(name) {
    const safeName = String(name || 'User').trim();
    if (!safeName) return 'U';
    const names = safeName.split(/\s+/).filter(Boolean);
    if (names.length === 1) return names[0].slice(0, 2).toUpperCase();
    return names.slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

// Update navbar with user data
function updateNavbarUserInfo() {
    try {
        const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
        if (!user) {
            return;
        }

        const displayName = getUserDisplayName(user);
        const displayEmail = getUserDisplayEmail(user.email);
        const initials = getUserInitials(displayName);

        const nameEls = document.querySelectorAll('[data-user-name]');
        nameEls.forEach(el => el.textContent = displayName);

        const emailEls = document.querySelectorAll('[data-user-email]');
        emailEls.forEach(el => el.textContent = displayEmail);

        const initialsEls = document.querySelectorAll('[data-user-initials]');
        initialsEls.forEach(el => el.textContent = initials);

        const nameEl = document.getElementById('navbar-user-name');
        const emailEl = document.getElementById('navbar-user-email');
        const initialsEl = document.getElementById('navbar-user-initials');
        const profileName = document.getElementById('profile-name');
        const fieldName = document.getElementById('field-name');
        const fieldEmail = document.getElementById('field-email');

        if (nameEl) nameEl.textContent = displayName;
        if (emailEl) emailEl.textContent = displayEmail;
        if (initialsEl) initialsEl.textContent = initials;
        if (profileName) profileName.textContent = displayName;
        if (fieldName) fieldName.value = displayName;
        if (fieldEmail) fieldEmail.value = user.email || '';
    } catch (error) {
        console.log('Error updating navbar user info:', error);
    }
}

// Sample notifications data
const SAMPLE_NOTIFICATIONS = [
    {
        id: 1,
        title: 'Welcome to ApexMine!',
        message: 'Your account has been successfully created. Start mining and earning rewards.',
        timestamp: 'Today at 10:30 AM',
        unread: true
    },
    {
        id: 2,
        title: 'Daily Bonus Available',
        message: 'Claim your daily bonus of 0.02 credits now!',
        timestamp: 'Today at 9:00 AM',
        unread: true
    },
    {
        id: 3,
        title: 'Mining Complete',
        message: 'Your Alpha Rig has completed mining. You earned 0.16 credits.',
        timestamp: 'Yesterday at 6:45 PM',
        unread: false
    },
    {
        id: 4,
        title: 'Referral Bonus',
        message: 'You earned 1.5 credits from a new referral!',
        timestamp: 'Yesterday at 2:15 PM',
        unread: false
    },
    {
        id: 5,
        title: 'Upgrade Available',
        message: 'Unlock Beta tier and access more earning opportunities.',
        timestamp: '3 days ago',
        unread: false
    }
];

// Load notifications from localStorage or use sample
function getNotifications() {
    const stored = localStorage.getItem('notifications');
    return stored ? JSON.parse(stored) : SAMPLE_NOTIFICATIONS;
}

// Populate notification dropdown
function populateNotifications() {
    const notificationsList = document.getElementById('notificationsList');
    if (!notificationsList) return;
    
    const notifications = getNotifications();
    
    if (notifications.length === 0) {
        notificationsList.innerHTML = '<div class="p-4 text-center text-gray-400 text-sm"><p>No notifications yet</p></div>';
        return;
    }
    
    notificationsList.innerHTML = notifications.map(notif => `
        <div class="notification-item ${notif.unread ? 'unread' : ''}">
            <div class="notification-item-title">${notif.title}</div>
            <div class="notification-item-message">${notif.message}</div>
            <div class="notification-item-time">${notif.timestamp}</div>
        </div>
    `).join('');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    setActiveNav(currentPage);
    populateNotifications();
    updateNavbarUserInfo();
    
    // Create icons with Lucide
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
});

// Toggle sidebar on mobile
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('hidden');
    }
}

// Notification dropdown functionality
function toggleNotificationDropdown() {
    const dropdown = document.getElementById('notificationDropdown');
    if (dropdown) {
        dropdown.classList.toggle('hidden');
    }
}

function closeNotificationDropdown() {
    const dropdown = document.getElementById('notificationDropdown');
    if (dropdown) {
        dropdown.classList.add('hidden');
    }
}

// Close notification dropdown when clicking outside
document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('notificationDropdown');
    const bell = document.getElementById('notificationBell');
    
    if (dropdown && bell && !dropdown.contains(event.target) && !bell.contains(event.target)) {
        dropdown.classList.add('hidden');
    }
});
