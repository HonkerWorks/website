// ==========================================================================
// HonkerWorks script.js v0.2
// Coordinates the visitor state machine (Intro Flow with consent gate),
// the user theme calibration system, and the "Banana Mode" animation.
// ==========================================================================

(function() {
    'use strict';

    // =================================-------------------------------------
    // 1. DYNAMIC COLOR STORAGE & CONFIGURATION
    // =================-----------------------------------------------------

    let activeThemeColors = ['#ffd31d', '#ff2e63', '#00adb5'];
    let selectedColors = [];
    let isRecalibrating = false;

    // Consent check and in-memory session store (used if consent is denied)
    let hasConsent = false;
    const sessionData = {};

    function getStorageItem(key) {
        if (hasConsent) {
            return localStorage.getItem(key);
        }
        return sessionData[key] || null;
    }

    function setStorageItem(key, value) {
        if (hasConsent) {
            localStorage.setItem(key, value);
        } else {
            sessionData[key] = value;
        }
    }

    // Convert hex to rgba helper for CSS injection and canvas
    function hexToRgba(hex, alpha) {
        hex = hex.replace('#', '');
        let r, g, b;
        if (hex.length === 3) {
            r = parseInt(hex[0] + hex[0], 16);
            g = parseInt(hex[1] + hex[1], 16);
            b = parseInt(hex[2] + hex[2], 16);
        } else {
            r = parseInt(hex.substring(0, 2), 16);
            g = parseInt(hex.substring(2, 4), 16);
            b = parseInt(hex.substring(4, 6), 16);
        }
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // Repaint document and cache active color channels
    function applyTheme(colors) {
        if (!colors || colors.length < 3) return;
        activeThemeColors = colors;

        const root = document.documentElement;
        
        // CSS variable updates
        root.style.setProperty('--theme-c1', colors[0]);
        root.style.setProperty('--theme-c1-glow', hexToRgba(colors[0], 0.15));
        
        root.style.setProperty('--theme-c2', colors[1]);
        root.style.setProperty('--theme-c2-glow', hexToRgba(colors[1], 0.15));
        
        root.style.setProperty('--theme-c3', colors[2]);
        root.style.setProperty('--theme-c3-glow', hexToRgba(colors[2], 0.15));

        console.log("Visual sensors calibrated to:", colors);
    }

    // =================================-------------------------------------
    // 2. STATE MACHINE (INTRO FLOW & OVERLAYS)
    // =================-----------------------------------------------------
    
    // Elements
    const introContainer = document.getElementById('intro-container');
    const mainSite = document.getElementById('main-site');
    const canvasControls = document.getElementById('canvas-controls');
    
    const phases = {
        consent: document.getElementById('phase-consent'),
        calibration: document.getElementById('phase-calibration'),
        ready: document.getElementById('phase-ready'),
        cucumbergeddonComic: document.getElementById('phase-comic-cucumbergeddon'),
        choice: document.getElementById('phase-explanation-choice'),
        comicExpl: document.getElementById('phase-explanation-comic'),
        textExpl: document.getElementById('phase-explanation-text')
    };

    // Buttons
    const consentGrantBtn = document.getElementById('consent-grant-btn');
    const consentDeclineBtn = document.getElementById('consent-decline-btn');
    const confirmCalibrationBtn = document.getElementById('confirm-calibration-btn');
    const beginBtn = document.getElementById('begin-btn');
    const readComicBtn = document.getElementById('read-comic-btn');
    const chooseComicBtn = document.getElementById('choose-comic-btn');
    const chooseTextBtn = document.getElementById('choose-text-btn');
    
    const completeComicBtn = document.getElementById('complete-flow-comic-btn');
    const completeTextBtn = document.getElementById('complete-flow-text-btn');
    const switchToTextBtn = document.getElementById('switch-to-text-btn');
    const switchToComicBtn = document.getElementById('switch-to-comic-btn');
    
    const resetIntroBtn = document.getElementById('reset-intro-btn');
    const recalibrateThemeBtn = document.getElementById('recalibrate-theme-btn');
    
    const tabTextBtn = document.getElementById('tab-text-btn');
    const tabComicBtn = document.getElementById('tab-comic-btn');
    const docContentText = document.getElementById('doc-content-text');
    const docContentComic = document.getElementById('doc-content-comic');

    function initStateMachine() {
        // First check: does consent historically exist in localStorage?
        const consentVal = localStorage.getItem('honkerworks_consent');
        
        if (consentVal === 'granted') {
            hasConsent = true;
            // Load custom colors
            const savedColors = localStorage.getItem('honkerworks_theme_colors');
            if (savedColors) {
                const parsedColors = JSON.parse(savedColors);
                selectedColors = parsedColors;
                applyTheme(parsedColors);
            }
            
            const isCompleted = localStorage.getItem('honkerworks_intro_completed') === 'true';
            if (isCompleted) {
                skipIntroDirectly();
                return;
            }
        }
        
        // If not completed or first load, initialize questionnaire listeners
        setupIntroListeners();
        setupCalibrationListeners();
    }

    function skipIntroDirectly() {
        if (introContainer) introContainer.classList.add('hidden');
        mainSite.classList.remove('hidden');
        void mainSite.offsetWidth;
        mainSite.classList.add('visible');
        canvasControls.classList.remove('controls-hidden');
        
        setupMainPageListeners();
        
        const firstChoice = getStorageItem('honkerworks_first_explanation') || 'text';
        activateDocTab(firstChoice);
    }

    function setupIntroListeners() {
        // Consent granted
        consentGrantBtn.addEventListener('click', () => {
            hasConsent = true;
            localStorage.setItem('honkerworks_consent', 'granted');
            transitionPhase(phases.consent, phases.calibration);
        });

        // Consent declined (Runs in stateless mode)
        consentDeclineBtn.addEventListener('click', () => {
            hasConsent = false;
            // Proceed without storing anything in localStorage
            transitionPhase(phases.consent, phases.calibration);
        });

        // Ready -> Comic Cucumbergeddon
        beginBtn.addEventListener('click', () => {
            setStorageItem('honkerworks_seen_question', 'true');
            transitionPhase(phases.ready, phases.cucumbergeddonComic);
        });

        // Cucumbergeddon Comic -> Choice
        readComicBtn.addEventListener('click', () => {
            setStorageItem('honkerworks_read_comic', 'true');
            transitionPhase(phases.cucumbergeddonComic, phases.choice);
        });

        // Choice -> Comic Explanation
        chooseComicBtn.addEventListener('click', () => {
            setStorageItem('honkerworks_first_explanation', 'comic');
            transitionPhase(phases.choice, phases.comicExpl);
        });

        // Choice -> Text Explanation
        chooseTextBtn.addEventListener('click', () => {
            setStorageItem('honkerworks_first_explanation', 'text');
            transitionPhase(phases.choice, phases.textExpl);
        });

        // Toggle paths
        switchToTextBtn.addEventListener('click', () => {
            setStorageItem('honkerworks_viewed_both', 'true');
            transitionPhase(phases.comicExpl, phases.textExpl);
        });

        switchToComicBtn.addEventListener('click', () => {
            setStorageItem('honkerworks_viewed_both', 'true');
            transitionPhase(phases.textExpl, phases.comicExpl);
        });

        // Complete flow buttons
        completeComicBtn.addEventListener('click', () => {
            completeIntroFlow('comic');
        });

        completeTextBtn.addEventListener('click', () => {
            completeIntroFlow('text');
        });
    }

    function syncCalibratorDOM() {
        const swatches = document.querySelectorAll('.swatch:not(#custom-add-btn)');
        const customAddBtn = document.getElementById('custom-add-btn');
        const swatchGrid = document.querySelector('.swatch-grid');
        const counter = document.getElementById('calibration-counter');
        const confirmBtn = document.getElementById('confirm-calibration-btn');
        
        if (!swatchGrid || !counter || !confirmBtn) return;
        
        // Clear all selected states and dynamic custom swatches
        swatches.forEach(s => s.classList.remove('selected'));
        document.querySelectorAll('.custom-swatch').forEach(s => s.remove());
        
        selectedColors.forEach(color => {
            const swatch = document.querySelector(`.swatch[data-color="${color}"]:not(#custom-add-btn)`);
            if (swatch) {
                swatch.classList.add('selected');
            } else {
                // Spawn dynamic custom swatch
                const newSwatch = document.createElement('div');
                newSwatch.className = 'swatch selected custom-swatch';
                newSwatch.style.backgroundColor = color;
                newSwatch.setAttribute('data-color', color);
                newSwatch.innerHTML = `<span class="swatch-name" style="font-size: 0.5rem; background: rgba(255,255,255,0.9); padding: 1px 3px; color: #000;">${color.toUpperCase()}</span>`;
                
                swatchGrid.insertBefore(newSwatch, customAddBtn);
                
                newSwatch.addEventListener('click', () => {
                    selectedColors = selectedColors.filter(c => c !== color);
                    newSwatch.remove();
                    syncCalibratorDOM();
                });
            }
        });
        
        counter.innerText = `Selected: ${selectedColors.length} / 3`;
        if (selectedColors.length === 3) {
            confirmBtn.removeAttribute('disabled');
        } else {
            confirmBtn.setAttribute('disabled', 'true');
        }
    }

    function setupCalibrationListeners() {
        const swatches = document.querySelectorAll('.swatch:not(#custom-add-btn)');
        const hiddenPicker = document.getElementById('hidden-picker');

        // Curated swatches selection
        swatches.forEach(swatch => {
            swatch.addEventListener('click', () => {
                const color = swatch.getAttribute('data-color');
                
                if (selectedColors.includes(color)) {
                    selectedColors = selectedColors.filter(c => c !== color);
                } else if (selectedColors.length < 3) {
                    selectedColors.push(color);
                } else {
                    // FIFO replacement: remove oldest, add new
                    const oldestColor = selectedColors.shift();
                    const dynamicOldest = document.querySelector(`.custom-swatch[data-color="${oldestColor}"]`);
                    if (dynamicOldest) dynamicOldest.remove();
                    
                    selectedColors.push(color);
                }
                
                syncCalibratorDOM();
            });
        });

        // Hidden picker change (fires when color is selected and native picker closes)
        hiddenPicker.addEventListener('change', () => {
            const color = hiddenPicker.value;
            
            if (selectedColors.includes(color)) return;
            
            if (selectedColors.length >= 3) {
                const oldestColor = selectedColors.shift();
                const dynamicOldest = document.querySelector(`.custom-swatch[data-color="${oldestColor}"]`);
                if (dynamicOldest) dynamicOldest.remove();
            }
            
            selectedColors.push(color);
            syncCalibratorDOM();
            console.log("Custom color locked in:", color);
        });

        confirmCalibrationBtn.addEventListener('click', () => {
            applyTheme(selectedColors);
            setStorageItem('honkerworks_theme_colors', JSON.stringify(selectedColors));

            if (isRecalibrating) {
                isRecalibrating = false;
                introContainer.classList.add('hidden');
                mainSite.classList.remove('hidden');
                void mainSite.offsetWidth;
                mainSite.classList.add('visible');
                canvasControls.classList.remove('hidden');
            } else {
                transitionPhase(phases.calibration, phases.ready);
            }
        });
    }

    function transitionPhase(fromPhase, toPhase) {
        fromPhase.classList.remove('active');
        setTimeout(() => {
            toPhase.classList.add('active');
        }, 300);
    }

    function completeIntroFlow(activeTabSelection) {
        setStorageItem('honkerworks_intro_completed', 'true');
        
        introContainer.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        introContainer.style.opacity = '0';
        introContainer.style.transform = 'scale(0.98)';
        
        setTimeout(() => {
            introContainer.classList.add('hidden');
            // Restore visibility rules in case they recalibrate later
            introContainer.style.opacity = '1';
            introContainer.style.transform = 'scale(1)';
            
            mainSite.classList.remove('hidden');
            void mainSite.offsetWidth;
            mainSite.classList.add('visible');
            canvasControls.classList.remove('controls-hidden');
            
            setupMainPageListeners();
            activateDocTab(activeTabSelection);
            
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 600);
    }

    function setupMainPageListeners() {
        tabTextBtn.addEventListener('click', () => activateDocTab('text'));
        tabComicBtn.addEventListener('click', () => activateDocTab('comic'));
        
        // Reset flow
        resetIntroBtn.addEventListener('click', () => {
            localStorage.removeItem('honkerworks_intro_completed');
            localStorage.removeItem('honkerworks_seen_question');
            localStorage.removeItem('honkerworks_read_comic');
            localStorage.removeItem('honkerworks_first_explanation');
            localStorage.removeItem('honkerworks_viewed_both');
            localStorage.removeItem('honkerworks_theme_colors');
            localStorage.removeItem('honkerworks_consent');
            window.location.reload();
        });

        // Recalibrate theme button
        recalibrateThemeBtn.addEventListener('click', () => {
            isRecalibrating = true;
            
            // Hide main, show intro container calibration view
            mainSite.classList.remove('visible');
            mainSite.classList.add('hidden');
            canvasControls.classList.add('controls-hidden');
            
            // Activate calibration phase in container
            Object.values(phases).forEach(p => p.classList.remove('active'));
            phases.calibration.classList.add('active');
            
            introContainer.classList.remove('hidden');
            syncCalibratorDOM(); // Render current active theme selections
        });
    }

    function activateDocTab(type) {
        if (!mainSite.classList.contains('hidden')) {
            if (type === 'text') {
                tabTextBtn.classList.add('active');
                tabComicBtn.classList.remove('active');
                docContentText.classList.add('active');
                docContentComic.classList.remove('active');
            } else {
                tabComicBtn.classList.add('active');
                tabTextBtn.classList.remove('active');
                docContentComic.classList.add('active');
                docContentText.classList.remove('active');
            }
        }
    }


    // =================================-------------------------------------
    // 3. BANANA MODE BACKGROUND ANIMATION ENGINE
    // =================-----------------------------------------------------
    
    let canvas, ctx;
    let width, height;
    let particles = [];
    let time = 0;
    
    let isRunning = true;
    let autoMode = true;
    let lastAutoSwitch = 0;
    let currentModeIndex = 12; // Start with ambient 'nebula' wave
    let literalBananaMode = false;
    
    const modes = [
        'tessellation', 'marbling', 'cellular', 'spiral', 'fractal',
        'orbit', 'magnetic', 'quantum', 'mandala', 'chaos',
        'boids', 'springs', 'nebula', 'interference', 'kaleidoscope'
    ];

    function getCurrentMode() {
        return modes[currentModeIndex];
    }

    class Particle {
        constructor() {
            this.reset();
            this.history = [];
        }

        reset() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vz = Math.random() * 2 - 1;
            this.vx = 0;
            this.vy = 0;
            this.life = Math.random() * 100 + 60;
            this.maxLife = this.life;
            this.size = Math.random() * 2.5 + 1.2;
            
            // Randomly select one of the 3 calibrated theme colors
            this.themeColor = activeThemeColors[Math.floor(Math.random() * 3)];
        }

        update() {
            const mode = getCurrentMode();
            this.updateByMode(mode);

            this.x += this.vx;
            this.y += this.vy;

            if (!literalBananaMode) {
                this.history.push({x: this.x, y: this.y});
                if (this.history.length > 10) {
                    this.history.shift();
                }
            } else {
                this.history = [];
            }

            this.life--;
            if (this.life <= 0 || this.x < -60 || this.x > width + 60 || this.y < -60 || this.y > height + 60) {
                this.reset();
            }
        }

        updateByMode(mode) {
            switch(mode) {
                case 'tessellation': this.updateTessellation(); break;
                case 'marbling': this.updateMarbling(); break;
                case 'cellular': this.updateCellular(); break;
                case 'spiral': this.updateSpiral(); break;
                case 'fractal': this.updateFractal(); break;
                case 'orbit': this.updateOrbit(); break;
                case 'magnetic': this.updateMagnetic(); break;
                case 'quantum': this.updateQuantum(); break;
                case 'mandala': this.updateMandala(); break;
                case 'chaos': this.updateChaos(); break;
                case 'boids': this.updateBoids(); break;
                case 'springs': this.updateSprings(); break;
                case 'nebula': this.updateNebula(); break;
                case 'interference': this.updateInterference(); break;
                case 'kaleidoscope': this.updateKaleidoscope(); break;
            }
        }

        updateTessellation() {
            const centerX = width / 2;
            const centerY = height / 2;
            const angle = Math.atan2(this.y - centerY, this.x - centerX);
            const distance = Math.sqrt((this.x - centerX) ** 2 + (this.y - centerY) ** 2);
            const wave = Math.sin(distance * 0.015 + time * 0.03) * 2;
            this.vx = Math.cos(angle + wave) * 0.45;
            this.vy = Math.sin(angle + wave) * 0.45;
        }

        updateMarbling() {
            const noiseX = this.x * 0.008 + time * 0.006;
            const noiseY = this.y * 0.008 + time * 0.006;
            const angle1 = Math.sin(noiseX) * Math.cos(noiseY) * Math.PI * 2;
            const angle2 = Math.cos(noiseX) * Math.sin(noiseY) * Math.PI * 2;
            this.vx = Math.cos(angle1) * 1.2 + Math.cos(angle2) * 0.4;
            this.vy = Math.sin(angle1) * 1.2 + Math.sin(angle2) * 0.4;
        }

        updateCellular() {
            const neighbors = particles.slice(0, 50).filter(p => {
                const dx = p.x - this.x;
                const dy = p.y - this.y;
                return (dx*dx + dy*dy) < 2000 && p !== this;
            });

            if (neighbors.length > 0) {
                let avgX = 0, avgY = 0;
                neighbors.forEach(p => { avgX += p.x; avgY += p.y; });
                avgX /= neighbors.length;
                avgY /= neighbors.length;
                this.vx += (avgX - this.x) * 0.0006;
                this.vy += (avgY - this.y) * 0.0006;
            }
            this.vx *= 0.992;
            this.vy *= 0.992;
        }

        updateSpiral() {
            const centerX = width / 2;
            const centerY = height / 2;
            const angle = Math.atan2(this.y - centerY, this.x - centerX);
            const distance = Math.sqrt((this.x - centerX) ** 2 + (this.y - centerY) ** 2);
            this.vx = Math.cos(angle + distance * 0.008 + time * 0.015) * 1.6;
            this.vy = Math.sin(angle + distance * 0.008 + time * 0.015) * 1.6;
        }

        updateFractal() {
            const fx = (this.x / width) * 4 - 2;
            const fy = (this.y / height) * 4 - 2;
            let zx = fx, zy = fy;
            let iterations = 0;
            while (zx * zx + zy * zy < 4 && iterations < 16) {
                const xtemp = zx * zx - zy * zy + fx;
                zy = 2 * zx * zy + fy;
                zx = xtemp;
                iterations++;
            }
            this.vx += Math.sin(iterations * 0.4) * 0.4;
            this.vy += Math.cos(iterations * 0.4) * 0.4;
        }

        updateOrbit() {
            const ox = width / 2;
            const oy = height / 2;
            const odx = this.x - ox;
            const ody = this.y - oy;
            const oangle = Math.atan2(ody, odx);
            const oradius = Math.sqrt(odx * odx + ody * ody);
            this.vx = -Math.sin(oangle) * (80 / (oradius + 1));
            this.vy = Math.cos(oangle) * (80 / (oradius + 1));
        }

        updateMagnetic() {
            const fieldStrength = Math.sin(this.x * 0.008 + time * 0.03) * Math.cos(this.y * 0.008 + time * 0.03);
            this.vx += fieldStrength * 1.5;
            this.vy += Math.cos(fieldStrength) * 1.5;
        }

        updateQuantum() {
            if (Math.random() < 0.03) {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
            }
            this.vx += (Math.random() - 0.5) * 0.4;
            this.vy += (Math.random() - 0.5) * 0.4;
        }

        updateMandala() {
            const mx = this.x - width / 2;
            const my = this.y - height / 2;
            const mangle = Math.atan2(my, mx);
            const petals = 8;
            const petalAngle = ((mangle + Math.PI) / (2 * Math.PI)) * petals;
            const modAngle = petalAngle - Math.floor(petalAngle);
            this.vx = Math.cos(modAngle * Math.PI * 2) * 0.8;
            this.vy = Math.sin(modAngle * Math.PI * 2) * 0.8;
        }

        updateChaos() {
            const sigma = 10;
            const rho = 28;
            const beta = 8/3;
            const dt = 0.008;
            const scale = 0.08;

            const dx = sigma * (this.vy - this.vx) * dt;
            const dy = (this.vx * (rho - this.vz) - this.vy) * dt;

            this.vx += dx * scale;
            this.vy += dy * scale;
        }

        updateBoids() {
            const neighbors = particles.slice(0, 60).filter(p => {
                const distSq = (p.x - this.x)**2 + (p.y - this.y)**2;
                return distSq < 6400 && p !== this;
            });

            let sepX = 0, sepY = 0, alignX = 0, alignY = 0, cohX = 0, cohY = 0;

            neighbors.forEach(p => {
                const dx = this.x - p.x;
                const dy = this.y - p.y;
                const dist = Math.sqrt(dx*dx + dy*dy) || 1;

                if (dist < 25) {
                    sepX += dx / dist;
                    sepY += dy / dist;
                }
                alignX += p.vx;
                alignY += p.vy;
                cohX += p.x;
                cohY += p.y;
            });

            if (neighbors.length > 0) {
                const len = neighbors.length;
                this.vx += sepX * 0.08 + ((alignX / len) - this.vx) * 0.04;
                this.vy += sepY * 0.08 + ((alignY / len) - this.vy) * 0.04;
                this.vx += ((cohX / len) - this.x) * 0.0005;
                this.vy += ((cohY / len) - this.y) * 0.0005;
            }
        }

        updateSprings() {
            const springX = width / 2;
            const springY = height / 2;
            const dx = springX - this.x;
            const dy = springY - this.y;
            this.vx += dx * 0.0008;
            this.vy += dy * 0.0008;
            this.vx *= 0.985;
            this.vy *= 0.985;
        }

        updateNebula() {
            const density = Math.sin(this.x * 0.0015 + time * 0.008) * Math.cos(this.y * 0.0015 + time * 0.006);
            this.vx += density * 0.6;
            this.vy += Math.sin(density * 2) * 0.6;
            this.vx *= 0.99;
            this.vy *= 0.99;
        }

        updateInterference() {
            const wave = Math.sin(this.x * 0.015 + time * 0.08) + Math.sin(this.y * 0.015 + time * 0.08);
            this.vx += wave * 0.4;
            this.vy += Math.cos(wave) * 0.4;
        }

        updateKaleidoscope() {
            const angle = Math.atan2(this.y - height/2, this.x - width/2);
            const normalizedAngle = ((angle + Math.PI) / (2 * Math.PI)) * 12;
            const segmentAngle = normalizedAngle - Math.floor(normalizedAngle);
            const mirroredAngle = segmentAngle > 0.5 ? 1 - segmentAngle : segmentAngle;

            this.vx = Math.cos(mirroredAngle * Math.PI * 2) * 0.45;
            this.vy = Math.sin(mirroredAngle * Math.PI * 2) * 0.45;
        }

        draw() {
            const alpha = this.life / this.maxLife;
            const mode = getCurrentMode();

            if (literalBananaMode) {
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.globalAlpha = alpha * 0.7;
                const angle = Math.atan2(this.vy, this.vx);
                ctx.rotate(angle);
                ctx.font = `${this.size * 5 + 10}px serif`;
                ctx.fillText('🍌', 0, 0);
                ctx.restore();
                return;
            }

            if (mode === 'tessellation' || mode === 'mandala') {
                ctx.strokeStyle = hexToRgba(this.themeColor, alpha * 0.12);
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);

                const centerX = width / 2;
                const centerY = height / 2;
                const angle = Math.atan2(this.y - centerY, this.x - centerX);
                const length = 12;

                ctx.lineTo(
                    this.x + Math.cos(angle + Math.PI / 3) * length,
                    this.y + Math.sin(angle + Math.PI / 3) * length
                );
                ctx.lineTo(
                    this.x + Math.cos(angle - Math.PI / 3) * length,
                    this.y + Math.sin(angle - Math.PI / 3) * length
                );
                ctx.closePath();
                ctx.stroke();
            } else {
                if (this.history.length > 1) {
                    ctx.strokeStyle = hexToRgba(this.themeColor, alpha * 0.045);
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(this.history[0].x, this.history[0].y);

                    for (let i = 1; i < this.history.length; i++) {
                        ctx.lineTo(this.history[i].x, this.history[i].y);
                    }
                    ctx.stroke();
                }

                ctx.fillStyle = hexToRgba(this.themeColor, alpha * 0.25);
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    function resizeCanvas() {
        if (!canvas) return;
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        ctx.fillStyle = '#060606';
        ctx.fillRect(0, 0, width, height);
    }

    function initParticles() {
        particles = [];
        const mode = getCurrentMode();
        let count = ['cellular', 'boids'].includes(mode) ? 80 : 300;
        
        if (window.innerWidth < 768) {
            count = Math.floor(count * 0.4);
        }
        
        if (literalBananaMode) {
            count = Math.min(count, 50);
        }

        for (let i = 0; i < count; i++) {
            particles.push(new Particle());
        }
    }

    let animationFrameId = null;

    function animate() {
        if (!isRunning) return;

        time++;

        if (autoMode && (time - lastAutoSwitch > 900)) {
            currentModeIndex = (currentModeIndex + 1) % modes.length;
            lastAutoSwitch = time;
            updateControlsUI();
            initParticles();
        }

        ctx.fillStyle = 'rgba(6, 6, 6, 0.085)';
        ctx.fillRect(0, 0, width, height);

        particles.forEach(p => {
            p.update();
            p.draw();
        });

        animationFrameId = requestAnimationFrame(animate);
    }

    function startAnimation() {
        if (!isRunning) {
            isRunning = true;
            animate();
        }
    }

    function stopAnimation() {
        if (isRunning) {
            isRunning = false;
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
            if (ctx && canvas) {
                ctx.fillStyle = '#060606';
                ctx.fillRect(0, 0, width, height);
            }
        }
    }

    function setupAnimationControls() {
        const toggleAnimBtn = document.getElementById('toggle-animation-btn');
        const prevModeBtn = document.getElementById('prev-mode-btn');
        const nextModeBtn = document.getElementById('next-mode-btn');
        const toggleAutoBtn = document.getElementById('toggle-auto-btn');
        
        if (!toggleAnimBtn) return;

        toggleAnimBtn.addEventListener('click', () => {
            const statusText = toggleAnimBtn.querySelector('.status-text');
            if (isRunning) {
                stopAnimation();
                toggleAnimBtn.classList.remove('active');
                toggleAnimBtn.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                statusText.innerText = 'OFF';
            } else {
                startAnimation();
                toggleAnimBtn.classList.add('active');
                toggleAnimBtn.style.borderColor = 'var(--theme-c1)';
                statusText.innerText = 'ON';
            }
        });

        prevModeBtn.addEventListener('click', () => {
            currentModeIndex = (currentModeIndex - 1 + modes.length) % modes.length;
            initParticles();
            updateControlsUI();
        });

        nextModeBtn.addEventListener('click', () => {
            currentModeIndex = (currentModeIndex + 1) % modes.length;
            initParticles();
            updateControlsUI();
        });

        toggleAutoBtn.addEventListener('click', () => {
            autoMode = !autoMode;
            lastAutoSwitch = time;
            if (autoMode) {
                toggleAutoBtn.classList.add('active');
            } else {
                toggleAutoBtn.classList.remove('active');
            }
        });
        
        window.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'b' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
                    literalBananaMode = !literalBananaMode;
                    initParticles();
                }
            }
        });

        updateControlsUI();
    }

    function updateControlsUI() {
        const modeDisplay = document.getElementById('current-mode-display');
        if (modeDisplay) {
            modeDisplay.innerText = getCurrentMode();
        }
    }

    function initAnimation() {
        canvas = document.getElementById('bg-canvas');
        if (!canvas) return;

        ctx = canvas.getContext('2d');
        
        const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        const handleMotionPreference = (e) => {
            if (e.matches) {
                stopAnimation();
                const toggleAnimBtn = document.getElementById('toggle-animation-btn');
                if (toggleAnimBtn) {
                    toggleAnimBtn.classList.remove('active');
                    toggleAnimBtn.querySelector('.status-text').innerText = 'OFF';
                }
            } else {
                isRunning = false;
                startAnimation();
            }
        };
        
        motionQuery.addEventListener('change', handleMotionPreference);

        resizeCanvas();
        initParticles();
        setupAnimationControls();
        
        window.addEventListener('resize', () => {
            resizeCanvas();
            initParticles();
        });

        if (!motionQuery.matches) {
            isRunning = false;
            startAnimation();
        } else {
            isRunning = true;
            stopAnimation();
        }
    }

    // =================================-------------------------------------
    // 4. EASTER EGG: DRIFTING BANANA & CUCUMBER/GOOSE STORM
    // =================-----------------------------------------------------
    
    let bananaX = 100;
    let bananaY = 100;
    let bananaVx = 1.2;
    let bananaVy = 0.8;
    let isStormActive = false;
    let stormEmojis = [];
    
    function initDriftingBanana() {
        const driftingBanana = document.getElementById('drifting-banana');
        if (!driftingBanana) return;
        
        bananaX = Math.random() * (window.innerWidth - 100) + 50;
        bananaY = Math.random() * (window.innerHeight - 100) + 50;
        
        bananaVx = (Math.random() * 1.4 + 0.6) * (Math.random() < 0.5 ? 1 : -1);
        bananaVy = (Math.random() * 1.4 + 0.6) * (Math.random() < 0.5 ? 1 : -1);
        
        driftingBanana.style.left = bananaX + 'px';
        driftingBanana.style.top = bananaY + 'px';
        
        function drift() {
            if (isStormActive) return;
            
            bananaX += bananaVx;
            bananaY += bananaVy;
            
            const rightLimit = window.innerWidth - 60;
            const bottomLimit = window.innerHeight - 60;
            
            if (bananaX <= 0) {
                bananaX = 0;
                bananaVx *= -1;
            } else if (bananaX >= rightLimit) {
                bananaX = rightLimit;
                bananaVx *= -1;
            }
            
            if (bananaY <= 0) {
                bananaY = 0;
                bananaVy *= -1;
            } else if (bananaY >= bottomLimit) {
                bananaY = bottomLimit;
                bananaVy *= -1;
            }
            
            driftingBanana.style.left = bananaX + 'px';
            driftingBanana.style.top = bananaY + 'px';
            
            const rot = (time * 0.4) % 360;
            driftingBanana.style.transform = `rotate(${rot}deg)`;
            
            requestAnimationFrame(drift);
        }
        
        requestAnimationFrame(drift);
        
        driftingBanana.addEventListener('click', (e) => {
            e.stopPropagation();
            startStorm(bananaX, bananaY);
        });
    }

    function startStorm(startX, startY) {
        if (isStormActive) return;
        isStormActive = true;
        
        const driftingBanana = document.getElementById('drifting-banana');
        if (driftingBanana) {
            driftingBanana.style.display = 'none';
        }
        
        const stormContainer = document.getElementById('storm-container');
        if (!stormContainer) return;
        
        document.body.style.overflow = 'hidden';
        console.log("Cucumbergeddon & Goose Storm Engaged!");
        
        let spawnRate = 1;
        let spawnInterval = 50;
        let maxEmojis = 600; 
        let spawnedCount = 0;
        let baseSize = 22;
        
        function spawn() {
            if (spawnedCount >= maxEmojis) {
                showOverloadWarning();
                return;
            }
            
            const spawnCountThisTick = Math.min(Math.floor(spawnRate), maxEmojis - spawnedCount);
            
            for (let i = 0; i < spawnCountThisTick; i++) {
                const el = document.createElement('span');
                el.className = 'storm-emoji';
                
                el.innerText = Math.random() < 0.5 ? '🥒' : '🪿';
                
                const offset = 25;
                const x = startX + (Math.random() - 0.5) * offset;
                const y = startY + (Math.random() - 0.5) * offset;
                
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 4 + 2;
                const vx = Math.cos(angle) * speed;
                const vy = Math.sin(angle) * speed;
                
                const currentSize = baseSize + spawnedCount * 0.15;
                
                el.style.fontSize = `${currentSize}px`;
                el.style.left = `${x}px`;
                el.style.top = `${y}px`;
                
                const rot = Math.random() * 360;
                const vRot = (Math.random() - 0.5) * 6;
                
                stormContainer.appendChild(el);
                
                stormEmojis.push({
                    element: el,
                    x: x,
                    y: y,
                    vx: vx,
                    vy: vy,
                    size: currentSize,
                    rot: rot,
                    vRot: vRot
                });
                
                spawnedCount++;
            }
            
            spawnRate += 0.08;
            setTimeout(spawn, Math.max(10, spawnInterval - spawnedCount * 0.15));
        }
        
        spawn();
        
        function updateStormPhysics() {
            const w = window.innerWidth;
            const h = window.innerHeight;
            
            stormEmojis.forEach(emoji => {
                emoji.x += emoji.vx;
                emoji.y += emoji.vy;
                emoji.rot += emoji.vRot;
                
                const limitX = w - emoji.size * 1.2;
                const limitY = h - emoji.size * 1.2;
                
                if (emoji.x <= 0) {
                    emoji.x = 0;
                    emoji.vx *= -1;
                } else if (emoji.x >= limitX) {
                    emoji.x = limitX;
                    emoji.vx *= -1;
                }
                
                if (emoji.y <= 0) {
                    emoji.y = 0;
                    emoji.vy *= -1;
                } else if (emoji.y >= limitY) {
                    emoji.y = limitY;
                    emoji.vy *= -1;
                }
                
                emoji.element.style.left = `${emoji.x}px`;
                emoji.element.style.top = `${emoji.y}px`;
                emoji.element.style.transform = `rotate(${emoji.rot}deg)`;
            });
            
            requestAnimationFrame(updateStormPhysics);
        }
        
        requestAnimationFrame(updateStormPhysics);
    }
    
    function showOverloadWarning() {
        const container = document.getElementById('storm-container');
        if (!container || document.getElementById('overload-warning')) return;
        
        const warning = document.createElement('div');
        warning.id = 'overload-warning';
        warning.style.position = 'fixed';
        warning.style.top = '50%';
        warning.style.left = '50%';
        warning.style.transform = 'translate(-50%, -50%)';
        warning.style.padding = '2rem 3rem';
        warning.style.background = 'rgba(10, 10, 10, 0.95)';
        warning.style.border = '2px solid var(--color-pink)';
        warning.style.borderRadius = '12px';
        warning.style.color = '#fff';
        warning.style.fontFamily = 'var(--font-mono)';
        warning.style.textAlign = 'center';
        warning.style.zIndex = '20000';
        warning.style.boxShadow = '0 0 50px rgba(255, 46, 99, 0.4)';
        warning.style.pointerEvents = 'auto';
        
        warning.innerHTML = `
            <h2 style="color: var(--color-pink); margin-bottom: 1rem; font-size: 1.8rem; font-weight: 700;">⚠️ LAB OVERFLOW ⚠️</h2>
            <p style="color: var(--text-secondary); margin-bottom: 1.5rem; line-height: 1.5;">
                Cucumbergeddon & Goose storm coordinates have saturated computational memory.
            </p>
            <button onclick="window.location.reload();" class="action-btn primary-btn" style="background-color: var(--color-pink); border-color: var(--color-pink); color: #fff; box-shadow: 0 4px 15px rgba(255, 46, 99, 0.3);">
                🔄 Re-Calibrate Lab
            </button>
        `;
        
        container.appendChild(warning);
    }

    // =================================-------------------------------------
    // 4.5. TEAM COHORT DATA & DYNAMIC DOSSIERS
    // =================-----------------------------------------------------
    const fallbackTeamData = {
      "intro": {
        "title": "We believe ambitious ideas require different kinds of minds.",
        "subtitle": "Honkerworks is intentionally interdisciplinary.",
        "description": "Our goal isn't simply to build software. It's to investigate difficult problems, create useful tools, and continuously improve our understanding of the world. Different people contribute different perspectives—engineering, markets, research, systems thinking, operations, business, and experimentation."
      },
      "members": [
        {
          "id": "timothy",
          "name": "Timothy Eichler",
          "role": "Chief Beam Inspector (CBI)",
          "avatar": "assets/timothy_avatar.png",
          "summary": "Co-ordinating system development, architectural design, and experimental engineering pipelines.",
          "bio": [
            {
              "heading": "Why \"Chief Beam Inspector\"?",
              "paragraphs": [
                "The title Chief Beam Inspector (CBI) was adopted because it describes the role more accurately than traditional titles like CTO or Chief Architect.",
                "The phrase comes from an old Zen teaching about the \"beam\" in one's own eye before pointing out the \"splinter\" in someone else's. Whether building software, designing organisations, or working with AI, the principle is the same: Inspect your own assumptions first.",
                "Question your own reasoning. Look for blind spots before criticizing the world. At Honkerworks, investigation begins with ourselves."
              ]
            },
            {
              "heading": "Wrestling With AI",
              "paragraphs": [
                "The title itself emerged during long conversations with AI while exploring questions about reasoning, evidence, software architecture, and truth-seeking.",
                "As countless discussions unfolded, one theme kept returning: Before building better systems, we needed to become better investigators. Not investigators in the detective sense, but investigators of our own thinking.",
                "The AI eventually remarked that much of this work resembled a \"Chief Beam Inspector\"—someone whose responsibility is not simply to build, but to continually inspect the beams supporting the entire structure.",
                "The name made us laugh. Then it stuck, because beneath the humour was something surprisingly accurate: much of engineering isn't writing code. It's examining assumptions, finding contradictions, removing unnecessary complexity, and strengthening weak foundations before adding another floor."
              ]
            },
            {
              "heading": "The Builder's Responsibility",
              "paragraphs": [
                "Building without investigation creates fragile systems. Investigation without building creates endless theory. Honkerworks tries to hold both in balance.",
                "The role of the CBI is therefore to:"
              ],
              "list": [
                "Inspect assumptions",
                "Investigate evidence",
                "Design experiments",
                "Build carefully",
                "Learn continuously",
                "Revise opinions when presented with better evidence"
              ],
              "postscript": "Build. Investigate. Repeat. If there is a beam to inspect, inspect your own first."
            }
          ],
          "additionalRoles": [
            "Founder",
            "Head of Research & Development",
            "Systems Architect",
            "Software Engineer",
            "AI Systems Designer",
            "Infrastructure Engineer",
            "Product Designer",
            "Research Engineer"
          ],
          "links": {
            "github": "https://github.com/timeichler",
            "linkedin": "#",
            "twitter": "#",
            "website": "#"
          }
        },
        {
          "id": "myles",
          "name": "Myles",
          "role": "Chief Executive Officer (CEO)",
          "avatar": "assets/myles_avatar.png",
          "summary": "Navigating ambiguity, carrying risk first, and creating the momentum needed to transform ambitious research into resilient organisations.",
          "bio": [
            {
              "paragraphs": [
                "Myles operates where ambiguity meets execution. For him, leadership is not about maintaining static control, but about finding balance while in constant motion, adapting to changing terrain, and stepping willingly into the unknown.",
                "He believes that sustainable growth requires carrying risk first. By absorbing the impact of uncertainty, he helps establish the quiet stability and trust that engineers and researchers need to do their most ambitious work. He doesn't manage from behind; he moves first because momentum is built through action.",
                "At Honkerworks, Myles is helping shape an environment where resilience is practiced rather than merely discussed, ensuring that deep technical breakthroughs find their place in the real world."
              ],
              "heading": "Focus Areas:",
              "list": [
                "Navigating structural uncertainty and organizational strategy",
                "Forming deep, trust-based partnerships and alliances",
                "Carrying operational risk to protect creative freedom",
                "Bridging advanced research with sustainable market value",
                "Cultivating environments of resilience and continual learning"
              ],
              "postscript": "His work is centered on building things worth believing in—aligning people, resources, and momentum to turn ambitious ideas into permanent realities."
            }
          ],
          "additionalRoles": [],
          "links": {
            "linkedin": "#",
            "twitter": "#",
            "website": "#"
          }
        },
        {
          "id": "jonathan",
          "name": "Jonathan Evans",
          "role": "Partner",
          "subtitle": "Independent Researcher & Developer",
          "avatar": "assets/jonathan_avatar.png",
          "summary": "Providing steadfast support, thoughtful analysis, and a calm, long-term perspective to guide ambitious ideas toward sustainable reality.",
          "bio": [
            {
              "paragraphs": [
                "Jonathan's role at Honkerworks is built on a foundation of long-term consistency. For years, he was the friend who quietly kept reaching out, maintaining connection even when the busy cycles of research and building meant communication wasn't always returned. When Honkerworks finally began taking shape, he was among the first to step forward and say, 'Let's talk.' That patient willingness to invest in the future is a pattern that defines both his character and his work.",
                "He brings a quiet, stabilizing presence to the team, contributing through deep structural analysis and practical business execution. He does not seek the spotlight; instead, he serves as an anchor—asking the difficult questions when they matter most and helping steer projects when uncertainty grows.",
                "His focus is on making ambitious ideas sustainable over the long haul. Through thoughtful collaboration and a steady perspective, he ensures that the laboratory's creations are built on ground that lasts."
              ],
              "heading": "Current focus areas include:",
              "list": [
                "Long-term systems thinking and technical analysis",
                "Aligning advanced software concepts with sustainable business models",
                "Evaluating and challenging core architectural assumptions",
                "Independent software development and experimental research",
                "Fostering durable, trust-based collaboration across disciplines"
              ],
              "postscript": "Rather than defining him by a single moment, Jonathan's contribution represents the value of quiet expertise and steadfast dedication brought together around shared goals."
            }
          ],
          "additionalRoles": [
            "Writer",
            "Educator",
            "Business Owner"
          ],
          "links": {
            "github": "#",
            "linkedin": "#",
            "website": "#"
          }
        },
        {
          "id": "ty",
          "name": "Ty Cockburn",
          "role": "Advisory Engineer",
          "avatar": "assets/ty_avatar.png",
          "summary": "Bridging imagination and implementation by grounding ambitious concepts in safe, reliable, and functional reality.",
          "bio": [
            {
              "paragraphs": [
                "Ty Cockburn is an engineer in the broadest sense of the word. With a background spanning mechanical engineering, practical trades, industrial operations, and complex multidisciplinary coordination, he brings the rare discipline of making difficult things actually work in the physical world. He operates with the understanding that every elegant design must eventually survive contact with reality, and that mistakes carry real consequences.",
                "A master of coordinating across specialists, contractors, and project phases, Ty maintains momentum and quality where others see logistical friction. Beyond technical competence, he brings a defining quality of quiet confidence and humility. Respect, to Ty, is something freely given rather than carefully rationed. He naturally treats younger colleagues as peers, teaching by working alongside them and mentoring without talking down.",
                "Initially serving in an advisory capacity, Ty helps shape the engineering direction of Honkerworks, serving as the critical bridge between imagination and implementation. He believes that great engineering is rarely the work of a single individual—it emerges from teams built on trust, mutual respect, and shared responsibility."
              ],
              "heading": "Focus Areas:",
              "list": [
                "Bridging ambitious engineering designs with physical implementation",
                "Systems thinking, logistics, planning, and safe operational execution",
                "Coordinating multidisciplinary teams, specialists, and contractors",
                "Mentoring, peer collaboration, and cultivating collective responsibility",
                "Translating advanced concepts into functional, reliable systems that exist in the world"
              ],
              "postscript": "His perspective brings the practical judgment and deep competence required to ensure that what we build is both safe and built to last."
            }
          ],
          "additionalRoles": [
            "Mechanical Engineer",
            "Industrial Operations",
            "Systems Architect",
            "Logistics & Planning"
          ],
          "links": {
            "linkedin": "#"
          }
        }
      ],
      "growing": {
        "title": "A Growing Team",
        "paragraphs": [
          "Honkerworks is still at the beginning.",
          "Many future contributors will join from different backgrounds:"
        ],
        "backgrounds": [
          "Software engineering",
          "Artificial intelligence",
          "Distributed systems",
          "Mathematics",
          "Physics",
          "Biology",
          "Design",
          "Music",
          "Education",
          "Philosophy",
          "Economics",
          "Product",
          "Operations"
        ],
        "postscript": "The goal is not to collect impressive résumés. The goal is to assemble people who enjoy asking difficult questions, building carefully, learning continuously, and leaving the world a little better than they found it."
      }
    };

    let teamData = null;

    function initTeamSection() {
        fetch('team.json')
            .then(response => {
                if (!response.ok) throw new Error('Network response was not ok');
                return response.json();
            })
            .then(data => {
                teamData = data;
                renderTeam(data);
            })
            .catch(err => {
                console.warn('Could not load team.json dynamically (possibly CORS or file:// protocol). Using inline fallback data.', err);
                teamData = fallbackTeamData;
                renderTeam(fallbackTeamData);
            });

        setupDossierModalListeners();
    }

    function renderTeam(data) {
        const titleEl = document.getElementById('team-title');
        const subtitleEl = document.getElementById('team-subtitle');
        const descEl = document.getElementById('team-description');
        if (titleEl && data.intro.title) titleEl.innerText = data.intro.title;
        if (subtitleEl && data.intro.subtitle) subtitleEl.innerText = data.intro.subtitle;
        if (descEl && data.intro.description) descEl.innerText = data.intro.description;

        const grid = document.getElementById('team-grid');
        if (grid) {
            grid.innerHTML = '';
            data.members.forEach(member => {
                const card = document.createElement('div');
                card.className = 'team-card glass-card';
                card.setAttribute('data-id', member.id);
                card.innerHTML = `
                    <div class="team-avatar-container">
                        <img src="${member.avatar}" alt="${member.name}" class="team-avatar">
                    </div>
                    <h3 class="team-name">${member.name}</h3>
                    <div class="team-role">${member.role}</div>
                    <p class="team-summary">${member.summary || ''}</p>
                `;
                card.addEventListener('click', () => {
                    openDossier(member.id);
                });
                grid.appendChild(card);
            });
        }

        const growTitleEl = document.getElementById('growing-title');
        const growPostscriptEl = document.getElementById('growing-postscript');
        if (growTitleEl && data.growing.title) growTitleEl.innerText = data.growing.title;
        if (growPostscriptEl && data.growing.postscript) growPostscriptEl.innerText = data.growing.postscript;

        const backgroundsList = document.getElementById('growing-backgrounds');
        if (backgroundsList && data.growing.backgrounds) {
            backgroundsList.innerHTML = '';
            data.growing.backgrounds.forEach(bg => {
                const span = document.createElement('span');
                span.innerText = bg;
                backgroundsList.appendChild(span);
            });
        }
    }

    function openDossier(id) {
        if (!teamData) return;
        const member = teamData.members.find(m => m.id === id);
        if (!member) return;

        const modal = document.getElementById('dossier-modal');
        const avatar = document.getElementById('dossier-avatar');
        const name = document.getElementById('dossier-name');
        const role = document.getElementById('dossier-role');
        const bioContent = document.getElementById('dossier-bio-content');
        const rolesList = document.getElementById('dossier-roles-list');
        const rolesSection = document.getElementById('dossier-roles-section');
        const linksContainer = document.getElementById('dossier-links');

        if (!modal || !avatar || !name || !role || !bioContent || !rolesList || !linksContainer) return;

        avatar.src = member.avatar;
        avatar.alt = member.name;
        name.innerText = member.name;
        
        let roleText = member.role;
        if (member.subtitle) {
            roleText += ` // ${member.subtitle}`;
        }
        role.innerText = roleText;

        let bioHtml = '';
        if (member.bio) {
            const bioSections = Array.isArray(member.bio) ? member.bio : [member.bio];
            bioSections.forEach(section => {
                if (section.heading) {
                    bioHtml += `<h3>${section.heading}</h3>`;
                }
                if (section.paragraphs) {
                    section.paragraphs.forEach(p => {
                        bioHtml += `<p>${p}</p>`;
                    });
                }
                if (section.list) {
                    bioHtml += `<ul>`;
                    section.list.forEach(item => {
                        bioHtml += `<li>${item}</li>`;
                    });
                    bioHtml += `</ul>`;
                }
                if (section.postscript) {
                    bioHtml += `<p style="font-style: italic; color: var(--text-primary); margin-top: 1rem; margin-bottom: 1.5rem;">${section.postscript}</p>`;
                }
            });
        }
        bioContent.innerHTML = bioHtml;

        if (member.additionalRoles && member.additionalRoles.length > 0) {
            rolesSection.style.display = 'block';
            rolesList.innerHTML = '';
            member.additionalRoles.forEach(r => {
                const tag = document.createElement('span');
                tag.innerText = r;
                rolesList.appendChild(tag);
            });
        } else {
            rolesSection.style.display = 'none';
        }

        linksContainer.innerHTML = '';
        if (member.links) {
            Object.entries(member.links).forEach(([platform, url]) => {
                if (url && url !== '#') {
                    const link = document.createElement('a');
                    link.className = 'dossier-link';
                    link.href = url;
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    
                    let dispName = platform.charAt(0).toUpperCase() + platform.slice(1);
                    if (platform === 'twitter') dispName = 'X / Twitter';
                    
                    link.innerText = dispName;
                    linksContainer.appendChild(link);
                }
            });
        }
        
        if (linksContainer.children.length === 0) {
            const link = document.createElement('a');
            link.className = 'dossier-link';
            link.href = 'mailto:hello@honkerworks.com';
            link.innerText = 'Contact via Lab';
            linksContainer.appendChild(link);
        }

        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    function closeDossier() {
        const modal = document.getElementById('dossier-modal');
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }

    function setupDossierModalListeners() {
        const closeBtn = document.getElementById('close-dossier-btn');
        const modal = document.getElementById('dossier-modal');

        if (closeBtn) {
            closeBtn.addEventListener('click', closeDossier);
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal || e.target.classList.contains('modal-container')) {
                    closeDossier();
                }
            });
        }

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeDossier();
            }
        });
    }

    // =================================-------------------------------------
    // 5. EXECUTION ON DOM CONTENT LOADED
    // =================-----------------------------------------------------
    window.addEventListener('DOMContentLoaded', () => {
        initStateMachine();
        initAnimation();
        initDriftingBanana();
        initTeamSection();
    });

})();
