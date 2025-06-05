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
    if (totalSeconds > 0 && isPaused) {
        isPaused = false;
        return;
    }

    const minutesInput = document.getElementById("minutesInput").value;
    const minutes = parseInt(minutesInput);

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

    // Toggle button visibility
    document.getElementById("startButton").style.display = "none";
    document.getElementById("pauseButton").style.display = "inline-block";
    document.getElementById("stopButton").style.display = "inline-block";

    updateTimerDisplay();

    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        if (!isPaused) {
            totalSeconds--;
            updateTimerDisplay();
            if (totalSeconds <= 0) clearInterval(timerInterval);
        }
    }, 1000);

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

    document.querySelector(".header").style.visibility = "visible";
    document.querySelector(".footer").style.visibility = "visible";
    document.querySelector(".timer-controls").style.display = "flex";
    document.getElementById("minutesInput").style.display = "inline-block";

    document.getElementById("timerDisplay").textContent = "00:00";
    totalSeconds = 0;
    isPaused = false;

    // Show start, hide pause & stop
    document.getElementById("startButton").style.display = "inline-block";
    document.getElementById("pauseButton").style.display = "none";
    document.getElementById("stopButton").style.display = "none";

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
