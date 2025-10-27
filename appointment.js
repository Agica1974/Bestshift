// appointment.js – kompakte Ansicht, Formular nur auf Wunsch, Punkte im Kalender,
// Mehrfach-Termine, Liste (oben) mit Uhrzeit & Dauer, Edit/Löschen

document.addEventListener("DOMContentLoaded", function () {
  ensureFormSection();          // packt deine Inputs einmal in .appt-form & versteckt sie
  setupAppointmentSystem();     // Click-Delegation
  restoreAppointments();        // Punkte im Kalender nachladen
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

/* ========================================================
   Hilfsfunktionen für den Modal Anzeige(Schicht und Farbe)
   ======================================================== */
  function getShiftInfoForDate(dateKey) {
  const dayEl = document.querySelector(`[data-date='${dateKey}']`);
  if (!dayEl) return { shift: null, color: null };
  const shiftText = dayEl.querySelector(".shift-display")?.textContent?.trim() || null;
  const bgColor = dayEl.style.backgroundColor || null;
  return { shift: shiftText, color: bgColor };
}

function getOrCreateShiftBanner(modal) {
  let el = modal.querySelector(".shift-banner");
  if (!el) {
    el = document.createElement("div");
    el.className = "shift-banner";
    const modalContent = modal.querySelector(".modal-content");
    // 👉 Banner ganz oben einfügen (als erstes Element)
    modalContent.insertBefore(el, modalContent.firstChild);
  }
  return el;
}


// Kürzel → Volltext
function getShiftFullText(short) {
  switch (short) {
    case "F": return "Frühschicht";
    case "S": return "Spätschicht";
    case "N": return "Nachtschicht";
    case "U": return "Urlaub";
    case "K": return "Krank";
    case "WE": return "Wochenende";
    case "Frei": return "Frei";
    default: return "";
  }
}

// Kürzel → Icon
function getShiftIcon(short) {
  switch (short) {
    case "F": return "🌅";
    case "S": return "🌇";
    case "N": return "🌙";
    case "U": return "🏖️";
    case "K": return "🤒";
    case "WE": return "🏡";
    case "Frei": return "✨";
    default: return "➖";
  }
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

  modal.removeAttribute('data-editing-id');

  // 🟡 Schichtanzeige sofort einfügen (immer ganz oben)
  const { shift, color } = getShiftInfoForDate(dateKey);
  const icon = getShiftIcon(shift);
  const fullText = getShiftFullText(shift);
  const shiftBanner = getOrCreateShiftBanner(modal);

  shiftBanner.textContent = shift
    ? `${icon}  ${shift} – ${fullText}`
    : `${icon}  Keine Schicht`;
  shiftBanner.style.backgroundColor = color || "#e0e0e0";
  shiftBanner.style.color = shift ? "#000" : "#666";
  shiftBanner.classList.toggle("empty", !shift);

  // 🔥 Modal sichtbar machen, korrekt positionieren
  modal.style.display = "block";
  modal.style.visibility = "hidden";
  positionModalCorrectly(dayElement, modal);
  modal.style.visibility = "visible";

  modal.dataset.anchor = dateKey;

  // 👇 Modal-Ansicht aufbauen
  const view = clearModalView(modal);
  hideForm();

  const map = loadAppointmentsMap();
  const hasItems = (map[dateKey] || []).length > 0;
  if (hasItems) renderSummaryList(view, dateKey);

  renderQuickActions(view, dateKey);

  saveButton.onclick = function () {
    const editing = modal.dataset.editingId || null;
    saveAppointment(dateKey, editing || null);
  };
  closeButton.onclick = function () {
    modal.style.display = "none";
    modal.removeAttribute('data-editing-id');
    modal.removeAttribute('data-anchor');
  };
}



function positionModalCorrectly(dayElement, modal) {
  const rect = dayElement.getBoundingClientRect();

  const modalWidth  = modal.offsetWidth  || Math.min(320, window.innerWidth * 0.9);
  const modalHeight = modal.offsetHeight || 260;

  const spaceBelow  = window.innerHeight - rect.bottom;
  const spaceAbove  = rect.top;

  let top = rect.bottom + 8;
  let arrowDirection = "bottom";
  if (spaceBelow < modalHeight && spaceAbove > modalHeight) {
    top = rect.top - modalHeight - 8;
    arrowDirection = "top";
  }

  // Modalleiste horizontal zentrieren, aber innerhalb des Viewports klemmen
  let left = rect.left + (rect.width / 2) - (modalWidth / 2);
  left = Math.max(10, Math.min(left, window.innerWidth - modalWidth - 10));

  // Anwenden
  modal.style.width = modalWidth + "px";
  modal.style.top   = `${top}px`;
  modal.style.left  = `${left}px`;
  modal.setAttribute("data-arrow", arrowDirection);

  // >>> Pfeil exakt auf die Tag-Mitte setzen
  const dayCenterX = rect.left + rect.width / 2; // px im Viewport
  const modalLeft  = left;                        // px im Viewport
  // Abstand von der linken Modalkante zur Tagmitte:
  let arrowX = dayCenterX - modalLeft;
  // clamp innerhalb des Modals, 12px Puffer
  arrowX = Math.max(12, Math.min(arrowX, modalWidth - 12));
  modal.style.setProperty("--arrow-x", `${arrowX}px`);
}

/* Repositioniere den Pfeil bei Resize/Scroll */
["resize", "scroll"].forEach(ev => {
  window.addEventListener(ev, () => {
    const modal = document.getElementById('appointmentModal');
    if (!modal || modal.style.display !== 'block') return;
    const dateKey = modal.dataset.anchor;
    if (!dateKey) return;
    const dayEl = document.querySelector(`[data-date='${dateKey}']`);
    if (dayEl) positionModalCorrectly(dayEl, modal);
  }, { passive: true });
});

/* =========================
   Storage-Helper (robust)
   ========================= */
const APPT_KEY = "savedAppointments";

/** Map: { [dateKey]: Array<Appointment> } – migriert alte Einzelobjekte */
function loadAppointmentsMap() {
  let raw = {};
  try { raw = JSON.parse(localStorage.getItem(APPT_KEY)) || {}; }
  catch { raw = {}; }

  let migrated = false;
  Object.keys(raw).forEach(k => {
    if (!Array.isArray(raw[k])) {
      raw[k] = raw[k] ? [ raw[k] ] : [];
      migrated = true;
    }
  });
  if (migrated) localStorage.setItem(APPT_KEY, JSON.stringify(raw));
  return raw;
}
function saveAppointmentsMap(map) {
  localStorage.setItem(APPT_KEY, JSON.stringify(map));
}
function deleteAppointmentById(dateKey, id) {
  const map = loadAppointmentsMap();
  if (!map[dateKey]) return;
  map[dateKey] = map[dateKey].filter(a => a.id !== id);
  if (map[dateKey].length === 0) delete map[dateKey];
  saveAppointmentsMap(map);
  renderAppointmentDotsForDate(dateKey);
  renderAppointmentsInModal(dateKey); // << Liste im Modal sofort aktualisieren
}
function updateAppointmentById(dateKey, id, patch) {
  const map = loadAppointmentsMap();
  const list = map[dateKey] || [];
  const idx = list.findIndex(a => a.id === id);
  if (idx === -1) return false;
  list[idx] = { ...list[idx], ...patch };
  map[dateKey] = list;
  saveAppointmentsMap(map);
  renderAppointmentDotsForDate(dateKey);
  renderAppointmentsInModal(dateKey);
  return true;
}

/* =========================
   Zeit-/UI-Helfer & Ansicht
   ========================= */

// "HH:MM" -> Minuten
function parseTimeToMinutes(t) {
  if (!t || !/^\d{1,2}:\d{2}$/.test(t)) return null;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
// Minuten -> "Xh Ymin"
function formatDuration(mins) {
  if (mins == null) return "";
  const h = Math.floor(mins / 60), m = mins % 60;
  if (h && m) return `${h}h ${m}min`;
  if (h) return `${h}h`;
  return `${m}min`;
}

// einmalig: packt deine Labels/Inputs/Save in .appt-form und versteckt sie
function ensureFormSection() {
  const modal = document.getElementById("appointmentModal");
  if (!modal) return;
  const content = modal.querySelector(".modal-content") || modal;

  // existiert bereits?
  if (content.querySelector(".appt-form")) return;

  const formWrap = document.createElement("div");
  formWrap.className = "appt-form is-hidden"; // per CSS versteckt

  // Alles zwischen dem H2 und dem Save-Button in die Form schieben
  const saveBtn = document.getElementById("saveAppointment");
  const nodes = [];
  let cursor = saveBtn?.previousElementSibling;
  while (cursor && cursor !== content.querySelector("h2")) {
    nodes.push(cursor);
    cursor = cursor.previousElementSibling;
  }
  nodes.reverse().forEach(n => formWrap.appendChild(n)); // in Originalreihenfolge
  content.insertBefore(formWrap, saveBtn);

  // Save-Button Teil des Formulars (damit zusammen ein-/ausblendbar)
  formWrap.appendChild(saveBtn);
}

// modal-view container (oben), wird pro Öffnen geleert
function clearModalView(modal) {
  const content = modal.querySelector(".modal-content") || modal;
  let view = content.querySelector("#appointmentView");
  if (!view) {
    view = document.createElement("div");
    view.id = "appointmentView";
    content.insertBefore(view, content.firstChild);
  }
  view.innerHTML = "";
  view.style.display = "block";
  return view;
}
function hideForm() {
  document.querySelector(".appt-form")?.classList.add("is-hidden");
}
function showForm() {
  document.querySelector(".appt-form")?.classList.remove("is-hidden");
}

// Quick-Actions: + Schicht | + Termin
function renderQuickActions(viewEl, dateKey) {
  const row = document.createElement("div");
  row.style.display = "grid";
  row.style.gridTemplateColumns = "1fr 1px 1fr";
  row.style.alignItems = "center";
  row.style.gap = "12px";
  row.style.padding = "8px 0";
  row.style.marginTop = "6px";

  const addShift = document.createElement("button");
  addShift.textContent = "+  Schicht";
  addShift.style.padding = "8px 10px";
  addShift.style.borderRadius = "6px";
  addShift.onclick = () => {
    // Popover schließen, Vorlagen-Overlay öffnen
    document.getElementById("appointmentModal").style.display = "none";
    const wrapper = document.getElementById("savedOptionsWrapper");
    const controlsRow = document.querySelector(".controls");
    if (wrapper) wrapper.classList.add("show");
    if (controlsRow) controlsRow.classList.add("is-hidden");
  };

  const divider = document.createElement("div");
  divider.style.height = "100%";
  divider.style.background = "#ddd";
  divider.style.width = "1px";
  divider.style.justifySelf = "center";

  const addAppt = document.createElement("button");
  addAppt.textContent = "+  Termin";
  addAppt.style.padding = "8px 10px";
  addAppt.style.borderRadius = "6px";
  addAppt.onclick = () => {
    showAppointmentForm(dateKey); // Formular einblenden
  };

  row.appendChild(addShift);
  row.appendChild(divider);
  row.appendChild(addAppt);
  viewEl.appendChild(row);
}


// Zusammenfassungsliste (oben): Titel, Zeit, Dauer, Ort + Edit/Löschen
function renderSummaryList(viewEl, dateKey) {
  const map = loadAppointmentsMap();
  const items = (map[dateKey] || []).slice();

  // sortiert nach Startzeit
  items.sort((a,b)=> {
    const am = parseTimeToMinutes(a.start), bm = parseTimeToMinutes(b.start);
    if (am == null && bm == null) return 0;
    if (am == null) return 1;
    if (bm == null) return -1;
    return am - bm;
  });

  items.forEach(a => {
    const wrap = document.createElement("div");
    wrap.style.display = "grid";
    wrap.style.gridTemplateColumns = "1fr auto auto";
    wrap.style.alignItems = "center";
    wrap.style.gap = "8px";
    wrap.style.background = "var(--modalCard, #f4f4f6)";
    wrap.style.padding = "10px 12px";
    wrap.style.borderRadius = "10px";
    wrap.style.marginBottom = "8px";

    const left = document.createElement("div");
    left.style.display = "flex";
    left.style.flexDirection = "column";
    left.style.gap = "4px";

    // 🧩 Titel
    const title = document.createElement("div");
    title.textContent = a.title || "Ohne Titel";
    title.style.fontSize = "1.05rem";
    title.style.fontWeight = "600";

    // 🕒 Zeit + Dauer
    const sub = document.createElement("div");
    sub.style.display = "flex";
    sub.style.gap = "10px";
    sub.style.fontFamily = "monospace";
    const timeText = (a.start && a.end) ? `${a.start} – ${a.end}` : (a.start || "");
    const startM = parseTimeToMinutes(a.start), endM = parseTimeToMinutes(a.end);
    const dur    = (startM!=null && endM!=null && endM>=startM) ? formatDuration(endM - startM) : "";
    sub.textContent = timeText;

    // 📍 Ort (neu)
    const locDiv = document.createElement("div");
    locDiv.textContent = a.location ? `📍 ${a.location}` : "";
    locDiv.style.fontSize = "0.85rem";
    locDiv.style.color = "#555";
    locDiv.style.fontStyle = "italic";

    // Dauer separat in Spalte (rechts)
    const durDiv = document.createElement("div");
    durDiv.style.fontFamily = "monospace";
    durDiv.textContent = dur;

    // Buttons Edit/Löschen
    const btnWrap = document.createElement("div");
    btnWrap.style.display = "flex";
    btnWrap.style.gap = "6px";

    const editBtn = document.createElement("button");
    editBtn.textContent = "✎";
    editBtn.title = "Bearbeiten";
    editBtn.style.padding = "4px 6px";
    editBtn.style.fontSize = "0.85rem";
    editBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      showAppointmentForm(dateKey, a.id); // Formular mit Daten
    });

    const delBtn = document.createElement("button");
    delBtn.textContent = "🗑";
    delBtn.title = "Löschen";
    delBtn.style.padding = "4px 6px";
    delBtn.style.fontSize = "0.85rem";
    delBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      if (confirm(`Termin "${a.title || 'Ohne Titel'}" löschen?`)) {
        deleteAppointmentById(dateKey, a.id);
      }
    });

    btnWrap.appendChild(editBtn);
    btnWrap.appendChild(delBtn);

    // Zusammenbauen
    left.appendChild(title);
    left.appendChild(sub);
    if (a.location) left.appendChild(locDiv); // << nur anzeigen, wenn Ort vorhanden

    wrap.appendChild(left);
    wrap.appendChild(durDiv);
    wrap.appendChild(btnWrap);
    viewEl.appendChild(wrap);
  });
}


