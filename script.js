// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCfmmyyScTL1A9TUGD4mjxMFlVjg0WQQoM",
  authDomain: "invitacion-be60d.firebaseapp.com",
  projectId: "invitacion-be60d",
  storageBucket: "invitacion-be60d.firebasestorage.app",
  messagingSenderId: "634606934656",
  appId: "1:634606934656:web:2bafaf3d9d2ce24c3d6465",
  measurementId: "G-E4N3HG6J05"
};

// Initialize Firebase (using Compat SDK for simplicity in a script tag setup)
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const guestsCol = db.collection('guests');

// State Management
let families = [];
let editingId = null;

// DOM Elements
const guestList = document.getElementById('guest-list');
const addFamilyBtn = document.getElementById('add-family-btn');
const modalOverlay = document.getElementById('modal-overlay');
const familyForm = document.getElementById('family-form');
const cancelBtn = document.getElementById('cancel-btn');
const modalTitle = document.getElementById('modal-title');
const searchInput = document.getElementById('search-input');
const totalFamiliesEl = document.getElementById('total-families');
const totalGuestsEl = document.getElementById('total-guests');
const totalAttendingEl = document.getElementById('total-attending');

// Check-in Modal Elements
const checkinModal = document.getElementById('checkin-modal');
const checkinFamilyName = document.getElementById('checkin-family-name');
const checkinStatusBadge = document.getElementById('checkin-status-badge');
const checkinTableNumber = document.getElementById('checkin-table-number');
const checkinGuestInfo = document.getElementById('checkin-guest-info');
const markArrivedBtn = document.getElementById('mark-arrived-btn');
const closeCheckinBtn = document.getElementById('close-checkin-btn');

// Filters
const filterBtns = document.querySelectorAll('.filter-btn');
let currentFilter = 'all'; // all, arrived, pending

// Load data from Firebase (Real-time sync)
function initFirebaseSync() {
    guestsCol.onSnapshot((snapshot) => {
        families = [];
        snapshot.forEach((doc) => {
            families.push({ id: doc.id, ...doc.data() });
        });
        renderList(searchInput.value);
    });
}

// Update Statistics
function updateStats() {
    totalFamiliesEl.textContent = families.length;
    const total = families.reduce((sum, f) => sum + parseInt(f.count || 0), 0);
    const totalAttending = families.reduce((sum, f) => {
        if (f.status === 'confirmed' && f.attendingCount) {
            return sum + parseInt(f.attendingCount);
        }
        return sum;
    }, 0);
    totalGuestsEl.textContent = total;
    if (totalAttendingEl) totalAttendingEl.textContent = totalAttending;
}

