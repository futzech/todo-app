document.addEventListener('DOMContentLoaded', function() {
  const input = document.getElementById('rpnInput');
  const calculateBtn = document.getElementById('calculateBtn');
  const resultBox = document.getElementById('resultBox');
  const historyList = document.getElementById('historyList');
  const examples = document.querySelectorAll('.btn-example');
  const logoutBtn = document.getElementById('logoutBtn');

  let history = [];

  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.href = '/';
  });

  function addToHistory(expr, result) {
    history.unshift({ expr, result, timestamp: new Date().toLocaleTimeString() });
    if (history.length > 20) history = history.slice(0, 20);
    
    historyList.innerHTML = history.map(item => 
      `<div class="history-item">
        <span class="expr">${item.expr}</span>
        <span class="result">${item.result}</span>
        <span class="time">${item.timestamp}</span>
      </div>`
    ).join('');
  }

  async function calculateRPN() {
    const expr = input.value.trim();
    if (!expr) return;

    calculateBtn.disabled = true;
    calculateBtn.textContent = ' Вычисляем...';
    resultBox.textContent = 'Вычисляем...';

    try {
      const response = await fetch('/api/rpn/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ expression: expr })
      });

      const data = await response.json();

      if (data.success) {
        resultBox.textContent = ` ${data.result}`;
        resultBox.className = 'result-box success';
        addToHistory(expr, data.result);
        input.value = '';
      } else {
        resultBox.textContent = ` ${data.error}`;
        resultBox.className = 'result-box error';
      }
    } catch (error) {
      resultBox.textContent = ' Ошибка соединения';
      resultBox.className = 'result-box error';
    } finally {
      calculateBtn.disabled = false;
      calculateBtn.textContent = ' Вычислить';
    }
  }

  calculateBtn.addEventListener('click', calculateRPN);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') calculateRPN();
  });

  examples.forEach(btn => {
    btn.addEventListener('click', () => {
      input.value = btn.dataset.expr;
      calculateRPN();
    });
  });
});