/* >>> NEU: Liste im geöffneten Modal neu aufbauen (nach Löschen/Ändern) */
function renderAppointmentsInModal(dateKey) {
  const modal = document.getElementById("appointmentModal");
  if (!modal || modal.style.display !== "block") return;

  const view = clearModalView(modal);
  hideForm(); // wir bleiben in der kompakten Ansicht

  const map = loadAppointmentsMap();
  const hasItems = (map[dateKey] || []).length > 0;

  if (hasItems) renderSummaryList(view, dateKey);
  renderQuickActions(view, dateKey);
}

// Formular ein-/ausblenden + ggf. füllen
function showAppointmentForm(dateKey, editingId = null) {
  const modal   = document.getElementById("appointmentModal");
  const content = modal.querySelector(".modal-content") || modal;

  // kompakte Ansicht ausblenden
  const view = content.querySelector("#appointmentView");
  if (view) view.style.display = "none";

  // Formular zeigen
  showForm();

  // Felder befüllen (Edit) oder leeren (Neu)
  const titleEl = document.getElementById("appointmentTitle");
  const startEl = document.getElementById("appointmentStart");
  const endEl   = document.getElementById("appointmentEnd");
  const locEl   = document.getElementById("appointmentLocation");

  if (editingId) {
    const map  = loadAppointmentsMap();
    const list = map[dateKey] || [];
    const appt = list.find(a => a.id === editingId);
    if (appt) {
      titleEl.value = appt.title || "";
      startEl.value = appt.start || "";
      endEl.value   = appt.end || "";
      locEl.value   = appt.location || "";
      modal.dataset.editingId = editingId;
    }
  } else {
    modal.removeAttribute('data-editing-id');
    titleEl.value = "";
    startEl.value = "";
    endEl.value   = "";
    locEl.value   = "";
  }
}

