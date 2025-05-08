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


 // left and right buttons character creation
 const characterImg = document.getElementById('characterImg');
const hiddenImageValue = document.getElementById('imagevalue');

const characterImages = [
  "/img/malePixel.png",
  "/img/pixelFemale.png",
  "/img/charlos.png",
  "/img/torkoal.png",
  "/img/goku.png"
];

let currentIndex = 0;

function changeImage(direction) {
  characterImg.classList.add('fade-out');

  setTimeout(() => {
    currentIndex = (currentIndex + direction + characterImages.length) % characterImages.length;
    characterImg.src = characterImages[currentIndex];
    hiddenImageValue.value = characterImages[currentIndex];

    characterImg.classList.remove('fade-out');
    characterImg.classList.add('fade-in');
  }, 200);

  setTimeout(() => {
    characterImg.classList.remove('fade-in');
  }, 600);
}

document.querySelector('.carousel-btn-left-btn').addEventListener('click', () => changeImage(-1));
document.querySelector('.carousel-btn-right-btn').addEventListener('click', () => changeImage(1));

// Set initial image value on load
hiddenImageValue.value = characterImages[currentIndex];
