document.addEventListener("DOMContentLoaded", () => {
  const profileForm = document.getElementById("profileForm");
  if (profileForm) {
    profileForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const username = document.getElementById("username").value;
      const email = document.getElementById("email").value;

      try {
        const response = await fetch("/api/profile", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username, email }),
        });

        const result = await response.json();

        if (response.ok) {
          alert("✅ Profiel succesvol bijgewerkt!");
        } else {
          alert("❌ Fout bij bijwerken profiel: " + result.error);
        }
      } catch (error) {
        console.error("Error updating profile:", error);
        alert("❌ Er is iets misgegaan.");
      }
    });
  }
});