// Render the Guest List
function renderList(filterText = '') {
    guestList.innerHTML = '';
    
    let filtered = families.filter(f => 
        f.name.toLowerCase().includes(filterText.toLowerCase())
    );

    if (currentFilter === 'arrived') {
        filtered = filtered.filter(f => f.arrived);
    } else if (currentFilter === 'pending') {
        filtered = filtered.filter(f => !f.arrived);
    } else if (currentFilter === 'confirmed') {
        filtered = filtered.filter(f => f.status === 'confirmed');
    } else if (currentFilter === 'declined') {
        filtered = filtered.filter(f => f.status === 'declined');
    }

    if (filtered.length === 0) {
        guestList.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 3rem; color: #999;">
                <p>No se encontraron familias.</p>
            </div>
        `;
        return;
    }

    filtered.forEach(family => {
        const card = document.createElement('div');
        card.className = `guest-card ${family.arrived ? 'arrived' : ''}`;
        card.onclick = (e) => {
            // Prevent modal if clicking on buttons
            if (e.target.closest('.card-actions')) return;
            openCheckin(family.id);
        };

        let guestInfoText = `${family.count} pase(s)`;
        if (family.status === 'confirmed') {
            guestInfoText = `${family.attendingCount || 0} conf. de ${family.count}`;
        } else if (family.status === 'declined') {
            guestInfoText = `Declinó (${family.count} pases)`;
        }

        card.innerHTML = `
            <div class="family-info">
                <h3>${family.name}</h3>
                <span class="guest-count-badge">${guestInfoText}</span>
                ${family.table ? `<span class="table-badge">Mesa ${family.table}</span>` : ''}
            </div>
            <div class="card-actions">
                <button onclick="editFamily('${family.id}')" class="icon-btn edit-btn" title="Editar">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button onclick="deleteFamily('${family.id}')" class="icon-btn delete-btn" title="Eliminar">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
            </div>
        `;
        guestList.appendChild(card);
    });
    
    updateStats();
}

// Modal Interaction
addFamilyBtn.addEventListener('click', () => {
    editingId = null;
    modalTitle.textContent = 'Agregar Familia';
    familyForm.reset();
    modalOverlay.classList.remove('hidden');
});

cancelBtn.addEventListener('click', () => {
    modalOverlay.classList.add('hidden');
});

// Form Submission
familyForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = document.getElementById('family-name').value;
    const count = document.getElementById('guest-count').value;
    const table = document.getElementById('table-number').value;

    if (editingId) {
        // Update Firebase
        guestsCol.doc(editingId).update({ name, count, table });
    } else {
        // Create Firebase
        guestsCol.add({
            name,
            count,
            table,
            arrived: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }

    modalOverlay.classList.add('hidden');
});

// Edit/Delete actions
window.editFamily = (id) => {
    const family = families.find(f => f.id === id);
    if (family) {
        editingId = id;
        modalTitle.textContent = 'Editar Familia';
        document.getElementById('family-name').value = family.name;
        document.getElementById('guest-count').value = family.count;
        document.getElementById('table-number').value = family.table || '';
        modalOverlay.classList.remove('hidden');
    }
};

window.deleteFamily = (id) => {
    if (confirm('¿Estás seguro de que deseas eliminar esta familia?')) {
        guestsCol.doc(id).delete();
    }
};

// Check-in Modal Logic
window.openCheckin = (id) => {
    const family = families.find(f => f.id === id);
    if (family) {
        editingId = id;
        checkinFamilyName.textContent = family.name;
        checkinTableNumber.textContent = family.table || '-';
        
        let guestInfoText = `${family.count} pase(s)`;
        if (family.status === 'confirmed') {
            guestInfoText = `${family.attendingCount || 0} asisten (de ${family.count} pases)`;
        } else if (family.status === 'declined') {
            guestInfoText = `Declinó invitación`;
        }
        checkinGuestInfo.textContent = guestInfoText;
        
        if (family.arrived) {
            checkinStatusBadge.textContent = 'Llegaron';
            checkinStatusBadge.classList.add('arrived');
            markArrivedBtn.textContent = 'Desmarcar llegada';
            markArrivedBtn.style.background = '#888';
        } else {
            checkinStatusBadge.textContent = 'Pendiente';
            checkinStatusBadge.classList.remove('arrived');
            markArrivedBtn.textContent = '¡Ya llegaron!';
            markArrivedBtn.style.background = 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))';
        }
        
        checkinModal.classList.remove('hidden');
    }
};

closeCheckinBtn.addEventListener('click', () => {
    checkinModal.classList.add('hidden');
});

markArrivedBtn.addEventListener('click', () => {
    const family = families.find(f => f.id === editingId);
    if (family) {
        guestsCol.doc(editingId).update({ arrived: !family.arrived }).then(() => {
            // Re-open/update the modal with new data
            openCheckin(editingId);
        });
    }
});

// Filter Interaction
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.id.replace('filter-', '');
        renderList(searchInput.value);
    });
});

// Search Interaction
searchInput.addEventListener('input', (e) => {
    renderList(e.target.value);
});

// Initial Load
initFirebaseSync();
