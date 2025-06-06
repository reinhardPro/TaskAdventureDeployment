console.log("home.js is loaded");

document.addEventListener("DOMContentLoaded", function () {
  const taskCards = document.querySelectorAll(".task-card");

  taskCards.forEach(card => {
    const title = card.querySelector(".task-title");
    const expand = card.querySelector(".task-expand");
    const details = card.nextElementSibling;

    function toggleDetails() {
      if (details && details.classList.contains("task-details")) {
        const isShown = details.classList.contains("show");

        if (isShown) {
          details.classList.remove("show");
          details.classList.add("hidden");
          card.classList.remove("open");
        } else {
          details.classList.add("show");
          details.classList.remove("hidden");
          card.classList.add("open");
        }
      }
    }

    card.addEventListener("click", toggleDetails);
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const btnMale = document.getElementById("btnMale");
  const btnFemale = document.getElementById("btnFemale");

  btnMale.addEventListener("click", () => {
    btnMale.classList.add("active");
    btnFemale.classList.remove("active");
  });

  btnFemale.addEventListener("click", () => {
    btnFemale.classList.add("active");
    btnMale.classList.remove("active");
  });
});

document.addEventListener("DOMContentLoaded", function () {
  let currentXp = parseInt(document.getElementById("xpInfo").dataset.xp, 10);
  let currentLevel = parseInt(document.getElementById("level")?.dataset.level, 10);
  let xpNeeded = calculateXpNeeded(currentLevel);

  const xpFill = document.getElementById("xpFill");
  const xpInfo = document.getElementById("xpInfo");
  const levelInfo = document.querySelector(".level-info");

function calculateXpNeeded(level) {
  return 100 + (level - 1) * 50;
}

  function updateXPBar(xp, level) {
    currentXp = xp;
    currentLevel = level;
    xpNeeded = calculateXpNeeded(currentLevel);

    const percent = (currentXp / xpNeeded) * 100;
    xpFill.style.width = `${percent}%`;
    xpInfo.textContent = `XP: ${currentXp} / ${xpNeeded}`;
    levelInfo.textContent = `Level: ${currentLevel}`;
  }

  function gainXP(amount) {
    fetch('/api/gain-xp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ xpGained: amount })
    })
      .then(res => res.json())
      .then(data => {
        updateXPBar(data.xp, data.level);
        if (data.leveledUp) {
          alert(`Level Up! Je bent nu op level ${data.level}`);
        }
      });
  }

  function addXP(amount) {
  currentXp += amount;

  while (currentXp >= xpNeeded) {
    currentXp -= xpNeeded;
    currentLevel++;
    xpNeeded = calculateXpNeeded(currentLevel);
  }

  updateXPBar(currentXp, currentLevel);
}

  // complete btn
document.querySelectorAll(".complete-btn").forEach(button => {
  button.addEventListener("click", function (event) {
    event.stopPropagation(); // avoid toggling task details
    button.disabled = true;
button.textContent = "Completing...";
    const taskId = button.dataset.taskId;
    const characterId = button.dataset.characterId;
    const taskXp = parseInt(button.dataset.xp, 10);

    const taskDetails = button.closest(".task-details");
    const taskCard = taskDetails?.previousElementSibling;

    if (!taskId || !characterId || !taskCard || !taskDetails) return;

    // XP update
    addXP(taskXp);

    // Visually fade out
    taskCard.style.opacity = "0.5";
    taskDetails.style.opacity = "0.5";

    // Send async request to server
    fetch(`/task/complete/${taskId}?characterId=${characterId}`, {
      method: 'POST'
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to complete task");
        return res.text(); // or .json() if you return JSON
      })
      .then(() => {
        setTimeout(() => {
          taskCard.remove();
          taskDetails.remove();
          

          const remainingTasks = document.querySelectorAll('.task-card');
  if (remainingTasks.length === 0) {
    const noTasksMessage = document.getElementById("no-tasks-message");
    if (noTasksMessage) {
      noTasksMessage.style.display = "block";
    }
  }
        }, 2000);
      })
      .catch(err => {
        console.error("Error completing task:", err);
        taskCard.style.opacity = "1"; // reset in case of error
        taskDetails.style.opacity = "1";
      });
  });
});

  updateXPBar(currentXp, currentLevel);
});
