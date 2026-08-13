// API Configuration
const API_BASE = 'https://backinvitacionc.vercel.app';

async function apiRequest(path, { method = 'GET', body } = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Error ${res.status}`);
    }
    return res.status === 204 ? null : res.json();
}

const WHATSAPP_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.6 6.32A7.85 7.85 0 0 0 12.05 4a7.94 7.94 0 0 0-6.87 11.93L4 20l4.2-1.1a7.9 7.9 0 0 0 3.85 1h.01a7.94 7.94 0 0 0 5.54-13.58zm-5.55 12.2h-.01a6.6 6.6 0 0 1-3.36-.92l-.24-.14-2.5.65.67-2.43-.16-.25a6.58 6.58 0 0 1 10.16-8.14 6.55 6.55 0 0 1 1.93 4.65 6.6 6.6 0 0 1-6.49 6.58zm3.6-4.93c-.2-.1-1.17-.58-1.35-.64-.18-.07-.31-.1-.44.1-.13.19-.5.64-.62.77-.11.13-.23.14-.42.05-.2-.1-.85-.31-1.61-.99a6.02 6.02 0 0 1-1.11-1.38c-.12-.2 0-.31.1-.42.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.15.04-.28-.02-.4-.06-.11-.35-.85-.5-1.19-.13-.32-.27-.28-.37-.28h-.32c-.11 0-.29.04-.44.2-.15.17-.6.58-.6 1.42 0 .83.61 1.63.7 1.75.08.11 1.13 1.72 2.75 2.35 1.37.53 1.65.42 1.95.4.3-.03.98-.4 1.11-.79.14-.38.14-.71.1-.78-.04-.07-.16-.11-.36-.2z"/></svg>`;

function buildInvitationMessage(name, isFamilia) {
    const greeting = `¡Hola, ${name}!`;
    const instructions = isFamilia
        ? `\n\nBusquen el nombre "${name}" para ver sus pases y confirmar su asistencia.`
        : '';
    return `${greeting} Espero se encuentren muy bien.

Les mando una cordial invitación para mi fiesta de *XV años - Yareni Guadalupe* — sería muy especial poder compartir este día tan importante junto a ustedes.

Aquí pueden ver todos los detalles de la celebración:
https://yareniguadalupe.vercel.app/${instructions}

*¡Los espero con mucho cariño!*`;
}

function renderWhatsappBtn(telefono, name, isFamilia) {
    if (telefono) {
        const message = buildInvitationMessage(name, isFamilia);
        const link = `https://wa.me/52${telefono}?text=${encodeURIComponent(message)}`;
        return `<a href="${link}" target="_blank" rel="noopener" class="icon-btn whatsapp-btn" title="Enviar invitación" onclick="event.stopPropagation()">${WHATSAPP_ICON}</a>`;
    }
    return `<button type="button" class="icon-btn whatsapp-btn" disabled title="Sin teléfono">${WHATSAPP_ICON}</button>`;
}

// State
let familias = [];
let mesas = [];
let amigos = [];
let editingId = null;
let editingAmigoId = null;
let currentMesaNumber = null;
let currentAmigoStatus = '';

// DOM Elements
const guestList = document.getElementById('guest-list');
const addFamilyBtn = document.getElementById('add-family-btn');
const modalOverlay = document.getElementById('modal-overlay');
const familyForm = document.getElementById('family-form');
const cancelBtn = document.getElementById('cancel-btn');
const modalTitle = document.getElementById('modal-title');
const searchInput = document.getElementById('search-input');
const statFamiliasEl = document.getElementById('stat-familias');
const statPasesEl = document.getElementById('stat-pases');
const statAmigosEl = document.getElementById('stat-amigos');
const statPersonasEl = document.getElementById('stat-personas');

// Check-in Modal Elements
const checkinModal = document.getElementById('checkin-modal');
const checkinFamilyName = document.getElementById('checkin-family-name');
const checkinStatusBadge = document.getElementById('checkin-status-badge');
const checkinTableNumber = document.getElementById('checkin-table-number');
const checkinGuestInfo = document.getElementById('checkin-guest-info');
const markArrivedBtn = document.getElementById('mark-arrived-btn');
const closeCheckinBtn = document.getElementById('close-checkin-btn');

// Mesas Elements
const mesasGrid = document.getElementById('mesas-grid');
const mesaSearchInput = document.getElementById('mesa-search-input');
const mesaDetailModal = document.getElementById('mesa-detail-modal');
const mesaDetailTitle = document.getElementById('mesa-detail-title');
const mesaDetailList = document.getElementById('mesa-detail-list');
const mesaDetailCloseBtn = document.getElementById('mesa-detail-close-btn');

// Amigos Elements
const amigosList = document.getElementById('amigos-list');
const addAmigoBtn = document.getElementById('add-amigo-btn');
const amigoModalOverlay = document.getElementById('amigo-modal-overlay');
const amigoForm = document.getElementById('amigo-form');
const amigoCancelBtn = document.getElementById('amigo-cancel-btn');
const amigoSearchInput = document.getElementById('amigo-search-input');
const amigoModalTitle = document.getElementById('amigo-modal-title');

// Filters
const filterBtns = document.querySelectorAll('#tab-familias .filter-group .filter-btn');
let currentFilter = 'all'; // all, arrived, pending, declined

// Tabs
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanels = {
    familias: document.getElementById('tab-familias'),
    mesas: document.getElementById('tab-mesas'),
    amigos: document.getElementById('tab-amigos')
};
const loadedTabs = new Set();

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        Object.entries(tabPanels).forEach(([key, panel]) => {
            panel.classList.toggle('active', key === tab);
            panel.classList.toggle('hidden', key !== tab);
        });
        if (tab === 'mesas' && !loadedTabs.has('mesas')) {
            loadedTabs.add('mesas');
            loadMesas();
        } else if (tab === 'amigos' && !loadedTabs.has('amigos')) {
            loadedTabs.add('amigos');
            loadAmigos();
        }
    });
});

