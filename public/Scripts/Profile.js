document.addEventListener('DOMContentLoaded', async () => {
    const res = await fetch('/api/profile');
    const result = await res.json();
  
    if (result.success) {
      document.getElementById('username').value = result.data.username;
      document.getElementById('email').value = result.data.email;
    }
  });
  
  document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
  
    const data = {
      username: document.getElementById('username').value,
      email: document.getElementById('email').value,
      password: document.getElementById('password').value,
    };
  
    const res = await fetch('/api/update-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  
    const result = await res.json();
    if (result.success) {
      alert('✅ Profiel geüpdatet!');
    } else {
      alert('❌ Update mislukt.');
    }
  });
  