document.addEventListener('DOMContentLoaded', function () {
  const acceptButtons = document.querySelectorAll('.accept-button');

  // Start countdown for all timers already shown on page load
  document.querySelectorAll('.timer').forEach(timerDiv => {
    const dueDateStr = timerDiv.getAttribute('data-due-date');
    if (timerDiv.style.display !== 'none') {
      startTimer(timerDiv, dueDateStr);
    }
  });

  acceptButtons.forEach(button => {
    button.addEventListener('click', async function () {
      const taskItem = button.closest('.task-item');
      const taskId = button.getAttribute('data-task-id');
      const dueDateStr = button.getAttribute('data-due-date');

      try {
        const response = await fetch(`/task/accept/${taskId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) throw new Error('Failed to accept task');

        // Hide ONLY accept button
        const acceptButton = taskItem.querySelector('.accept-button');
        if (acceptButton) acceptButton.style.display = 'none';

        // Update status to "In Progress"
        const statusSpan = [...taskItem.querySelectorAll('span')]
          .find(span => span.textContent.trim().startsWith('Status:'));
        if (statusSpan) {
          statusSpan.innerHTML = 'Status: In Progress';
        }

        // Show and start timer
        const timerDiv = taskItem.querySelector('.timer');
        timerDiv.style.display = 'block';
        startTimer(timerDiv, dueDateStr);

      } catch (err) {
        alert('Error: ' + err.message);
      }
    });
  });

  function startTimer(timerDiv, dueDateStr) {
    const dueDate = new Date(dueDateStr);
    dueDate.setHours(23, 59, 59, 999); // Extend to end of day

    const updateTimer = () => {
      const now = new Date();
      const diff = dueDate - now;

      if (diff <= 0) {
        timerDiv.textContent = "Time's up!";
        clearInterval(intervalId);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      timerDiv.textContent = `Time remaining: ${days}d ${hours}h ${minutes}m ${seconds}s`;
    };

    updateTimer();
    const intervalId = setInterval(updateTimer, 1000);
  }
});