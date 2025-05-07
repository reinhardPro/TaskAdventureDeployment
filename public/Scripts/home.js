document.addEventListener("DOMContentLoaded", function () {
    const characterImg = document.getElementById("character-image");
  
    document.getElementById("btnMale").addEventListener("click", function () {
      if (characterImg) characterImg.src = '/img/malePixel.png';
      localStorage.setItem("selectedGender", "male");
    });
  
    document.getElementById("btnFemale").addEventListener("click", function () {
      if (characterImg) characterImg.src = '/img/pixelFemale.png';
      localStorage.setItem("selectedGender", "female");
    });
  });

  

  document.addEventListener("DOMContentLoaded", function () {
    const characterImgHome = document.getElementById("characterImgHome");
    const selectedGender = localStorage.getItem("selectedGender");
  
    if (characterImgHome) {
      if (selectedGender === "female") {
        characterImgHome.src = '/img/pixelFemale.png';
      } else {
        characterImgHome.src = '/img/malePixel.png';
      }
    }
  });



  document.getElementById("btnMale").addEventListener("click", function () {
    localStorage.setItem("selectedGender", "male");
    window.location.href = "/"; // Verander dit pad naar jouw juiste route
  });
  
  document.getElementById("btnFemale").addEventListener("click", function () {
    localStorage.setItem("selectedGender", "female");
    window.location.href = "/"; // Verander dit pad naar jouw juiste route
  });
  
  