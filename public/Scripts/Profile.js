document.getElementById('profileForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  const username = document.getElementById('username').value;
  const email = document.getElementById('email').value;

const originalUsername = document.getElementById('username').defaultValue;
const originalEmail = document.getElementById('email').defaultValue;

if (username === originalUsername && email === originalEmail) {
  Swal.fire('No changes detected.', 'Please adjust your details to save.', 'warning');
  return;
}

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
      Swal.fire('Profile updated!', '', 'success').then(() => {
    window.location.href = '/home';
      });
    } else {
      Swal.fire('Fout', result.message, 'error');
    }
  } catch (err) {
    Swal.fire('Fout bij verbinding met server.', '', 'error');
  }
});
