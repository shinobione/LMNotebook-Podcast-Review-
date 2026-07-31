document.addEventListener('DOMContentLoaded', () => {
    const audioEl = document.getElementById('audio-element');
    const btnPlayPause = document.getElementById('btn-play-pause');
    const btnRewind = document.getElementById('btn-rewind');
    const btnForward = document.getElementById('btn-forward');
    const btnPrevious = document.getElementById('btn-previous');
    const btnNext = document.getElementById('btn-next');
    const progressBar = document.getElementById('progress-bar');
    const progressContainer = document.getElementById('progress-container');
    const spotifyIframe = document.getElementById('spotify-iframe');
    const canvas = document.getElementById('rta-canvas');
    const ambientCanvas = document.getElementById('ambient-canvas');
    const audioFxCanvas = document.getElementById('audio-fx-canvas');
    const btnExportMp3 = document.getElementById('btn-export-mp3');
    const trackList = document.getElementById('track-list');
    const waveformCanvas = document.getElementById('waveform-canvas');
    const btnImmersive = document.getElementById('btn-immersive');
    const btnExitLive = document.getElementById('btn-exit-live');

    const currentTrackTitle = document.getElementById('current-track-title');
    const currentTrackSubtitle = document.getElementById('current-track-subtitle');
    const currentEpTag = document.getElementById('current-ep-tag');
    const playerCover = document.getElementById('player-cover');
    const lyricsDisplay = document.getElementById('lyrics-display');
    const timeCurrent = document.getElementById('time-current');
    const timeTotal = document.getElementById('time-total');
    const trackPosition = document.getElementById('track-position');
    const nextTrackTitle = document.getElementById('next-track-title');

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mobileMotion = window.matchMedia('(max-width: 768px)');
    const spotifyEmbedSrc = spotifyIframe ? spotifyIframe.src : '';
    let spotifyResetTimer = null;

    const EPS = [
        {
            id: 'ep1',
            label: 'EP 01',
            title: 'NEON HEARTBREAKS',
            epName: 'Neon Heartbreaks EP',
            tagClass: 'cyan-tag',
            cover: 'assets/neon-heartbreaks.jpeg',
            tracks: [
                { id: 'before-the-noise', title: 'Before the Noise', cover: 'assets/before-the-noise.jpeg', coverFallback: 'assets/before-the-noise.jpeg', audio: 'audio/before-the-noise.mp3', lyrics: 'assets/lyrics/before-the-noise.txt' },
                { id: 'low-bitrate-love', title: 'Low Bitrate Love', cover: 'assets/low-bitrate-love.jpeg', coverFallback: 'assets/low-bitrate-love.jpeg', audio: 'audio/low-bitrate-love.mp3', lyrics: 'assets/lyrics/low-bitrate-love.txt' },
                { id: 'real-love-doesnt-rush', title: "Real love doesn't rush", cover: 'assets/real-love-doesnt-rush.jpeg', coverFallback: 'assets/real-love-doesnt-rush.jpeg', audio: 'audio/real-love-doesnt-rush.mp3', lyrics: 'assets/lyrics/real-love-doesnt-rush.txt' }
            ]
        },
        {
            id: 'ep2',
            label: 'EP 02',
            title: 'SAIGON LETTERS',
            epName: 'Love Letters from Saigon',
            tagClass: 'purple-tag',
            cover: 'assets/love-letters.jpeg',
            tracks: [
                { id: 'saigon-bound', title: 'Saigon Bound', cover: 'assets/saigon-bound.png', coverFallback: 'assets/saigon-bound.png', audio: 'audio/saigon-bound.mp3', lyrics: 'assets/lyrics/saigon-bound.txt' },
                { id: 'tinh-bolero-cho-tran', title: 'Tình Bolero Cho Trân', cover: 'assets/tinh-bolero-cho-tran.png', coverFallback: 'assets/tinh-bolero-cho-tran.png', audio: 'audio/tinh-bolero-cho-tran.mp3', lyrics: 'assets/lyrics/tinh-bolero-cho-tran.txt' },
                { id: 'jusquau-dernier-souffle', title: "Jusqu'au Dernier Souffle", cover: 'assets/jusquau-dernier-souffle.jpeg', coverFallback: 'assets/jusquau-dernier-souffle.jpeg', audio: 'audio/jusquau-dernier-souffle.mp3', lyrics: 'assets/lyrics/jusquau-dernier-souffle.txt' }
            ]
        },
        {
            id: 'ep3',
            label: 'EP 03',
            title: 'COAL TO DIAMOND',
            epName: 'Coal to Diamond',
            tagClass: 'red-tag',
            cover: 'assets/coal-to-diamond.jpeg',
            tracks: [
                { id: 'thick', title: 'THICK', cover: 'assets/thick.jpeg', coverFallback: 'assets/thick.jpeg', audio: 'audio/thick.mp3', lyrics: 'assets/lyrics/thick.txt' },
                { id: 'the-throne-resonates', title: 'THE THRONE RESONATES', cover: 'assets/the-throne-resonates.jpeg', coverFallback: 'assets/the-throne-resonates.jpeg', audio: 'audio/the-throne-resonates.mp3', lyrics: 'assets/lyrics/the-throne-resonates.txt' },
                { id: 'carved-from-pressure', title: 'Carved from Pressure', cover: 'assets/carved-from-pressure.jpeg', coverFallback: 'assets/carved-from-pressure.jpeg', audio: 'audio/carved-from-pressure.mp3', lyrics: 'assets/lyrics/carved-from-pressure.txt' }
            ]
        }
    ];

    const TRACKS = EPS.reduce((tracks, ep, epIndex) => {
        ep.tracks.forEach((track, trackIndex) => {
            tracks[track.id] = { ...track, epId: ep.id, epName: ep.epName, epTag: ep.label, trackNumber: trackIndex + 1, activeByDefault: epIndex === 0 && trackIndex === 0 };
        });
        return tracks;
    }, {});

    const TRACK_ORDER = EPS.flatMap(ep => ep.tracks.map(track => track.id));
    let currentTrackId = TRACK_ORDER[0];

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

    let audioCtx, analyser, dataArray, resizeObserver;
    let isInitialized = false;
    let spotifyGhostMode = false;
    let parsedLyrics = [];
    let rtaAnimationId = null;
    let ambientAnimationId = null;
    let lastVisualLevel = 0;
    let bassAverage = 0;
    let lastBeatAt = 0;
    let lastSuperHitAt = 0;
    let fxAnimationId = null;
    let currentPeaks = [];
    let currentDropMarkers = [];
    let reactiveBass = 0;
    let reactiveMids = 0;
    let reactiveHighs = 0;
    let lightningLife = 0;
    let currentVisualTheme = 'ep1';
    const waveformCache = new Map();
    let particlePrimary = '#00f0ff';
    let particleSecondary = '#b026ff';
    const TRACK_PALETTES = {
        ep1: ['#00d9ff', '#3478ff'], ep2: ['#ffd166', '#ff4f9a'], ep3: ['#ff203f', '#ff7a18']
    };

    function createResponsiveImage(src, alt, className, isLazy = true) {
        const img = document.createElement('img');
        img.src = src;
        img.srcset = `${src} 1x`;
        img.sizes = '(max-width: 1024px) 100vw, 33vw';
        img.alt = alt;
        img.className = className;
        img.decoding = 'async';
        if (isLazy) img.loading = 'lazy';
        return img;
    }

    function renderTrackList() {
        if (!trackList) return;
        trackList.innerHTML = '';
        const fragment = document.createDocumentFragment();

        EPS.forEach(ep => {
            const epCard = document.createElement('article');
            epCard.className = `ep-card${ep.id === 'ep1' ? ' active' : ''}`;
            epCard.dataset.epTarget = ep.id;

            const coverFrame = document.createElement('div');
            coverFrame.className = 'ep-cover-frame';

            const tag = document.createElement('span');
            tag.className = `ep-tag-mini ${ep.tagClass}`;
            tag.textContent = ep.label;

            coverFrame.appendChild(tag);
            coverFrame.appendChild(createResponsiveImage(ep.cover, `${ep.title} cover`, 'ep-img-cover'));

            const details = document.createElement('div');
            details.className = 'ep-details';

            const title = document.createElement('h4');
            title.textContent = ep.title;

            const miniTrackList = document.createElement('div');
            miniTrackList.className = 'mini-tracklist';

            ep.tracks.forEach((track, index) => {
                const item = document.createElement('button');
                item.type = 'button';
                item.className = `mini-track-item${track.id === 'before-the-noise' ? ' active-track' : ''}`;
                item.dataset.track = track.id;
                item.setAttribute('aria-label', `Play ${track.title}`);
                item.textContent = `${index + 1}. ${track.title}`;
                miniTrackList.appendChild(item);
            });

            details.append(title, miniTrackList);
            epCard.append(coverFrame, details);
            fragment.appendChild(epCard);
        });

        trackList.appendChild(fragment);
    }

    function setMotionState() {
        document.documentElement.classList.toggle('reduced-motion', prefersReducedMotion.matches);
    }

    function resizeCanvasToDisplaySize(targetCanvas) {
        if (!targetCanvas) return;
        const rect = targetCanvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const width = Math.max(1, Math.round(rect.width * dpr));
        const height = Math.max(1, Math.round(rect.height * dpr));
        if (targetCanvas.width !== width || targetCanvas.height !== height) {
            targetCanvas.width = width;
            targetCanvas.height = height;
        }
    }

    function initAmbientParticles() {
        if (!ambientCanvas || prefersReducedMotion.matches) return;
        const ctx = ambientCanvas.getContext('2d');
        let width = 0;
        let height = 0;

        function resizeAmbientCanvas() {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            width = ambientCanvas.width = Math.round(window.innerWidth * dpr);
            height = ambientCanvas.height = Math.round(window.innerHeight * dpr);
            ambientCanvas.style.width = `${window.innerWidth}px`;
            ambientCanvas.style.height = `${window.innerHeight}px`;
        }

        resizeAmbientCanvas();
        window.addEventListener('resize', resizeAmbientCanvas, { passive: true });

        const particleCount = mobileMotion.matches ? 32 : 70;
        const particles = Array.from({ length: particleCount }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.7,
            vy: (Math.random() - 0.5) * 0.7,
            radius: Math.random() * 2.2 + 0.8,
            baseAlpha: Math.random() * 0.5 + 0.2
        }));

        function renderAmbient() {
            if (document.hidden || prefersReducedMotion.matches) {
                ambientAnimationId = requestAnimationFrame(renderAmbient);
                return;
            }

            ctx.clearRect(0, 0, width, height);

            let audioLevel = 0;
            let highLevel = 0;
            if (dataArray && (!audioEl.paused || spotifyGhostMode)) {
                let sum = 0;
                for (let i = 0; i < 12; i++) sum += dataArray[i];
                audioLevel = (sum / 12) / 255;
                for (let i = 28; i < Math.min(52, dataArray.length); i++) highLevel += dataArray[i];
                highLevel /= Math.max(1, Math.min(52, dataArray.length) - 28) * 255;
            }

            particles.forEach(p => {
                p.x += p.vx * (1 + audioLevel * 2);
                p.y += p.vy * (1 + audioLevel * 2);
                if (p.x < 0) p.x = width;
                if (p.x > width) p.x = 0;
                if (p.y < 0) p.y = height;
                if (p.y > height) p.y = 0;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius + audioLevel * 2.5, 0, Math.PI * 2);
                const sparkle = highLevel > 0.35 && Math.random() > 0.82;
                ctx.fillStyle = sparkle ? particleSecondary : particlePrimary;
                ctx.globalAlpha = Math.min(1, p.baseAlpha + audioLevel * 0.45 + (sparkle ? highLevel * 0.35 : 0));
                ctx.shadowBlur = (sparkle ? 18 : 10) * (1 + audioLevel);
                ctx.shadowColor = sparkle ? particleSecondary : particlePrimary;
                ctx.fill();
            });
            ctx.globalAlpha = 1;
            ambientAnimationId = requestAnimationFrame(renderAmbient);
        }

        renderAmbient();
    }

    function initAudioFx() {
        if (!audioFxCanvas || fxAnimationId) return;
        const context = audioFxCanvas.getContext('2d');
        const resize = () => {
            const dpr = Math.min(devicePixelRatio || 1, 1.5);
            audioFxCanvas.width = Math.round(innerWidth * dpr);
            audioFxCanvas.height = Math.round(innerHeight * dpr);
            audioFxCanvas.style.width = `${innerWidth}px`;
            audioFxCanvas.style.height = `${innerHeight}px`;
            context.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        resize();
        window.addEventListener('resize', resize, { passive: true });

        const renderFx = now => {
            fxAnimationId = requestAnimationFrame(renderFx);
            if (document.hidden || prefersReducedMotion.matches || audioEl.paused) {
                context.clearRect(0, 0, innerWidth, innerHeight);
                return;
            }
            context.clearRect(0, 0, innerWidth, innerHeight);
            const rect = document.querySelector('.hero-cover-stage').getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const radius = Math.min(rect.width, rect.height) * .52;

            const live = document.body.classList.contains('live-stage');

            if (currentVisualTheme === 'ep1') {
                // Blue album: layered, organic waves that bend with mids and swell with bass.
                context.save();
                context.lineCap = 'round';
                for (let wave = 0; wave < (live ? 7 : 4); wave++) {
                    const baseline = innerHeight * (.18 + wave * .12);
                    const amplitude = 18 + wave * 4 + reactiveBass * 70;
                    const phase = now * (.00045 + wave * .000035);
                    context.beginPath();
                    for (let x = -20; x <= innerWidth + 20; x += 14) {
                        const y = baseline
                            + Math.sin(x * .009 + phase + wave) * amplitude
                            + Math.sin(x * .021 - phase * 1.7) * (8 + reactiveMids * 24);
                        if (x < 0) context.moveTo(x, y); else context.lineTo(x, y);
                    }
                    context.strokeStyle = wave % 2 ? particleSecondary : particlePrimary;
                    context.globalAlpha = .055 + reactiveMids * .12;
                    context.lineWidth = 1 + reactiveBass * 2.2;
                    context.shadowBlur = 12 + reactiveBass * 22;
                    context.shadowColor = context.strokeStyle;
                    context.stroke();
                }
                context.restore();
            } else if (currentVisualTheme === 'ep2') {
                // Yellow album: a warm orbit of hand-drawn hearts instead of rigid geometry.
                context.save();
                context.translate(cx, cy);
                const heartCount = live ? 12 : 7;
                for (let index = 0; index < heartCount; index++) {
                    const angle = now * .00016 + index / heartCount * Math.PI * 2;
                    const orbit = radius * (1.25 + (index % 3) * .22) + reactiveBass * 38;
                    const size = 5 + (index % 4) * 2 + reactiveMids * 9;
                    const hx = Math.cos(angle) * orbit;
                    const hy = Math.sin(angle * 1.35) * orbit * .7;
                    context.save();
                    context.translate(hx, hy);
                    context.rotate(angle + Math.PI / 2);
                    context.beginPath();
                    context.moveTo(0, size * .35);
                    context.bezierCurveTo(-size * 1.35, -size * .65, -size * .55, -size * 1.45, 0, -size * .65);
                    context.bezierCurveTo(size * .55, -size * 1.45, size * 1.35, -size * .65, 0, size * .35);
                    context.strokeStyle = index % 2 ? particleSecondary : particlePrimary;
                    context.globalAlpha = .18 + reactiveMids * .5;
                    context.lineWidth = 1.2 + reactiveHighs * 1.8;
                    context.shadowBlur = 12;
                    context.shadowColor = context.strokeStyle;
                    context.stroke();
                    context.restore();
                }
                context.restore();
            }

            context.save();
            context.translate(cx, cy);
            const bars = Math.min(64, dataArray ? dataArray.length : 0);
            for (let index = 0; index < bars; index++) {
                const angle = index / bars * Math.PI * 2 - Math.PI / 2;
                const value = (dataArray[index] || 0) / 255;
                const length = 4 + value * Math.min(46, rect.width * .13);
                context.strokeStyle = index < 20 ? particlePrimary : particleSecondary;
                context.globalAlpha = .22 + value * .7;
                context.lineWidth = 1 + value * 1.5;
                context.beginPath();
                context.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
                context.lineTo(Math.cos(angle) * (radius + length), Math.sin(angle) * (radius + length));
                context.stroke();
            }
            context.restore();

            if (currentVisualTheme === 'ep3' && (lightningLife > .02 || reactiveBass > .48)) {
                context.save();
                context.strokeStyle = '#eaffff';
                context.shadowBlur = 18 + reactiveBass * 28;
                context.shadowColor = '#ff203f';
                context.globalAlpha = Math.max(lightningLife, reactiveBass * .5);
                context.lineWidth = 1.1 + reactiveBass * 2.4;
                const bolts = lightningLife > .35 ? 4 : 2;
                for (let bolt = 0; bolt < bolts; bolt++) {
                    const angle = now * .001 + bolt * Math.PI * .63 + Math.random() * .4;
                    const reach = radius * (1.6 + reactiveBass * 1.7);
                    context.beginPath();
                    context.moveTo(cx + Math.cos(angle) * radius * .8, cy + Math.sin(angle) * radius * .8);
                    for (let step = 1; step <= 8; step++) {
                        const distance = radius * .8 + reach * step / 8;
                        const jitter = (Math.random() - .5) * (22 + reactiveBass * 42);
                        context.lineTo(cx + Math.cos(angle) * distance + Math.sin(angle) * jitter, cy + Math.sin(angle) * distance - Math.cos(angle) * jitter);
                    }
                    context.stroke();
                }
                context.restore();
                lightningLife *= .84;
            }
        };
        fxAnimationId = requestAnimationFrame(renderFx);
    }

    function initDSP() {
        if (isInitialized) return;
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128;
        dataArray = new Uint8Array(analyser.frequencyBinCount);

        const source = audioCtx.createMediaElementSource(audioEl);
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
        isInitialized = true;

        resizeCanvasToDisplaySize(canvas);
        resizeObserver = new ResizeObserver(() => resizeCanvasToDisplaySize(canvas));
        resizeObserver.observe(canvas);
        renderRTA();
        initAudioFx();
        renderWaveform(audioEl.getAttribute('src'));
    }

    function renderRTA() {
        if (!canvas || !dataArray) return;
        if (document.hidden || prefersReducedMotion.matches) {
            rtaAnimationId = requestAnimationFrame(renderRTA);
            return;
        }

        const ctx = canvas.getContext('2d');
        rtaAnimationId = requestAnimationFrame(renderRTA);

        if (!audioEl.paused) {
            analyser.getByteFrequencyData(dataArray);
        } else if (spotifyGhostMode) {
            for (let i = 0; i < dataArray.length; i++) {
                dataArray[i] = Math.random() > 0.82 ? Math.random() * 220 : Math.max(0, dataArray[i] - 12);
            }
        } else {
            for (let i = 0; i < dataArray.length; i++) dataArray[i] = Math.max(0, dataArray[i] - 6);
        }

        const averageBand = (start, end) => {
            let sum = 0;
            const safeEnd = Math.min(end, dataArray.length);
            for (let i = start; i < safeEnd; i++) sum += dataArray[i];
            return sum / (Math.max(1, safeEnd - start) * 255);
        };
        const bass = averageBand(0, 8);
        const mids = averageBand(8, 28);
        const highs = averageBand(28, 64);
        const visualLevel = bass * 0.55 + mids * 0.3 + highs * 0.15;
        reactiveBass = bass;
        reactiveMids = mids;
        reactiveHighs = highs;
        bassAverage = bassAverage * 0.92 + bass * 0.08;
        const now = performance.now();
        if (!audioEl.paused && bass > bassAverage * 1.35 && bass > 0.24 && now - lastBeatAt > 180) {
            document.body.classList.remove('beat-hit');
            void document.body.offsetWidth;
            document.body.classList.add('beat-hit');
            lastBeatAt = now;
        }
        if (currentVisualTheme === 'ep3' && !audioEl.paused && bass > 0.52 && now - lastSuperHitAt > 420) {
            lightningLife = 1;
            document.body.classList.add('super-hit');
            setTimeout(() => document.body.classList.remove('super-hit'), 180);
            lastSuperHitAt = now;
        }
        if (Math.abs(visualLevel - lastVisualLevel) > 0.012 || visualLevel === 0) {
            const style = document.body.style;
            style.setProperty('--audio-level', visualLevel.toFixed(3));
            style.setProperty('--bass-level', bass.toFixed(3));
            style.setProperty('--mid-level', mids.toFixed(3));
            style.setProperty('--high-level', highs.toFixed(3));
            lastVisualLevel = visualLevel;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / dataArray.length) * 2.5;
        let x = 0;

        for (let i = 0; i < dataArray.length; i++) {
            const barHeight = (dataArray[i] / 255) * canvas.height;
            const r = barHeight * 2.8;
            const g = 240 * (1 - (i / dataArray.length));
            ctx.fillStyle = `rgb(${r},${g},255)`;
            ctx.shadowBlur = 6;
            ctx.shadowColor = '#00f0ff';
            ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
            x += barWidth;
        }
    }

    function pauseLocalPlayer() {
        if (!audioEl.paused) {
            audioEl.pause();
            btnPlayPause.textContent = '▶';
            btnPlayPause.style.background = 'var(--spotify-green)';
            btnPlayPause.setAttribute('aria-label', 'Play selected track');
            setLocalAudioActive(false);
        }
    }

    window.addEventListener('blur', () => {
        setTimeout(() => {
            if (document.activeElement === spotifyIframe) {
                pauseLocalPlayer();
                if (!isInitialized) initDSP();
                spotifyGhostMode = true;
            }
        }, 50);
    });

    function resetSpotifyEmbed() {
        spotifyGhostMode = false;
        if (!spotifyIframe || !spotifyEmbedSrc) return;

        clearTimeout(spotifyResetTimer);
        spotifyIframe.src = 'about:blank';
        spotifyResetTimer = setTimeout(() => {
            spotifyIframe.src = spotifyEmbedSrc;
        }, 80);
    }

    function setLocalAudioActive(isActive) {
        document.body.classList.toggle('audio-active', isActive);
    }

    audioEl.addEventListener('ended', () => {
        setLocalAudioActive(false);
        selectAdjacentTrack(1, true);
    });
    audioEl.addEventListener('pause', () => {
        if (!spotifyGhostMode) setLocalAudioActive(false);
    });
    audioEl.addEventListener('play', () => setLocalAudioActive(true));

    function formatTime(t) {
        return Number.isNaN(t) ? '00:00' : `${Math.floor(t / 60).toString().padStart(2, '0')}:${Math.floor(t % 60).toString().padStart(2, '0')}`;
    }

    btnPlayPause.addEventListener('click', async () => {
        if (!isInitialized) initDSP();
        if (audioCtx && audioCtx.state === 'suspended') await audioCtx.resume();
        if (audioEl.paused) {
            resetSpotifyEmbed();
            await audioEl.play();
            btnPlayPause.textContent = '⏸';
            btnPlayPause.style.background = 'var(--accent-cyan)';
            btnPlayPause.setAttribute('aria-label', 'Pause playback');
            setLocalAudioActive(true);
        } else {
            audioEl.pause();
            btnPlayPause.textContent = '▶';
            btnPlayPause.style.background = 'var(--spotify-green)';
            btnPlayPause.setAttribute('aria-label', 'Play selected track');
            setLocalAudioActive(false);
        }
    });

    btnRewind.addEventListener('click', () => { audioEl.currentTime = Math.max(0, audioEl.currentTime - 10); });
    btnForward.addEventListener('click', () => { audioEl.currentTime = Math.min(audioEl.duration || 0, audioEl.currentTime + 10); });
    btnPrevious.addEventListener('click', () => {
        if (audioEl.currentTime > 3) {
            audioEl.currentTime = 0;
            return;
        }
        selectAdjacentTrack(-1, !audioEl.paused);
    });
    btnNext.addEventListener('click', () => selectAdjacentTrack(1, !audioEl.paused));

    progressContainer.addEventListener('click', e => {
        const rect = progressContainer.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        if (!Number.isNaN(audioEl.duration)) audioEl.currentTime = pos * audioEl.duration;
    });

    audioEl.addEventListener('timeupdate', () => {
        if (!Number.isNaN(audioEl.duration)) {
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
                            const centeredTop = el.offsetTop - lyricsDisplay.clientHeight / 2 + el.clientHeight / 2;
                            const maxTop = Math.max(0, lyricsDisplay.scrollHeight - lyricsDisplay.clientHeight);
                            const targetTop = Math.min(maxTop, Math.max(0, centeredTop));
                            lyricsDisplay.scrollTo({ top: targetTop, behavior: prefersReducedMotion.matches ? 'auto' : 'smooth' });
                        }
                    } else {
                        el.classList.remove('lyrics-line-active');
                    }
                });
            }
        }
        drawWaveform();
        updateDropAnticipation();
        timeCurrent.textContent = formatTime(audioEl.currentTime);
        timeTotal.textContent = formatTime(audioEl.duration);
    });

    function processLyricsText(rawText) {
        parsedLyrics = [];
        lyricsDisplay.innerHTML = '';
        const lines = rawText.split('\n');
        const fragment = document.createDocumentFragment();

        lines.forEach(line => {
            if (!line.trim()) return;
            const match = line.match(/\[(\d{2}):(\d{2})(?:\.(\d+))?\]/);
            let timeSec = 0;
            let txt = line;
            if (match) {
                timeSec = parseInt(match[1], 10) * 60 + parseInt(match[2], 10) + (match[3] ? parseInt(match[3].padEnd(3, '0').slice(0, 3), 10) / 1000 : 0);
                txt = line.replace(/\[.*?\]/g, '').trim();
            } else {
                txt = line.trim();
            }
            parsedLyrics.push({ time: timeSec, text: txt });
            const span = document.createElement('span');
            span.className = 'lyrics-line';
            span.textContent = txt;
            fragment.appendChild(span);
            fragment.appendChild(document.createElement('br'));
        });

        lyricsDisplay.appendChild(fragment);

        if (parsedLyrics.length > 0) {
            lyricsDisplay.querySelectorAll('.lyrics-line')[0].classList.add('lyrics-line-active');
            lyricsDisplay.scrollTo({ top: 0, behavior: 'auto' });
        }
    }

    async function loadLyrics(track) {
        lyricsDisplay.textContent = 'Loading vault data...';
        try {
            const res = await fetch(track.lyrics);
            if (res.ok) {
                processLyricsText(await res.text());
                return;
            }
        } catch (e) {
            console.warn('Lyrics fetch failed, using fallback copy.', e);
        }

        if (FALLBACK_LYRICS[track.id]) {
            processLyricsText(FALLBACK_LYRICS[track.id]);
        } else {
            processLyricsText(`[00:00.00] // ${track.id.toUpperCase()} //\n[00:05.00] Audio stream active and synchronized.`);
        }
    }

    function setActiveTrack(trackId) {
        document.querySelectorAll('.mini-track-item').forEach(item => {
            const isActive = item.dataset.track === trackId;
            item.classList.toggle('active-track', isActive);
            item.setAttribute('aria-pressed', String(isActive));
        });

        document.querySelectorAll('.ep-card').forEach(card => {
            card.classList.toggle('active', card.dataset.epTarget === TRACKS[trackId].epId);
        });
    }


    function drawWaveform() {
        if (!waveformCanvas || !currentPeaks.length) return;
        const rect = waveformCanvas.getBoundingClientRect();
        const dpr = Math.min(devicePixelRatio || 1, 2);
        waveformCanvas.width = Math.max(1, Math.round(rect.width * dpr));
        waveformCanvas.height = Math.max(1, Math.round(rect.height * dpr));
        const context = waveformCanvas.getContext('2d');
        const progress = Number.isFinite(audioEl.duration) ? audioEl.currentTime / audioEl.duration : 0;
        const width = waveformCanvas.width / currentPeaks.length;
        context.clearRect(0, 0, waveformCanvas.width, waveformCanvas.height);
        currentPeaks.forEach((peak, index) => {
            const played = index / currentPeaks.length <= progress;
            const height = Math.max(1, peak * waveformCanvas.height * .88);
            context.fillStyle = played ? particlePrimary : 'rgba(226,232,240,.28)';
            context.shadowBlur = played ? 5 : 0;
            context.shadowColor = particlePrimary;
            context.fillRect(index * width, (waveformCanvas.height - height) / 2, Math.max(1, width - 1), height);
        });
        context.shadowBlur = 0;
        context.fillStyle = particleSecondary;
        currentDropMarkers.forEach(index => context.fillRect(index * width, 0, Math.max(1, dpr), waveformCanvas.height * .22));
        const headX = progress * waveformCanvas.width;
        context.fillStyle = '#fff';
        context.shadowBlur = 12;
        context.shadowColor = particlePrimary;
        context.beginPath();
        context.arc(headX, waveformCanvas.height / 2, 2.5 * dpr + reactiveBass * 2, 0, Math.PI * 2);
        context.fill();
    }

    function updateDropAnticipation() {
        if (!currentDropMarkers.length || !Number.isFinite(audioEl.duration)) return;
        const currentBin = audioEl.currentTime / audioEl.duration * currentPeaks.length;
        const nextDrop = currentDropMarkers.find(index => index >= currentBin);
        const binsAhead = nextDrop === undefined ? Infinity : nextDrop - currentBin;
        const anticipation = binsAhead < 12 ? Math.max(0, 1 - binsAhead / 12) : 0;
        document.body.style.setProperty('--drop-build', anticipation.toFixed(3));
        document.body.classList.toggle('drop-imminent', anticipation > .08);
    }

    async function renderWaveform(audioUrl) {
        if (!waveformCanvas || !audioCtx) return;
        const token = audioUrl;
        let peaks = waveformCache.get(audioUrl);
        if (!peaks) {
            try {
                const response = await fetch(audioUrl);
                const buffer = await audioCtx.decodeAudioData(await response.arrayBuffer());
                const channel = buffer.getChannelData(0);
                const bins = 180;
                const step = Math.max(1, Math.floor(channel.length / bins));
                peaks = Array.from({ length: bins }, (_, index) => {
                    let peak = 0;
                    for (let i = index * step; i < Math.min(channel.length, (index + 1) * step); i += 16) peak = Math.max(peak, Math.abs(channel[i]));
                    return peak;
                });
                waveformCache.set(audioUrl, peaks);
            } catch (error) {
                console.warn('Waveform generation failed.', error);
                return;
            }
        }
        if (audioEl.getAttribute('src') !== token) return;
        currentPeaks = peaks;
        const threshold = peaks.reduce((sum, peak) => sum + peak, 0) / peaks.length * 1.65;
        currentDropMarkers = peaks.map((peak, index) => peak > threshold && index > 2 && peak > peaks[index - 1] && peak >= (peaks[index + 1] || 0) ? index : -1).filter(index => index >= 0);
        drawWaveform();
    }

    function applyTrackPalette(track) {
        const [primary, secondary] = TRACK_PALETTES[track.epId] || TRACK_PALETTES.ep1;
        document.body.style.setProperty('--track-accent', primary);
        document.body.style.setProperty('--track-secondary', secondary);
        particlePrimary = primary;
        particleSecondary = secondary;
        currentVisualTheme = track.epId;
        document.body.classList.remove('theme-ep1', 'theme-ep2', 'theme-ep3');
        document.body.classList.add(`theme-${track.epId}`);
    }

    function setExperienceMode(active) {
        const live = Boolean(active);
        document.body.classList.toggle('live-stage', live);
        btnImmersive.setAttribute('aria-pressed', String(live));
        btnImmersive.hidden = live;
        btnExitLive.hidden = !live;
    }

    async function leaveFullscreen() {
        if (document.fullscreenElement && document.exitFullscreen) {
            await document.exitFullscreen().catch(() => {});
        }
    }

    async function toggleExperience() {
        const active = !document.body.classList.contains('live-stage');
        setExperienceMode(active);
        if (active && document.documentElement.requestFullscreen) {
            await document.documentElement.requestFullscreen().catch(() => {});
        } else if (!active) {
            await leaveFullscreen();
        }
    }

    function selectAdjacentTrack(offset, autoplay) {
        const currentIndex = TRACK_ORDER.indexOf(currentTrackId);
        const nextIndex = (currentIndex + offset + TRACK_ORDER.length) % TRACK_ORDER.length;
        return loadTrackData(TRACK_ORDER[nextIndex], autoplay);
    }

    function updateTrackContext(trackId) {
        const currentIndex = TRACK_ORDER.indexOf(trackId);
        const followingId = TRACK_ORDER[(currentIndex + 1) % TRACK_ORDER.length];
        trackPosition.textContent = `Track ${currentIndex + 1} / ${TRACK_ORDER.length}`;
        nextTrackTitle.textContent = TRACKS[followingId].title;
    }

    async function loadTrackData(trackId, autoplay = isInitialized) {
        const track = TRACKS[trackId];
        if (!track) return;
        currentTrackId = trackId;
        updateTrackContext(trackId);
        applyTrackPalette(track);
        document.body.classList.add('track-changing');
        setTimeout(() => document.body.classList.remove('track-changing'), 480);

        if (autoplay) resetSpotifyEmbed();
        else spotifyGhostMode = false;
        audioEl.src = track.audio;
        audioEl.load();
        renderWaveform(track.audio);

        if (btnExportMp3) {
            btnExportMp3.href = track.audio;
            btnExportMp3.setAttribute('download', `${track.id}.mp3`);
        }

        currentTrackTitle.textContent = track.title;
        currentTrackSubtitle.textContent = track.epName;
        currentEpTag.textContent = track.epTag;
        playerCover.src = track.cover;
        playerCover.srcset = `${track.cover} 1x`;
        playerCover.alt = `${track.title} cover`;
        playerCover.onerror = function onCoverError() { this.src = track.coverFallback; };
        setActiveTrack(trackId);
        loadLyrics(track);

        if (autoplay) {
            await audioEl.play();
            btnPlayPause.textContent = '⏸';
            btnPlayPause.style.background = 'var(--accent-cyan)';
            btnPlayPause.setAttribute('aria-label', 'Pause playback');
            setLocalAudioActive(true);
        } else {
            btnPlayPause.textContent = '▶';
            btnPlayPause.style.background = 'var(--spotify-green)';
            btnPlayPause.setAttribute('aria-label', 'Play selected track');
            setLocalAudioActive(false);
        }
    }

    trackList.addEventListener('click', async e => {
        const item = e.target.closest('.mini-track-item');
        if (!item) return;
        if (!isInitialized) initDSP();
        if (audioCtx && audioCtx.state === 'suspended') await audioCtx.resume();
        loadTrackData(item.dataset.track, true);
    });

    btnImmersive.addEventListener('click', toggleExperience);
    btnExitLive.addEventListener('click', toggleExperience);
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && document.body.classList.contains('live-stage')) {
            setExperienceMode(false);
        }
        const isInteractiveTarget = event.target.closest('button, a, input, textarea, select');
        if (document.body.classList.contains('live-stage') && event.code === 'Space' && !event.repeat && !isInteractiveTarget) {
            event.preventDefault();
            btnPlayPause.click();
        }
        if (document.body.classList.contains('live-stage') && event.key === 'ArrowRight') selectAdjacentTrack(1, !audioEl.paused);
        if (document.body.classList.contains('live-stage') && event.key === 'ArrowLeft') selectAdjacentTrack(-1, !audioEl.paused);
    });

    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement && document.body.classList.contains('live-stage')) {
            setExperienceMode(false);
        }
    });

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            resizeCanvasToDisplaySize(canvas);
        }
    });

    prefersReducedMotion.addEventListener('change', setMotionState);
    setMotionState();
    renderTrackList();
    initAmbientParticles();
    loadTrackData('before-the-noise', false);
});
