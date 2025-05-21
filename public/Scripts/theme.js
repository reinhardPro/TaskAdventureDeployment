window.addEventListener('DOMContentLoaded', () => {
    const selector = document.getElementById('themeSelector');
    const savedTheme = localStorage.getItem('theme') || 'default';
  
    document.body.classList.add(savedTheme + '-theme');
    if (selector) selector.value = savedTheme;
  
    if (selector) {
      selector.addEventListener('change', function () {
        const selected = this.value;
        document.body.classList.remove('default-theme', 'lightgray-theme', 'darkgray-theme', 'lightblue-theme');
        document.body.classList.add(selected + '-theme');
        localStorage.setItem('theme', selected);
      });
    }
  });



  function toggleFooterPosition() {
  const footer = document.querySelector('.footer');
  const bodyHeight = document.body.scrollHeight;
  const windowHeight = window.innerHeight;

  if (bodyHeight <= windowHeight) {
    footer.classList.add('fixed');
  } else {
    footer.classList.remove('fixed');
  }
}

window.addEventListener('load', toggleFooterPosition);
window.addEventListener('resize', toggleFooterPosition);

  