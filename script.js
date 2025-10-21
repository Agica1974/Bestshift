// --- State ---
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();
let savedOptions = JSON.parse(localStorage.getItem("savedOptions")) || [];
let selectedOption = null;
let weekStartDay = parseInt(localStorage.getItem("weekStartDay")) || 0; // 0=So

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

  const savedOptionsWrapper    = document.getElementById("savedOptionsWrapper"); // Overlay
  const savedOptionsContainer  = document.getElementById("savedOptions");
  const closeSavedOptionsBtn   = document.getElementById("closeSavedOptionsBtn");
  const controlsRow            = document.querySelector(".controls");           // ganze Button-Zeile

  // Init
  weekStartSelect.value = weekStartDay;
  createCalendar();
  renderSavedOptions();

  // --- Öffnen Vorlagen: Overlay zeigen, Buttons „verstecken“ (Platz bleibt) ---
  optionsButton.addEventListener("click", () => {
    renderSavedOptions();
    savedOptionsWrapper.classList.add("show");   // Overlay an
    controlsRow.classList.add("is-hidden");         // Buttons unsichtbar (lassen Platz)
  });

  // --- Overlay schließen: Overlay aus, Buttons wieder sichtbar ---
  closeSavedOptionsBtn.addEventListener("click", () => {
    savedOptionsWrapper.classList.remove("show");
    controlsRow.classList.remove("is-hidden");
    selectedOption = null;
  });

  // „+“ → Modal zum Anlegen einer Schicht öffnen
  addNewShiftButton.addEventListener("click", () => {
    optionsMenu.classList.add("show");
  });

  // Modal schließen
  closeOptionsMenuButton.addEventListener("click", () => {
    optionsMenu.classList.remove("show");
  });

  // Schicht speichern
  saveOptionButton.addEventListener("click", () => {
    const shiftInput = document.getElementById("optionShift");
    const colorInput = document.getElementById("optionColor");
    const shift = (shiftInput.value || "").trim();
    const color = colorInput.value || "#47adb5";
    // if (!shift) {
    //   alert("Bitte eine Schichtbezeichnung eingeben (z. B. F / S / N).");
    //   return;
    // }
    savedOptions.push({ shift, color });
    localStorage.setItem("savedOptions", JSON.stringify(savedOptions));
    shiftInput.value = "";
    optionsMenu.classList.remove("show");
    renderSavedOptions();
    // Optional: Overlay sofort zeigen
    savedOptionsWrapper.classList.add("show");
    controlsRow.classList.add("hidden");
  });

  // Wochentags-Start ändern
  weekStartSelect.addEventListener("change", (e) => {
    weekStartDay = parseInt(e.target.value);
    localStorage.setItem("weekStartDay", weekStartDay);
    createCalendar();
  });

  // Monatswechsel (BLEIBT wie gehabt!)
  prevMonthBtn.addEventListener("click", () => changeMonth(-1));
  nextMonthBtn.addEventListener("click", () => changeMonth(1));
});

// --- Render saved options ---
function renderSavedOptions() {
  const container = document.getElementById("savedOptions");
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
      selectedOption = option;
      document.querySelectorAll(".option-item").forEach(el => el.classList.remove("selected"));
      item.classList.add("selected");
    });

    container.appendChild(item);
    createCalendar();
  });
}

// --- Calendar ---
function createCalendar() {
  const calendar = document.getElementById("calendar");
  calendar.innerHTML = "";

  const weekDays = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
  const adjustedWeekDays = weekDays.slice(weekStartDay).concat(weekDays.slice(0, weekStartDay));

  // Header
  adjustedWeekDays.forEach(day => {
    const dayHeader = document.createElement("div");
    dayHeader.classList.add("day-header");
    dayHeader.textContent = day;
    calendar.appendChild(dayHeader);
  });

  // Monat & Jahr
  const monthNames = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
  document.getElementById("calendar-header").innerText = `${monthNames[currentMonth]} ${currentYear}`;

  const firstDay     = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth  = new Date(currentYear, currentMonth + 1, 0).getDate();
  const prevMonthDays= new Date(currentYear, currentMonth, 0).getDate();
  let startOffset    = (firstDay - weekStartDay + 7) % 7;

  // Vorheriger Monat
  let prevMonth = currentMonth - 1;
  let prevYear  = currentYear;
  if (prevMonth < 0) { prevMonth = 11; prevYear--; }
  for (let i = startOffset; i > 0; i--) {
    const d = createDayElement(prevMonthDays - i + 1, prevMonth, prevYear, true);
    calendar.appendChild(d);
  }

  // Aktueller Monat
  for (let day = 1; day <= daysInMonth; day++) {
    const d = createDayElement(day, currentMonth, currentYear, false);
    calendar.appendChild(d);
  }

  // Nächster Monat: GENAU bis 49 Kinder (7 Header + 42 Tage)
  let nextMonth = currentMonth + 1;
  let nextYear  = currentYear;
  if (nextMonth > 11) { nextMonth = 0; nextYear++; }

  let nextMonthDays = 1;
  while (calendar.children.length < 49) {
    const d = createDayElement(nextMonthDays++, nextMonth, nextYear, true);
    calendar.appendChild(d);
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

  // NEU: Entscheidungslogik + Event stoppen
  el.addEventListener("click", (e) => {
    if (selectedOption) {
      // Schicht ist aktiv → Schicht anwenden, Termin-Modal NICHT öffnen
      e.preventDefault();
      e.stopPropagation();
      applySelectedOption(el, dateKey);
      return;
    }
    // Keine Schicht aktiv → hier NICHTS tun; appointment.js darf das Modal öffnen
  });

  return el;
}

function applySelectedOption(dayElement, dateKey) {
  if (!selectedOption) return;
  const shiftDisplay = dayElement.querySelector(".shift-display");
  shiftDisplay.textContent = selectedOption.shift;  // Text unter dem Datum
  // Optional: nur den Text einfärben, nicht die ganze Zelle
  // shiftDisplay.style.color = selectedOption.color;

  // Wenn du die Zelle färben willst, entkommentieren:
   dayElement.style.backgroundColor = selectedOption.color;

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
    dayElement.style.backgroundColor = savedChanges[dateKey].color; 
    shiftDisplay.textContent = savedChanges[dateKey].shift;
  });
}
