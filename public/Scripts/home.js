// Meldt in de console dat het script geladen is
console.log("home.js is loaded");

// ==============================
// Toggle taakdetails tonen/verbergen
// ==============================
document.addEventListener("DOMContentLoaded", function () {
  const taskCards = document.querySelectorAll(".task-card");

  taskCards.forEach(card => {
    const title = card.querySelector(".task-title");     // Titel van de taak (optioneel gebruikt)
    const expand = card.querySelector(".task-expand");   // Expand knop (optioneel gebruikt)
    const details = card.nextElementSibling;             // Verondersteld: .task-details volgt direct na de kaart

    // Functie voor tonen/verbergen van details
    function toggleDetails() {
      if (details && details.classList.contains("task-details")) {
        const isShown = details.classList.contains("show");

        if (isShown) {
          // Verberg details
          details.classList.remove("show");
          details.classList.add("hidden");
          card.classList.remove("open");
        } else {
          // Toon details
          details.classList.add("show");
          details.classList.remove("hidden");
          card.classList.add("open");
        }
      }
    }

    // Activeer toggle wanneer kaart wordt aangeklikt
    card.addEventListener("click", toggleDetails);
  });
});

// ==============================
// Geslacht selecteren via knoppen
// ==============================
document.addEventListener("DOMContentLoaded", () => {
  const btnMale = document.getElementById("btnMale");
  const btnFemale = document.getElementById("btnFemale");

  // Bij klikken op man
  btnMale.addEventListener("click", () => {
    btnMale.classList.add("active");
    btnFemale.classList.remove("active");
  });

  // Bij klikken op vrouw
  btnFemale.addEventListener("click", () => {
    btnFemale.classList.add("active");
    btnMale.classList.remove("active");
  });
});

// ==============================
// XP-systeem voor gamification
// ==============================
document.addEventListener("DOMContentLoaded", function () {
  const maxXP = 100; // Maximale XP voordat je levelt

  // Update voortgangsbalk en leveltekst
  function updateXPBar(xp, level) {
    const percent = (xp / maxXP) * 100;
    document.getElementById('xpFill').style.width = `${percent}%`;
    document.getElementById('xpInfo').textContent = `XP: ${xp} / ${maxXP}`;
    document.getElementById('level').textContent = `Level: ${level}`;
  }

  // Stuur XP-waarde naar server en verwerk respons
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

      // Toon melding bij level-up
      if (data.leveledUp) {
        alert(`Level Up! Je bent nu op level ${data.level}`);
      }
    });
  }

  // XP toevoegen bij klikken op knoppen
  document.getElementById("gainXp1").addEventListener("click", function () {
    gainXP(1);
  });

  document.getElementById("gainXp5").addEventListener("click", function () {
    gainXP(5);
  });

  document.getElementById("gainXp10").addEventListener("click", function () {
    gainXP(10);
  });

  // Start met initiële XP en level (uit HTML geladen via data-attributen)
  const initialXP = parseInt(document.getElementById('xpInfo').dataset.xp, 10);
  const initialLevel = parseInt(document.getElementById('level').dataset.level, 10);
  updateXPBar(initialXP, initialLevel);
});

// ==============================
// Taken visueel verwijderen bij voltooiing
// ==============================
document.addEventListener("DOMContentLoaded", function () {
  const completeButtons = document.querySelectorAll(".complete-btn");

  completeButtons.forEach(button => {
    button.addEventListener("click", function (event) {
      event.stopPropagation(); // Voorkom dat het klikken details togglet

      const taskDetails = button.closest(".task-details");           // Vind de details-container
      const taskCard = taskDetails?.previousElementSibling;          // Bijbehorende taakkaart

      if (!taskCard) return;

      // Geef visueel effect (vervagen)
      taskCard.style.opacity = "0.5";
      taskDetails.style.opacity = "0.5";

      // Verwijder na 2 seconden beide elementen uit de DOM
      setTimeout(() => {
        taskDetails.remove();
        taskCard.remove();
      }, 2000);
    });
  });
});
