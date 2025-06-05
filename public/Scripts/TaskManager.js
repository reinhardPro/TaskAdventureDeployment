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

        // ⏱️ Sla starttijd op in dataset (ms sinds epoch)
        taskItem.dataset.startTime = Date.now();
        taskItem.dataset.taskId = taskId;

        startTimer(taskItem, timerDiv, dueDate);

      } catch (err) {
        alert('Error: ' + err.message);
      }
    });
  });

  // ⏱️ Voor timers die al actief zijn bij paginalaad
  document.querySelectorAll('.task-item .timer').forEach(timerDiv => {
    const taskItem = timerDiv.closest('.task-item');
    const dueDateStr = timerDiv.getAttribute('data-due-date');
    const dueDate = new Date(dueDateStr);
    startTimer(taskItem, timerDiv, dueDate);
  });

  // 🔁 Timerfunctie per taak
  function startTimer(taskItem, timerDiv, dueDateStr) {
    const dueDate = new Date(dueDateStr);
    dueDate.setHours(23, 59, 59, 999); // Stel deadline in op eind van dag

    const updateTimer = () => {
      const now = new Date();
      const diff = dueDate - now;

      if (diff <= 0) {
        timerDiv.textContent = "Time's up!";
        clearInterval(intervalId);

        // ✅ Bereken gespendeerde tijd
        const startTime = parseInt(taskItem.dataset.startTime, 10);
        const endTime = Date.now();
        const minutesSpent = Math.floor((endTime - startTime) / (1000 * 60)) || 1;
        const taskId = taskItem.dataset.taskId;

        // 🔁 Verstuur naar server dat de taak gefaald is + tijd gespendeerd
        fetch('/task/fail', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            taskId: taskId,
            minutesSpent: minutesSpent
          })
        }).then(res => {
          if (!res.ok) console.error('Kon mislukt posten');
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
