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

        const statusSpan = [...taskItem.querySelectorAll('span')]
          .find(span => span.textContent.trim().startsWith('Status:'));
        if (statusSpan) {
          statusSpan.innerHTML = 'Status: In Progress';
        }

        const timerDiv = taskItem.querySelector('.timer');
        timerDiv.style.display = 'block';

        taskItem.dataset.startTime = Date.now();
        taskItem.dataset.taskId = taskId;

        startTimer(taskItem, timerDiv, dueDateStr);

      } catch (err) {
        alert('Error: ' + err.message);
      }
    });
  });

  document.querySelectorAll('.task-item .timer').forEach(timerDiv => {
    const taskItem = timerDiv.closest('.task-item');
    const dueDateStr = timerDiv.getAttribute('data-due-date');
    startTimer(taskItem, timerDiv, dueDateStr);
  });

  function startTimer(taskItem, timerDiv, dueDateStr) {
    const dueDate = new Date(dueDateStr);
    dueDate.setHours(23, 59, 59, 999);

    const updateTimer = () => {
      const now = new Date();
      const diff = dueDate - now;

      if (diff <= 0) {
        timerDiv.textContent = "Time's up!";
        clearInterval(intervalId);

        const startTime = parseInt(taskItem.dataset.startTime, 10);
        const endTime = Date.now();
        const minutesSpent = Math.floor((endTime - startTime) / (1000 * 60)) || 1;
        const taskId = taskItem.dataset.taskId;

        fetch('/task/fail', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            taskId: taskId,
            minutesSpent: minutesSpent
          })
        }).catch(err => {
          console.error('Fout bij versturen fail info:', err);
        });

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
