// Voeg een event listener toe voor het verzenden van het profielwijzigingsformulier
document.getElementById('profileForm').addEventListener('submit', async function (e) {
  e.preventDefault(); // Voorkom standaard formuliergedrag (pagina herladen)

  // Haal de huidige inputwaarden op
  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();

  // Haal de originele waarden op (zoals die waren bij het laden van de pagina)
  const originalUsername = document.getElementById('username').defaultValue;
  const originalEmail = document.getElementById('email').defaultValue;

  // Controleer of er überhaupt iets gewijzigd is
  if (username === originalUsername && email === originalEmail) {
    Swal.fire('No changes detected.', 'Please adjust your details to save.', 'warning');
    return; // Stop hier: geen update nodig
  }

  try {
    // Verstuur de gewijzigde gegevens naar de server
    const response = await fetch('/profile/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, email })
    });

    // Ontvang en verwerk het antwoord van de server
    const result = await response.json();

    // Als de update succesvol was
    if (result.success) {
      Swal.fire('Profile updated!', '', 'success').then(() => {
        // Navigeer na bevestiging terug naar homepagina
        window.location.href = '/home';
      });
    } else {
      // Server gaf een fout terug (bijv. validatie)
      Swal.fire('Fout', result.message || 'Er ging iets mis bij het bijwerken.', 'error');
    }

  } catch (err) {
    // Fout bij het versturen of verbinden (bijv. netwerkprobleem)
    Swal.fire('Fout bij verbinding met server.', '', 'error');
  }
});
