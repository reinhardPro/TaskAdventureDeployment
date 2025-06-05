// Houdt de intervalreferentie bij voor de timer
let timerInterval;

// Totaal aantal seconden dat nog op de timer staat
let totalSeconds = 0;

// Geeft aan of de timer momenteel gepauzeerd is
let isPaused = false;

/**
 * Start of hervat de timer.
 * Als de timer gepauzeerd is en er nog tijd over is, hervat hij zonder opnieuw te starten.
 */
function startTimer() {
    // Hervat timer als deze gepauzeerd was
    if (totalSeconds > 0 && isPaused) {
        isPaused = false;
        return;
    }

    const minutesInput = document.getElementById("minutesInput").value;
    const minutes = parseInt(minutesInput);

    // Voorkom starten met lege of ongeldige invoer
    if (!minutes || minutes < 5 || minutes > 120) {
        alert("Voer een tijd in tussen 5 en 120 minuten.");
        return;
    }

    totalSeconds = minutes * 60;
    isPaused = false;

    // Verberg UI-elementen tijdens de focusmodus
    document.querySelector(".header").style.visibility = "hidden";
    document.querySelector(".footer").style.visibility = "hidden";
    document.getElementById("minutesInput").style.display = "none";

    updateTimerDisplay();

    // Stop vorige interval als die bestaat
    if (timerInterval) clearInterval(timerInterval);

    // Start een nieuwe interval (1 seconde)
    timerInterval = setInterval(() => {
        if (!isPaused) {
            totalSeconds--;
            updateTimerDisplay();

            // Stop timer bij nul
            if (totalSeconds <= 0) clearInterval(timerInterval);
        }
    }, 1000);

    // Activeer fullscreenmodus indien nog niet actief
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.warn("Fullscreen mislukt:", err);
        });
    }
}

/**
 * Pauzeert of hervat de timer.
 */
function pauseTimer() {
    isPaused = !isPaused;
}

/**
 * Stopt de timer volledig en herstelt de oorspronkelijke interface.
 */
function stopTimer() {
    clearInterval(timerInterval);

    // Herstel zichtbaarheid van elementen
    document.querySelector(".header").style.visibility = "visible";
    document.querySelector(".footer").style.visibility = "visible";
    document.querySelector(".timer-controls").style.display = "flex";
    document.getElementById("minutesInput").style.display = "inline-block";

    // Reset de timer en interface
    document.getElementById("timerDisplay").textContent = "00:00";
    totalSeconds = 0;
    isPaused = false;

    // Verlaat fullscreenmodus indien actief
    if (document.fullscreenElement) {
        document.exitFullscreen();
    }
}

/**
 * Werkt de weergave van de timer bij in het formaat mm:ss.
 */
function updateTimerDisplay() {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    document.getElementById("timerDisplay").textContent = formattedTime;
}

/**
 * Alias voor stopTimer, bedoeld om focusmodus te verlaten.
 */
function CloseFocusMode() {
    stopTimer();
}
