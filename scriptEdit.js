/***********************
 * Schichtplaner – Core
 ***********************/

// --- Globaler State ---
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();
let savedOptions = JSON.parse(localStorage.getItem("savedOptions")) || [];
let selectedOption = null;                // aktuell gewählte Vorlage
let weekStartDay = parseInt(localStorage.getItem("weekStartDay")) || 0; // 0=So

// Für appointment.js als Guard sichtbar machen:
Object.defineProperty(window, "selectedOption", {
  get: () => selectedOption,
  set: (v) => { selectedOption = v; },
  configurable: true
});

// --- Farb-Strategy: 'bg' = ganze Zelle färben | 'text' = nur Schicht-Label färben
const COLOR_MODE = 'bg';

// Status-Kürzel (erweiterbar)
const STATUS_CODES = new Set(["U", "Urlaub", "K", "Krank"]);
const isStatusCode = (code = "") => STATUS_CODES.has(code.trim());

// Helpers
function applyColorToDay(dayEl, color) {
  if (!dayEl || dayEl.classList.contains('gray-day')) return; // Randtage nicht färben
  const label = dayEl.querySelector('.shift-display');
  if (COLOR_MODE === 'bg') {
    dayEl.style.backgroundColor = color || "";
    if (label) label.style.color = "";
  } else {
    if (label) label.style.color = color || "";
    dayEl.style.backgroundColor = "";
  }
}

// Status-Leiste + Badge rendern
function renderStatusUI(dayEl, statusCode, statusColor) {
  const strip = dayEl.querySelector('.status-strip');
  const badge = dayEl.querySelector('.status-badge');

  if (!statusCode) {
    if (strip) strip.style.background = 'transparent';
    if (badge) { badge.style.display = 'none'; badge.textContent = ''; }
    return;
  }
  if (strip) strip.style.background = statusColor || '#0a0';
  if (badge) {
    badge.textContent = statusCode[0].toUpperCase();
    badge.style.display = 'inline-block';
  }
}

// Tag vollständig rendern (Base + Status)
function renderDayRecord(dayEl, rec) {
  if (!dayEl) return;
  const label = dayEl.querySelector(".shift-display");
  const isGray = dayEl.classList.contains("gray-day");

  // Reset
  dayEl.style.background = "";
  dayEl.style.backgroundColor = "";
  if (label) { label.style.color = ""; label.textContent = ""; }

  if (!rec) { renderStatusUI(dayEl, null, null); return; }

  const baseShift = rec.shift || "";
  const baseColor = rec.color || "";
  const statusCode = rec.statusCode || "";
  const statusColor = rec.statusColor || "";

  // Base-Label
  if (label) label.textContent = baseShift || "";

  // Base-Farbe (keine 50/50, Status ist als Leiste)
  if (!isGray && baseColor) {
    dayEl.style.backgroundColor = baseColor;
  }

  // Status unten als Leiste + Badge
  renderStatusUI(dayEl, statusCode, statusColor);
}

document.addEventListener("DOMContentLoaded", () => {
  // DOM
  const optionsButton          = document.getElementById("optionsButton");
  const addNewShiftButton      = document.getElementById("addNewShiftButton");
  const prevMonthBtn           = document.getElementById("prevMonth");
  const nextMonthBtn           = document.getElementById("nextMonth");

  const optionsMenu            = document.getElementById("optionsMenu");
  const closeOptionsMenuButton = document.getElementById("closeOptionsMenu");
  const saveOptionButton       = document.getElementById("saveOption");
  const weekStartSelect        = document.getElementById("weekStartSelect");

  const savedOptionsWrapper    = document.getElementById("savedOptionsWrapper"); // Overlay über Buttons
  const closeSavedOptionsBtn   = document.getElementById("closeSavedOptionsBtn");
  const controlsRow            = document.querySelector(".controls");

  if (weekStartSelect) weekStartSelect.value = weekStartDay;

  createCalendar();
  renderSavedOptions();

  // Vorlagen anzeigen
  optionsButton?.addEventListener("click", () => {
    renderSavedOptions();
    savedOptionsWrapper?.classList.add("show");
    controlsRow?.classList.add("is-hidden");
  });

  // Overlay schließen
  closeSavedOptionsBtn?.addEventListener("click", () => {
    savedOptionsWrapper?.classList.remove("show");
    controlsRow?.classList.remove("is-hidden");
    clearSelectedOption();
  });

  // „+“ → Schicht-Modal öffnen
  addNewShiftButton?.addEventListener("click", () => {
    optionsMenu?.classList.add("show");
  });

  // Schicht-Modal schließen
  closeOptionsMenuButton?.addEventListener("click", () => {
    optionsMenu?.classList.remove("show");
    clearSelectedOption();
  });

  function clearSelectedOption() {
  selectedOption = null;
  document.querySelectorAll(".option-item").forEach(el => el.classList.remove("selected"));
}


  // Schicht speichern – leere Option jetzt ERLAUBT
  saveOptionButton?.addEventListener("click", () => {
    const shiftInput = document.getElementById("optionShift");
    const colorInput = document.getElementById("optionColor");

    const shift = (shiftInput?.value || "").trim();      // darf leer sein
    const color = colorInput?.value || "#47adb5";

    savedOptions.push({ shift, color });
    localStorage.setItem("savedOptions", JSON.stringify(savedOptions));

    if (shiftInput) shiftInput.value = "";
    optionsMenu?.classList.remove("show");
    renderSavedOptions();

    // Overlay direkt zeigen
    savedOptionsWrapper?.classList.add("show");
    controlsRow?.classList.add("is-hidden");
  });

  // Wochenstart ändern
  weekStartSelect?.addEventListener("change", (e) => {
    weekStartDay = parseInt(e.target.value);
    localStorage.setItem("weekStartDay", weekStartDay);
    createCalendar();
  });

  // Monatswechsel
  prevMonthBtn?.addEventListener("click", () => changeMonth(-1));
  nextMonthBtn?.addEventListener("click", () => changeMonth(1));
});

