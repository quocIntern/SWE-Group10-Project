let userEmailElement;
let logoutButton;
let patientsContainer;
let searchPatientsInput;
let patientInfoContainer;
let patientSymptomsContainer;
let navLinks;
let sections;

let allPatients = [];
let selectedPatientId = null;

document.addEventListener('DOMContentLoaded', () => {
    userEmailElement = document.getElementById('user-email');
    logoutButton = document.getElementById('logout-button');
    patientsContainer = document.getElementById('patients-container');
    searchPatientsInput = document.getElementById('search-patients');
    patientInfoContainer = document.getElementById('patient-info-container');
    patientSymptomsContainer = document.getElementById('patient-symptoms');
    navLinks = document.querySelectorAll('.nav-link');
    sections = document.querySelectorAll('.section');
    
    populateUserDetails();
    fetchAllPatients();
    setupNavigation();
    initializeNavigation();
    setupSearchFilter();
    setupLogout();
});

function setupNavigation() {
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.getAttribute('data-section');
            
            navLinks.forEach(l => {
                l.classList.remove('active');
            });
            
            link.classList.add('active');
            
            showSection(sectionId);
        });
    });
}

function showSection(sectionId) {
    sections.forEach(section => section.classList.remove('active'));
    document.getElementById(sectionId)?.classList.add('active');
}

function initializeNavigation() {
    let activeSection = null;
    sections.forEach(section => {
        if (section.classList.contains('active')) {
            activeSection = section.id;
        }
    });
    
    if (activeSection) {
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-section') === activeSection) {
                link.classList.add('active');
            }
        });
    }
}

function setupSearchFilter() {
    searchPatientsInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const cards = document.querySelectorAll('.patient-card');
        
        cards.forEach(card => {
            const email = card.dataset.email.toLowerCase();
            if (email.includes(searchTerm)) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
        });
    });
}

function setupLogout() {
    logoutButton.addEventListener('click', () => {
        window.clearToken();
        window.location.href = '../index.html';
    });
}

async function populateUserDetails() {
    const user = await window.loadCurrentUser();

    if (!user) {
        window.location.href = '../index.html';
        return;
    }

    userEmailElement.textContent = user.email;
    
    if (user.role !== 'doctor') {
        alert('Access denied. This dashboard is for doctors only.');
        window.clearToken();
        window.location.href = '../index.html';
    }
}

async function fetchAllPatients() {
    const token = window.getToken();
    
    try {
        const response = await fetch('/api/doctor/patients', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const users = await response.json();
            allPatients = Array.isArray(users) ? users.filter(user => user.role === 'patient') : [];
            displayPatients(allPatients);
        } else {
            patientsContainer.innerHTML = '<p class="loading error">Failed to load patients</p>';
        }
    } catch (error) {
        console.error('Error fetching patients:', error);
        patientsContainer.innerHTML = '<p class="loading error">Could not load patients. Please try again.</p>';
    }
}

function displayPatients(patients) {
    patientsContainer.innerHTML = '';

    if (patients.length === 0) {
        patientsContainer.innerHTML = '<p class="loading">No patients found</p>';
        return;
    }

    patients.forEach(patient => {
        const card = document.createElement('div');
        card.className = 'patient-card';
        card.dataset.email = patient.email;
        card.dataset.patientId = patient._id;

        const lastVisit = patient.lastAppointment 
            ? new Date(patient.lastAppointment).toLocaleDateString()
            : 'No appointments yet';

        card.innerHTML = `
            <div class="patient-email">${patient.email}</div>
            <div class="patient-status">Patient ID: ${patient._id.substring(0, 8)}...</div>
            <div class="patient-last-visit">Last visit: ${lastVisit}</div>
        `;

        card.addEventListener('click', () => selectPatient(patient));
        patientsContainer.appendChild(card);
    });
}

async function selectPatient(patient) {
    selectedPatientId = patient._id;
    
    // Update patient info
    const patientInfoHTML = `
        <div class="patient-info-header">
            <div class="patient-name">${patient.email}</div>
            <div class="patient-email-display">Patient ID: ${patient._id}</div>
        </div>
        <div class="info-grid">
            <div class="info-item">
                <div class="info-label">Account Status</div>
                <div class="info-value">Active</div>
            </div>
            <div class="info-item">
                <div class="info-label">Role</div>
                <div class="info-value">Patient</div>
            </div>
            <div class="info-item">
                <div class="info-label">Registered</div>
                <div class="info-value">${new Date(patient.createdAt || new Date()).toLocaleDateString()}</div>
            </div>
        </div>
    `;
    
    patientInfoContainer.innerHTML = patientInfoHTML;
    
    await fetchPatientSymptoms(patient._id);
    
    showSection('patient-details');
    navLinks.forEach(l => l.classList.remove('active'));
    document.querySelector('[data-section="patient-details"]').classList.add('active');
}

async function fetchPatientSymptoms(patientId) {
    const token = window.getToken();
    
    try {
        const response = await fetch(`/api/doctor/patients/${patientId}/symptoms`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const symptoms = await response.json();
            displayPatientSymptoms(symptoms);
        } else {
            patientSymptomsContainer.innerHTML = '<p class="loading">Failed to load symptoms</p>';
        }
    } catch (error) {
        console.error('Error fetching patient symptoms:', error);
        patientSymptomsContainer.innerHTML = '<p class="loading error">Could not load symptoms</p>';
    }
}

function displayPatientSymptoms(symptoms) {
    patientSymptomsContainer.innerHTML = '';

    if (!symptoms || symptoms.length === 0) {
        patientSymptomsContainer.innerHTML = '<p class="loading">No symptom history available</p>';
        return;
    }

    symptoms.forEach(log => {
        const entry = document.createElement('div');
        entry.className = 'symptom-entry';

        const date = new Date(log.date).toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        entry.innerHTML = `
            <div class="symptom-date">${date}</div>
            <div class="symptom-items">
                ${(log.symptoms || []).map(symptom => `<span class="symptom-tag">${symptom.trim()}</span>`).join('')}
            </div>
        `;

        patientSymptomsContainer.appendChild(entry);
    });
}