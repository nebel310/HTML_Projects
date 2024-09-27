// Получаем ссылки на необходимые элементы
const screen = document.querySelector('.screen');
const buttons = document.querySelectorAll('.num');

// Добавляем обработчик события для каждой кнопки
buttons.forEach((button) => {
  button.addEventListener('click', () => {
    // Получаем текст кнопки
    const buttonText = button.innerText;

    // Обработка разных действий в зависимости от текста кнопки
    if (buttonText === '=') {
      calculate();
    } else if (buttonText === 'C') {
      clearScreen();
    } else if (buttonText === '&#129044;') {
      deleteLastCharacter();
    } else {
      appendToScreen(buttonText);
    }
  });
});

// Функция для добавления символа на экран
function appendToScreen(text) {
  screen.innerText += text;
}

// Функция для очистки экрана
function clearScreen() {
  screen.innerText = '';
}

// Функция для удаления последнего символа
function deleteLastCharacter() {
  screen.innerText = screen.innerText.slice(0, -1);
}

// Функция для вычисления результата
function calculate() {
  const expression = screen.innerText;
  
  try {
    const result = eval(expression);
    
    if (result === Infinity || result === -Infinity || isNaN(result)) {
      screen.innerText = 'Error';
    } else {
      screen.innerText = result;
    }
  } catch (error) {
    screen.innerText = 'Error';
  }
}

// Добавляем обработчик события для клавиши Backspace
document.addEventListener('keydown', (event) => {
  if (event.key === 'Backspace') {
    event.preventDefault();
    deleteLastCharacter();
  }
});
