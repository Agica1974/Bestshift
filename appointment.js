
document.addEventListener("DOMContentLoaded", function () {
    setupAppointmentSystem();
    restoreAppointments();
});



function setupAppointmentSystem() {
    const calendar = document.getElementById("calendar");

    if (calendar) {
        calendar.addEventListener("click", function (event) {
            const clickedDay = event.target.closest(".day");
            // Überprüfen, ob #savedOptions sichtbar ist
            const savedOptionsVisible = document.getElementById("savedOptions").classList.contains("show");

            // Wenn savedOptions sichtbar sind, Modal nicht öffnen
            if (clickedDay && !savedOptionsVisible && !document.getElementById("optionsMenu").classList.contains("show")) {
                openAppointmentModal(clickedDay);
            }
        });
    }
}
function openAppointmentModal(dayElement) {
    const modal = document.getElementById("appointmentModal");
    const saveButton = document.getElementById("saveAppointment");
    const closeButton = document.getElementById("closeAppointment");
    const dateKey = dayElement.getAttribute("data-date");

    if (!modal) return;

    // 🛠 Erst verstecken, um Höhe korrekt zu berechnen
    modal.style.display = "block";
    modal.style.visibility = "hidden";

    // 📌 Modal positionieren
    positionModalCorrectly(dayElement, modal);

    // 🔥 Jetzt erst sichtbar machen
    modal.style.visibility = "visible";

    // Event-Listener für Speichern setzen
    saveButton.onclick = function () {
        saveAppointment(dateKey);
    };

    // Event-Listener für Schließen setzen
    closeButton.onclick = function () {
        modal.style.display = "none";
    };
}

function saveAppointment(dateKey) {
    const title = document.getElementById("appointmentTitle").value;
    const startTime = document.getElementById("appointmentStart").value;
    const endTime = document.getElementById("appointmentEnd").value;
    const location = document.getElementById("appointmentLocation").value;

    if (!title || !startTime || !endTime) {
        alert("Bitte alle Pflichtfelder ausfüllen.");
        return;
    }

    let savedAppointments = JSON.parse(localStorage.getItem("savedAppointments")) || {};
    savedAppointments[dateKey] = { title, startTime, endTime, location };

    localStorage.setItem("savedAppointments", JSON.stringify(savedAppointments));

    updateCalendarDisplay(dateKey);
    document.getElementById("appointmentModal").style.display = "none";
}

function updateCalendarDisplay(dateKey) {
    const dayElement = document.querySelector(`[data-date='${dateKey}']`);
    const savedAppointments = JSON.parse(localStorage.getItem("savedAppointments")) || {};

    if (dayElement && savedAppointments[dateKey]) {
        let appointmentDisplay = dayElement.querySelector(".appointment-display");

        if (!appointmentDisplay) {
            appointmentDisplay = document.createElement("div");
            appointmentDisplay.classList.add("appointment-display");
            dayElement.appendChild(appointmentDisplay);
        }

        appointmentDisplay.textContent = savedAppointments[dateKey].title;
    }
}

// *** Modal nach Wunsch positionieren *** //

function positionModalCorrectly(dayElement, modal) {
    const rect = dayElement.getBoundingClientRect(); // Position des Tages holen
    const modalHeight = modal.offsetHeight;
    const modalWidth = modal.offsetWidth;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    
    // Standard: Modal unter dem Tag
    let top = rect.bottom + 8; // 8px Abstand
    let arrowDirection = "bottom"; // Pfeil zeigt nach OBEN (Modal ist UNTEN)

    // Falls unten nicht genug Platz ist, über den Tag anzeigen
    if (spaceBelow < modalHeight && spaceAbove > modalHeight) {
        top = rect.top - modalHeight - 8;
        arrowDirection = "top"; // Pfeil zeigt nach UNTEN (Modal ist OBEN)
    }

    // Horizontale Positionierung (zentriert zum Tag)
    let left = rect.left + (rect.width / 2) - (modalWidth / 2);

    // Verhindern, dass das Modal aus dem Bildschirm ragt
    left = Math.max(10, Math.min(left, window.innerWidth - modalWidth - 10));

    // Modal platzieren
    modal.style.top = `${top}px`;
    modal.style.left = `${left}px`;

    // 🔥 Pfeilrichtung richtig setzen
    modal.setAttribute("data-arrow", arrowDirection);
}
  

// ✅ Beim Laden gespeicherte Termine anzeigen
function restoreAppointments() {
    let savedAppointments = JSON.parse(localStorage.getItem("savedAppointments")) || {};

    Object.keys(savedAppointments).forEach(dateKey => {
        updateCalendarDisplay(dateKey);
    });

    console.log("Alle gespeicherten Termine wurden geladen:", savedAppointments);
}





