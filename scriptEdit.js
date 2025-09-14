let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();
let savedOptions = JSON.parse(localStorage.getItem("savedOptions")) || [];
let selectedOption = null;
let weekStartDay = parseInt(localStorage.getItem("weekStartDay")) || 0; // Standard ist Sonntag (0)

document.addEventListener("DOMContentLoaded", function () {
    createCalendar();

    const optionsButton = document.getElementById("optionsButton");
    const optionsMenu = document.getElementById("optionsMenu");
    const saveOptionButton = document.getElementById("saveOption");
    const weekStartSelect = document.getElementById("weekStartSelect");
    const addNewShiftButton = document.getElementById("addNewShiftButton");
    const closeOptionsMenuButton = document.getElementById("closeOptionsMenu"); // Schließen-X

    // Optionen Button
    if (optionsButton && optionsMenu) {
        optionsButton.addEventListener("click", function () {
            optionsMenu.classList.toggle("show");
            selectedOption = null; // Deaktiviert die OptionsMenu ***
            console.log("Optionen wurden geöffnet!");
        });
    }

    // Schicht speichern
    if (saveOptionButton) {
        saveOptionButton.addEventListener("click", function () {
            const shift = document.getElementById("optionShift").value;
            const color = document.getElementById("optionColor").value;
            const option = { shift, color };

            // Neue Option speichern
            savedOptions.push(option);
            localStorage.setItem("savedOptions", JSON.stringify(savedOptions));

            renderSavedOptions(); // Anzeige der gespeicherten Optionen aktualisieren
        });
    }

    // Wochentag-Auswahl speichern
    if (weekStartSelect) {
        weekStartSelect.value = weekStartDay;
        weekStartSelect.addEventListener("change", (e) => {
            weekStartDay = parseInt(e.target.value);
            localStorage.setItem("weekStartDay", weekStartDay); // Speichern des Wochentages
            createCalendar(); // Kalender neu laden
        });
    }

    renderSavedOptions(); // Optionen beim Laden anzeigen

    // Event für das Plus-Zeichen
    addNewShiftButton.addEventListener("click", function () {
        // Öffne das Optionsmenü, um eine neue Schicht hinzuzufügen
        const optionsMenu = document.getElementById("optionsMenu");
        optionsMenu.classList.add("show");
    });

    // Event für das Schließen-X
    if (closeOptionsMenuButton) {
        closeOptionsMenuButton.addEventListener("click", function () {
            optionsMenu.classList.remove("show"); // Schließt das Menü
        });
    }
});
function renderSavedOptions() {
    let container = document.getElementById("savedOptions");
    container.innerHTML = "";  // Alte Optionen entfernen

    savedOptions.forEach((option, index) => {
        let optionElement = document.createElement("div");
        optionElement.classList.add("option-item");
        optionElement.style.backgroundColor = option.color;

        // Name der Schicht als separaten Element für bessere Struktur
        let optionName = document.createElement("span");
        optionName.classList.add("option-name");
        optionName.textContent = option.shift;

        // Bearbeiten-Icon (Bleistift) hinzufügen
        let editButton = document.createElement("span");
        editButton.innerHTML = '<i class="fa fa-pencil-alt"></i>'; // FontAwesome Bleistift-Icon
        editButton.classList.add("edit-button");
        editButton.title = "Bearbeiten";

        editButton.addEventListener("click", () => {
            // Setze die Werte in die Eingabefelder
            document.getElementById("optionShift").value = option.shift;
            document.getElementById("optionColor").value = option.color;
        
            // Speichere den aktuellen Index der Option, damit wir sie später aktualisieren können
            selectedOption = { ...option, index };
            console.log("Option zur Bearbeitung ausgewählt:", selectedOption);
        });
        

        // Löschen-Icon (rotes X) hinzufügen
        let deleteButton = document.createElement("span");
        deleteButton.innerHTML = '<i class="fa fa-times"></i>'; // FontAwesome X-Icon
        deleteButton.classList.add("delete-button");
        deleteButton.title = "Löschen";

        deleteButton.addEventListener("click", (e) => {
            e.stopPropagation(); // Verhindert das Triggern des "Bearbeiten"-Events
            if (confirm("Möchtest du diese Schicht wirklich löschen?")) {
                savedOptions.splice(index, 1);
                localStorage.setItem("savedOptions", JSON.stringify(savedOptions));
                renderSavedOptions();
                console.log("Option gelöscht:", option);
            }
        });

        // Elemente zusammenfügen
        optionElement.appendChild(optionName);
        optionElement.appendChild(editButton);
        optionElement.appendChild(deleteButton);

        // Klick auf Option markiert sie als ausgewählt
        optionElement.addEventListener("click", () => {
            selectedOption = option;
            document.querySelectorAll(".option-item").forEach(el => el.classList.remove("selected"));
            optionElement.classList.add("selected");
        });

        container.appendChild(optionElement);
    });

    // Das Plus-Zeichen immer anzeigen
    let addButton = document.getElementById("addNewShiftButton");
    addButton.classList.remove("hidden");
}


