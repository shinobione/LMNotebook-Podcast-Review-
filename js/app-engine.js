document.addEventListener('DOMContentLoaded', () => {

  const audio = document.getElementById('audio-element');
  const btnPlayPause = document.getElementById('btn-play-pause');
  const btnRewind = document.getElementById('btn-rewind');
  const btnForward = document.getElementById('btn-forward');
  const currentTimeSpan = document.getElementById('current-time');
  const totalDurationSpan = document.getElementById('total-duration');
  const barsContainer = document.getElementById('bars-flex');
  const clickArea = document.getElementById('waveform-click-area');

  const trackTitle = document.getElementById('current-track-title');
  const trackSub = document.getElementById('current-track-sub');
  const epCode = document.getElementById('active-ep-code');
  const playerCoverImg = document.getElementById('player-cover-img');
  
  const trackItems = Array.from(document.querySelectorAll('.mini-track-item'));
  const epCards = document.querySelectorAll('.ep-card');

  const numBars = 40;
  const bars = [];

  // Waveform HTML5
  if (barsContainer) {
    barsContainer.innerHTML = '';
    for (let i = 0; i < numBars; i++) {
      const bar = document.createElement('div');
      bar.classList.add('bar');
      const h = Math.floor(Math.sin(i * 0.2) * 30 + Math.random() * 40 + 20);
      bar.style.height = `${Math.min(100, Math.max(15, h))}%`;
      barsContainer.appendChild(bar);
      bars.push(bar);
    }
  }

  function formatTime(seconds) {
    if (isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  function updatePlayButton(playing) {
    if (!btnPlayPause) return;
    btnPlayPause.innerHTML = playing ? '<i data-lucide="pause"></i>' : '<i data-lucide="play"></i>';
    if (window.lucide) lucide.createIcons();
  }

  if (btnPlayPause) {
    btnPlayPause.addEventListener('click', () => {
      if (audio.paused) {
        audio.play().then(() => updatePlayButton(true)).catch(e => console.log(e));
      } else {
        audio.pause();
        updatePlayButton(false);
      }
    });
  }

  if (btnRewind) btnRewind.addEventListener('click', () => { audio.currentTime = Math.max(0, audio.currentTime - 10); });
  if (btnForward) btnForward.addEventListener('click', () => { audio.currentTime = Math.min(audio.duration, audio.currentTime + 10); });

  audio.addEventListener('loadedmetadata', () => {
    if (totalDurationSpan) totalDurationSpan.textContent = formatTime(audio.duration);
  });

  audio.addEventListener('timeupdate', () => {
    if (currentTimeSpan) currentTimeSpan.textContent = formatTime(audio.currentTime);
    if (audio.duration) {
      const progress = audio.currentTime / audio.duration;
      const activeIndex = Math.floor(progress * numBars);
      bars.forEach((bar, index) => {
        if (index <= activeIndex) bar.classList.add('active');
        else bar.classList.remove('active');
      });
    }
  });

  // ENCHAÎNEMENT AUTOMATIQUE SUR LA PISTE SUIVANTE QUAND TERMINÉ
  audio.addEventListener('ended', () => {
    const activeItem = document.querySelector('.mini-track-item.active-track');
    const currentIndex = trackItems.indexOf(activeItem);
    if (currentIndex !== -1 && currentIndex < trackItems.length - 1) {
      trackItems[currentIndex + 1].click();
    } else if (trackItems.length > 0) {
      trackItems[0].click(); // Boucle sur le premier
    }
  });

  if (clickArea) {
    clickArea.addEventListener('click', (e) => {
      const rect = clickArea.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      if (audio.duration) audio.currentTime = (clickX / rect.width) * audio.duration;
    });
  }

  // CHARGEMENT PISTE & COVER
  trackItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();

      const parentCard = item.closest('.ep-card');
      
      epCards.forEach(c => c.classList.remove('active'));
      trackItems.forEach(t => t.classList.remove('active-track'));

      parentCard.classList.add('active');
      item.classList.add('active-track');

      const trackName = item.getAttribute('data-track');
      const trackSubtitle = item.getAttribute('data-sub');
      const audioSrc = item.getAttribute('data-audio');
      const trackCover = item.getAttribute('data-cover');
      const code = parentCard.getAttribute('data-ep');

      if (trackTitle) trackTitle.textContent = trackName;
      if (trackSub) trackSub.textContent = trackSubtitle;
      if (epCode) epCode.textContent = code;
      
      if (playerCoverImg && trackCover) {
        playerCoverImg.src = trackCover;
      }

      audio.src = audioSrc;
      audio.load();
      audio.play().then(() => updatePlayButton(true)).catch(e => console.log("Audio load error:", e));
    });
  });

  // Spectrum Canvas 60 FPS
  const canvas = document.getElementById('rta-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    const barCount = 32;
    const rtaBars = Array.from({ length: barCount }, () => 0.15);

    function drawSpectrum() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const barWidth = (width / barCount) - 2;

      for (let i = 0; i < barCount; i++) {
        let target = !audio.paused ? (Math.random() * 0.85 + 0.15) : (0.08 + Math.sin(Date.now() * 0.002 + i * 0.3) * 0.04);
        rtaBars[i] += (target - rtaBars[i]) * 0.2;

        const barHeight = rtaBars[i] * height;
        const x = i * (barWidth + 2);
        const y = height - barHeight;

        const gradient = ctx.createLinearGradient(0, y, 0, height);
        gradient.addColorStop(0, '#00f0ff');
        gradient.addColorStop(0.5, '#9333ea');
        gradient.addColorStop(1, '#1db954');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, barHeight);
      }
      requestAnimationFrame(drawSpectrum);
    }
    drawSpectrum();
  }

});
