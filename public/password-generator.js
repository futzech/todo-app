document.addEventListener('DOMContentLoaded', function() {
  const generateBtn = document.getElementById('generateBtn');
  const copyBtn = document.getElementById('copyBtn');
  const passwordDisplay = document.getElementById('passwordDisplay');
  const lengthSlider = document.getElementById('lengthSlider');
  const lengthDisplay = document.getElementById('lengthDisplay');
  const copyStatus = document.getElementById('copyStatus');
  const logoutBtn = document.getElementById('logoutBtn');
  
  const uppercaseCb = document.getElementById('includeUppercase');
  const lowercaseCb = document.getElementById('includeLowercase');
  const numbersCb = document.getElementById('includeNumbers');
  const symbolsCb = document.getElementById('includeSymbols');
  
  const strengthIndicator = document.getElementById('strengthIndicator');
  const strengthFill = strengthIndicator.querySelector('.strength-fill');
  const strengthText = document.getElementById('strength-text');

  let currentPassword = '';

  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.href = '/';
  });

  lengthSlider.addEventListener('input', (e) => {
    lengthDisplay.textContent = e.target.value;
    updateStrength();
  });

  generateBtn.addEventListener('click', generatePassword);

  function generatePassword() {
    const length = parseInt(lengthSlider.value);
    const charset = [];
    
    if (uppercaseCb.checked) charset.push('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    if (lowercaseCb.checked) charset.push('abcdefghijklmnopqrstuvwxyz');
    if (numbersCb.checked) charset.push('0123456789');
    if (symbolsCb.checked) charset.push('!@#$%^&*()_+-=[]{}|;:,.<>?');

    if (charset.length === 0) {
      showError('Выберите хотя бы один тип символов!');
      return;
    }

    let password = '';
    const allChars = charset.join('');
    
    const requiredChars = [];
    if (uppercaseCb.checked) requiredChars.push(getRandom('ABCDEFGHIJKLMNOPQRSTUVWXYZ'));
    if (lowercaseCb.checked) requiredChars.push(getRandom('abcdefghijklmnopqrstuvwxyz'));
    if (numbersCb.checked) requiredChars.push(getRandom('0123456789'));
    if (symbolsCb.checked) requiredChars.push(getRandom('!@#$%^&*()_+-=[]{}|;:,.<>?'));
    
    password = requiredChars.join('');
    
    for (let i = requiredChars.length; i < length; i++) {
      password += getRandom(allChars);
    }
    
    password = password.split('').sort(() => Math.random() - 0.5).join('');
    
    currentPassword = password;
    passwordDisplay.textContent = password;
    passwordDisplay.className = 'password-box generated';
    
    updateStrength();
    generateBtn.textContent = ' Сгенерировать новый';
  }


  copyBtn.addEventListener('click', async () => {
    if (!currentPassword) return;
    
    try {
      await navigator.clipboard.writeText(currentPassword);
      showCopyStatus(' Скопировано!', 'success');
      copyBtn.classList.add('copied');
      setTimeout(() => copyBtn.classList.remove('copied'), 2000);
    } catch (err) {
      showCopyStatus('Ошибка копирования', 'error');
    }
  });

  function getRandom(str) {
    return str[Math.floor(Math.random() * str.length)];
  }

  function updateStrength() {
    const length = parseInt(lengthSlider.value);
    let score = 0;
    let text = '';
    
    if (length >= 16) score += 25;
    if (uppercaseCb.checked) score += 20;
    if (lowercaseCb.checked) score += 15;
    if (numbersCb.checked) score += 20;
    if (symbolsCb.checked) score += 20;
    
    strengthFill.style.width = `${Math.min(score, 100)}%`;
    
    if (score >= 90) {
      strengthFill.className = 'strength-fill excellent';
      text = 'Отлично ';
    } else if (score >= 70) {
      strengthFill.className = 'strength-fill good';
      text = 'Хорошо ';
    } else if (score >= 50) {
      strengthFill.className = 'strength-fill medium';
      text = 'Средне ';
    } else {
      strengthFill.className = 'strength-fill weak';
      text = 'Слабо ';
    }
    
    strengthText.textContent = text;
  }

  function showCopyStatus(message, type) {
    copyStatus.textContent = message;
    copyStatus.className = `copy-status ${type}`;
    setTimeout(() => {
      copyStatus.textContent = '';
      copyStatus.className = 'copy-status';
    }, 3000);
  }

  function showError(message) {
    passwordDisplay.textContent = message;
    passwordDisplay.className = 'password-box error';
  }

  updateStrength();
});