function createCalendar() {
    const calendar = document.getElementById("calendar");
    calendar.innerHTML = "";

    // Wochentage
    const weekDays = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
    const adjustedWeekDays = weekDays.slice(weekStartDay).concat(weekDays.slice(0, weekStartDay));

    // Wochentags-Leiste erstellen
    adjustedWeekDays.forEach(day => {
        let dayHeader = document.createElement("div");
        dayHeader.classList.add("day-header");
        dayHeader.textContent = day;
        calendar.appendChild(dayHeader);
    });

    // Monat & Jahr anzeigen
    const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
    document.getElementById("calendar-header").innerText = `${monthNames[currentMonth]} ${currentYear}`;

    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

    let startOffset = (firstDay - weekStartDay + 7) % 7;

    // **Fix: Korrekte Werte für Vormonat & Jahr**
    let prevMonth = currentMonth - 1;
    let prevYear = currentYear;
    if (prevMonth < 0) {
        prevMonth = 11;
        prevYear--;
    }

    // **Vormonats-Tage (grau)**
    for (let i = startOffset; i > 0; i--) {
        let dayElement = createDayElement(prevMonthDays - i + 1, prevMonth, prevYear, true);
        calendar.appendChild(dayElement);
    }

    // **Aktuelle Monats-Tage**
    for (let day = 1; day <= daysInMonth; day++) {
        let dayElement = createDayElement(day, currentMonth, currentYear, false);
        calendar.appendChild(dayElement);
    }

    // **Fix: Korrekte Werte für nächsten Monat & Jahr**
    let nextMonth = currentMonth + 1;
    let nextYear = currentYear;
    if (nextMonth > 11) {
        nextMonth = 0;
        nextYear++;
    }

    // **Nächster Monat (grau)**
    let nextMonthDays = 1;
    while (calendar.children.length < 49) {
        let dayElement = createDayElement(nextMonthDays++, nextMonth, nextYear, true);
        calendar.appendChild(dayElement);
    }

    restoreAllDays();
    restoreAppointments();  // 🚀 NEU: Termine wiederherstellen aus appointment.js Datei
}

// ***Nächster Monat *** Vorherige Monat***

function changeMonth(offset) {
    currentMonth += offset;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    } else if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    createCalendar();
}

document.getElementById("prevMonth").addEventListener("click", function () {
    changeMonth(-1);
});

document.getElementById("nextMonth").addEventListener("click", function () {
    changeMonth(1);
});

// *** Erzeuge die Tage  für den aktuellen Monat ***

function createDayElement(day, month, year, isGray) {
    if (typeof year === "undefined" || typeof month === "undefined") {
        console.error("Fehler: Ungültige Werte für createDayElement()", { day, month, year });
        return null; // Falls Werte fehlen, bricht die Funktion ab
    }

    let dayElement = document.createElement("div");
    dayElement.classList.add("day");

    if (isGray) {
        dayElement.classList.add("gray-day");
        dayElement.setAttribute("title", "Dieser Tag gehört zu einem anderen Monat");
    }

    let dayText = document.createElement("span");
    dayText.classList.add("day-text");
    dayText.textContent = day;
    dayElement.appendChild(dayText);

    let shiftDisplay = document.createElement("span");
    shiftDisplay.classList.add("shift-display");
    dayElement.appendChild(shiftDisplay);

    // **Fix: Richtiges Datum formatieren**
    let uniqueKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    dayElement.setAttribute("data-date", uniqueKey);

    // **Debugging: Prüfen, ob der Key korrekt ist**
    console.log("Erstellt:", uniqueKey);

    dayElement.addEventListener("click", () => applySelectedOption(dayElement, uniqueKey));

    return dayElement;
}



function applySelectedOption(dayElement, dateKey) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
        console.error("Fehler: Ungültiger dateKey", dateKey);
        return;
    }

    if (!selectedOption) {
        console.log("Keine Option aktiv, Änderung nicht möglich.");
        return; // Falls keine Option aktiv ist, wird nichts geändert
    }

    const shiftDisplay = dayElement.querySelector(".shift-display");

    dayElement.style.backgroundColor = selectedOption.color;
    shiftDisplay.textContent = selectedOption.shift;
    saveChanges(dateKey, selectedOption.shift, selectedOption.color);
    
}

function saveChanges() {
    let shift = document.getElementById("optionShift").value;
    let color = document.getElementById("optionColor").value;
    
    if (!shift || !color) {
        console.error("Fehlende Werte: Bitte eine Schicht und Farbe eingeben.");
        return;
    }

    let savedOptions = JSON.parse(localStorage.getItem("savedOptions")) || [];

    if (selectedOption !== null && selectedOption.index !== undefined) {
        // Falls eine Option bearbeitet wird, ersetze sie
        savedOptions[selectedOption.index] = { shift, color };
        selectedOption = null; // Auswahl zurücksetzen
    } else {
        // Falls eine neue Option hinzugefügt wird
        savedOptions.push({ shift, color });
    }

    // Speichern & UI aktualisieren
    localStorage.setItem("savedOptions", JSON.stringify(savedOptions));
    renderSavedOptions();
}


// function saveChanges(dateKey, shift, color) {
//     let savedChanges = JSON.parse(localStorage.getItem("savedChanges")) || {}; 

//     savedChanges[dateKey] = { shift, color };

//     localStorage.setItem("savedChanges", JSON.stringify(savedChanges));

//     console.log(`Gespeicherte Änderung: ${dateKey} -> ${shift}, ${color}`);
// }



function removeSavedChange(day) {
    const savedData = JSON.parse(localStorage.getItem("calendarData")) || {};
    const key = `${currentYear}-${currentMonth}-${day}`;
    if (savedData[key]) {
        delete savedData[key]; // Entferne den gespeicherten Tag
        localStorage.setItem("calendarData", JSON.stringify(savedData));
    }
}

function restoreAllDays() {
    let savedChanges = JSON.parse(localStorage.getItem("savedChanges")) || {}; 

    Object.keys(savedChanges).forEach((dateKey) => {
        const dayElement = document.querySelector(`[data-date='${dateKey}']`);
        if (dayElement) {
            const shiftDisplay = dayElement.querySelector(".shift-display");
            dayElement.style.backgroundColor = savedChanges[dateKey].color;
            shiftDisplay.textContent = savedChanges[dateKey].shift;
        }
    });

    console.log("Alle gespeicherten Änderungen wurden geladen:", savedChanges);
}

// 




