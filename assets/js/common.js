/*
 * Utilidades compartidas: cielo, aviso flotante, cortina entre páginas,
 * revelado al hacer scroll y el filtro SVG del trazo "a mano".
 */
(function () {
    "use strict";

    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Filtro SVG para bordes con temblor de lápiz
    const svgNS = "http://www.w3.org/2000/svg";
    const defs = document.createElementNS(svgNS, "svg");
    defs.setAttribute("width", "0");
    defs.setAttribute("height", "0");
    defs.setAttribute("aria-hidden", "true");
    defs.style.position = "absolute";
    defs.innerHTML =
        '<filter id="rough" x="-5%" y="-5%" width="110%" height="110%">' +
        '<feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" result="n"/>' +
        '<feDisplacementMap in="SourceGraphic" in2="n" scale="3.2"/>' +
        "</filter>";
    document.body.prepend(defs);

    // Aviso flotante
    let toastEl = null;
    let toastTimer = null;
    function toast(msg, ms = 1800) {
        if (!toastEl) {
            toastEl = document.createElement("div");
            toastEl.className = "toast";
            toastEl.setAttribute("role", "status");
            document.body.append(toastEl);
        }
        toastEl.textContent = msg;
        toastEl.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toastEl.classList.remove("show"), ms);
    }

    // Cielo dinámico
    const canvas = document.getElementById("sky-canvas");
    if (canvas && window.DynamicSky) {
        new window.DynamicSky(
            canvas,
            document.getElementById("sky-btn"),
            document.getElementById("sky-icon"),
            null,
            { onToast: toast }
        );
    }

    // Cortina: entra al salir de la página y se retira al llegar
    const curtain = document.createElement("div");
    curtain.className = "curtain";
    curtain.setAttribute("aria-hidden", "true");
    curtain.innerHTML =
        '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1.5l2.6 7.1 7.4.3-5.8 4.6 2 7.2L12 16.6l-6.2 4.1 2-7.2L2 8.9l7.4-.3z"/></svg>';
    document.body.append(curtain);

    let arrived = false;
    try { arrived = sessionStorage.getItem("cortina") === "1"; } catch (e) { /* nada */ }
    if (arrived && !reduced) {
        try { sessionStorage.removeItem("cortina"); } catch (e) { /* nada */ }
        curtain.classList.add("start");
        requestAnimationFrame(() => requestAnimationFrame(() => {
            curtain.classList.remove("start");
            curtain.classList.add("leave");
        }));
    }

    function go(href) {
        if (reduced) { location.href = href; return; }
        try { sessionStorage.setItem("cortina", "1"); } catch (e) { /* nada */ }
        curtain.classList.remove("leave", "start");
        void curtain.offsetWidth;
        curtain.classList.add("cover");
        setTimeout(() => { location.href = href; }, 560);
    }

    document.addEventListener("click", e => {
        const a = e.target.closest("a[data-go]");
        if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        go(a.getAttribute("href"));
    });

    // Al volver con el botón "atrás" del navegador, quitar la cortina
    window.addEventListener("pageshow", e => {
        if (e.persisted) curtain.classList.remove("cover");
    });

    // Revelado al hacer scroll
    function observeReveal(root = document) {
        const els = root.querySelectorAll(".reveal:not(.in)");
        if (!("IntersectionObserver" in window) || reduced) {
            els.forEach(el => el.classList.add("in"));
            return;
        }
        const io = new IntersectionObserver(entries => {
            for (const en of entries) {
                if (en.isIntersecting) {
                    en.target.classList.add("in");
                    io.unobserve(en.target);
                }
            }
        }, { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });
        els.forEach(el => io.observe(el));
    }

    window.ParaLucy = { toast, go, observeReveal, reduced };
})();
