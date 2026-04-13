document.addEventListener('DOMContentLoaded', function () {
  const fileInput = document.getElementById('logFile');
  const uploadZone = document.getElementById('uploadZone');
  const analyzeBtn = document.getElementById('analyzeBtn');
  const resultsSection = document.getElementById('resultsSection');
  const logoutBtn = document.getElementById('logoutBtn');

  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.href = '/';
  });

  function updateUI(hasFile) {
    analyzeBtn.disabled = !hasFile;
    if (hasFile) {
      analyzeBtn.textContent = ' Проанализировать';
    }
  }

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    uploadZone.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  ['dragenter', 'dragover'].forEach(eventName => {
    uploadZone.addEventListener(eventName, highlight, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    uploadZone.addEventListener(eventName, unhighlight, false);
  });

  function highlight(e) {
    uploadZone.classList.add('highlight');
  }

  function unhighlight(e) {
    uploadZone.classList.remove('highlight');
  }

  uploadZone.addEventListener('drop', handleDrop, false);

  function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;

    handleFiles(files);
  }

  fileInput.addEventListener('change', function () {
    handleFiles(this.files);
  });

  function handleFiles(files) {
    const file = files[0];
    if (file && (file.name.endsWith('.log') || file.name.endsWith('.txt'))) {
      readFile(file);
    }
  }

  async function readFile(file) {
    try {
      const text = await file.text();
      analyzeLog(text);
    } catch (error) {
      alert('Ошибка чтения файла: ' + error.message);
    }
  }

  async function analyzeLog(logContent) {
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = ' Анализ...';

    await new Promise(resolve => setTimeout(resolve, 500));

    const analysis = parseLogFile(logContent);
    displayResults(analysis);

    analyzeBtn.disabled = false;
    analyzeBtn.textContent = ' Готово!';
    setTimeout(() => {
      analyzeBtn.textContent = ' Проанализировать';
    }, 2000);

    resultsSection.classList.remove('hidden');
  }

  function parseLogFile(logContent) {
    const ipCounter = {};
    const methodCounter = {};
    const error404Urls = new Set();

    const lines = logContent.split('\n').filter(line => line.trim());

    for (const line of lines.slice(0, 10000)) {
      const ipMatch = line.match(/^(\S+)/);

      const requestMatch = line.match(/"([^"]+)"/);
      const methodMatch = requestMatch ? requestMatch[1].split(' ')[0] : null;

      const statusMatch = line.match(/ (\d{3}) /);
      const urlMatch = requestMatch ? requestMatch[1].split(' ')[1] : null;

      if (ipMatch) {
        const ip = ipMatch[1];
        ipCounter[ip] = (ipCounter[ip] || 0) + 1;
      }

      if (methodMatch && ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS', 'PATCH'].includes(methodMatch.toUpperCase())) {
        const method = methodMatch.toUpperCase();
        methodCounter[method] = (methodCounter[method] || 0) + 1;
      }

      if (statusMatch && statusMatch[1] === '404' && urlMatch) {
        error404Urls.add(decodeURIComponent(urlMatch));
      }
    }

    return {
      topIPs: Object.entries(ipCounter)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10),
      httpMethods: Object.entries(methodCounter)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10), 
      error404s: Array.from(error404Urls).slice(0, 20)
    };
  }

  function displayResults({ topIPs, httpMethods, error404s }) {
    document.getElementById('topIPs').innerHTML = topIPs.map(([ip, count]) =>
      `<div class="result-item"><span class="ip">${ip}</span><span class="count">${count}</span></div>`
    ).join('');

    document.getElementById('httpMethods').innerHTML = httpMethods.map(([method, count]) =>
      `<div class="result-item"><span class="method">${method}</span><span class="count">${count}</span></div>`
    ).join('');

    const error404El = document.getElementById('error404s');
    if (error404s.length) {
      error404El.innerHTML = error404s.map(url =>
        `<div class="error-url">${url}</div>`
      ).join('');
    } else {
      error404El.innerHTML = '<div class="no-results">Ошибок 404 не найдено 🎉</div>';
    }
  }
});