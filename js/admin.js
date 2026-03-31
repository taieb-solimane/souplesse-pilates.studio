/* ── ADMIN DASHBOARD LOGIC ───────────────────────────
   Handles adding / deleting courses and managing clients.
   All data is persisted via CoursesDB / ClientsDB (courses.js).
─────────────────────────────────────────────────────── */

let editingCourseId = null;

document.addEventListener('DOMContentLoaded', () => {
  renderAdminTable();
  renderClientsTable();
  setMinDateTime();
  refreshStats();
  
  // Listen for localStorage changes
  window.addEventListener('storage', (e) => {
    if (e.key === 'souplesse_courses' || e.key === 'souplesse_clients') {
      renderAdminTable();
      renderClientsTable();
      refreshStats();
    }
  });
});

/* ── Set datetime min to now ────────────────────────── */
const setMinDateTime = () => {
  const input = document.getElementById('fieldDateTime');
  if (!input) return;
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  input.min = now.toISOString().slice(0, 16);
};

/* ── Add Course ─────────────────────────────────────── */
const addCourse = () => {
  const fields = {
    title:           document.getElementById('fieldTitle'),
    coachNom:        document.getElementById('fieldCoachNom'),
    coachPrenom:     document.getElementById('fieldCoachPrenom'),
    coachEmail:      document.getElementById('fieldCoachEmail'),
    dateTime:        document.getElementById('fieldDateTime'),
    capacity:        document.getElementById('fieldCapacity'),
    image:           document.getElementById('fieldImage'),
    description:     document.getElementById('fieldDescription'),
    price:           document.getElementById('fieldPrice'),
  };

  const errorEl = document.getElementById('adminFormError');
  errorEl.textContent = '';

  for (const [key, el] of Object.entries(fields)) {
    if (key !== 'image' && !el.value.trim()) { // Image is optional
      errorEl.textContent = 'Veuillez remplir tous les champs.';
      el.focus();
      return;
    }
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.coachEmail.value.trim())) {
    errorEl.textContent = 'Adresse email du coach invalide.';
    fields.coachEmail.focus();
    return;
  }

  const coachNom = fields.coachNom.value.trim();
  const coachPrenom = fields.coachPrenom.value.trim();
  const coach = (coachPrenom + ' ' + coachNom).trim();

  const capacity = parseInt(fields.capacity.value, 10);
  if (isNaN(capacity) || capacity < 1 || capacity > 50) {
    errorEl.textContent = 'Capacité invalide (1–50).';
    fields.capacity.focus();
    return;
  }

  let price = null;
  if (fields.price.value.trim() !== '') {
    price = parseInt(fields.price.value, 10);
    if (isNaN(price) || price < 0) {
      errorEl.textContent = 'Prix invalide. Veuillez entrer un nombre positif.';
      fields.price.focus();
      return;
    }
  }

  const baseData = {
    title:       fields.title.value.trim(),
    coach:       coach,
    coachEmail:  fields.coachEmail.value.trim(),
    dateTime:    fields.dateTime.value,
    capacity,
    image:       fields.image.value.trim() || 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80', // Default image
    description: fields.description.value.trim(),
    price:       price !== null ? price : null,
  };

  if (editingCourseId) {
    CoursesDB.update(editingCourseId, baseData);
    editingCourseId = null;
    document.querySelector('#addCourseSection .admin-card-title').textContent = 'Ajouter une Classe';
    document.querySelector('#addCourseSection .admin-submit-btn').textContent = 'Publier la Classe →';
    showToast('Classe mise à jour avec succès ✓');
  } else {
    const newCourse = { ...baseData, id: `c_${Date.now()}`, booked: 0 };
    if (newCourse.price === null || newCourse.price === undefined) {
      delete newCourse.price;
    }
    CoursesDB.add(newCourse);
    showToast('Classe ajoutée avec succès ✓');
  }

  renderAdminTable();
  renderClientsTable();
  resetAdminForm();
  refreshStats();
};

