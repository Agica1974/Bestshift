/**************************
 * Termine (Appointments) *
 **************************/

const APPT_KEY = "appointments";

// Storage-Helpers
function loadAppointments() {
  try { return JSON.parse(localStorage.getItem(APPT_KEY)) || {}; }
  catch { return {}; }
}
function saveAppointments(map) {
  localStorage.setItem(APPT_KEY, JSON.stringify(map));
}

function addAppointment(dateKey, appt) {
  const map = loadAppointments();
  const list = map[dateKey] || [];
  const id = crypto?.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
  list.push({ id, ...appt });
  map[dateKey] = list;
  saveAppointments(map);
  return id;
}

function deleteAppointment(dateKey, id) {
  const map = loadAppointments();
  map[dateKey] = (map[dateKey] || []).filter(a => a.id !== id);
  if (map[dateKey].length === 0) delete map[dateKey];
  saveAppointments(map);
}

// Termin-Punkte (statt Text) im Tagesfeld
function renderAppointmentsForDay(dayEl, list) {
  if (!dayEl) return;
  const dotWrap = dayEl.querySelector('.appt-dots');
  if (!dotWrap) return;

  dotWrap.innerHTML = '';

  const maxDots = 3;
  const count = list.length;
  const shown = Math.min(count, maxDots);

  for (let i = 0; i < shown; i++) {
    const dot = document.createElement('span');
    dot.className = 'appt-dot';
    // Optional: Typ-Farben
    // if (list[i].type === 'Arzt') dot.style.background = '#b00';
    dotWrap.appendChild(dot);
  }
  if (count > maxDots) {
    const more = document.createElement('span');
    more.className = 'appt-plus';
    more.textContent = `+${count - maxDots}`;
    dotWrap.appendChild(more);
  }
}

// Nach Rendern des Kalenders aufrufen
function restoreAppointments() {
  const map = loadAppointments();
  Object.entries(map).forEach(([dateKey, list]) => {
    const dayEl = document.querySelector(`[data-date='${dateKey}']`);
    if (!dayEl) return;
    renderAppointmentsForDay(dayEl, list);
  });
}
window.restoreAppointments = restoreAppointments;

// Modal-Handling
const modal = document.getElementById("appointmentModal");
const closeBtn = document.getElementById("closeAppointment");

function openAppointmentModalForDay(dayEl, dateKey) {
  if (!modal) return;

  // Position relativ zum Tagesfeld (einfach): unter/über dem Feld
  const rect = dayEl.getBoundingClientRect();
  const vwTop = window.scrollY + rect.top;
  const vwLeft = window.scrollX + rect.left;

  const modalWidth = Math.min(320, window.innerWidth * 0.9);
  modal.style.width = modalWidth + 'px';

  // Standard: unterhalb
  let top = vwTop + rect.height + 8;
  let arrow = 'top';

  // Wenn nicht genug Platz unten → oberhalb
  if (top + modal.offsetHeight > window.scrollY + window.innerHeight) {
    top = vwTop - (modal.offsetHeight + 8);
    arrow = 'bottom';
  }

  modal.style.top = `${top}px`;
  modal.style.left = `${vwLeft + rect.width / 2 - modalWidth / 2}px`;
  modal.setAttribute('data-arrow', arrow);

  modal.dataset.anchor = dateKey;
  modal.classList.add('show');
}

function closeAppointmentModal() {
  if (!modal) return;
  modal.classList.remove('show');
}

closeBtn?.addEventListener("click", closeAppointmentModal);

// Delegation: Nur öffnen, wenn KEINE Vorlage aktiv ist
document.getElementById('calendar')?.addEventListener('click', (e) => {
  const dayEl = e.target.closest('.day');
  if (!dayEl) return;
  if (window.selectedOption) return; // Guard: Vorlage aktiv → kein Modal

  const dateKey = dayEl.getAttribute('data-date');
  openAppointmentModalForDay(dayEl, dateKey);
});

// Speichern-Button im Modal
document.getElementById("saveAppointment")?.addEventListener("click", () => {
  if (!modal) return;
  const dateKey = modal.dataset.anchor;
  if (!dateKey) return;

  const title = document.getElementById("appointmentTitle").value.trim();
  const start = document.getElementById("appointmentStart").value;
  const end   = document.getElementById("appointmentEnd").value;
  const location = document.getElementById("appointmentLocation").value.trim();

  addAppointment(dateKey, { title, start, end, location });

  // Sichtbar nur den betroffenen Tag aktualisieren
  const dayEl = document.querySelector(`[data-date='${dateKey}']`);
  if (dayEl) {
    const map = loadAppointments();
    renderAppointmentsForDay(dayEl, map[dateKey] || []);
  }

  closeAppointmentModal();
});
