document.addEventListener('DOMContentLoaded', () => {
  const audio = document.getElementById('audio-element');
  const btnPlayPause = document.getElementById('btn-play-pause');
  const playIcon = document.getElementById('play-icon');
  const currentTimeEl = document.getElementById('current-time');
  const durationEl = document.getElementById('total-duration');
  const barsFlex = document.getElementById('bars-flex');
  const clickArea = document.getElementById('waveform-click-area');
  const dialogueBlocks = document.querySelectorAll('.dialogue-block');
  const eqBars = document.querySelectorAll('.cover-eq-bar');

  const totalBars = 50;

  // 1. Render Waveform Bars
  for (let i = 0; i < totalBars; i++) {
    const bar = document.createElement('div');
    bar.className = 'bar';
    const randomHeight = Math.floor(Math.random() * 70) + 20;
    bar.style.height = `${randomHeight}%`;
    barsFlex.appendChild(bar);
  }

  const bars = document.querySelectorAll('.bar');

  function formatTime(seconds) {
    if (isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  // Update Duration
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

  // Time Update Loop
  audio.addEventListener('timeupdate', () => {
    const current = audio.currentTime;
    const duration = audio.duration || 1;
    
    currentTimeEl.textContent = formatTime(current);

    // Waveform fill
    const progressRatio = current / duration;
    const activeBarIndex = Math.floor(progressRatio * totalBars);

    bars.forEach((bar, index) => {
      if (index <= activeBarIndex) {
        bar.classList.add('active');
      } else {
        bar.classList.remove('active');
      }
    });

    // Animate EQ bars when playing
    if (!audio.paused) {
      eqBars.forEach(eq => {
        const h = Math.floor(Math.random() * 80) + 15;
        eq.style.height = `${h}%`;
      });
    }

    // Transcript Sync + Auto-scroll
    dialogueBlocks.forEach(block => {
      const startTime = parseFloat(block.getAttribute('data-start'));
      if (current >= startTime) {
        dialogueBlocks.forEach(b => b.classList.remove('active'));
        block.classList.add('active');
        
        // Auto-scroll inside container
        block.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
      }
    });
  });

  // Click on dialogue block to jump in audio
  dialogueBlocks.forEach(block => {
    block.addEventListener('click', () => {
      const startTime = parseFloat(block.getAttribute('data-start'));
      if (!isNaN(startTime)) {
        audio.currentTime = startTime;
        if (audio.paused) {
          audio.play();
          playIcon.setAttribute('data-lucide', 'pause');
          lucide.createIcons();
        }
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

  // Rewind / Forward
  document.getElementById('btn-rewind').addEventListener('click', () => audio.currentTime -= 10);
  document.getElementById('btn-forward').addEventListener('click', () => audio.currentTime += 10);
});
