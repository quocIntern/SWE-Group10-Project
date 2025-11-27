// Selectors
let adminEmailElement;
let logoutButton;
let navLinks;
let sections;
let searchInput;
let userTableBody;

// Stats Elements
let statPatients;
let statDoctors;
let statAppointments;
let statMessages;

document.addEventListener('DOMContentLoaded', () => {
    adminEmailElement = document.getElementById('admin-email');
    logoutButton = document.getElementById('logout-button');
    navLinks = document.querySelectorAll('.nav-link');
    sections = document.querySelectorAll('.section');
    searchInput = document.getElementById('search-users');
    userTableBody = document.getElementById('user-table-body');

    statPatients = document.getElementById('stat-patients');
    statDoctors = document.getElementById('stat-doctors');
    statAppointments = document.getElementById('stat-appointments');
    statMessages = document.getElementById('stat-messages');

    setupNavigation();
    setupLogout();
    populateAdminDetails();
    
    // Initial Load
    fetchSystemStats();
    fetchUsers();

    // Search Filter
    searchInput?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('.user-row');
        rows.forEach(row => {
            const email = row.querySelector('.col-email').textContent.toLowerCase();
            row.style.display = email.includes(term) ? '' : 'none';
        });
    });
});

// --- Navigation ---
function setupNavigation() {
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.getAttribute('data-section');
            
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            sections.forEach(s => s.classList.remove('active'));
            document.getElementById(sectionId).classList.add('active');

            if (sectionId === 'overview') fetchSystemStats();
            if (sectionId === 'user-management') fetchUsers();
        });
    });
}

// --- API Calls ---
async function fetchSystemStats() {
    const token = localStorage.getItem('hm_token');
    try {
        const res = await fetch('http://localhost:3000/api/admin/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            statPatients.textContent = data.users.patients;
            statDoctors.textContent = data.users.doctors;
            statAppointments.textContent = data.activity.appointments;
            statMessages.textContent = data.activity.messages;
        }
    } catch (e) { console.error(e); }
}

async function fetchUsers() {
    const token = localStorage.getItem('hm_token');
    userTableBody.innerHTML = '<tr><td colspan="4" class="loading">Loading users...</td></tr>';
    
    try {
        const res = await fetch('http://localhost:3000/api/admin/users', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const users = await res.json();
            renderUsers(users);
        }
    } catch (e) { 
        userTableBody.innerHTML = '<tr><td colspan="4" class="error">Error loading users</td></tr>';
    }
}

function renderUsers(users) {
    userTableBody.innerHTML = '';
    users.forEach(user => {
        const tr = document.createElement('tr');
        tr.className = 'user-row';
        
        // Prevent deleting yourself (Admin)
        const isSelf = user.email === adminEmailElement.textContent;
        const deleteBtn = isSelf ? '<span style="color:#ccc;">-</span>' : 
            `<button class="btn btn-danger btn-small" onclick="deleteUser('${user._id}')">Delete</button>`;

        tr.innerHTML = `
            <td class="col-email">${user.email}</td>
            <td><span class="role-tag role-${user.role}">${user.role}</span></td>
            <td>${new Date(user.createdAt).toLocaleDateString()}</td>
            <td>${deleteBtn}</td>
        `;
        userTableBody.appendChild(tr);
    });
}

async function deleteUser(userId) {
    if (!confirm('Are you sure? This will delete the user and ALL their data (appointments, messages, etc.).')) return;

    const token = localStorage.getItem('hm_token');
    try {
        const res = await fetch(`http://localhost:3000/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            alert('User deleted.');
            fetchUsers();
            fetchSystemStats(); // Refresh stats too
        } else {
            alert('Failed to delete user.');
        }
    } catch (e) { alert('Network error.'); }
}

// --- Auth ---
async function populateAdminDetails() {
    const token = localStorage.getItem('hm_token');
    if (!token) return window.location.href = '../login/index.html';

    try {
        const response = await fetch('http://localhost:3000/api/auth/user', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const user = await response.json();
            if (user.role !== 'admin') {
                alert('Access Denied: Admin only.');
                localStorage.removeItem('hm_token');
                window.location.href = '../login/index.html';
                return;
            }
            adminEmailElement.textContent = user.email;
        } else {
            window.location.href = '../login/index.html';
        }
    } catch (e) { window.location.href = '../login/index.html'; }
}

function setupLogout() {
    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('hm_token');
        window.location.href = '../login/index.html';
    });
}

// Expose deleteUser to global scope for onclick
window.deleteUser = deleteUser;