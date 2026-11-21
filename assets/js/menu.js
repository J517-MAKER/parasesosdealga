/*
 * Menú principal: bienvenida, chispas, carrusel y vista previa de la última nota.
 */
(function () {
    "use strict";

    const { observeReveal, reduced } = window.ParaLucy;
    const $ = id => document.getElementById(id);

    /* =========================================================
       Pantalla de bienvenida (una vez por sesión)
       ========================================================= */
    const splash = $("splash");
    let seen = false;
    try { seen = sessionStorage.getItem("bienvenida-vista") === "1"; } catch (e) { /* nada */ }

    if (seen || !splash) {
        if (splash) splash.classList.add("gone");
        observeReveal();
    } else {
        document.body.classList.add("splash-open");
        runSplash();
    }

    function runSplash() {
        const parts = [...splash.querySelectorAll("[data-type]")];
        let skip = false;
        let done = false;

        const wait = ms => new Promise(r => setTimeout(r, ms));

        async function type(el) {
            const text = el.dataset.type;
            el.classList.add("typing");
            for (let i = 1; i <= text.length; i++) {
                if (skip) break;
                el.textContent = text.slice(0, i);
                const ch = text[i - 1];
                await wait(ch === "," ? 260 : ch === " " ? 55 : 42 + Math.random() * 38);
            }
            el.textContent = text;
            el.classList.remove("typing");
        }

        (async () => {
            await wait(reduced ? 0 : 650);
            for (const p of parts) {
                await type(p);
                if (!skip) await wait(220);
            }
            finishTyping();
        })();

        function finishTyping() {
            if (done) return;
            done = true;
            parts.forEach(p => { p.textContent = p.dataset.type; p.classList.remove("typing"); });
            splash.classList.add("typed");
            $("splash-start").focus({ preventScroll: true });
        }

        function enter() {
            try { sessionStorage.setItem("bienvenida-vista", "1"); } catch (e) { /* nada */ }
            const curtain = document.querySelector(".curtain");
            const reveal = () => {
                splash.classList.add("gone");
                document.body.classList.remove("splash-open");
                window.scrollTo(0, 0);
                observeReveal();
            };
            if (reduced || !curtain) { reveal(); return; }
            curtain.classList.remove("leave", "start");
            void curtain.offsetWidth;
            curtain.classList.add("cover");
            setTimeout(() => {
                reveal();
                curtain.classList.remove("cover");
                curtain.classList.add("leave");
            }, 600);
        }

        splash.addEventListener("click", () => {
            if (!done) { skip = true; finishTyping(); return; }
            enter();
        });

        document.addEventListener("keydown", function onKey(e) {
            if (!document.body.classList.contains("splash-open")) {
                document.removeEventListener("keydown", onKey);
                return;
            }
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                splash.click();
            }
        });
    }

    /* =========================================================
       Chispas naranjas de fondo
       ========================================================= */
    const sparks = $("sparks");
    if (sparks && !reduced) {
        const n = innerWidth < 700 ? 11 : 18;
        for (let i = 0; i < n; i++) {
            const el = document.createElement("i");
            const isStar = Math.random() < 0.3;
            if (isStar) { el.className = "star"; el.textContent = "✦"; }
            const s = isStar ? 5 + Math.random() * 4 : 3 + Math.random() * 5;
            const t = 11 + Math.random() * 12;
            el.style.cssText =
                `left:${Math.random() * 100}%;` +
                `--s:${s.toFixed(1)}px;` +
                `--t:${t.toFixed(1)}s;` +
                `--delay:${(-Math.random() * t).toFixed(1)}s;` +
                `--dx:${(Math.random() * 80 - 40).toFixed(0)}px;`;
            sparks.append(el);
        }
    }

    /* =========================================================
       Carrusel
       ========================================================= */
    const carousel = $("carousel");
    if (carousel) setupCarousel();

    function setupCarousel() {
        const slides = [...carousel.querySelectorAll(".slide")];
        const dotsEl = $("dots");
        const chip = $("mood-chip");
        const burst = $("burst");
        const MOODS = {
            romance: { icon: "💗", text: "Lado romántico" },
            energy: { icon: "⚡", text: "Lado energía" }
        };
        const DELAY = 5200;
        let idx = 0;
        let timer = null;
        let paused = false;

        slides.forEach((s, i) => {
            const img = s.querySelector("img");
            if (s.dataset.pos) img.style.objectPosition = s.dataset.pos;
            s.setAttribute("aria-roledescription", "diapositiva");
            s.setAttribute("aria-label", `${i + 1} de ${slides.length}`);

            const dot = document.createElement("button");
            dot.type = "button";
            dot.className = "dot";
            dot.setAttribute("role", "tab");
            dot.setAttribute("aria-label", `Imagen ${i + 1}`);
            dot.addEventListener("click", () => { show(i); restart(); });
            dotsEl.append(dot);
        });
        const dots = [...dotsEl.children];

        function show(i, first = false) {
            idx = (i + slides.length) % slides.length;
            slides.forEach((s, k) => s.classList.toggle("active", k === idx));
            dots.forEach((d, k) => d.setAttribute("aria-selected", String(k === idx)));

            const mood = slides[idx].dataset.mood;
            const m = MOODS[mood];
            chip.querySelector(".mood-icon").textContent = m.icon;
            chip.querySelector(".mood-text").textContent = m.text;
            chip.classList.toggle("energy", mood === "energy");
            chip.classList.remove("swap");
            void chip.offsetWidth;
            chip.classList.add("swap");

            if (mood === "energy" && !first && !reduced) {
                carousel.classList.remove("flash");
                void carousel.offsetWidth;
                carousel.classList.add("flash");
                sparkBurst();
            }
        }

        function sparkBurst() {
            burst.textContent = "";
            const n = 16;
            for (let i = 0; i < n; i++) {
                const a = (Math.PI * 2 * i) / n + Math.random() * 0.4;
                const d = 70 + Math.random() * 90;
                const p = document.createElement("i");
                p.style.setProperty("--x", `${Math.cos(a) * d}px`);
                p.style.setProperty("--y", `${Math.sin(a) * d}px`);
                p.style.animationDelay = `${Math.random() * 80}ms`;
                if (Math.random() < 0.35) p.style.background = "#fff3d6";
                burst.append(p);
            }
            setTimeout(() => { burst.textContent = ""; }, 1000);
        }

        const next = () => show(idx + 1);
        const prev = () => show(idx - 1);

        function restart() {
            clearInterval(timer);
            if (!paused && !reduced) timer = setInterval(next, DELAY);
        }

        carousel.querySelector(".car-next").addEventListener("click", e => { e.stopPropagation(); next(); restart(); });
        carousel.querySelector(".car-prev").addEventListener("click", e => { e.stopPropagation(); prev(); restart(); });

        // Deslizar con el dedo
        let startX = 0, startY = 0, tracking = false;
        carousel.addEventListener("pointerdown", e => {
            if (e.target.closest(".car-btn")) return;
            tracking = true;
            startX = e.clientX;
            startY = e.clientY;
        });
        window.addEventListener("pointerup", e => {
            if (!tracking) return;
            tracking = false;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
                dx < 0 ? next() : prev();
                restart();
            }
        });
        window.addEventListener("pointercancel", () => { tracking = false; });

        // Pausa al pasar el cursor y cuando la pestaña no está visible
        carousel.addEventListener("mouseenter", () => { paused = true; clearInterval(timer); });
        carousel.addEventListener("mouseleave", () => { paused = false; restart(); });
        document.addEventListener("visibilitychange", () => {
            if (document.hidden) clearInterval(timer); else restart();
        });

        // Inclinación 3D suave con el cursor (solo computadora)
        if (matchMedia("(hover: hover) and (pointer: fine)").matches && !reduced) {
            const frame = carousel.parentElement;
            frame.addEventListener("mousemove", e => {
                const r = frame.getBoundingClientRect();
                const x = (e.clientX - r.left) / r.width - 0.5;
                const y = (e.clientY - r.top) / r.height - 0.5;
                carousel.style.transform = `perspective(900px) rotateY(${x * 5}deg) rotateX(${-y * 5}deg)`;
            });
            frame.addEventListener("mouseleave", () => { carousel.style.transform = ""; });
            carousel.style.transition = "transform 0.3s ease-out";
        }

        show(0, true);
        restart();
    }

    /* =========================================================
       Última nota y etiqueta "Nueva"
       ========================================================= */
    const notes = Array.isArray(window.NOTAS) ? window.NOTAS.slice() : [];
    const parseDate = s => {
        const [y, m, d] = String(s || "").split("-").map(Number);
        return y ? new Date(y, (m || 1) - 1, d || 1) : null;
    };
    notes.sort((a, b) => (parseDate(b.fecha) || 0) - (parseDate(a.fecha) || 0));

    const title = $("postit-title");
    const meta = $("postit-meta");
    if (!notes.length) {
        title.textContent = "Pronto habrá una nota aquí";
        meta.textContent = "✏️ Estoy escribiendo…";
    } else {
        const last = parseDate(notes[0].fecha);
        const fmt = last ? last.toLocaleDateString("es-MX", { day: "numeric", month: "long" }) : "";
        const days = last ? (Date.now() - last.getTime()) / 86400000 : 99;
        const fresh = days < 7;
        title.textContent = fresh ? "Tienes una nota nueva" : "Hay notas esperándote";
        meta.textContent = `🔒 ${notes.length} ${notes.length === 1 ? "nota" : "notas"}${fmt ? ` · la última es del ${fmt}` : ""}`;
        if (fresh) $("badge-new").hidden = false;
    }
})();
