document.addEventListener('DOMContentLoaded', () => {
    const audioEl = document.getElementById('audio-element');
    const btnPlayPause = document.getElementById('btn-play-pause');
    const btnRewind = document.getElementById('btn-rewind');
    const btnForward = document.getElementById('btn-forward');
    const progressBar = document.getElementById('progress-bar');
    const progressContainer = document.getElementById('progress-container');
    const spotifyIframe = document.getElementById('spotify-iframe');
    const canvas = document.getElementById('rta-canvas');
    const ambientCanvas = document.getElementById('ambient-canvas');
    const btnExportMp3 = document.getElementById('btn-export-mp3');
    
    const currentTrackTitle = document.getElementById('current-track-title');
    const currentTrackSubtitle = document.getElementById('current-track-subtitle');
    const playerCover = document.getElementById('player-cover');
    const lyricsDisplay = document.getElementById('lyrics-display');
    const timeCurrent = document.getElementById('time-current');
    const timeTotal = document.getElementById('time-total');
    
    let audioCtx, analyser, dataArray;
    let isInitialized = false;
    let spotifyGhostMode = false;
    let parsedLyrics = []; 

    const FALLBACK_LYRICS = {
        "before-the-noise": "[00:00.00] // BEFORE THE NOISE //\n[00:04.50] Neon lights bleeding through the dashboard glass\n[00:10.20] Chasing shadows while the city builds too fast\n[00:16.80] We lived in moments that cracked\n[00:23.10] When kicked straight back to life\n[00:29.40] And the memories rush in\n[00:36.00] Ooh... Ooh... Mmmh\n[00:45.00] Cut the static, find the baseline drop\n[00:52.30] This underground machine is never gonna stop.",
        "low-bitrate-love": "[00:00.00] // LOW BITRATE LOVE //\n[00:05.00] Compressed frequencies across the wire\n[00:12.40] You whispered digital dreams in synthetic fire\n[00:20.10] Low bitrate love, high voltage pain\n[00:28.50] Running through the data stream in my brain.",
        "real-love-doesnt-rush": "[00:00.00] // REAL LOVE DOESN'T RUSH //\n[00:06.00] Slow burn vinyl cracking in the dark\n[00:14.20] Taking time to build a permanent spark\n[00:22.50] Real love doesn't rush the tempo\n[00:31.00] Keeping it deep, keeping it memo.",
        "saigon-bound": "[00:00.00] // SAIGON BOUND //\n[00:05.00] Motorbike hum under tropical rain\n[00:12.00] Neon crossing through Ben Thanh vein\n[00:20.00] Saigon bound, heartbeats aligned\n[00:28.00] Leaving the static and cold behind.",
        "tinh-bolero-cho-tran": "[00:00.00] // TÌNH BOLERO CHO TRÂN //\n[00:06.00] Tiếng guitar vọng qua phố xưa\n[00:14.00] Gửi trọn niềm đau vào trong cơn mưa\n[00:22.00] Tình Bolero cho người phương xa\n[00:30.00] Ngọt ngào câu hát đậm đà thiết tha.",
        "jusquau-dernier-souffle": "[00:00.00] // JUSQU'AU DERNIER SOUFFLE //\n[00:05.00] Regard croisé au coin de la rue\n[00:12.00] Des promesses qu'on n'a pas revues\n[00:20.00] Jusqu'au dernier souffle et dernier éclat\n[00:28.00] Je garderai ta flamme gravée en moi.",
        "thick": "[00:00.00] // THICK //\n[00:04.00] Blunt force trauma bumping the club\n[00:10.00] Billion-watt beat hitting big on the track\n[00:17.00] Bold with the bounce, never backing it back\n[00:24.00] Bury the rhythm, the body, the bone\n[00:31.00] Big bad weight sitting fat on the throne.",
        "the-throne-resonates": "[00:00.00] // THE THRONE RESONATES //\n[00:05.00] Heavy metal sub frequencies low\n[00:13.00] Watch the obsidian kingdom grow\n[00:21.00] The throne resonates with every shockwave\n[00:29.00] Built from the pressure inside the cave.",
        "carved-from-pressure": "[00:00.00] // CARVED FROM PRESSURE //\n[00:06.00] Coal to diamond under tectonic weight\n[00:14.00] We carved our name directly into fate\n[00:22.00] No fractures found, absolute glass\n[00:30.00] Watching the fragile illusions pass."
    };

    // --- 1. PARTICULES AMBIANTES AUDIO-RÉACTIVES ---
    function initAmbientParticles() {
        if (!ambientCanvas) return;
        const ctx = ambientCanvas.getContext('2d');
        let width = ambientCanvas.width = window.innerWidth;
        let height = ambientCanvas.height = window.innerHeight;
        
        window.addEventListener('resize', () => {
            width = ambientCanvas.width = window.innerWidth;
            height = ambientCanvas.height = window.innerHeight;
        });

        const particles = [];
        for (let i = 0; i < 70; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.7,
                vy: (Math.random() - 0.5) * 0.7,
                radius: Math.random() * 2.2 + 0.8,
                baseAlpha: Math.random() * 0.5 + 0.2
            });
        }

        function renderAmbient() {
            requestAnimationFrame(renderAmbient);
            ctx.clearRect(0, 0, width, height);

            let audioLevel = 0;
            if (dataArray && (!audioEl.paused || spotifyGhostMode)) {
                let sum = 0;
                for (let i = 0; i < 12; i++) sum += dataArray[i];
                audioLevel = (sum / 12) / 255;
            }

            particles.forEach(p => {
                p.x += p.vx * (1 + audioLevel * 2);
                p.y += p.vy * (1 + audioLevel * 2);
                if (p.x < 0) p.x = width; if (p.x > width) p.x = 0;
                if (p.y < 0) p.y = height; if (p.y > height) p.y = 0;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius + audioLevel * 2.5, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(0, 240, 255, ${p.baseAlpha + audioLevel * 0.5})`;
                ctx.shadowBlur = 10 * (1 + audioLevel);
                ctx.shadowColor = '#00f0ff';
                ctx.fill();
            });
        }
        renderAmbient();
    }
    initAmbientParticles();

    // --- 2. DSP & RTA ---
    function initDSP() {
        if (isInitialized) return;
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 128;
            dataArray = new Uint8Array(analyser.frequencyBinCount);
            
            const source = audioCtx.createMediaElementSource(audioEl);
            source.connect(analyser);
            analyser.connect(audioCtx.destination);
            isInitialized = true;
            renderRTA();
        } catch (e) {
            console.error("DSP Error:", e);
        }
    }

    function renderRTA() {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        requestAnimationFrame(renderRTA);
        
        if (!audioEl.paused) {
            analyser.getByteFrequencyData(dataArray);
        } else if (spotifyGhostMode) {
            for (let i = 0; i < dataArray.length; i++) {
                dataArray[i] = Math.random() > 0.82 ? Math.random() * 220 : Math.max(0, dataArray[i] - 12);
            }
        } else {
            for (let i = 0; i < dataArray.length; i++) dataArray[i] = Math.max(0, dataArray[i] - 6);
        }
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / dataArray.length) * 2.5;
        let x = 0;
        
        for (let i = 0; i < dataArray.length; i++) {
            let barHeight = (dataArray[i] / 255) * canvas.height;
            const r = barHeight * 2.8, g = 240 * (1 - (i/dataArray.length)), b = 255;
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.shadowBlur = 6;
            ctx.shadowColor = '#00f0ff';
            ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
            x += barWidth;
        }
    }

    // --- 3. MUTUAL EXCLUSION ---
    function pauseLocalPlayer() {
        if (!audioEl.paused) {
            audioEl.pause();
            btnPlayPause.textContent = '▶';
            btnPlayPause.style.background = 'var(--spotify-green)';
        }
    }

    window.addEventListener('blur', () => {
        setTimeout(() => {
            if (document.activeElement === spotifyIframe) {
                pauseLocalPlayer();
                initDSP();
                spotifyGhostMode = true;
            }
        }, 50);
    });

    function muteSpotifyEmbed() {
        spotifyGhostMode = false;
        if (spotifyIframe) {
            const src = spotifyIframe.src;
            spotifyIframe.src = "";
            setTimeout(() => { spotifyIframe.src = src; }, 50);
        }
    }

    // --- 4. CONTROLS & TIMELINE ---
    btnPlayPause.addEventListener('click', () => {
        initDSP();
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        if (audioEl.paused) {
            muteSpotifyEmbed();
            audioEl.play();
            btnPlayPause.textContent = '⏸';
            btnPlayPause.style.background = 'var(--accent-cyan)';
        } else {
            audioEl.pause();
            btnPlayPause.textContent = '▶';
            btnPlayPause.style.background = 'var(--spotify-green)';
        }
    });

    btnRewind.addEventListener('click', () => { audioEl.currentTime = Math.max(0, audioEl.currentTime - 10); });
    btnForward.addEventListener('click', () => { audioEl.currentTime = Math.min(audioEl.duration, audioEl.currentTime + 10); });

    progressContainer.addEventListener('click', (e) => {
        const rect = progressContainer.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        if (!isNaN(audioEl.duration)) audioEl.currentTime = pos * audioEl.duration;
    });

    audioEl.addEventListener('timeupdate', () => {
        if (!isNaN(audioEl.duration)) {
            progressBar.style.width = `${(audioEl.currentTime / audioEl.duration) * 100}%`;

            if (parsedLyrics.length > 0) {
                let activeIndex = 0;
                for (let i = 0; i < parsedLyrics.length; i++) {
                    if (audioEl.currentTime >= parsedLyrics[i].time) activeIndex = i;
                    else break;
                }

                const lineElements = lyricsDisplay.querySelectorAll('.lyrics-line');
                lineElements.forEach((el, index) => {
                    if (index === activeIndex) {
                        if (!el.classList.contains('lyrics-line-active')) {
                            el.classList.add('lyrics-line-active');
                            const targetTop = el.offsetTop - lyricsDisplay.clientHeight / 2 + el.clientHeight / 2;
                            lyricsDisplay.scrollTo({ top: targetTop, behavior: 'smooth' });
                        }
                    } else {
                        el.classList.remove('lyrics-line-active');
                    }
                });
            }
        }
        const fmt = (t) => isNaN(t) ? "00:00" : `${Math.floor(t/60).toString().padStart(2,'0')}:${Math.floor(t%60).toString().padStart(2,'0')}`;
        timeCurrent.textContent = fmt(audioEl.currentTime);
        timeTotal.textContent = fmt(audioEl.duration);
    });

    // --- 5. PARSER & LOADER ---
    function processLyricsText(rawText) {
        parsedLyrics = [];
        lyricsDisplay.innerHTML = '';
        const lines = rawText.split('\n');
        
        lines.forEach(line => {
            if (!line.trim()) return;
            const match = line.match(/\[(\d{2}):(\d{2})(?:\.(\d+))?\]/);
            let timeSec = 0;
            let txt = line;
            if (match) {
                timeSec = parseInt(match[1]) * 60 + parseInt(match[2]) + (match[3] ? parseInt(match[3].padEnd(3,'0').slice(0,3))/1000 : 0);
                txt = line.replace(/\[.*?\]/g, '').trim();
            } else {
                txt = line.trim();
            }
            parsedLyrics.push({ time: timeSec, text: txt });
            const span = document.createElement('span');
            span.className = 'lyrics-line';
            span.textContent = txt;
            lyricsDisplay.appendChild(span);
            lyricsDisplay.appendChild(document.createElement('br'));
        });

        if (parsedLyrics.length > 0) {
            lyricsDisplay.querySelectorAll('.lyrics-line')[0].classList.add('lyrics-line-active');
            lyricsDisplay.scrollTo({ top: 0, behavior: 'auto' });
        }
    }

    async function loadLyrics(trackId) {
        lyricsDisplay.textContent = "Loading vault data...";
        try {
            const res = await fetch(`assets/lyrics/${trackId}.txt`);
            if (res.ok) {
                processLyricsText(await res.text());
                return;
            }
        } catch (e) {}
        
        if (FALLBACK_LYRICS[trackId]) {
            processLyricsText(FALLBACK_LYRICS[trackId]);
        } else {
            processLyricsText(`[00:00.00] // ${trackId.toUpperCase()} //\n[00:05.00] Audio stream active and synchronized.`);
        }
    }

    function loadTrackData(trackId, epName, title) {
        muteSpotifyEmbed();
        const audioPath = `audio/${trackId}.mp3`;
        audioEl.src = audioPath;
        if (btnExportMp3) {
            btnExportMp3.href = audioPath;
            btnExportMp3.setAttribute('download', `${trackId}.mp3`);
        }
        if (isInitialized) audioEl.play();
        btnPlayPause.textContent = isInitialized ? '⏸' : '▶';
        btnPlayPause.style.background = isInitialized ? 'var(--accent-cyan)' : 'var(--spotify-green)';
        
        currentTrackTitle.textContent = title;
        currentTrackSubtitle.textContent = epName;
        playerCover.src = `assets/${trackId}.jpeg`;
        playerCover.onerror = function() { this.src = `assets/${trackId}.png`; };
        loadLyrics(trackId);
    }

    document.querySelectorAll('.mini-track-item').forEach(item => {
        item.addEventListener('click', (e) => {
            document.querySelectorAll('.mini-track-item').forEach(t => t.classList.remove('active-track'));
            e.target.classList.add('active-track');
            initDSP();
            if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
            loadTrackData(e.target.getAttribute('data-track'), e.target.getAttribute('data-ep'), e.target.textContent.repeat ? e.target.textContent.replace(/^\d+\.\s*/, '') : e.target.textContent);
        });
    });

    if (btnExportMp3) {
        btnExportMp3.href = "audio/before-the-noise.mp3";
        btnExportMp3.setAttribute('download', "before-the-noise.mp3");
    }
    loadLyrics('before-the-noise');
});
