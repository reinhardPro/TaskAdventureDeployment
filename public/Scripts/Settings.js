document.addEventListener("DOMContentLoaded", () => {
  // Sidebar navigation switching
  const sidebarItems = document.querySelectorAll(".sidebar ul li");
  const sections = document.querySelectorAll(".settings-section");

  sidebarItems.forEach(item => {
    item.addEventListener("click", () => {
      // Remove 'active' from all and add to clicked item
      sidebarItems.forEach(i => i.classList.remove("active"));
      item.classList.add("active");

      // Show the corresponding section, hide others
      const targetSection = item.getAttribute("data-section");
      sections.forEach(section => {
        section.style.display = section.id === targetSection ? "block" : "none";
      });

      // Scroll to top when switching sections
      window.scrollTo(0, 0);
    });
  });

  // Expandable list items in settings
  const settingsListItems = document.querySelectorAll("ul.settings-list > li");

  settingsListItems.forEach(li => {
    li.addEventListener("click", event => {
      // Prevent toggle when clicking on interactive elements inside .details
      const interactiveTags = ["INPUT", "SELECT", "BUTTON", "A", "LABEL", "TEXTAREA", "FORM"];
      if (
        event.target.closest(".details") &&
        interactiveTags.includes(event.target.tagName)
      ) {
        return;
      }

      // Toggle the "open" class
      li.classList.toggle("open");
    });
  });

  // Theme selector logic
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
});

// Confirmation dialogs for forms
function confirmChangePassword(event) {
  if (!confirm("Weet je zeker dat je je wachtwoord wilt wijzigen?")) {
    event.preventDefault();
  }
}

function confirmDeleteCharacter(event) {
  if (!confirm("Weet je zeker dat je dit character wilt verwijderen?")) {
    event.preventDefault();
  }
}

function confirmDeleteAccount(event) {
  if (!confirm("Weet je zeker dat je je account permanent wilt verwijderen?")) {
    event.preventDefault();
  }
}
