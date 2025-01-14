const audio = new Audio();
let isPlaying = false;

// Получаем все плееры и кнопки
const players = document.querySelectorAll('.radio-container');
const prevButton = document.getElementById('prev-button');
const nextButton = document.getElementById('next-button');

let currentPlayerIndex = 0;

// Показываем первый плеер по умолчанию
players[currentPlayerIndex].classList.add('active');

// Функция для сброса состояния плеера
function resetPlayer() {
  audio.pause();
  isPlaying = false;

  // Сбрасываем кнопки Play/Pause для радио
  document.getElementById('play-pause').classList.remove('playing');
  document.querySelector('.play-icon').style.display = 'block';
  document.querySelector('.pause-icon').style.display = 'none';

  // Сбрасываем кнопки Play/Pause для музыки
  document.getElementById('play-pause-music').classList.remove('playing');
  document.querySelector('.play-icon-music').style.display = 'block';
  document.querySelector('.pause-icon-music').style.display = 'none';

  // Сбрасываем ползунок перемотки
  seekSlider.value = 0;
  currentTimeDisplay.textContent = '0:00';
}

// Функция для переключения плееров
function switchPlayer(direction) {
  // Сбрасываем состояние текущего плеера
  resetPlayer();

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

// Функционал для музыкального плеера
const fileInput = document.getElementById('file-input');
const loadMusicButton = document.getElementById('load-music');
const playPauseMusicButton = document.getElementById('play-pause-music');
const prevTrackButton = document.getElementById('prev-track');
const nextTrackButton = document.getElementById('next-track');
const trackName = document.getElementById('track-name');
const seekSlider = document.getElementById('seek-slider');
const currentTimeDisplay = document.getElementById('current-time');
const totalTimeDisplay = document.getElementById('total-time');

// Загрузка музыки
loadMusicButton.addEventListener('click', () => {
  fileInput.click(); // Открываем диалог выбора файла
});

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const fileURL = URL.createObjectURL(file);
    audio.src = fileURL;
    audio.play();
    isPlaying = true;
    playPauseMusicButton.classList.add('playing');
    document.querySelector('.play-icon-music').style.display = 'none';
    document.querySelector('.pause-icon-music').style.display = 'block';

    // Обновляем название трека
    trackName.textContent = file.name;

    // Обновляем ползунок и время при загрузке файла
    audio.addEventListener('loadedmetadata', () => {
      seekSlider.max = audio.duration;
      totalTimeDisplay.textContent = formatTime(audio.duration);
    });
  }
});

// Управление воспроизведением музыки
playPauseMusicButton.addEventListener('click', () => {
  if (isPlaying) {
    audio.pause();
    playPauseMusicButton.classList.remove('playing');
    document.querySelector('.play-icon-music').style.display = 'block';
    document.querySelector('.pause-icon-music').style.display = 'none';
  } else {
    audio.play();
    playPauseMusicButton.classList.add('playing');
    document.querySelector('.play-icon-music').style.display = 'none';
    document.querySelector('.pause-icon-music').style.display = 'block';
  }
  isPlaying = !isPlaying;
});

// Кнопки "Предыдущая" и "Следующая" (пока пустышки)
prevTrackButton.addEventListener('click', () => {
  alert('Предыдущая песня (функционал в разработке)');
});

nextTrackButton.addEventListener('click', () => {
  alert('Следующая песня (функционал в разработке)');
});

// Управление громкостью для музыкального плеера
document.getElementById('volume-music').addEventListener('input', (e) => {
  audio.volume = e.target.value;
});

// Перемотка музыки
seekSlider.addEventListener('input', (e) => {
  const seekTime = e.target.value;
  audio.currentTime = seekTime;
});

// Обновление ползунка и времени
audio.addEventListener('timeupdate', () => {
  seekSlider.value = audio.currentTime;
  currentTimeDisplay.textContent = formatTime(audio.currentTime);
});

// Форматирование времени (минуты:секунды)
function formatTime(time) {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}