// ---- Familias ----

async function loadFamilias() {
    try {
        const res = await apiRequest('/guests?status=all&limit=200');
        familias = (res.data || []).filter(f => f.tipo === 'familia');
        renderList(searchInput.value);
    } catch (err) {
        guestList.innerHTML = `<div class="empty-state" style="text-align:center;padding:3rem;color:#c00;">Error cargando familias: ${err.message}</div>`;
    }
}

async function loadResumen() {
    try {
        const resumen = await apiRequest('/resumen');
        statFamiliasEl.textContent = `${resumen.familias.confirmadas} / ${resumen.familias.total}`;
        statPasesEl.textContent = `${resumen.familias.pasesConfirmados} / ${resumen.familias.pasesInvitados}`;
        statAmigosEl.textContent = resumen.amigos.confirmados;
        statPersonasEl.textContent = resumen.totalPersonasConfirmadas;
    } catch (err) {
        statFamiliasEl.textContent = '-';
        statPasesEl.textContent = '-';
        statAmigosEl.textContent = '-';
        statPersonasEl.textContent = '-';
    }
}

function renderList(filterText = '') {
    guestList.innerHTML = '';

    let filtered = familias.filter(f =>
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
            if (e.target.closest('.card-actions')) return;
            openCheckin(family.id);
        };

        let guestInfoText = `${family.count} pase(s)`;
        if (family.status === 'confirmed') {
            guestInfoText = `${family.attendingCount ?? family.count} conf. de ${family.count}`;
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
                ${renderWhatsappBtn(family.telefono, family.name, true)}
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
}

function validTable(value) {
    if (!value) return null;
    const n = parseInt(value, 10);
    if (n < 1 || n > 24) {
        throw new Error('El número de mesa debe estar entre 1 y 24.');
    }
    return n;
}

function validTelefono(value, required = false) {
    if (!value) {
        if (required) throw new Error('El teléfono es requerido.');
        return null;
    }
    if (!/^\d{10}$/.test(value)) {
        throw new Error('El teléfono debe tener exactamente 10 dígitos.');
    }
    return value;
}

addFamilyBtn.addEventListener('click', () => {
    editingId = null;
    modalTitle.textContent = 'Agregar Familia';
    familyForm.reset();
    modalOverlay.classList.remove('hidden');
});

cancelBtn.addEventListener('click', () => {
    modalOverlay.classList.add('hidden');
});

familyForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('family-name').value;
    const count = parseInt(document.getElementById('guest-count').value, 10);
    const tableRaw = document.getElementById('table-number').value;
    const telefonoRaw = document.getElementById('family-telefono').value;

    try {
        const table = validTable(tableRaw);
        const telefono = validTelefono(telefonoRaw, false);
        const payload = { name, count };
        if (table !== null) payload.table = table;
        if (telefono) payload.telefono = telefono;

        if (editingId) {
            await apiRequest(`/guests/${editingId}`, { method: 'PATCH', body: payload });
        } else {
            await apiRequest('/guests', { method: 'POST', body: payload });
        }
        modalOverlay.classList.add('hidden');
        await loadFamilias();
        loadResumen();
    } catch (err) {
        alert(err.message);
    }
});