/* ==================================
   Speichern und Sicht aktualisieren
   ================================== */
// editingId === null -> create, sonst update
function saveAppointment(dateKey, editingId = null) {
  const title     = document.getElementById("appointmentTitle").value.trim();
  const startTime = document.getElementById("appointmentStart").value;
  const endTime   = document.getElementById("appointmentEnd").value;
  const location  = document.getElementById("appointmentLocation").value.trim();

  if (!title || !startTime || !endTime) {
    alert("Bitte alle Pflichtfelder ausfüllen.");
    return;
  }

  if (editingId) {
    updateAppointmentById(dateKey, editingId, { title, start: startTime, end: endTime, location });
  } else {
    const map = loadAppointmentsMap();
    const list = map[dateKey] || [];
    const id = (crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now() + Math.random());
    list.push({ id, title, start: startTime, end: endTime, location });
    map[dateKey] = list;
    saveAppointmentsMap(map);
    renderAppointmentDotsForDate(dateKey);
    renderAppointmentsInModal(dateKey);
  }

  // Modal schließen
  const modal = document.getElementById("appointmentModal");
  if (modal) {
    modal.style.display = "none";
    modal.removeAttribute('data-editing-id');
    modal.removeAttribute('data-anchor');
  }
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
function renderAppointmentDotsForDate(dateKey) {
  const dayEl = document.querySelector(`[data-date='${dateKey}']`);
  if (!dayEl) return;
  const map = loadAppointmentsMap();
  renderAppointmentDotsForDayElement(dayEl, map[dateKey] || []);
}
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
