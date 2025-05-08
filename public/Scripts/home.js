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