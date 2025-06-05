document.addEventListener('DOMContentLoaded', function () {
  const acceptButtons = document.querySelectorAll('.accept-button');

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

const acceptButton = taskItem.querySelector('.accept-button');
if (acceptButton) acceptButton.style.display = 'none';

        const timerDiv = taskItem.querySelector('.timer');
        const dueDate = new Date(dueDateStr);
        timerDiv.style.display = 'block';

        startTimer(timerDiv, dueDate);

      } catch (err) {
        alert('Error: ' + err.message);
      }
    });
  });

  
  document.querySelectorAll('.task-item .timer').forEach(timerDiv => {
    const dueDateStr = timerDiv.getAttribute('data-due-date');
    const dueDate = new Date(dueDateStr);
    startTimer(timerDiv, dueDate);
  });

function startTimer(timerDiv, dueDateStr) {
  const dueDate = new Date(dueDateStr);
  dueDate.setHours(23, 59, 59, 999); // set to end of day

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

