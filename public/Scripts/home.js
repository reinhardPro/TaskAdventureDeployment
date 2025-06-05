// Log om te bevestigen dat het script geladen is
console.log("home.js is loaded");

// ================================
// 1. Toggle Task Details on Click
// ================================
document.addEventListener("DOMContentLoaded", function () {
  const taskCards = document.querySelectorAll(".task-card");

  taskCards.forEach(card => {
    const title = card.querySelector(".task-title");
    const expand = card.querySelector(".task-expand");
    const details = card.nextElementSibling; // De details-container staat direct na de task-card in de DOM

    function toggleDetails() {
      if (details && details.classList.contains("task-details")) {
        const isShown = details.classList.contains("show");

        if (isShown) {
          // Verberg de details
          details.classList.remove("show");
          details.classList.add("hidden");
          card.classList.remove("open");
        } else {
          // Toon de details
          details.classList.add("show");
          details.classList.remove("hidden");
          card.classList.add("open");
        }
      }
    }

    // Toggle details bij klikken op de kaart
    card.addEventListener("click", toggleDetails);
  });
});

// ======================================
// 2. Toggle Active State (Gender Select)
// ======================================
document.addEventListener("DOMContentLoaded", () => {
  const btnMale = document.getElementById("btnMale");
  const btnFemale = document.getElementById("btnFemale");

  // Activeer mannelijke knop
  btnMale.addEventListener("click", () => {
    btnMale.classList.add("active");
    btnFemale.classList.remove("active");
  });

  // Activeer vrouwelijke knop
  btnFemale.addEventListener("click", () => {
    btnFemale.classList.add("active");
    btnMale.classList.remove("active");
  });
});

// =============================
// 3. XP Systeem en Leveling Up
// =============================
document.addEventListener("DOMContentLoaded", function () {
  const maxXP = 100; // Max XP nodig per level

  /**
   * Update de XP-balk visueel op basis van huidige XP en level
   */
  function updateXPBar(xp, level) {
    const percent = (xp / maxXP) * 100;
    document.getElementById('xpFill').style.width = `${percent}%`;
    document.getElementById('xpInfo').textContent = `XP: ${xp} / ${maxXP}`;
    document.getElementById('level').textContent = `Level: ${level}`;
  }

  /**
   * Stuur een XP-vermeerderingsverzoek naar de backend en verwerk het resultaat
   */
  function gainXP(amount) {
    fetch('/api/gain-xp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ xpGained: amount })
    })
    .then(res => res.json())
    .then(data => {
      updateXPBar(data.xp, data.level);

      // Toon alert als gebruiker een nieuw level bereikt
      if (data.leveledUp) {
        alert(`Level Up! Je bent nu op level ${data.level}`);
      }
    });
  }

  // Knoppen om XP toe te voegen
  document.getElementById("gainXp1").addEventListener("click", () => gainXP(1));
  document.getElementById("gainXp5").addEventListener("click", () => gainXP(5));
  document.getElementById("gainXp10").addEventListener("click", () => gainXP(10));

  // Initialiseer XP-balk op basis van bestaande gegevens in HTML
  const initialXP = parseInt(document.getElementById('xpInfo').dataset.xp, 10);
  const initialLevel = parseInt(document.getElementById('level').dataset.level, 10);
  updateXPBar(initialXP, initialLevel);
});

// =============================================
// 4. Taken visueel verwijderen na voltooien
// =============================================
document.addEventListener("DOMContentLoaded", function () {
  const completeButtons = document.querySelectorAll(".complete-btn");

  completeButtons.forEach(button => {
    button.addEventListener("click", function (event) {
      event.stopPropagation(); // Voorkom het togglen van taakdetails bij klik

      // Zoek de bijbehorende taak en details-sectie
      const taskDetails = button.closest(".task-details");
      const taskCard = taskDetails?.previousElementSibling;

      if (!taskCard) return; // Safety check

      // Visueel effect: vervagen voor verwijderen
      taskCard.style.opacity = "0.5";
      taskDetails.style.opacity = "0.5";

      // Verwijder beide elementen na korte delay
      setTimeout(() => {
        taskDetails.remove();
        taskCard.remove();
      }, 2000); // 2 seconden animatie
    });
  });
});
