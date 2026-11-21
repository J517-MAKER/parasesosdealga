/*
 * Cielo dinámico compartido (día / mañana / atardecer / noche / automático).
 * Extraído de wordle.html para que el menú y las demás páginas usen el mismo cielo.
 * Guarda el modo en localStorage con la misma clave que el Wordle,
 * así el cielo elegido se mantiene entre páginas.
 *
 * Uso:
 *   new DynamicSky(canvas, botonCielo, iconoCielo, metaThemeColor, { onToast: msg => ... });
 */
(function () {
    "use strict";

    const SKY_STORAGE_KEY = "wordle-cielo-modo";

    // Mismo formato que wordle.html (JSON) para compartir el modo entre páginas
    const MODES = ["auto", "day", "sunset", "night"];
    const storage = {
        get(k) {
            try {
                const raw = localStorage.getItem(k);
                if (raw === null) return null;
                let v = raw;
                try { v = JSON.parse(raw); } catch (e) { /* valor sin JSON */ }
                return MODES.includes(v) ? v : null;
            } catch (e) { return null; }
        },
        set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } }
    };

    let showToast = () => {};

    class DynamicSky {
        constructor(canvas, skyBtnEl, skyIconEl, metaThemeEl) {
            this.canvas = canvas;
            this.ctx = canvas.getContext("2d");
            this.btn = skyBtnEl;
            this.icon = skyIconEl;
            this.metaTheme = metaThemeEl;

            this.mode = storage.get(SKY_STORAGE_KEY) || "auto"; // 'auto' | 'day' | 'sunset' | 'night'
            this.activePhase = "day"; // 'morning' | 'day' | 'sunset' | 'night'

            this.isMobile = (window.innerWidth < 768) || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
            this.targetFps = this.isMobile ? 36 : 60;
            this.frameInterval = 1000 / this.targetFps;
            this.lastRender = 0;

            this.width = 0;
            this.height = 0;
            this.dpr = 1;

            this.clouds = [];
            this.stars = [];
            this.animId = null;
            this.lastTime = performance.now();

            this.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

            // Valores actuales para interpolación suave (lerp)
            this.current = {
                top: [74, 144, 217],
                mid: [148, 198, 243],
                bot: [225, 242, 255],
                sunX: 0.78,
                sunY: 0.22,
                sunAlpha: 1,
                sunR: 28,
                sunColor: [255, 250, 220],
                sunGlow: [255, 215, 120, 0.4],
                moonX: 0.8,
                moonY: 0.2,
                moonAlpha: 0,
                starAlpha: 0,
                cloudTop: [255, 255, 255, 0.95],
                cloudMid: [240, 246, 255, 0.85],
                cloudBot: [180, 200, 225, 0.42]
            };

            this.target = { ...this.current };

            this.initStars();
            this.resize();
            this.initClouds();

            window.addEventListener("resize", () => {
                this.resize();
                this.repositionClouds();
            }, { passive: true });

            document.addEventListener("visibilitychange", () => {
                if (document.hidden) {
                    if (this.animId) cancelAnimationFrame(this.animId);
                    this.animId = null;
                } else {
                    this.lastTime = performance.now();
                    this.loop(this.lastTime);
                }
            });

            if (this.btn) {
                this.btn.addEventListener("click", () => this.cycleMode());
            }

            this.syncPhase(true);
            this.updateButtonUI();
            this.loop(performance.now());
        }

        getAutoPhase() {
            const now = new Date();
            const h = now.getHours() + now.getMinutes() / 60;
            if (h >= 6 && h < 11.5) return "morning";
            if (h >= 11.5 && h < 18) return "day";
            if (h >= 18 && h < 20.75) return "sunset";
            return "night";
        }

        getThemeForPhase(phase) {
            if (phase === "night") return "night";
            if (phase === "sunset") return "sunset";
            return "day";
        }

        syncPhase(immediate = false) {
            const phase = this.mode === "auto" ? this.getAutoPhase() : this.mode;
            this.activePhase = phase;
            const theme = this.getThemeForPhase(phase);

            if (theme === "day") {
                document.documentElement.removeAttribute("data-theme");
            } else {
                document.documentElement.setAttribute("data-theme", theme);
            }

            let themeColor = "#6b95c0";
            if (phase === "day") {
                themeColor = "#74aee2";
                this.target = {
                    top: [74, 144, 217],
                    mid: [148, 198, 243],
                    bot: [225, 242, 255],
                    sunX: 0.78,
                    sunY: 0.22,
                    sunAlpha: 1,
                    sunR: 28,
                    sunColor: [255, 250, 220],
                    sunGlow: [255, 215, 120, 0.4],
                    moonX: 0.8,
                    moonY: 0.2,
                    moonAlpha: 0,
                    starAlpha: 0,
                    cloudTop: [255, 255, 255, 0.96],
                    cloudMid: [240, 246, 255, 0.86],
                    cloudBot: [180, 200, 225, 0.42]
                };
            } else if (phase === "morning") {
                themeColor = "#7ba0c8";
                this.target = {
                    top: [95, 135, 195],
                    mid: [175, 175, 225],
                    bot: [255, 215, 185],
                    sunX: 0.24,
                    sunY: 0.42,
                    sunAlpha: 1,
                    sunR: 26,
                    sunColor: [255, 235, 190],
                    sunGlow: [255, 190, 100, 0.45],
                    moonX: 0.8,
                    moonY: 0.2,
                    moonAlpha: 0,
                    starAlpha: 0,
                    cloudTop: [255, 250, 240, 0.94],
                    cloudMid: [245, 228, 232, 0.82],
                    cloudBot: [185, 170, 205, 0.45]
                };
            } else if (phase === "sunset") {
                themeColor = "#54285b";
                this.target = {
                    top: [58, 30, 80],
                    mid: [175, 72, 105],
                    bot: [245, 155, 90],
                    sunX: 0.65,
                    sunY: 0.58,
                    sunAlpha: 1,
                    sunR: 30,
                    sunColor: [255, 170, 90],
                    sunGlow: [235, 95, 75, 0.5],
                    moonX: 0.8,
                    moonY: 0.2,
                    moonAlpha: 0,
                    starAlpha: 0.2,
                    cloudTop: [255, 205, 160, 0.9],
                    cloudMid: [210, 125, 145, 0.8],
                    cloudBot: [85, 40, 80, 0.55]
                };
            } else { // night
                themeColor = "#0d152a";
                this.target = {
                    top: [7, 12, 28],
                    mid: [15, 26, 54],
                    bot: [26, 40, 78],
                    sunX: 0.78,
                    sunY: 0.22,
                    sunAlpha: 0,
                    sunR: 26,
                    sunColor: [255, 250, 220],
                    sunGlow: [255, 215, 120, 0],
                    moonX: 0.8,
                    moonY: 0.2,
                    moonAlpha: 1,
                    starAlpha: 1,
                    cloudTop: [145, 175, 215, 0.4],
                    cloudMid: [35, 48, 75, 0.65],
                    cloudBot: [16, 24, 42, 0.72]
                };
            }

            if (this.metaTheme) this.metaTheme.setAttribute("content", themeColor);

            if (immediate) {
                for (const k in this.target) {
                    this.current[k] = Array.isArray(this.target[k]) ? [...this.target[k]] : this.target[k];
                }
            }
        }

        cycleMode() {
            const modes = ["auto", "day", "sunset", "night"];
            const nextIdx = (modes.indexOf(this.mode) + 1) % modes.length;
            this.mode = modes[nextIdx];
            storage.set(SKY_STORAGE_KEY, this.mode);
            this.syncPhase(false);
            this.updateButtonUI();

            const msgs = {
                auto: "Cielo: Automático (tiempo real) ⏱️",
                day: "Cielo: Día ☀️",
                sunset: "Cielo: Atardecer 🌅",
                night: "Cielo: Noche 🌙"
            };
            showToast(msgs[this.mode]);
        }

        updateButtonUI() {
            if (!this.icon) return;
            const icons = {
                auto: "⛅",
                day: "☀️",
                sunset: "🌅",
                night: "🌙"
            };
            const titles = {
                auto: "Cielo: Automático en tiempo real (clic para cambiar)",
                day: "Cielo: Día (clic para cambiar)",
                sunset: "Cielo: Atardecer (clic para cambiar)",
                night: "Cielo: Noche (clic para cambiar)"
            };
            this.icon.textContent = icons[this.mode] || "⛅";
            if (this.btn) this.btn.title = titles[this.mode] || "Cambiar modo de cielo";
        }

        initStars() {
            this.stars = [];
            const count = this.isMobile ? 32 : 65;
            for (let i = 0; i < count; i++) {
                const tintChoice = Math.random();
                let color = "255, 255, 255";
                if (tintChoice < 0.25) color = "200, 225, 255";
                else if (tintChoice < 0.45) color = "255, 245, 215";

                this.stars.push({
                    xNorm: Math.random(),
                    yNorm: Math.random() * 0.72,
                    r: Math.random() * 1.4 + 0.6,
                    baseAlpha: Math.random() * 0.65 + 0.25,
                    speed: Math.random() * 0.0025 + 0.0012,
                    phase: Math.random() * Math.PI * 2,
                    color
                });
            }
        }

        initClouds() {
            this.clouds = [];
            const layerDefs = this.isMobile ? [
                { count: 2, scaleRange: [0.65, 0.85], speedRange: [0.12, 0.22], yRange: [0.06, 0.4] },
                { count: 3, scaleRange: [0.95, 1.25], speedRange: [0.28, 0.45], yRange: [0.15, 0.68] },
                { count: 2, scaleRange: [1.35, 1.6], speedRange: [0.55, 0.85], yRange: [0.28, 0.82] }
            ] : [
                { count: 3, scaleRange: [0.65, 0.85], speedRange: [0.12, 0.22], yRange: [0.06, 0.45] },
                { count: 4, scaleRange: [0.95, 1.25], speedRange: [0.28, 0.45], yRange: [0.12, 0.72] },
                { count: 3, scaleRange: [1.35, 1.7], speedRange: [0.55, 0.85], yRange: [0.25, 0.85] }
            ];

            layerDefs.forEach((l, lIdx) => {
                for (let i = 0; i < l.count; i++) {
                    const scale = l.scaleRange[0] + Math.random() * (l.scaleRange[1] - l.scaleRange[0]);
                    const speed = l.speedRange[0] + Math.random() * (l.speedRange[1] - l.speedRange[0]);
                    const baseW = 180 + Math.random() * 80;
                    const baseH = 75 + Math.random() * 30;

                    const puffs = [
                        { dx: -baseW * 0.38, dy: baseH * 0.08, r: baseH * 0.4 },
                        { dx: -baseW * 0.18, dy: -baseH * 0.18, r: baseH * 0.52 },
                        { dx: baseW * 0.05, dy: -baseH * 0.25, r: baseH * 0.58 },
                        { dx: baseW * 0.25, dy: -baseH * 0.12, r: baseH * 0.46 },
                        { dx: baseW * 0.4, dy: baseH * 0.1, r: baseH * 0.38 },
                        { dx: 0, dy: baseH * 0.12, r: baseH * 0.44 },
                        { dx: -baseW * 0.08, dy: baseH * 0.05, r: baseH * 0.48 }
                    ];

                    const totalW = (baseW + baseH * 1.2) * scale;
                    const x = Math.random() * (this.width + totalW) - totalW * 0.5;
                    const y = (l.yRange[0] + Math.random() * (l.yRange[1] - l.yRange[0])) * this.height;

                    this.clouds.push({
                        layer: lIdx,
                        x,
                        y,
                        scale,
                        speed: this.reducedMotion ? 0.03 : speed,
                        baseW,
                        baseH,
                        totalW,
                        puffs,
                        yRange: l.yRange
                    });
                }
            });

            this.clouds.sort((a, b) => a.layer - b.layer);
        }

        repositionClouds() {
            for (const c of this.clouds) {
                c.totalW = (c.baseW + c.baseH * 1.2) * c.scale;
                if (c.y > this.height) {
                    c.y = (c.yRange[0] + Math.random() * (c.yRange[1] - c.yRange[0])) * this.height;
                }
            }
        }

        resize() {
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            this.isMobile = (this.width < 768) || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
            this.targetFps = this.isMobile ? 36 : 60;
            this.frameInterval = 1000 / this.targetFps;
            const maxDpr = this.isMobile ? 1.25 : 1.75;
            this.dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
            this.canvas.width = Math.floor(this.width * this.dpr);
            this.canvas.height = Math.floor(this.height * this.dpr);
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);
            this.ctx.scale(this.dpr, this.dpr);
        }

        lerp(a, b, t) {
            return a + (b - a) * t;
        }

        lerpArr(a, b, t) {
            return a.map((val, i) => this.lerp(val, b[i], t));
        }

        updateInterpolation(dt) {
            const t = Math.min(1, dt * 0.0035);
            this.current.top = this.lerpArr(this.current.top, this.target.top, t);
            this.current.mid = this.lerpArr(this.current.mid, this.target.mid, t);
            this.current.bot = this.lerpArr(this.current.bot, this.target.bot, t);

            this.current.cloudTop = this.lerpArr(this.current.cloudTop, this.target.cloudTop, t);
            this.current.cloudMid = this.lerpArr(this.current.cloudMid, this.target.cloudMid, t);
            this.current.cloudBot = this.lerpArr(this.current.cloudBot, this.target.cloudBot, t);

            this.current.sunX = this.lerp(this.current.sunX, this.target.sunX, t);
            this.current.sunY = this.lerp(this.current.sunY, this.target.sunY, t);
            this.current.sunAlpha = this.lerp(this.current.sunAlpha, this.target.sunAlpha, t);
            this.current.sunR = this.lerp(this.current.sunR, this.target.sunR, t);
            this.current.sunColor = this.lerpArr(this.current.sunColor, this.target.sunColor, t);
            this.current.sunGlow = this.lerpArr(this.current.sunGlow, this.target.sunGlow, t);

            this.current.moonX = this.lerp(this.current.moonX, this.target.moonX, t);
            this.current.moonY = this.lerp(this.current.moonY, this.target.moonY, t);
            this.current.moonAlpha = this.lerp(this.current.moonAlpha, this.target.moonAlpha, t);
            this.current.starAlpha = this.lerp(this.current.starAlpha, this.target.starAlpha, t);
        }

        drawSkyGradient() {
            const { top, mid, bot } = this.current;
            const grad = this.ctx.createLinearGradient(0, 0, 0, this.height);
            grad.addColorStop(0, `rgb(${top[0] | 0}, ${top[1] | 0}, ${top[2] | 0})`);
            grad.addColorStop(0.55, `rgb(${mid[0] | 0}, ${mid[1] | 0}, ${mid[2] | 0})`);
            grad.addColorStop(1, `rgb(${bot[0] | 0}, ${bot[1] | 0}, ${bot[2] | 0})`);
            this.ctx.fillStyle = grad;
            this.ctx.fillRect(0, 0, this.width, this.height);
        }

        drawStars(time) {
            if (this.current.starAlpha <= 0.01) return;
            this.ctx.save();
            for (const s of this.stars) {
                const x = s.xNorm * this.width;
                const y = s.yNorm * this.height;
                const twinkle = Math.sin(time * s.speed + s.phase);
                const a = Math.max(0, Math.min(1, (s.baseAlpha + twinkle * 0.35) * this.current.starAlpha));
                this.ctx.fillStyle = `rgba(${s.color}, ${a})`;
                this.ctx.beginPath();
                this.ctx.arc(x, y, s.r, 0, Math.PI * 2);
                this.ctx.fill();
            }
            this.ctx.restore();
        }

        drawSun() {
            const alpha = this.current.sunAlpha;
            if (alpha <= 0.01) return;
            const x = this.current.sunX * this.width;
            const y = this.current.sunY * this.height;
            const r = this.current.sunR;
            const color = this.current.sunColor;
            const glow = this.current.sunGlow;

            this.ctx.save();
            this.ctx.globalAlpha = alpha;

            const corona = this.ctx.createRadialGradient(x, y, r * 0.3, x, y, r * 3.8);
            corona.addColorStop(0, `rgba(${glow[0] | 0}, ${glow[1] | 0}, ${glow[2] | 0}, ${glow[3]})`);
            corona.addColorStop(0.65, `rgba(${glow[0] | 0}, ${glow[1] | 0}, ${glow[2] | 0}, ${glow[3] * 0.3})`);
            corona.addColorStop(1, `rgba(${glow[0] | 0}, ${glow[1] | 0}, ${glow[2] | 0}, 0)`);
            this.ctx.fillStyle = corona;
            this.ctx.beginPath();
            this.ctx.arc(x, y, r * 3.8, 0, Math.PI * 2);
            this.ctx.fill();

            const core = this.ctx.createRadialGradient(x, y, 0, x, y, r);
            core.addColorStop(0, "#ffffff");
            core.addColorStop(0.7, `rgb(${color[0] | 0}, ${color[1] | 0}, ${color[2] | 0})`);
            core.addColorStop(1, `rgba(${glow[0] | 0}, ${glow[1] | 0}, ${glow[2] | 0}, 0.8)`);
            this.ctx.fillStyle = core;
            this.ctx.beginPath();
            this.ctx.arc(x, y, r, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.restore();
        }

        drawMoon() {
            const alpha = this.current.moonAlpha;
            if (alpha <= 0.01) return;
            const x = this.current.moonX * this.width;
            const y = this.current.moonY * this.height;
            const r = 24;

            this.ctx.save();
            this.ctx.globalAlpha = alpha;

            const halo = this.ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 3.5);
            halo.addColorStop(0, "rgba(215, 235, 255, 0.35)");
            halo.addColorStop(0.6, "rgba(160, 195, 245, 0.12)");
            halo.addColorStop(1, "rgba(100, 150, 240, 0)");
            this.ctx.fillStyle = halo;
            this.ctx.beginPath();
            this.ctx.arc(x, y, r * 3.5, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.fillStyle = "#f2f7ff";
            this.ctx.shadowColor = "rgba(195, 225, 255, 0.7)";
            this.ctx.shadowBlur = 10;
            this.ctx.beginPath();
            this.ctx.arc(x, y, r, -Math.PI * 0.32, Math.PI * 0.68, false);
            this.ctx.quadraticCurveTo(x - r * 0.15, y + r * 0.15, x + r * 0.45, y - r * 0.82);
            this.ctx.closePath();
            this.ctx.fill();

            this.ctx.restore();
        }

        drawCloud(cloud) {
            const { x, y, scale, puffs, baseW, baseH } = cloud;
            const top = this.current.cloudTop;
            const mid = this.current.cloudMid;
            const bot = this.current.cloudBot;

            this.ctx.save();
            this.ctx.translate(x, y);
            this.ctx.scale(scale, scale);

            const grad = this.ctx.createLinearGradient(0, -baseH * 0.6, 0, baseH * 0.6);
            grad.addColorStop(0, `rgba(${top[0] | 0}, ${top[1] | 0}, ${top[2] | 0}, ${top[3]})`);
            grad.addColorStop(0.45, `rgba(${mid[0] | 0}, ${mid[1] | 0}, ${mid[2] | 0}, ${mid[3]})`);
            grad.addColorStop(1, `rgba(${bot[0] | 0}, ${bot[1] | 0}, ${bot[2] | 0}, ${bot[3]})`);

            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            for (const p of puffs) {
                this.ctx.moveTo(p.dx + p.r, p.dy);
                this.ctx.arc(p.dx, p.dy, p.r, 0, Math.PI * 2);
            }
            this.ctx.fill();

            if (this.current.sunAlpha > 0.15) {
                this.ctx.fillStyle = `rgba(255, 255, 255, ${0.16 * this.current.sunAlpha})`;
                this.ctx.beginPath();
                for (const p of puffs) {
                    if (p.dy <= 0) {
                        this.ctx.moveTo(p.dx + p.r * 0.7, p.dy - p.r * 0.18);
                        this.ctx.arc(p.dx, p.dy - p.r * 0.18, p.r * 0.7, 0, Math.PI * 2);
                    }
                }
                this.ctx.fill();
            }

            this.ctx.restore();
        }

        updateClouds(dt) {
            const timeFactor = dt / 16.67;
            for (const c of this.clouds) {
                c.x += c.speed * timeFactor;
                if (c.x - c.totalW * 0.5 > this.width) {
                    c.x = -c.totalW * 0.5;
                    c.y = (c.yRange[0] + Math.random() * (c.yRange[1] - c.yRange[0])) * this.height;
                }
            }
        }

        loop(now) {
            const elapsed = now - this.lastRender;
            if (elapsed < this.frameInterval) {
                this.animId = requestAnimationFrame(t => this.loop(t));
                return;
            }
            this.lastRender = now - (elapsed % this.frameInterval);
            const dt = Math.min(elapsed, 100);
            this.lastTime = now;

            if (this.mode === "auto") {
                const currentCalculated = this.getAutoPhase();
                if (currentCalculated !== this.activePhase) {
                    this.syncPhase(false);
                }
            }

            this.updateInterpolation(dt);
            this.updateClouds(dt);

            this.ctx.clearRect(0, 0, this.width, this.height);
            this.drawSkyGradient();
            this.drawStars(now);
            this.drawSun();
            this.drawMoon();

            for (const cloud of this.clouds) {
                this.drawCloud(cloud);
            }

            this.animId = requestAnimationFrame(t => this.loop(t));
        }
    }

    // Permite pasar un callback para los mensajes del botón del cielo
    const Base = DynamicSky;
    window.DynamicSky = class extends Base {
        constructor(canvas, btn, icon, meta, opts = {}) {
            if (typeof opts.onToast === "function") showToast = opts.onToast;
            super(canvas, btn, icon, meta);
        }
    };
})();