/* ── Delete Course ──────────────────────────────────── */
const deleteCourse = (id) => {
  if (!confirm('Supprimer cette classe ? Cette action est irréversible.')) return;
  CoursesDB.remove(id);
  renderAdminTable();
  renderClientsTable();
  refreshStats(); // Refresh stats after deleting course
  showToast('Classe supprimée.');
};

/* ── Edit Course ────────────────────────────────────── */
const editCourse = (id) => {
  const course = CoursesDB.getAll().find(c => c.id === id);
  if (!course) return;

  editingCourseId = id;
  
  // Split coach name into prenom and nom
  const coachParts = course.coach.split(' ');
  const coachPrenom = coachParts.length > 1 ? coachParts.slice(0, -1).join(' ') : '';
  const coachNom = coachParts.length > 1 ? coachParts[coachParts.length - 1] : course.coach;
  
  document.getElementById('fieldTitle').value = course.title;
  document.getElementById('fieldCoachNom').value = coachNom;
  document.getElementById('fieldCoachPrenom').value = coachPrenom;
  document.getElementById('fieldCoachEmail').value = course.coachEmail;
  document.getElementById('fieldDateTime').value = course.dateTime;
  document.getElementById('fieldCapacity').value = course.capacity;
  document.getElementById('fieldImage').value = course.image || '';
  document.getElementById('fieldDescription').value = course.description;
  document.getElementById('fieldPrice').value = course.price !== undefined && course.price !== null ? course.price : '';
  
  document.querySelector('#addCourseSection .admin-card-title').textContent = 'Éditer une Classe';
  document.querySelector('#addCourseSection .admin-submit-btn').textContent = 'Enregistrer les Modifications →';
  
  document.getElementById('addCourseSection').scrollIntoView({ behavior: 'smooth' });
};

