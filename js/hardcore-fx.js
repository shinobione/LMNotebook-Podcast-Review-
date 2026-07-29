document.addEventListener('DOMContentLoaded', () => {
  
  // 1. CARTE DE SÉLECTION D'ALBUMS CLIQUEABLES
  const epCards = document.querySelectorAll('.ep-card');
  const trackTitle = document.getElementById('current-track-title');
  const trackSub = document.getElementById('current-track-sub');
  const epCode = document.getElementById('active-ep-code');
  const heroArtBg = document.getElementById('hero-art-bg');
  const metricLufs = document.getElementById('metric-lufs');
  const metricDr = document.getElementById('metric-dr');

  const artGradients = {
    neon: 'linear-gradient(135deg, rgba(0, 240, 255, 0.4) 0%, rgba(147, 51, 234, 0.4) 100%)',
    saigon: 'linear-gradient(135deg, rgba(255, 85, 0, 0.4) 0%, rgba(236, 72, 153, 0.4) 100%)',
    coal: 'linear-gradient(135deg, rgba(55, 65, 81, 0.6) 0%, rgba(17, 24, 39, 0.9) 100%)'
  };

  epCards.forEach(card => {
    card.addEventListener('click', () => {
      epCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');

      const title = card.getAttribute('data-title');
      const sub = card.getAttribute('data-sub');
      const code = card.getAttribute('data-code');
      const epType = card.getAttribute('data-ep');
      const lufs = card.getAttribute('data-lufs');
      const dr = card.getAttribute('data-dr');

      trackTitle.textContent = title;
      trackSub.textContent = sub;
      epCode.textContent = code;
      metricLufs.textContent = lufs;
      metricDr.textContent = dr;

      if (artGradients[epType]) {
        heroArtBg.style.background = artGradients[epType];
      }
    });
  });

  // 2. VISUALISEUR RTA CANVAS 60 FPS
  const canvas = document.getElementById('rta-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const barCount = 32;
  const bars = Array.from({ length: barCount }, () => Math.random() * 0.5 + 0.2);

  function drawSpectrum() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const width = canvas.width;
    const height = canvas.height;
    const barWidth = (width / barCount) - 2;

    for (let i = 0; i < barCount; i++) {
      // Simulation dynamique des barres
      const change = (Math.random() - 0.48) * 0.15;
      bars[i] = Math.max(0.1, Math.min(0.95, bars[i] + change));

      const barHeight = bars[i] * height;
      const x = i * (barWidth + 2);
      const y = height - barHeight;

      // Dégradé Cyberpunk Cyan / Magenta / Vert
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
});
