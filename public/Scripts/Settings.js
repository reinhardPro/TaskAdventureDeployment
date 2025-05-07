document.querySelectorAll("li").forEach(item => {
    item.addEventListener("click", (event) => {
      
      if (event.target.closest(".details") && 
         (event.target.tagName === "SELECT" || event.target.tagName === "INPUT" || event.target.tagName === "LABEL")) {
        return;
      }
      item.classList.toggle("open");
    });
  });
  

  const themeSelector = document.getElementById("themeSelector");
  
  if (themeSelector) {
    const savedTheme = localStorage.getItem("selectedTheme") || "default";
    if (savedTheme !== "default") {
      document.body.classList.add(`${savedTheme}-theme`);
    }
  
    themeSelector.value = savedTheme;
  
    themeSelector.addEventListener("change", function () {
      document.body.className = '';
      const selected = this.value;
      if (selected !== "default") {
        document.body.classList.add(`${selected}-theme`);
      }
      localStorage.setItem("selectedTheme", selected);
    });
  }

  const theme = localStorage.getItem("selectedTheme") || "default";
document.body.classList.add(`${theme}-theme`);

  