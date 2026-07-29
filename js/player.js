document.addEventListener('DOMContentLoaded', () => {
  const audio = document.getElementById('audio-element');
  const btnPlayPause = document.getElementById('btn-play-pause');
  const playIcon = document.getElementById('play-icon');
  const currentTimeEl = document.getElementById('current-time');
  const durationEl = document.getElementById('total-duration');
  const barsFlex = document.getElementById('bars-flex');
  const clickArea = document.getElementById('waveform-click-area');
  const eqBars = document.querySelectorAll('.cover-eq-bar');

  const totalBars = 48;

  for (let i = 0; i < totalBars; i++) {
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.height = `${Math.floor(Math.random() * 65) + 20}%`;
    barsFlex.appendChild(bar);
  }

  const bars = document.querySelectorAll('.bar');

  function formatTime(s) {
    if (isNaN(s)) return "00:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m < 10 ? '0' : ''}${m}:${sec < 10 ? '0' : ''}${sec}`;
  }

  audio.addEventListener('loadedmetadata', () => {
    durationEl.textContent = formatTime(audio.duration);
  });

  btnPlayPause.addEventListener('click', () => {
    if (audio.paused) {
      audio.play();
      playIcon.setAttribute('data-lucide', 'pause');
    } else {
      audio.pause();
      playIcon.setAttribute('data-lucide', 'play');
    }
    lucide.createIcons();
  });

  audio.addEventListener('timeupdate', () => {
    const current = audio.currentTime;
    const duration = audio.duration || 1;
    currentTimeEl.textContent = formatTime(current);

    const activeIndex = Math.floor((current / duration) * totalBars);
    bars.forEach((bar, idx) => {
      bar.classList.toggle('active', idx <= activeIndex);
    });

    if (!audio.paused) {
      eqBars.forEach(eq => {
        eq.style.height = `${Math.floor(Math.random() * 85) + 15}%`;
      });
    }
  });

  clickArea.addEventListener('click', (e) => {
    const rect = clickArea.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    if (audio.duration) audio.currentTime = ratio * audio.duration;
  });

  document.getElementById('btn-rewind').addEventListener('click', () => audio.currentTime -= 10);
  document.getElementById('btn-forward').addEventListener('click', () => audio.currentTime += 10);
});