/* ===========================
   Vorlagen-Rendering / Auswahl
   =========================== */
function renderSavedOptions() {
  const container = document.getElementById("savedOptions");
  if (!container) return;
  container.innerHTML = "";

  if (!savedOptions.length) {
    const p = document.createElement("p");
    p.textContent = "Vorlage noch nicht erstellt!";
    p.className = "empty-info";
    container.appendChild(p);
    return;
  }

  savedOptions.forEach((option) => {
    const item = document.createElement("div");
    item.className = "option-item";

    const isClear = option.shift.trim() === "";

    if (!isClear) {
      item.style.backgroundColor = option.color;
    } else {
      // leere Option neutral darstellen
      item.style.backgroundColor = "#fff";
      item.style.borderStyle = "dashed";
    }

    const label = document.createElement("span");
    label.className = "option-name";
    label.textContent = isClear ? "Leer" : option.shift;
    item.appendChild(label);

    item.addEventListener("click", () => {
      setSelectedOption(option, item);
    });

    container.appendChild(item);
  });
}

function setSelectedOption(option, itemEl) {
  selectedOption = option; // via window getter/setter global
  document.querySelectorAll(".option-item").forEach(el => el.classList.remove("selected"));
  itemEl?.classList.add("selected");
}

/* ==============
   Kalender-Logik
   ============== */
function createCalendar() {
  const calendar = document.getElementById("calendar");
  if (!calendar) return;
  calendar.innerHTML = "";

  // Wochentage rendern
  const weekDays = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
  const adjusted = weekDays.slice(weekStartDay).concat(weekDays.slice(0, weekStartDay));
  adjusted.forEach(day => {
    const head = document.createElement("div");
    head.classList.add("day-header");
    head.textContent = day;
    calendar.appendChild(head);
  });

  // Header: Monat/Jahr
  const monthNames = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
  const headerEl = document.getElementById("calendar-header");
  if (headerEl) headerEl.innerText = `${monthNames[currentMonth]} ${currentYear}`;

  // Tage berechnen
  const firstDay      = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth   = new Date(currentYear, currentMonth + 1, 0).getDate();
  const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
  const startOffset   = (firstDay - weekStartDay + 7) % 7;

  // Vorheriger Monat
  let prevMonth = currentMonth - 1;
  let prevYear  = currentYear;
  if (prevMonth < 0) { prevMonth = 11; prevYear--; }
  for (let i = startOffset; i > 0; i--) {
    calendar.appendChild(createDayElement(prevMonthDays - i + 1, prevMonth, prevYear, true));
  }

  // Aktueller Monat
  for (let day = 1; day <= daysInMonth; day++) {
    calendar.appendChild(createDayElement(day, currentMonth, currentYear, false));
  }

  // Nächster Monat: genau bis 49 Kinder (7 Header + 42 Tage)
  let nextMonth = currentMonth + 1;
  let nextYear  = currentYear;
  if (nextMonth > 11) { nextMonth = 0; nextYear++; }
  let nextMonthDay = 1;
  while (calendar.children.length < 49) {
    calendar.appendChild(createDayElement(nextMonthDay++, nextMonth, nextYear, true));
  }

  restoreAllDays();

  // Termine nachziehen (aus appointment.js)
  if (window.restoreAppointments) window.restoreAppointments();
}

function changeMonth(offset) {
  currentMonth += offset;
  if (currentMonth < 0) { currentMonth = 11; currentYear--; }
  else if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  createCalendar();
}