window.editFamily = (id) => {
    const family = familias.find(f => f.id === id);
    if (family) {
        editingId = id;
        modalTitle.textContent = 'Editar Familia';
        document.getElementById('family-name').value = family.name;
        document.getElementById('guest-count').value = family.count;
        document.getElementById('table-number').value = family.table || '';
        document.getElementById('family-telefono').value = family.telefono || '';
        modalOverlay.classList.remove('hidden');
    }
};

window.deleteFamily = async (id) => {
    if (confirm('¿Estás seguro de que deseas eliminar esta familia?')) {
        try {
            await apiRequest(`/guests/${id}`, { method: 'DELETE' });
            await loadFamilias();
            loadResumen();
        } catch (err) {
            alert(err.message);
        }
    }
};

// ---- Check-in ----

window.openCheckin = (id) => {
    const family = familias.find(f => f.id === id);
    if (family) {
        editingId = id;
        renderCheckinModal(family);
        checkinModal.classList.remove('hidden');
    }
};

function renderCheckinModal(family) {
    checkinFamilyName.textContent = family.name;
    checkinTableNumber.textContent = family.table || '-';

    let guestInfoText = `${family.count} pase(s)`;
    if (family.status === 'confirmed') {
        guestInfoText = `${family.attendingCount ?? family.count} conf. de ${family.count} pases`;
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

    markArrivedBtn.onclick = async () => {
        try {
            const updated = await apiRequest(`/guests/${family.id}`, { method: 'PATCH', body: { arrived: !family.arrived } });
            Object.assign(family, updated);
            renderList(searchInput.value);
            renderCheckinModal(family);
        } catch (err) {
            alert(err.message);
        }
    };
}

closeCheckinBtn.addEventListener('click', () => {
    checkinModal.classList.add('hidden');
});

// ---- Mesas ----

async function loadMesas() {
    try {
        const res = await apiRequest('/mesas');
        mesas = res.data || [];
        renderMesas(mesaSearchInput.value);
    } catch (err) {
        mesasGrid.innerHTML = `<div class="empty-state" style="text-align:center;padding:3rem;color:#c00;">Error cargando mesas: ${err.message}</div>`;
    }
}

function renderMesas(filterText = '') {
    mesasGrid.innerHTML = '';
    const search = filterText.toLowerCase();
    const visibleMesas = search
        ? mesas.filter(mesa => mesa.familias.some(f => f.name.toLowerCase().includes(search)))
        : mesas;

    if (visibleMesas.length === 0) {
        mesasGrid.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 3rem; color: #999;">
                <p>No se encontró ninguna familia con ese nombre.</p>
            </div>
        `;
        return;
    }

    visibleMesas.forEach(mesa => {
        const totalPases = mesa.familias.reduce((s, f) => s + (f.pases || 0), 0);
        const tile = document.createElement('div');
        tile.className = `mesa-tile ${mesa.familias.length === 0 ? 'empty' : ''}`;

        const familiasHtml = mesa.familias.length === 0
            ? '<p class="mesa-empty-text">Sin asignar</p>'
            : `<ul class="mesa-family-list">${mesa.familias.map(f => `
                <li class="${f.arrived ? 'arrived' : ''} ${search && f.name.toLowerCase().includes(search) ? 'match' : ''}">
                    <span>${f.name}</span>
                    <span class="mesa-family-pases">${f.confirmados ?? f.pases}</span>
                </li>
            `).join('')}</ul>`;

        tile.innerHTML = `
            <div class="mesa-tile-header">
                <span class="mesa-number">Mesa ${mesa.mesa}</span>
                <span class="mesa-info">${totalPases} pases</span>
            </div>
            ${familiasHtml}
        `;
        if (mesa.familias.length > 0) {
            tile.onclick = () => openMesaDetail(mesa);
        }
        mesasGrid.appendChild(tile);
    });
}

mesaSearchInput.addEventListener('input', (e) => {
    renderMesas(e.target.value);
});

function openMesaDetail(mesa) {
    currentMesaNumber = mesa.mesa;
    mesaDetailTitle.textContent = `Mesa ${mesa.mesa}`;
    mesaDetailModal.classList.remove('hidden');
    renderMesaDetail();
}

function renderMesaDetail() {
    const mesa = mesas.find(m => m.mesa === currentMesaNumber);
    mesaDetailList.innerHTML = '';
    mesa.familias.forEach(family => {
        const card = document.createElement('div');
        card.className = `guest-card ${family.arrived ? 'arrived' : ''}`;
        card.innerHTML = `
            <div class="family-info">
                <h3>${family.name}</h3>
                <span class="guest-count-badge">${family.confirmados != null ? `${family.confirmados} conf. de ` : ''}${family.pases} pase(s)</span>
            </div>
            <div class="card-actions">
                <button class="secondary-btn">${family.arrived ? 'Desmarcar' : 'Marcar llegada'}</button>
            </div>
        `;
        card.querySelector('button').addEventListener('click', async () => {
            try {
                const updated = await apiRequest(`/guests/${family.id}`, { method: 'PATCH', body: { arrived: !family.arrived } });
                Object.assign(family, { arrived: updated.arrived });
                renderMesaDetail();
                renderMesas();
                const fam = familias.find(f => f.id === family.id);
                if (fam) { Object.assign(fam, updated); renderList(searchInput.value); }
            } catch (err) {
                alert(err.message);
            }
        });
        mesaDetailList.appendChild(card);
    });
}

mesaDetailCloseBtn.addEventListener('click', () => {
    mesaDetailModal.classList.add('hidden');
});

// ---- Amigos ----

async function loadAmigos() {
    try {
        const qs = currentAmigoStatus ? `?status=${currentAmigoStatus}` : '';
        const res = await apiRequest(`/amigos${qs}`);
        amigos = res.data || [];
        renderAmigos(amigoSearchInput.value);
    } catch (err) {
        amigosList.innerHTML = `<div class="empty-state" style="text-align:center;padding:3rem;color:#c00;">Error cargando amigos: ${err.message}</div>`;
    }
}

function renderAmigos(filterText = '') {
    amigosList.innerHTML = '';
    const filtered = amigos.filter(a => a.name.toLowerCase().includes(filterText.toLowerCase()));

    if (filtered.length === 0) {
        amigosList.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 3rem; color: #999;">
                <p>No se encontraron contactos.</p>
            </div>
        `;
        return;
    }

    filtered.forEach(amigo => {
        const card = document.createElement('div');
        card.className = 'guest-card';
        const badge = amigo.status === 'confirmed'
            ? `<span class="status-badge confirmed">Confirmado</span>`
            : `<span class="status-badge">Pendiente</span>`;
        card.innerHTML = `
            <div class="family-info">
                <h3>${amigo.name}</h3>
                ${badge}
            </div>
            <div class="card-actions">
                ${renderWhatsappBtn(amigo.telefono, amigo.name, false)}
                <button onclick="editAmigo('${amigo.id}')" class="icon-btn edit-btn" title="Editar">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button onclick="deleteAmigo('${amigo.id}')" class="icon-btn delete-btn" title="Eliminar">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
            </div>
        `;
        amigosList.appendChild(card);
    });
}

window.editAmigo = (id) => {
    const amigo = amigos.find(a => a.id === id);
    if (amigo) {
        editingAmigoId = id;
        amigoModalTitle.textContent = 'Editar Contacto';
        document.getElementById('amigo-name').value = amigo.name;
        document.getElementById('amigo-telefono').value = amigo.telefono || '';
        amigoModalOverlay.classList.remove('hidden');
    }
};

window.deleteAmigo = async (id) => {
    if (confirm('¿Estás seguro de que deseas eliminar este contacto?')) {
        try {
            await apiRequest(`/guests/${id}`, { method: 'DELETE' });
            await loadAmigos();
            loadResumen();
        } catch (err) {
            alert(err.message);
        }
    }
};

document.querySelectorAll('#tab-amigos .filter-group .filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('#tab-amigos .filter-group .filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentAmigoStatus = btn.dataset.status || '';
        loadAmigos();
    });
});

