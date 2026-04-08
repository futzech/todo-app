class SimplePasswordGenerator {
    constructor() {
        this.requiredChars = {
            uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
            lowercase: 'abcdefghijklmnopqrstuvwxyz',
            numbers: '0123456789',
            symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
        };
        this.init();
    }

    init() {
        this.bindEvents();
        this.updateLengthDisplay();
        this.updateRequirements();
    }

    bindEvents() {
        document.getElementById('generateBtn').onclick = () => this.generatePassword();
        document.getElementById('lengthSlider').oninput = () => {
            this.updateLengthDisplay();
            this.updateRequirements();
        };
        document.getElementById('copyBtn').onclick = () => this.copyPassword();
    }

    updateLengthDisplay() {
        const slider = document.getElementById('lengthSlider');
        const display = document.getElementById('lengthDisplay');
        display.textContent = slider.value;
    }

    generatePassword() {
        const length = parseInt(document.getElementById('lengthSlider').value);

        // Обеспечиваем наличие всех требуемых символов
        let password = '';

        // Добавляем по одному обязательному символу
        password += this.requiredChars.uppercase[Math.floor(Math.random() * this.requiredChars.uppercase.length)];
        password += this.requiredChars.lowercase[Math.floor(Math.random() * this.requiredChars.lowercase.length)];
        password += this.requiredChars.numbers[Math.floor(Math.random() * this.requiredChars.numbers.length)];
        password += this.requiredChars.symbols[Math.floor(Math.random() * this.requiredChars.symbols.length)];

        // Заполняем остальную длину случайными символами
        const allChars = [...this.requiredChars.uppercase, ...this.requiredChars.lowercase,
        ...this.requiredChars.numbers, ...this.requiredChars.symbols];

        for (let i = 4; i < length; i++) {
            password += allChars[Math.floor(Math.random() * allChars.length)];
        }

        // Перемешиваем
        password = password.split('').sort(() => Math.random() - 0.5).join('');

        this.displayPassword(password);
        this.updateRequirements(password);
    }

    displayPassword(password) {
        const display = document.getElementById('passwordDisplay');
        display.textContent = password;

        display.className = 'password-display strong';
    }

    updateRequirements(password = '') {
        const reqList = document.getElementById('requirementsList');

        const requirements = [
            { id: 'uppercase', label: '1+ Uppercase letter', test: /[A-Z]/ },
            { id: 'lowercase', label: '1+ Lowercase letter', test: /[a-z]/ },
            { id: 'number', label: '1+ Number', test: /[0-9]/ },
            { id: 'symbol', label: '1+ Special symbol', test: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/ }
        ];

        reqList.innerHTML = requirements.map(req => {
            const met = password === '' ? false : req.test.test(password);
            return `
        <div class="requirement ${met ? 'met' : 'not-met'}">
          ${req.label}
        </div>
      `;
        }).join('');
    }

    copyPassword() {
        const password = document.getElementById('passwordDisplay').textContent.trim();
        const copyBtn = document.getElementById('copyBtn');
        const status = document.getElementById('copyStatus');
        const originalText = '📋 Copy Password';

        if (!password || password === 'Click Generate to create your secure password') {
            return;
        }

        // Сохраняем оригинальный текст
        const originalBtnText = copyBtn.textContent;

        // Копируем
        navigator.clipboard.writeText(password).then(() => {
            // Меняем текст и показываем статус
            copyBtn.textContent = 'Copied!';
            status.textContent = 'Password copied!';
            status.classList.add('show');

            // ВОЗВРАЩАЕМ через 2 секунды
            setTimeout(() => {
                copyBtn.textContent = originalBtnText; 
                status.classList.remove('show');
                status.textContent = '';
            }, 2200);

        }).catch((err) => {
            console.warn('Clipboard failed:', err);
            // Fallback
            const textArea = document.createElement('textarea');
            textArea.value = password;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);

            copyBtn.textContent = 'Copied!';
            status.textContent = 'Copied (fallback)';
            status.classList.add('show');

            setTimeout(() => {
                copyBtn.textContent = originalBtnText;
                status.classList.remove('show');
                status.textContent = '';
            }, 2200);
        });
    }
}

// Запуск
document.addEventListener('DOMContentLoaded', () => {
    new SimplePasswordGenerator();
});