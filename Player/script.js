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

// ========== Фоновая анимация (плавные газообразные круги) ==========
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');

let circles = [];
let animationId = null;
let isAnimating = false;
let currentGlobalAlpha = 0;      // для плавного появления/исчезновения
let targetGlobalAlpha = 0;
const FADE_IN_STEP = 0.03;        // быстрое появление
const FADE_OUT_STEP = 0.008;      // медленное исчезновение
let currentFadeStep = FADE_IN_STEP;

// Параметры кругов (медленное движение, как газ)
const CIRCLE_COUNT = 45;
const MAX_RADIUS = 70;
const MIN_RADIUS = 25;
const BASE_OPACITY = 0.1;         // максимальная прозрачность круга (еле заметный)
const VELOCITY_DAMP = 0.98;       // небольшое трение
const RANDOM_FORCE = 0.08;        // умеренная случайная сила для плавного блуждания
const MAX_SPEED = 0.9;            // ограничиваем максимальную скорость

// Инициализация кругов с учётом размеров canvas
function initCircles() {
  const w = canvas.width;
  const h = canvas.height;
  circles = [];
  for (let i = 0; i < CIRCLE_COUNT; i++) {
    circles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      radius: MIN_RADIUS + Math.random() * (MAX_RADIUS - MIN_RADIUS),
      opacity: BASE_OPACITY + Math.random() * 0.05,
      angle: Math.random() * Math.PI * 2,
      radiusOffset: 0,
      radiusSpeed: 0.005 + Math.random() * 0.01
    });
  }
}

// Оживление кругов (добавление случайных скоростей)
function reviveCircles() {
  for (let c of circles) {
    c.vx += (Math.random() - 0.5) * 0.6;
    c.vy += (Math.random() - 0.5) * 0.6;
    // Ограничиваем скорость
    if (c.vx > MAX_SPEED) c.vx = MAX_SPEED;
    if (c.vx < -MAX_SPEED) c.vx = -MAX_SPEED;
    if (c.vy > MAX_SPEED) c.vy = MAX_SPEED;
    if (c.vy < -MAX_SPEED) c.vy = -MAX_SPEED;
  }
}

// Обновление позиций с плавным, инерционным движением
function updateCircles() {
  const w = canvas.width;
  const h = canvas.height;
  for (let c of circles) {
    // Добавляем случайное ускорение
    c.vx += (Math.random() - 0.5) * RANDOM_FORCE;
    c.vy += (Math.random() - 0.5) * RANDOM_FORCE;
    
    // Ограничиваем скорость
    if (c.vx > MAX_SPEED) c.vx = MAX_SPEED;
    if (c.vx < -MAX_SPEED) c.vx = -MAX_SPEED;
    if (c.vy > MAX_SPEED) c.vy = MAX_SPEED;
    if (c.vy < -MAX_SPEED) c.vy = -MAX_SPEED;
    
    // Применяем трение
    c.vx *= VELOCITY_DAMP;
    c.vy *= VELOCITY_DAMP;
    
    // Обновляем позицию
    c.x += c.vx;
    c.y += c.vy;
    
    // Отражение от границ с потерей энергии
    if (c.x < 0) {
      c.x = 0;
      c.vx = -c.vx * 0.7;
    }
    if (c.x > w) {
      c.x = w;
      c.vx = -c.vx * 0.7;
    }
    if (c.y < 0) {
      c.y = 0;
      c.vy = -c.vy * 0.7;
    }
    if (c.y > h) {
      c.y = h;
      c.vy = -c.vy * 0.7;
    }
    
    // Плавное изменение радиуса (пульсация)
    c.radiusOffset += c.radiusSpeed;
    const radiusVar = Math.sin(c.radiusOffset) * 3;
    c.currentRadius = Math.max(5, c.radius + radiusVar);
  }
}

// Отрисовка кругов с учётом текущей глобальной прозрачности (fade)
function drawCircles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (currentGlobalAlpha <= 0) return;
  
  for (let c of circles) {
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.currentRadius || c.radius, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(c.x, c.y, (c.currentRadius || c.radius) * 0.2, c.x, c.y, (c.currentRadius || c.radius));
    const alpha = c.opacity * currentGlobalAlpha;
    grad.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.9})`);
    grad.addColorStop(1, `rgba(255, 200, 200, ${alpha * 0.4})`);
    ctx.fillStyle = grad;
    ctx.fill();
  }
}

// Анимационный цикл
function animateBackground() {
  if (!isAnimating && targetGlobalAlpha === 0 && currentGlobalAlpha === 0) {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    return;
  }
  
  // Плавное изменение глобальной прозрачности
  if (currentGlobalAlpha !== targetGlobalAlpha) {
    const step = currentFadeStep;
    if (currentGlobalAlpha < targetGlobalAlpha) {
      currentGlobalAlpha = Math.min(targetGlobalAlpha, currentGlobalAlpha + step);
    } else if (currentGlobalAlpha > targetGlobalAlpha) {
      currentGlobalAlpha = Math.max(targetGlobalAlpha, currentGlobalAlpha - step);
    }
  }
  
  updateCircles();
  drawCircles();
  animationId = requestAnimationFrame(animateBackground);
}

// Запуск анимации с плавным появлением
function startBackgroundAnimation() {
  if (targetGlobalAlpha === 1) return; // уже активна
  targetGlobalAlpha = 1;
  currentFadeStep = FADE_IN_STEP;
  // Оживляем круги, чтобы они не стояли на месте
  reviveCircles();
  if (!animationId) {
    animateBackground();
  }
  isAnimating = true;
}

// Остановка анимации с плавным исчезновением
function stopBackgroundAnimation() {
  if (targetGlobalAlpha === 0) return;
  targetGlobalAlpha = 0;
  currentFadeStep = FADE_OUT_STEP;
  isAnimating = false; // флаг, что музыка не играет, но анимация продолжит исчезать
  // анимационный цикл остановится сам, когда станет currentGlobalAlpha = 0
}

// Слушатели событий audio для управления фоновой анимацией
function onAudioPlay() {
  startBackgroundAnimation();
}

function onAudioPause() {
  stopBackgroundAnimation();
}

function onAudioEnded() {
  stopBackgroundAnimation();
}

audio.addEventListener('play', onAudioPlay);
audio.addEventListener('pause', onAudioPause);
audio.addEventListener('ended', onAudioEnded);

// Адаптация canvas под размер окна
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  initCircles();
  if (isAnimating || targetGlobalAlpha > 0) {
    drawCircles();
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

window.addEventListener('resize', () => {
  resizeCanvas();
});

// Инициализация
resizeCanvas();
currentGlobalAlpha = 0;
targetGlobalAlpha = 0;