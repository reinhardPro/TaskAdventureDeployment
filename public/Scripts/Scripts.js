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
  
  window.addEventListener('load', function() {
    const savedTheme = localStorage.getItem('theme');  // Haal het opgeslagen thema op
    if (savedTheme) {
        document.body.classList.add(savedTheme + '-theme');  // Voeg het opgeslagen thema toe aan de body
    } else {
        document.body.classList.add('default-theme');  // Gebruik het standaardthema als er geen voorkeur is opgeslagen
    }
});
