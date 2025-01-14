const audio = new Audio();
let isPlaying = false;

document.getElementById('load-stream').addEventListener('click', () => {
  const streamUrl = document.getElementById('stream-url').value;
  if (streamUrl) {
    audio.src = streamUrl;
    audio.play();
    isPlaying = true;
    document.getElementById('play-pause').classList.add('playing');
    document.querySelector('.play-icon').style.display = 'none';
    document.querySelector('.pause-icon').style.display = 'block';
  }
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