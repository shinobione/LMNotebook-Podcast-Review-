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
  const metricLufs = document.getElementById('metric-lufs');
  const metricDr = document.getElementById('metric-dr');
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

  audio.addEventListener('ended', () => updatePlayButton(false));

  if (clickArea) {
    clickArea.addEventListener('click', (e) => {
      const rect = clickArea.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      if (audio.duration) audio.currentTime = (clickX / rect.width) * audio.duration;
    });
  }

  // Clic sur cartes d'EP : Bascule Audio + Cover + Metas
  epCards.forEach(card => {
    card.addEventListener('click', () => {
      epCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');

      const track = card.getAttribute('data-track');
      const sub = card.getAttribute('data-sub');
      const code = card.getAttribute('data-code');
      const audioSrc = card.getAttribute('data-audio');
      const coverSrc = card.getAttribute('data-cover');
      const lufs = card.getAttribute('data-lufs');
      const dr = card.getAttribute('data-dr');

      if (trackTitle) trackTitle.textContent = track;
      if (trackSub) trackSub.textContent = sub;
      if (epCode) epCode.textContent = code;
      if (metricLufs) metricLufs.textContent = lufs;
      if (metricDr) metricDr.textContent = dr;
      if (playerCoverImg) playerCoverImg.src = coverSrc;

      audio.src = audioSrc;
      audio.load();
      audio.play().then(() => updatePlayButton(true)).catch(e => console.log(e));
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
