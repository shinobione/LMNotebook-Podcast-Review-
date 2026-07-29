document.addEventListener('DOMContentLoaded', () => {
  
  // 1. COMMUTATEUR D'AUDIO & ARTWORKS DYNAMIQUE
  const epCards = document.querySelectorAll('.ep-card');
  const audioElement = document.getElementById('audio-element');
  const trackTitle = document.getElementById('current-track-title');
  const trackSub = document.getElementById('current-track-sub');
  const epCode = document.getElementById('active-ep-code');
  const playerCoverImg = document.getElementById('player-cover-img');
  const metricLufs = document.getElementById('metric-lufs');
  const metricDr = document.getElementById('metric-dr');
  const btnPlayPause = document.getElementById('btn-play-pause');
  const playIcon = document.getElementById('play-icon');

  let isPlaying = false;

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

      // Update UI Text & Image
      trackTitle.textContent = track;
      trackSub.textContent = sub;
      epCode.textContent = code;
      playerCoverImg.src = coverSrc;
      metricLufs.textContent = lufs;
      metricDr.textContent = dr;

      // Update Audio Engine
      audioElement.src = audioSrc;
      audioElement.load();
      audioElement.play().then(() => {
        isPlaying = true;
        if (playIcon) playIcon.setAttribute('data-lucide', 'pause');
        if (window.lucide) lucide.createIcons();
      }).catch(() => {
        // Fallback si l'audio n'existe pas localement encore
        isPlaying = false;
      });
    });
  });

  // 2. SPECTRUM CANVAS REACTIF AU LECTEUR
  const canvas = document.getElementById('rta-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const barCount = 32;
  const bars = Array.from({ length: barCount }, () => 0.15);

  function drawSpectrum() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const width = canvas.width;
    const height = canvas.height;
    const barWidth = (width / barCount) - 2;

    for (let i = 0; i < barCount; i++) {
      let target;

      if (isPlaying) {
        // Simule un mouvement audio actif et dynamique
        target = Math.random() * 0.8 + 0.15;
      } else {
        // Signal basique au repos
        target = 0.1 + Math.sin(Date.now() * 0.002 + i) * 0.05;
      }

      // Smooth interpolation
      bars[i] += (target - bars[i]) * 0.2;

      const barHeight = bars[i] * height;
      const x = i * (barWidth + 2);
      const y = height - barHeight;

      // Color Gradient Cyberpunk
      const gradient = ctx.createLinearGradient(0, y, 0, height);
      gradient.addColorStop(0, '#00f0ff');
      gradient.addColorStop(0.5, '#9333ea');
      gradient.addColorStop(1, '#1db954');

      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth, barHeight);
    }

    requestAnimationFrame(drawSpectrum);
  }

  // Ecouteurs sur le player principal
  if (audioElement) {
    audioElement.addEventListener('play', () => { isPlaying = true; });
    audioElement.addEventListener('pause', () => { isPlaying = false; });
  }

  drawSpectrum();
});
