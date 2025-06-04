let timerInterval;
let totalSeconds = 0;
let isPaused = false;

/**
 * Start de timer op basis van de ingevoerde minuten.
 * Herstart timer als deze gepauzeerd was.
 */
function startTimer() {
    const input = document.getElementById("minutesInput");
    const minutes = parseInt(input.value);

    if (isPaused && totalSeconds > 0) {
        isPaused = false;
        return;
    }

    if (!minutes || minutes <= 0) return;

    totalSeconds = minutes * 60;
    isPaused = false;

    toggleElementsVisibility(false);
    updateTimerDisplay();

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (!isPaused) {
            totalSeconds--;
            updateTimerDisplay();

            if (totalSeconds <= 0) clearInterval(timerInterval);
        }
    }, 1000);

    enterFullscreen();
}

/** Wisselt tussen pauze en hervatten van de timer. */
function pauseTimer() {
    isPaused = !isPaused;
}

/** Stopt de timer en reset de interface. */
function stopTimer() {
    clearInterval(timerInterval);
    totalSeconds = 0;
    isPaused = false;

    toggleElementsVisibility(true);
    document.getElementById("timerDisplay").textContent = "00:00";

    exitFullscreen();
}

/** Update de timerweergave in mm:ss-formaat. */
function updateTimerDisplay() {
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    document.getElementById("timerDisplay").textContent = `${minutes}:${seconds}`;
}

/** Hulpfunctie: Verberg of toon UI-elementen. */
function toggleElementsVisibility(show) {
    const visibility = show ? "visible" : "hidden";
    const displayInput = show ? "inline-block" : "none";
    const displayControls = show ? "flex" : "none";

    document.querySelector(".header")?.style.visibility = visibility;
    document.querySelector(".footer")?.style.visibility = visibility;
    document.getElementById("minutesInput").style.display = displayInput;
    document.querySelector(".timer-controls").style.display = displayControls;
}

/** Activeer fullscreenmodus (indien nog niet actief). */
function enterFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.warn("Fullscreen mislukt:", err);
        });
    }
}

/** Verlaat fullscreenmodus (indien actief). */
function exitFullscreen() {
    if (document.fullscreenElement) {
        document.exitFullscreen();
    }
}

/** Alias voor het sluiten van de focusmodus. */
function CloseFocusMode() {
    stopTimer();
}