function createDayElement(day, month, year, isGray) {
  const el = document.createElement("div");
  el.classList.add("day");
  if (isGray) el.classList.add("gray-day");

  // Reset evtl. alter Inline-Styles (bei Re-Render)
  el.style.backgroundColor = '';
  el.style.color = '';

  const dayText = document.createElement("span");
  dayText.classList.add("day-text");
  dayText.textContent = day;
  el.appendChild(dayText);

  const shiftDisplay = document.createElement("span");
  shiftDisplay.classList.add("shift-display");
  el.appendChild(shiftDisplay);

  // Termin-Punkte-Container
  const dots = document.createElement("div");
  dots.className = "appt-dots";
  el.appendChild(dots);

  // Status-Leiste + Badge
  const strip = document.createElement("div");
  strip.className = "status-strip";
  el.appendChild(strip);

  const badge = document.createElement("div");
  badge.className = "status-badge";
  badge.style.display = "none";
  el.appendChild(badge);

  const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  el.setAttribute("data-date", dateKey);

  // WICHTIG: Guard – wenn eine Vorlage aktiv ist, KEIN Appointment-Modal öffnen.
  el.addEventListener("click", (e) => {
    if (selectedOption) {
      e.preventDefault();
      e.stopPropagation();
      applySelectedOption(el, dateKey);
      return;
    }
    // sonst: appointment.js öffnet das Modal (Delegation)
  });

  return el;
}

// function applySelectedOption(dayElement, dateKey) {
//   if (!selectedOption) return;

//   const saved = JSON.parse(localStorage.getItem("savedChanges")) || {};
//   const existing = saved[dateKey] || { shift: "", color: "" };

//   const selShift = (selectedOption.shift || "").trim();
//   const selColor = selectedOption.color || "";

//   // Leere Option = Reset der Base (Status bleibt)
//   if (selShift === "") {
//     const updated = {
//       shift: "",
//       color: "",
//       statusCode: existing.statusCode || "",
//       statusColor: existing.statusColor || ""
//     };
//     // Wenn komplett leeren gewünscht, Status auch löschen:
//     // updated.statusCode = ""; updated.statusColor = "";
//     if (!updated.shift && !updated.statusCode) {
//       delete saved[dateKey];
//       localStorage.setItem("savedChanges", JSON.stringify(saved));
//       renderDayRecord(dayElement, null);
//       return;
//     }
//     saved[dateKey] = updated;
//     localStorage.setItem("savedChanges", JSON.stringify(saved));
//     renderDayRecord(dayElement, updated);
//     return;
//   }

//   if (isStatusCode(selShift)) {
//     // Status setzen/ersetzen, Base behalten
//     const updated = {
//       shift: existing.shift || "",
//       color: existing.color || "",
//       statusCode: selShift,
//       statusColor: selColor || "#0a0"
//     };
//     saved[dateKey] = updated;
//     localStorage.setItem("savedChanges", JSON.stringify(saved));
//     renderDayRecord(dayElement, updated);
//     return;
//   }

function applySelectedOption(dayElement, dateKey) {
  if (!selectedOption) return;

  const saved = JSON.parse(localStorage.getItem("savedChanges")) || {};
  const existing = saved[dateKey] || { shift: "", color: "" };

  const selShift = (selectedOption.shift || "").trim();
  const selColor = selectedOption.color || "";

  // --- LEERE OPTION = RADIERGUMMI ---
  if (selShift === "") {
    // Falls ein Status gesetzt ist -> nur den Status entfernen, Basis behalten
    if (existing.statusCode) {
      const updated = {
        shift: existing.shift || "",
        color: existing.color || "",
        statusCode: "",
        statusColor: ""
      };
      // Wenn Basis leer UND Status gelöscht -> gesamten Eintrag entfernen
      if (!updated.shift) {
        delete saved[dateKey];
        localStorage.setItem("savedChanges", JSON.stringify(saved));
        renderDayRecord(dayElement, null);
        return;
      }
      saved[dateKey] = updated;
      localStorage.setItem("savedChanges", JSON.stringify(saved));
      renderDayRecord(dayElement, updated);
      return;
    }

    // Kein Status vorhanden -> Basis leeren (wie gehabt)
    if (existing.shift) {
      const updated = { shift: "", color: "", statusCode: "", statusColor: "" };
      delete saved[dateKey]; // komplett entfernen, ist jetzt leer
      localStorage.setItem("savedChanges", JSON.stringify(saved));
      renderDayRecord(dayElement, null);
      return;
    }

    // War schon leer
    renderDayRecord(dayElement, null);
    return;
  }

  // --- STATUS setzen ---
  if (isStatusCode(selShift)) {
    const updated = {
      shift: existing.shift || "",
      color: existing.color || "",
      statusCode: selShift,
      statusColor: selColor || "#0a0"
    };
    saved[dateKey] = updated;
    localStorage.setItem("savedChanges", JSON.stringify(saved));
    renderDayRecord(dayElement, updated);
    return;
  }

  // --- BASIS setzen ---
  const updated = {
    shift: selShift,
    color: selColor,
    statusCode: existing.statusCode || "",
    statusColor: existing.statusColor || ""
  };
  saved[dateKey] = updated;
  localStorage.setItem("savedChanges", JSON.stringify(saved));
  renderDayRecord(dayElement, updated);
}


function restoreAllDays() {
  const savedChanges = JSON.parse(localStorage.getItem("savedChanges")) || {};
  Object.keys(savedChanges).forEach((dateKey) => {
    const dayElement = document.querySelector(`[data-date='${dateKey}']`);
    if (!dayElement) return;
    renderDayRecord(dayElement, savedChanges[dateKey]);
  });
}
