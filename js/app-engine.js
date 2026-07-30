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
    const btnExportMp3 = document.getElementById('btn-export-mp3');
    const trackList = document.getElementById('track-list');

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
                item.setAttribute('aria-label', `Lire ${track.title}`);
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
            if (dataArray && (!audioEl.paused || spotifyGhostMode)) {
                let sum = 0;
                for (let i = 0; i < 12; i++) sum += dataArray[i];
                audioLevel = (sum / 12) / 255;
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
                ctx.fillStyle = `rgba(0, 240, 255, ${p.baseAlpha + audioLevel * 0.5})`;
                ctx.shadowBlur = 10 * (1 + audioLevel);
                ctx.shadowColor = '#00f0ff';
                ctx.fill();
            });
            ambientAnimationId = requestAnimationFrame(renderAmbient);
        }

        renderAmbient();
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

        let visualLevel = 0;
        for (let i = 0; i < Math.min(16, dataArray.length); i++) visualLevel += dataArray[i];
        visualLevel = visualLevel / (Math.min(16, dataArray.length) * 255);
        if (Math.abs(visualLevel - lastVisualLevel) > 0.015 || visualLevel === 0) {
            document.body.style.setProperty('--audio-level', visualLevel.toFixed(3));
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
            btnPlayPause.setAttribute('aria-label', 'Lire le morceau sélectionné');
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
            btnPlayPause.setAttribute('aria-label', 'Mettre en pause');
            setLocalAudioActive(true);
        } else {
            audioEl.pause();
            btnPlayPause.textContent = '▶';
            btnPlayPause.style.background = 'var(--spotify-green)';
            btnPlayPause.setAttribute('aria-label', 'Lire le morceau sélectionné');
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

    function selectAdjacentTrack(offset, autoplay) {
        const currentIndex = TRACK_ORDER.indexOf(currentTrackId);
        const nextIndex = (currentIndex + offset + TRACK_ORDER.length) % TRACK_ORDER.length;
        return loadTrackData(TRACK_ORDER[nextIndex], autoplay);
    }

    function updateTrackContext(trackId) {
        const currentIndex = TRACK_ORDER.indexOf(trackId);
        const followingId = TRACK_ORDER[(currentIndex + 1) % TRACK_ORDER.length];
        trackPosition.textContent = `Morceau ${currentIndex + 1} / ${TRACK_ORDER.length}`;
        nextTrackTitle.textContent = TRACKS[followingId].title;
    }

    async function loadTrackData(trackId, autoplay = isInitialized) {
        const track = TRACKS[trackId];
        if (!track) return;
        currentTrackId = trackId;
        updateTrackContext(trackId);

        if (autoplay) resetSpotifyEmbed();
        else spotifyGhostMode = false;
        audioEl.src = track.audio;
        audioEl.load();

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
            btnPlayPause.setAttribute('aria-label', 'Mettre en pause');
            setLocalAudioActive(true);
        } else {
            btnPlayPause.textContent = '▶';
            btnPlayPause.style.background = 'var(--spotify-green)';
            btnPlayPause.setAttribute('aria-label', 'Lire le morceau sélectionné');
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
