document.addEventListener('DOMContentLoaded', () => {
  const audio = document.getElementById('audio-element');
  const btnPlayPause = document.getElementById('btn-play-pause');
  const playIcon = document.getElementById('play-icon');
  const currentTimeEl = document.getElementById('current-time');
  const durationEl = document.getElementById('total-duration');
  const barsFlex = document.getElementById('bars-flex');
  const clickArea = document.getElementById('waveform-click-area');
  const dialogueBlocks = document.querySelectorAll('.dialogue-block');

  const totalBars = 45;

  // 1. Generate fake visual waveform bars
  for (let i = 0; i < totalBars; i++) {
    const bar = document.createElement('div');
    bar.className = 'bar';
    const randomHeight = Math.floor(Math.random() * 75) + 25;
    bar.style.height = `${randomHeight}%`;
    barsFlex.appendChild(bar);
  }

  const bars = document.querySelectorAll('.bar');

  // Format Time Helper
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  // Update Audio Metadata
  audio.addEventListener('loadedmetadata', () => {
    durationEl.textContent = formatTime(audio.duration);
  });

  // Play / Pause Toggle
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

  // Time Update & Synchronized Highlighting
  audio.addEventListener('timeupdate', () => {
    const current = audio.currentTime;
    const duration = audio.duration || 1;
    
    currentTimeEl.textContent = formatTime(current);

    // Waveform Bar fill ratio
    const progressRatio = current / duration;
    const activeBarIndex = Math.floor(progressRatio * totalBars);

    bars.forEach((bar, index) => {
      if (index <= activeBarIndex) {
        bar.classList.add('active');
      } else {
        bar.classList.remove('active');
      }
    });

    // Transcript Sync
    dialogueBlocks.forEach(block => {
      const startTime = parseFloat(block.getAttribute('data-start'));
      if (current >= startTime) {
        dialogueBlocks.forEach(b => b.classList.remove('active'));
        block.classList.add('active');
      }
    });
  });

  // Seek on Waveform Click
  clickArea.addEventListener('click', (e) => {
    const rect = clickArea.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = clickX / rect.width;
    if (audio.duration) {
      audio.currentTime = ratio * audio.duration;
    }
  });

  // Rewind / Forward Buttons
  document.getElementById('btn-rewind').addEventListener('click', () => audio.currentTime -= 10);
  document.getElementById('btn-forward').addEventListener('click', () => audio.currentTime += 10);
});
