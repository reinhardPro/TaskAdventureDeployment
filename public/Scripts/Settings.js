document.querySelectorAll("li").forEach(item => {
    item.addEventListener("click", () => {
      item.classList.toggle("open");
    });
  });
