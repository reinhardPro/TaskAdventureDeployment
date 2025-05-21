document.querySelectorAll("li").forEach(item => {
    item.addEventListener("click", (event) => {
      if (
        event.target.closest(".details") &&
        ["SELECT", "INPUT", "LABEL", "SPAN"].includes(event.target.tagName)
      ) {
        return;
      }
      item.classList.toggle("open");
    });
  });
  
  const themeSelector = document.getElementById("themeSelector");
  
  if (themeSelector) {
    const savedTheme = localStorage.getItem("selectedTheme") || "default";
    document.body.classList.add(`${savedTheme}-theme`);
    themeSelector.value = savedTheme;
  
    themeSelector.addEventListener("change", function () {
      document.body.classList.remove("default-theme", "lightgray-theme", "darkgray-theme", "lightblue-theme");
      const selected = this.value;
      document.body.classList.add(`${selected}-theme`);
      localStorage.setItem("selectedTheme", selected);
    });
  }
