document.getElementById('profileForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  const username = document.getElementById('username').value;
  const email = document.getElementById('email').value;

  try {
    const response = await fetch('/profile/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, email })
    });

    const result = await response.json();

    if (result.success) {
      Swal.fire('Profiel bijgewerkt!', '', 'success').then(() => {
    window.location.href = '/home';
      });
    } else {
      Swal.fire('Fout', result.message, 'error');
    }
  } catch (err) {
    Swal.fire('Fout bij verbinding met server.', '', 'error');
  }
});
