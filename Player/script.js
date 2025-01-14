const audio = new Audio();
let isPlaying = false;

// Получаем все плееры и кнопки
const players = document.querySelectorAll('.radio-container');
const prevButton = document.getElementById('prev-button');
const nextButton = document.getElementById('next-button');

let currentPlayerIndex = 0;

// Показываем первый плеер по умолчанию
players[currentPlayerIndex].classList.add('active');

// Функция для переключения плееров
function switchPlayer(direction) {
  // Скрываем текущий плеер
  players[currentPlayerIndex].classList.remove('active');

  // Вычисляем индекс следующего плеера
  if (direction === 'next') {
    currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
  } else if (direction === 'prev') {
    currentPlayerIndex = (currentPlayerIndex - 1 + players.length) % players.length;
  }

  // Показываем новый плеер
  players[currentPlayerIndex].classList.add('active');
}

// Обработчики для кнопок
prevButton.addEventListener('click', () => switchPlayer('prev'));
nextButton.addEventListener('click', () => switchPlayer('next'));

// Переменные для отслеживания свайпов
let touchStartX = 0;
let touchEndX = 0;
let isMouseDown = false;

// Обработчик начала касания (для сенсорных устройств)
document.addEventListener('touchstart', (e) => {
  touchStartX = e.touches[0].clientX;
});

// Обработчик движения пальца (для сенсорных устройств)
document.addEventListener('touchmove', (e) => {
  touchEndX = e.touches[0].clientX;
});

// Обработчик окончания касания (для сенсорных устройств)
document.addEventListener('touchend', () => {
  handleSwipe();
});

// Обработчик нажатия кнопки мыши
document.addEventListener('mousedown', (e) => {
  isMouseDown = true;
  touchStartX = e.clientX;
});

// Обработчик движения мыши
document.addEventListener('mousemove', (e) => {
  if (isMouseDown) {
    touchEndX = e.clientX;
  }
});

// Обработчик отпускания кнопки мыши
document.addEventListener('mouseup', () => {
  if (isMouseDown) {
    handleSwipe();
    isMouseDown = false;
  }
});

// Функция для обработки свайпа
function handleSwipe() {
  const swipeThreshold = 50; // Минимальное расстояние для свайпа
  const swipeDistance = touchEndX - touchStartX;

  if (Math.abs(swipeDistance) > swipeThreshold) {
    if (swipeDistance > 0) {
      // Свайп вправо → переключаем на предыдущий плеер
      switchPlayer('prev');
    } else {
      // Свайп влево → переключаем на следующий плеер
      switchPlayer('next');
    }
  }
}

// Остальной код для управления плеерами (воспроизведение, громкость и т.д.)
document.getElementById('dropdown-button').addEventListener('click', () => {
  const dropdownContent = document.getElementById('dropdown-content');
  dropdownContent.style.display = dropdownContent.style.display === 'block' ? 'none' : 'block';
});

document.querySelectorAll('.dropdown-item').forEach(item => {
  item.addEventListener('click', () => {
    const streamUrl = item.getAttribute('data-url');
    const stationName = item.getAttribute('data-name');

    if (streamUrl) {
      audio.src = streamUrl;
      audio.play();
      isPlaying = true;
      document.getElementById('play-pause').classList.add('playing');
      document.querySelector('.play-icon').style.display = 'none';
      document.querySelector('.pause-icon').style.display = 'block';

      // Обновляем название радиостанции
      document.getElementById('station-name').textContent = stationName;
    }
    // Закрываем выпадающий список после выбора
    document.getElementById('dropdown-content').style.display = 'none';
  });
});

document.getElementById('play-pause').addEventListener('click', () => {
  if (isPlaying) {
    audio.pause();
    document.getElementById('play-pause').classList.remove('playing');
    document.querySelector('.play-icon').style.display = 'block';
    document.querySelector('.pause-icon').style.display = 'none';
  } else {
    audio.play();
    document.getElementById('play-pause').classList.add('playing');
    document.querySelector('.play-icon').style.display = 'none';
    document.querySelector('.pause-icon').style.display = 'block';
  }
  isPlaying = !isPlaying;
});

document.getElementById('volume').addEventListener('input', (e) => {
  audio.volume = e.target.value;
});