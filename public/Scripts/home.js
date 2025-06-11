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

function maybeEvolveCharacter(level) {
  const characterImg = document.querySelector(".character-image");

  if (!characterImg) return;

  const stage1Level = 2; // set this to your real evolution threshold
  const stage2Level = 5;

  const baseImage = characterImg.src; // fallback

  const base = characterImg.dataset.base;
  const evo1 = characterImg.dataset.evo1;
  const evo2 = characterImg.dataset.evo2;

  if (level >= stage2Level && evo2) {
    characterImg.src = evo2;
  } else if (level >= stage1Level && evo1) {
    characterImg.src = evo1;
  } else {
    characterImg.src = base;
  }
}

  function updateXPBar(xp, level) {
    currentXp = xp;
    currentLevel = level;
    xpNeeded = calculateXpNeeded(currentLevel);

    const percent = (currentXp / xpNeeded) * 100;
    xpFill.style.width = `${percent}%`;
    xpInfo.textContent = `XP: ${currentXp} / ${xpNeeded}`;
    levelInfo.textContent = `Level: ${currentLevel}`;
    maybeEvolveCharacter(currentLevel);
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