amigoSearchInput.addEventListener('input', (e) => {
    renderAmigos(e.target.value);
});

addAmigoBtn.addEventListener('click', () => {
    editingAmigoId = null;
    amigoModalTitle.textContent = 'Agregar Contacto';
    amigoForm.reset();
    amigoModalOverlay.classList.remove('hidden');
});

amigoCancelBtn.addEventListener('click', () => {
    amigoModalOverlay.classList.add('hidden');
});

amigoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('amigo-name').value;
    const telefonoRaw = document.getElementById('amigo-telefono').value;
    try {
        const telefono = validTelefono(telefonoRaw, true);
        if (editingAmigoId) {
            // No enviar "table": estos registros son amigos y no deben aparecer en /mesas.
            await apiRequest(`/guests/${editingAmigoId}`, { method: 'PATCH', body: { name, telefono } });
        } else {
            await apiRequest('/amigos', { method: 'POST', body: { name, telefono } });
        }
        amigoModalOverlay.classList.add('hidden');
        await loadAmigos();
        loadResumen();
    } catch (err) {
        alert(err.message);
    }
});

// ---- Filters (Familias tab) ----

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.id.replace('filter-', '');
        renderList(searchInput.value);
    });
});

searchInput.addEventListener('input', (e) => {
    renderList(e.target.value);
});

// Initial Load
loadFamilias();
loadResumen();
