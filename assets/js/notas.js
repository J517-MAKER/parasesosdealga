/*
 * Bloc de notas con contraseña sencilla.
 * Nota: es un candado "de confianza". Detiene a los curiosos, pero el contenido
 * vive en data/notas.js dentro del repositorio público.
 */
(function () {
    "use strict";

    const PASSWORD = "nubes";
    const KEY = "notas-abiertas";
    const { observeReveal, reduced, toast } = window.ParaLucy;
    const $ = id => document.getElementById(id);

    const lockWrap = $("lock-wrap");
    const form = $("lock-form");
    const input = $("pass");
    const msg = $("lock-msg");
    const notesEl = $("notes");
    const lockBtn = $("lock-btn");
    let fails = 0;

    const store = {
        get() { try { return localStorage.getItem(KEY) === "1"; } catch (e) { return false; } },
        set(v) { try { v ? localStorage.setItem(KEY, "1") : localStorage.removeItem(KEY); } catch (e) { /* nada */ } }
    };

    const normalize = s => s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

    $("eye").addEventListener("click", e => {
        const show = input.type === "password";
        input.type = show ? "text" : "password";
        e.currentTarget.setAttribute("aria-pressed", String(show));
        e.currentTarget.setAttribute("aria-label", show ? "Ocultar contraseña" : "Mostrar contraseña");
        input.focus();
    });

    form.addEventListener("submit", e => {
        e.preventDefault();
        if (normalize(input.value) === PASSWORD) {
            store.set(true);
            msg.textContent = "";
            form.classList.add("opening");
            setTimeout(openNotes, reduced ? 0 : 1100);
        } else {
            fails++;
            msg.textContent = fails >= 2 ? "Casi… pista: mira al cielo ☁️" : "Esa no es 🙃 inténtalo otra vez";
            form.classList.remove("shake");
            void form.offsetWidth;
            form.classList.add("shake");
            input.select();
        }
    });

    lockBtn.addEventListener("click", () => {
        store.set(false);
        notesEl.hidden = true;
        lockBtn.hidden = true;
        form.classList.remove("opening");
        input.value = "";
        lockWrap.hidden = false;
        fails = 0;
        msg.textContent = "";
        toast("Bloc cerrado con llave 🔒");
    });

    function parseDate(s) {
        const [y, m, d] = String(s || "").split("-").map(Number);
        return y ? new Date(y, (m || 1) - 1, d || 1) : null;
    }

    function openNotes() {
        lockWrap.hidden = true;
        notesEl.hidden = false;
        lockBtn.hidden = false;
        render();
        window.scrollTo(0, 0);
    }

    function render() {
        const list = $("notes-list");
        list.textContent = "";
        const notes = (Array.isArray(window.NOTAS) ? window.NOTAS.slice() : [])
            .sort((a, b) => (parseDate(b.fecha) || 0) - (parseDate(a.fecha) || 0));

        $("notes-count").textContent = notes.length
            ? `${notes.length} ${notes.length === 1 ? "nota escrita" : "notas escritas"} para ti`
            : "Todavía no hay notas";

        if (!notes.length) {
            const empty = document.createElement("div");
            empty.className = "empty paper";
            empty.textContent = "Pronto habrá algo escrito aquí ✏️";
            list.append(empty);
            return;
        }

        notes.forEach((n, i) => {
            const card = document.createElement("article");
            card.className = "note reveal";
            card.style.setProperty("--d", `${Math.min(i, 4) * 90}ms`);

            const tape = document.createElement("span");
            tape.className = "tape";
            tape.setAttribute("aria-hidden", "true");

            const date = parseDate(n.fecha);
            const dateEl = document.createElement("p");
            dateEl.className = "note-date";
            dateEl.textContent = date
                ? date.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
                : "";
            if (date && (Date.now() - date.getTime()) / 86400000 < 7) {
                const badge = document.createElement("span");
                badge.className = "note-new";
                badge.textContent = "Nueva";
                dateEl.append(badge);
            }

            const title = document.createElement("h2");
            title.className = "note-title";
            title.textContent = n.titulo || "Sin título";

            const text = document.createElement("p");
            text.className = "note-text";
            text.textContent = n.texto || "";

            const sign = document.createElement("p");
            sign.className = "note-sign";
            sign.textContent = "— Alejandro";

            card.append(tape, dateEl, title, text, sign);
            list.append(card);
        });

        observeReveal(list);
    }

    if (store.get()) {
        openNotes();
    } else {
        setTimeout(() => input.focus({ preventScroll: true }), 500);
    }
})();
