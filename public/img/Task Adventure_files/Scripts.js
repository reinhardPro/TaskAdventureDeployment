document.addEventListener("DOMContentLoaded", () => {
    // Task dropdown toggle
    const expandButtons = document.querySelectorAll(".task-expand");
  
    expandButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const detail = btn.parentElement.nextElementSibling;
        detail.classList.toggle("hidden");
        btn.innerHTML = detail.classList.contains("hidden") ? "&#9660;" : "&#9650;";
      });
    });
  
    // Burger menu toggle
    const burger = document.getElementById("burger");
    const dropdownMenu = document.getElementById("dropdownMenu");
  
    burger.addEventListener("click", () => {
      dropdownMenu.classList.toggle("hidden");
    });
  });
  
  // Theme kleuren
  window.addEventListener('load', function() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.body.classList.add(savedTheme + '-theme');
    } else {
        document.body.classList.add('default-theme');
    }
});