/* ── Render admin table ─────────────────────────────── */
const renderAdminTable = () => {
  const tbody = document.getElementById('adminTableBody');
  const empty = document.getElementById('emptyState');
  if (!tbody) return;

  const courses = CoursesDB.getAll();
  tbody.innerHTML = '';

  if (courses.length === 0) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  courses.forEach(c => {
    const spots = CoursesDB.spotsLeft(c);
    const dt    = new Date(c.dateTime);
    const dateStr = dt.toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' });
    const timeStr = dt.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit', hour12: false });
    const isPast = dt < new Date();

    const tr = document.createElement('tr');
    tr.className = isPast ? 'row--past' : '';
    tr.innerHTML = `
      <td>
        <div class="td-title">${c.title}</div>
      </td>
      <td>
        <div class="td-coach">${c.coach}</div>
        <div class="td-email">${c.coachEmail}</div>
      </td>
      <td>
        <div>${dateStr}</div>
        <div class="td-time">${timeStr}</div>
      </td>
      <td>
        <div class="td-price">${c.price ? c.price.toLocaleString('fr-FR') + ' DA' : '—'}</div>
      </td>
      <td>
        <div class="spots-bar">
          <div class="spots-fill" style="width:${Math.round((c.booked / c.capacity) * 100)}%"></div>
        </div>
        <div class="spots-text">${c.booked} / ${c.capacity} ${spots === 0 ? '<span class="badge-full">Complet</span>' : ''}</div>
      </td>
      <td>
        <div style="display: flex; gap: 8px;">
          <button class="admin-btn-edit" onclick="editCourse('${c.id}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            Éditer
          </button>
          <button class="admin-btn-delete" onclick="deleteCourse('${c.id}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            Supprimer
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
};

/* ── Render clients table ───────────────────────────── */
const renderClientsTable = () => {
  const tbody = document.getElementById('clientsTableBody');
  const empty = document.getElementById('clientsEmptyState');
  if (!tbody) return;

  const clients = ClientsDB.getAll();
  tbody.innerHTML = '';

  if (clients.length === 0) {
    empty.style.display = 'flex';
    return;
  }
  empty.style.display = 'none';

  // Build course lookup
  const courseMap = {};
  CoursesDB.getAll().forEach(c => { courseMap[c.id] = c.title; });

  clients.forEach(cl => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="td-title">${cl.name}</div>
      </td>
      <td>
        <div class="td-email">${cl.email}</div>
      </td>
      <td>
        <div class="td-coach">${courseMap[cl.courseId] || cl.courseTitle || '—'}</div>
      </td>
      <td>
        <div class="td-time">${cl.bookedAt ? new Date(cl.bookedAt).toLocaleDateString('fr-FR') : '—'}</div>
      </td>
      <td>
        <button class="admin-btn-delete" onclick="deleteClient('${cl.id}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          Retirer
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
};

/* ── Add Client manually ────────────────────────────── */
const addClient = () => {
  const nameEl   = document.getElementById('clientName');
  const emailEl  = document.getElementById('clientEmail');
  const courseEl = document.getElementById('clientCourse');
  const errorEl  = document.getElementById('clientFormError');

  errorEl.textContent = '';

  if (!nameEl.value.trim() || !emailEl.value.trim() || !courseEl.value) {
    errorEl.textContent = 'Veuillez remplir tous les champs.';
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value.trim())) {
    errorEl.textContent = 'Adresse email invalide.';
    return;
  }

  const courses = CoursesDB.getAll();
  const course  = courses.find(c => c.id === courseEl.value);
  if (!course) { errorEl.textContent = 'Classe introuvable.'; return; }

  if (CoursesDB.spotsLeft(course) === 0) {
    errorEl.textContent = 'Cette classe est complète.';
    return;
  }

  const newClient = {
    id:          `cl_${Date.now()}`,
    name:        nameEl.value.trim(),
    email:       emailEl.value.trim(),
    courseId:    course.id,
    courseTitle: course.title,
    bookedAt:    new Date().toISOString(),
  };

  ClientsDB.add(newClient);
  CoursesDB.bookSpot(course.id);

  // Reset form
  nameEl.value = '';
  emailEl.value = '';
  courseEl.value = '';

  renderAdminTable();
  renderClientsTable();
  refreshStats(); // Refresh stats after adding client
  showToast(`${newClient.name} ajouté(e) à "${course.title}" ✓`);
};

/* ── Delete Client ──────────────────────────────────── */
const deleteClient = (id) => {
  if (!confirm('Retirer ce client ? Cette action est irréversible.')) return;
  ClientsDB.remove(id);
  renderClientsTable();
  refreshStats(); // Refresh stats after deleting client
  showToast('Client retiré.');
};

/* ── Populate course select in client form ──────────── */
const populateCourseSelect = () => {
  const sel = document.getElementById('clientCourse');
  if (!sel) return;
  const courses = CoursesDB.getAll();
  sel.innerHTML = '<option value="">— Choisir une classe —</option>' +
    courses.map(c => `<option value="${c.id}">${c.title} (${CoursesDB.spotsLeft(c)} places)</option>`).join('');
};

/* ── Reset form ─────────────────────────────────────── */
const resetAdminForm = () => {
  ['fieldTitle','fieldCoachNom','fieldCoachPrenom','fieldCoachEmail','fieldDateTime','fieldCapacity','fieldImage','fieldDescription','fieldPrice']
    .forEach(id => { document.getElementById(id).value = ''; });
  document.getElementById('adminFormError').textContent = '';
  setMinDateTime();
  
  if (editingCourseId) {
    editingCourseId = null;
    document.querySelector('#addCourseSection .admin-card-title').textContent = 'Ajouter une Classe';
    document.querySelector('#addCourseSection .admin-submit-btn').textContent = 'Publier la Classe →';
  }
};

/* ── Toast notification ─────────────────────────────── */
const showToast = (msg) => {
  const toast = document.getElementById('adminToast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3200);
};