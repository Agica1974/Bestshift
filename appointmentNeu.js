// appointment.js – Punkte-Anzeige + Mehrfach-Termine + robustes Restore

document.addEventListener("DOMContentLoaded", function () {
  setupAppointmentSystem();
  restoreAppointments();
});

/* =========================
   Setup & Click-Delegation
   ========================= */
function setupAppointmentSystem() {
  const calendar = document.getElementById("calendar");
  if (!calendar) return;

  calendar.addEventListener("click", function (event) {
    const clickedDay = event.target.closest(".day");
    if (!clickedDay) return;

    // Guards: Wenn Vorlagen aktiv / sichtbar → kein Modal
    const savedOptionsEl = document.getElementById("savedOptions");
    const optionsMenuEl  = document.getElementById("optionsMenu");
    const savedOptionsVisible = !!savedOptionsEl && savedOptionsEl.classList.contains("show");
    const optionsMenuVisible  = !!optionsMenuEl  && optionsMenuEl.classList.contains("show");

    // zusätzlicher Guard: wenn eine Vorlage (Schicht/Status/Leer) selektiert ist
    if (window.selectedOption) return;

    if (!savedOptionsVisible && !optionsMenuVisible) {
      openAppointmentModal(clickedDay);
    }
  });
}

/* ======================
   Modal öffnen/schließen
   ====================== */
function openAppointmentModal(dayElement) {
  const modal       = document.getElementById("appointmentModal");
  const saveButton  = document.getElementById("saveAppointment");
  const closeButton = document.getElementById("closeAppointment");
  const dateKey     = dayElement.getAttribute("data-date");
  if (!modal || !dateKey) return;

  // sichtbar machen, damit Maße stimmen – aber kurz unsichtbar halten
  modal.style.display = "block";
  modal.style.visibility = "hidden";

  positionModalCorrectly(dayElement, modal);

  // jetzt erst sichtbar
  modal.style.visibility = "visible";

  // Speichern/Schließen-Handler (je Öffnen neu setzen ist ok)
  saveButton.onclick = function () {
    saveAppointment(dateKey);
  };
  closeButton.onclick = function () {
    modal.style.display = "none";
  };
}

function positionModalCorrectly(dayElement, modal) {
  const rect = dayElement.getBoundingClientRect();
  const modalHeight = modal.offsetHeight || 260;
  const modalWidth  = modal.offsetWidth  || Math.min(320, window.innerWidth * 0.9);
  const spaceBelow  = window.innerHeight - rect.bottom;
  const spaceAbove  = rect.top;

  let top = rect.bottom + 8;
  let arrowDirection = "bottom"; // Modal unten, Pfeil zeigt nach oben

  if (spaceBelow < modalHeight && spaceAbove > modalHeight) {
    top = rect.top - modalHeight - 8;
    arrowDirection = "top"; // Modal oben, Pfeil zeigt nach unten
  }

  let left = rect.left + (rect.width / 2) - (modalWidth / 2);
  left = Math.max(10, Math.min(left, window.innerWidth - modalWidth - 10));

  modal.style.width = modalWidth + "px";
  modal.style.top   = `${top}px`;
  modal.style.left  = `${left}px`;
  modal.setAttribute("data-arrow", arrowDirection);
}

/* =========================
   Storage-Helper (robust)
   ========================= */

const APPT_KEY = "savedAppointments";

/**
 * Liefert eine Map: { [dateKey]: Array<Appointment> }
 * Unterstützt Altformat (ein einzelnes Objekt pro Tag) und migriert es zu Array.
 */
function loadAppointmentsMap() {
  let raw = {};
  try {
    raw = JSON.parse(localStorage.getItem(APPT_KEY)) || {};
  } catch {
    raw = {};
  }

  // Migration: wenn Eintrag kein Array ist, in Array umwandeln
  let migrated = false;
  Object.keys(raw).forEach(k => {
    if (!Array.isArray(raw[k])) {
      raw[k] = raw[k] ? [ raw[k] ] : [];
      migrated = true;
    }
  });
  if (migrated) {
    localStorage.setItem(APPT_KEY, JSON.stringify(raw));
  }
  return raw;
}

function saveAppointmentsMap(map) {
  localStorage.setItem(APPT_KEY, JSON.stringify(map));
}

/* ==================================
   Speichern und Sicht aktualisieren
   ================================== */
function saveAppointment(dateKey) {
  const title     = document.getElementById("appointmentTitle").value.trim();
  const startTime = document.getElementById("appointmentStart").value;
  const endTime   = document.getElementById("appointmentEnd").value;
  const location  = document.getElementById("appointmentLocation").value.trim();

  // Du kannst hier die Pflichtfelder lockern, wenn gewünscht
  if (!title || !startTime || !endTime) {
    alert("Bitte alle Pflichtfelder ausfüllen.");
    return;
  }

  const map = loadAppointmentsMap();
  const list = map[dateKey] || [];

  // neue ID (stabil)
  const id = (crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now() + Math.random());
  list.push({ id, title, start: startTime, end: endTime, location });
  map[dateKey] = list;
  saveAppointmentsMap(map);

  renderAppointmentDotsForDate(dateKey);
  document.getElementById("appointmentModal").style.display = "none";

  // Felder optional leeren
  document.getElementById("appointmentTitle").value = "";
  document.getElementById("appointmentStart").value = "";
  document.getElementById("appointmentEnd").value   = "";
  document.getElementById("appointmentLocation").value = "";
}

/* ===========================
   Punkte statt Titel im Tag
   =========================== */
function ensureDotsContainer(dayEl) {
  let wrap = dayEl.querySelector(".appt-dots");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.className = "appt-dots";
    dayEl.appendChild(wrap);
  }
  return wrap;
}

function renderAppointmentDotsForDayElement(dayEl, list) {
  if (!dayEl) return;
  const wrap = ensureDotsContainer(dayEl);
  wrap.innerHTML = "";

  const maxDots = 3;
  const count = Array.isArray(list) ? list.length : 0;
  const shown = Math.min(count, maxDots);

  for (let i = 0; i < shown; i++) {
    const dot = document.createElement("span");
    dot.className = "appt-dot";
    wrap.appendChild(dot);
  }
  if (count > maxDots) {
    const more = document.createElement("span");
    more.className = "appt-plus";
    more.textContent = `+${count - maxDots}`;
    wrap.appendChild(more);
  }
}

/** Render für einen Tag anhand des dateKey (sicher, auch wenn Tag nicht sichtbar ist) */
function renderAppointmentDotsForDate(dateKey) {
  const dayEl = document.querySelector(`[data-date='${dateKey}']`);
  if (!dayEl) return; // anderer Monat, taucht beim nächsten Render auf
  const map = loadAppointmentsMap();
  renderAppointmentDotsForDayElement(dayEl, map[dateKey] || []);
}

/** Abwärtskompatibler Wrapper-Name (ersetzt dein altes updateCalendarDisplay) */
function updateCalendarDisplay(dateKey) {
  renderAppointmentDotsForDate(dateKey);
}

/* ===========================
   Restore bei Seitenstart
   =========================== */
function restoreAppointments() {
  const map = loadAppointmentsMap();
  Object.keys(map).forEach(dateKey => {
    renderAppointmentDotsForDate(dateKey);
  });
  console.log("Alle gespeicherten Termine wurden geladen:", map);
}
