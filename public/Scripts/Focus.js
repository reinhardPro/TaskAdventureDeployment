let timerInterval;
let totalSeconds = 0;
let isPaused = false;

function startTimer() {
    if (totalSeconds > 0 && isPaused) {
        isPaused = false;
        return;
    }

    const minutesInput = document.getElementById("minutesInput").value;
    if (!minutesInput || minutesInput <= 0) return;

    totalSeconds = parseInt(minutesInput) * 60;
    isPaused = false;

    document.querySelector(".header").style.visibility = "hidden";
    document.querySelector(".footer").style.visibility = "hidden";
    document.getElementById("minutesInput").style.display = "none";

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




function pauseTimer() {
    isPaused = !isPaused;
}

function stopTimer() {
    clearInterval(timerInterval);
    document.querySelector(".header").style.visibility = "visible";
    document.querySelector(".footer").style.visibility = "visible";
    document.querySelector(".timer-controls").style.display = "flex";
    document.getElementById("minutesInput").style.display = "inline-block";
    document.getElementById("timerDisplay").textContent = "00:00";
    totalSeconds = 0;

    if (document.fullscreenElement) {
        document.exitFullscreen();
    }
}



function updateTimerDisplay() {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    document.getElementById("timerDisplay").textContent =
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function CloseFocusMode() {
    stopTimer();
}
