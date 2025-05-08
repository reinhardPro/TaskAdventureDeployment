document.addEventListener('DOMContentLoaded', () => {
    const genderButtons = document.querySelectorAll('.gender-button');
  
    genderButtons.forEach(button => {
      button.addEventListener('click', () => {
        genderButtons.forEach(btn => btn.classList.remove('selected')); // deselect all
        button.classList.add('selected'); // select clicked one
      });
    });
  });
  