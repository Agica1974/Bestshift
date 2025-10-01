/***********************
 * Schichtplaner – Core
 ***********************/

// --- Globaler State ---
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();
let savedOptions = JSON.parse(localStorage.getItem("savedOptions")) || [];
let selectedOption = null;                // aktuell gewählte Vorlage
let weekStartDay = parseInt(localStorage.getItem("weekStartDay")) || 0; // 0=So

// damit appointment.js den Guard sehen kann:
Object.defineProperty(window, "selectedOption", {
  get: () => selectedOption,
  set: (v) => { selectedOption = v; },
  configurable: true
});

// --- Farb-Strategy: 'bg' = ganze Zelle färben | 'text' = nur Schicht-Label färben
const COLOR_MODE = 'bg';

function applyColorToDay(dayEl, color) {
  const label = dayEl.querySelector(".shift-display");
  if (COLOR_MODE === 'bg') {
    dayEl.style.backgroundColor = color || "";
    label.style.color = ""; // reset evtl. alte Textfarbe
  } else {
    label.style.color = color || "";
    dayEl.style.backgroundColor = ""; // reset evtl. alten BG
  }
}

// --- DOM Ready ---
document.addEventListener("DOMContentLoaded", () => {
  // Elemente
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

  // Init
  if (weekStartSelect) weekStartSelect.value = weekStartDay;
  createCalendar();
  renderSavedOptions();

  // Vorlagen anzeigen (Overlay ein, Buttons weich ausblenden)
  optionsButton?.addEventListener("click", () => {
    renderSavedOptions();
    savedOptionsWrapper?.classList.add("show");
    controlsRow?.classList.add("is-hidden");
  });

  // Overlay schließen (Overlay aus, Buttons zurück)
  closeSavedOptionsBtn?.addEventListener("click", () => {
    savedOptionsWrapper?.classList.remove("show");
    controlsRow?.classList.remove("is-hidden");
    // Auswahl optional zurücksetzen:
    // clearSelectedOption();
  });

  // „+“ → Schicht-Modal öffnen
  addNewShiftButton?.addEventListener("click", () => {
    optionsMenu?.classList.add("show");
  });

  // Schicht-Modal schließen
  closeOptionsMenuButton?.addEventListener("click", () => {
    optionsMenu?.classList.remove("show");
  });

  // Schicht speichern
  saveOptionButton?.addEventListener("click", () => {
    const shiftInput = document.getElementById("optionShift");
    const colorInput = document.getElementById("optionColor");
    const shift = (shiftInput?.value || "").trim();
    const color = colorInput?.value || "#47adb5";
    if (!shift) {
      alert("Bitte eine Schichtbezeichnung eingeben (z. B. F / S / N).");
      return;
    }
    savedOptions.push({ shift, color });
    localStorage.setItem("savedOptions", JSON.stringify(savedOptions));
    if (shiftInput) shiftInput.value = "";
    optionsMenu?.classList.remove("show");
    renderSavedOptions();

    // Optional: Overlay direkt zeigen
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
    item.style.backgroundColor = option.color;

    const label = document.createElement("span");
    label.className = "option-name";
    label.textContent = option.shift;
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

function clearSelectedOption() {
  selectedOption = null;
  document.querySelectorAll(".option-item").forEach(el => el.classList.remove("selected"));
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

  const dayText = document.createElement("span");
  dayText.classList.add("day-text");
  dayText.textContent = day;
  el.appendChild(dayText);

  const shiftDisplay = document.createElement("span");
  shiftDisplay.classList.add("shift-display");
  el.appendChild(shiftDisplay);

  const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  el.setAttribute("data-date", dateKey);

  // WICHTIG: Guard – wenn eine Schicht aktiv ist, NICHT das Appointment-Modal öffnen.
  el.addEventListener("click", (e) => {
    if (selectedOption) {
      e.preventDefault();
      e.stopPropagation();
      applySelectedOption(el, dateKey);
      return;
    }
    // Keine Schicht aktiv -> appointment.js darf reagieren und Modal öffnen
  });

  return el;
}

function applySelectedOption(dayElement, dateKey) {
  if (!selectedOption) return;
  const shiftDisplay = dayElement.querySelector(".shift-display");
  shiftDisplay.textContent = selectedOption.shift;
  applyColorToDay(dayElement, selectedOption.color);
  saveChanges(dateKey, selectedOption.shift, selectedOption.color);
}

function saveChanges(dateKey, shift, color) {
  const savedChanges = JSON.parse(localStorage.getItem("savedChanges")) || {};
  savedChanges[dateKey] = { shift, color };
  localStorage.setItem("savedChanges", JSON.stringify(savedChanges));
}

function restoreAllDays() {
  const savedChanges = JSON.parse(localStorage.getItem("savedChanges")) || {};
  Object.keys(savedChanges).forEach((dateKey) => {
    const dayElement = document.querySelector(`[data-date='${dateKey}']`);
    if (!dayElement) return;
    const shiftDisplay = dayElement.querySelector(".shift-display");
    shiftDisplay.textContent = savedChanges[dateKey].shift;
    applyColorToDay(dayElement, savedChanges[dateKey].color);
  });
}
