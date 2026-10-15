function toggleMenu() {
    const menu = document.getElementById("menu");
    const abierto = menu.classList.toggle("menu-abierto");
    document.querySelector(".menu-hamburguesa").setAttribute("aria-expanded", abierto);
}

/* ---------- Transición al cambiar de página ---------- */
document.addEventListener("click", e => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest("a[href]");
    if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
    if (!/^(https?|file):$/.test(a.protocol) || a.origin !== location.origin) return;
    // Enlaces a otra parte de la misma página: sin transición
    if (a.pathname === location.pathname && a.search === location.search) return;

    e.preventDefault();
    document.body.classList.add("saliendo");
    setTimeout(() => { location.href = a.href; }, 200);
});

// Al volver con el botón "atrás" el navegador puede restaurar la página ya desvanecida
window.addEventListener("pageshow", e => {
    if (e.persisted) document.body.classList.remove("saliendo");
});

/* ---------- Carrusel de inicio ---------- */
const tarjetas = document.querySelectorAll(".destacado");

if (tarjetas.length) {
    const flechaIzquierda = document.querySelector(".flecha-izquierda");
    const flechaDerecha = document.querySelector(".flecha-derecha");
    let tarjetaActual = 0;
    let cambiando = false;
    let temporizador;

    function cambiarTarjeta(dir) {
        if (cambiando) return;
        cambiando = true;

        const der = dir === "derecha";
        const anterior = tarjetas[tarjetaActual];
        tarjetaActual = (tarjetaActual + (der ? 1 : -1) + tarjetas.length) % tarjetas.length;
        const siguiente = tarjetas[tarjetaActual];

        if (der) {
            siguiente.style.transition = "none";
            siguiente.classList.add("entrando-derecha");
            siguiente.offsetWidth; // fuerza reflow
            siguiente.style.transition = "";
            siguiente.classList.remove("entrando-derecha");
        }

        siguiente.classList.add("activo");
        anterior.classList.remove("activo");
        if (!der) anterior.classList.add("saliendo-derecha");

        setTimeout(() => {
            anterior.classList.remove("saliendo-derecha");
            cambiando = false;
        }, 1200);
    }

    function iniciarAuto() {
        clearInterval(temporizador);
        temporizador = setInterval(() => cambiarTarjeta("derecha"), 6000);
    }

    flechaDerecha.addEventListener("click", () => { cambiarTarjeta("derecha"); iniciarAuto(); });
    flechaIzquierda.addEventListener("click", () => { cambiarTarjeta("izquierda"); iniciarAuto(); });
    iniciarAuto();
}

/* ---------- Catálogo: fotos agrupadas (cambian al pasar el ratón) ---------- */
const reducirMovimiento = matchMedia("(prefers-reduced-motion: reduce)").matches;

document.querySelectorAll(".grupo").forEach(grupo => {
    const imgs = grupo.querySelectorAll("img");
    const figura = grupo.closest("figure");
    let actual = 0;
    let reloj = null;

    function mostrar(n) {
        imgs[actual].classList.remove("activa");
        actual = n;
        imgs[actual].classList.add("activa");
    }

    // Flechas para pasar de foto sin abrir el visor
    const flechas = document.createElement("div");
    flechas.className = "flecha-grupo";
    flechas.innerHTML = `<button type="button" class="fg-ant" aria-label="Foto anterior">&#10094;</button><button type="button" class="fg-sig" aria-label="Foto siguiente">&#10095;</button>`;
    figura.appendChild(flechas);

    function ir(d) {
        clearInterval(reloj);
        reloj = null;
        mostrar((actual + d + imgs.length) % imgs.length);
    }
    flechas.querySelector(".fg-ant").addEventListener("click", () => ir(-1));
    flechas.querySelector(".fg-sig").addEventListener("click", () => ir(1));

    figura.addEventListener("mouseenter", () => {
        if (reducirMovimiento || reloj) return;
        reloj = setInterval(() => mostrar((actual + 1) % imgs.length), 900);
    });

    figura.addEventListener("mouseleave", () => {
        clearInterval(reloj);
        reloj = null;
        mostrar(0);
    });
});

/* ---------- Catálogo: visor con lupa ---------- */
const botonesVer = document.querySelectorAll(".galeria-grid .ver");

if (botonesVer.length) {
    const ZOOM = 2.5;
    const visor = document.createElement("div");
    visor.className = "visor";
    visor.hidden = true;
    visor.setAttribute("role", "dialog");
    visor.setAttribute("aria-modal", "true");
    visor.setAttribute("aria-label", "Foto ampliada");
    visor.innerHTML = `
        <button type="button" class="visor-cerrar" aria-label="Cerrar">&times;</button>
        <button type="button" class="visor-nav visor-ant" aria-label="Foto anterior">&#10094;</button>
        <div class="visor-marco">
            <img class="visor-img" alt="">
            <div class="lupa" aria-hidden="true"></div>
        </div>
        <div class="visor-texto" hidden></div>
        <button type="button" class="visor-nav visor-sig" aria-label="Foto siguiente">&#10095;</button>
        <div class="visor-minis"></div>
        <p class="visor-pie"></p>`;
    document.body.appendChild(visor);

    const img = visor.querySelector(".visor-img");
    const marco = visor.querySelector(".visor-marco");
    const lupa = visor.querySelector(".lupa");
    const pie = visor.querySelector(".visor-pie");
    const navs = visor.querySelectorAll(".visor-nav");
    const minis = visor.querySelector(".visor-minis");
    const texto = visor.querySelector(".visor-texto");
    const tactil = matchMedia("(hover: none)").matches;

    let fotos = [];          // todas las fotos del catálogo, en orden: { src, alt, g }
    let pos = 0;             // posición en "fotos"
    let grupoActual = -1;    // índice (en botonesVer) del producto que se está mostrando

    // Carga las miniaturas y el texto "Más detalles" del producto al que pertenece la foto actual
    function cargarGrupo(g) {
        grupoActual = g;

        const delGrupo = [];
        fotos.forEach((f, i) => { if (f.g === g) delGrupo.push(i); });

        minis.innerHTML = "";
        visor.classList.toggle("con-minis", delGrupo.length > 1);
        if (delGrupo.length > 1) {
            delGrupo.forEach((i, n) => {
                const b = document.createElement("button");
                b.type = "button";
                b.className = "visor-mini";
                b.dataset.i = i;
                b.setAttribute("aria-label", `Ver foto ${n + 1} de ${delGrupo.length}`);
                const m = document.createElement("img");
                m.src = fotos[i].src;
                m.alt = "";
                b.appendChild(m);
                b.addEventListener("click", () => { pos = i; mostrarFoto(); });
                minis.appendChild(b);
            });
        }

        const p = botonesVer[g].closest("figure").querySelector(".detalles p");
        texto.innerHTML = p ? p.innerHTML : "";
        texto.hidden = !p;
        visor.classList.toggle("con-texto", !!p);
    }

    function mostrarFoto() {
        const f = fotos[pos];
        if (f.g !== grupoActual) cargarGrupo(f.g);

        img.src = f.src;
        img.alt = f.alt;
        lupa.style.backgroundImage = `url("${f.src}")`;
        lupa.style.display = "none";
        minis.querySelectorAll(".visor-mini").forEach(m => {
            const act = Number(m.dataset.i) === pos;
            m.classList.toggle("activa", act);
            if (act) { m.setAttribute("aria-current", "true"); m.scrollIntoView({ inline: "center", block: "nearest" }); }
            else m.removeAttribute("aria-current");
        });
        pie.textContent = tactil ? "Toca y arrastra sobre la foto para usar la lupa" : "Mueve el puntero sobre la foto para usar la lupa";
    }

    function abrir(boton) {
        // Lista con las fotos de todos los productos, en el orden de la página
        fotos = [];
        botonesVer.forEach((b, g) => {
            b.querySelectorAll("img").forEach(i => fotos.push({ src: i.getAttribute("src"), alt: i.alt, g }));
        });

        const g = [...botonesVer].indexOf(boton);
        const imgs = [...boton.querySelectorAll("img")];
        const dentro = Math.max(0, imgs.findIndex(i => i.classList.contains("activa")));
        pos = fotos.findIndex(f => f.g === g) + dentro;

        navs.forEach(b => b.hidden = fotos.length < 2);
        grupoActual = -1;
        visor.hidden = false;
        mostrarFoto();
        visor.querySelector(".visor-cerrar").focus();
    }

    function cerrar() {
        visor.hidden = true;
        lupa.style.display = "none";
        if (botonesVer[grupoActual]) botonesVer[grupoActual].focus();
    }

    function mover(d) {
        pos = (pos + d + fotos.length) % fotos.length;
        mostrarFoto();
    }

    function moverLupa(x, y) {
        const r = img.getBoundingClientRect();
        const px = x - r.left;
        const py = y - r.top;
        if (px < 0 || py < 0 || px > r.width || py > r.height) {
            lupa.style.display = "none";
            return;
        }
        lupa.style.display = "block";
        const w = lupa.offsetWidth, h = lupa.offsetHeight;
        lupa.style.backgroundSize = `${r.width * ZOOM}px ${r.height * ZOOM}px`;
        lupa.style.backgroundPosition = `${w / 2 - px * ZOOM}px ${h / 2 - py * ZOOM}px`;
        lupa.style.left = `${px - w / 2}px`;
        lupa.style.top = `${py - h / 2}px`;
    }

    botonesVer.forEach(b => b.addEventListener("click", () => abrir(b)));

    visor.querySelector(".visor-cerrar").addEventListener("click", cerrar);
    visor.querySelector(".visor-ant").addEventListener("click", () => mover(-1));
    visor.querySelector(".visor-sig").addEventListener("click", () => mover(1));
    visor.addEventListener("click", e => { if (e.target === visor) cerrar(); });
    visor.addEventListener("wheel", e => e.preventDefault(), { passive: false });

    marco.addEventListener("mousemove", e => moverLupa(e.clientX, e.clientY));
    marco.addEventListener("mouseleave", () => { lupa.style.display = "none"; });
    marco.addEventListener("touchstart", e => moverLupa(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    marco.addEventListener("touchmove", e => moverLupa(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    marco.addEventListener("touchend", () => { lupa.style.display = "none"; });

    document.addEventListener("keydown", e => {
        if (visor.hidden) return;
        if (e.key === "Escape") cerrar();
        else if (e.key === "ArrowLeft" && fotos.length > 1) mover(-1);
        else if (e.key === "ArrowRight" && fotos.length > 1) mover(1);
        else if (e.key === "Tab") {
            const f = [...visor.querySelectorAll("button")].filter(b => !b.hidden);
            const primero = f[0], ultimo = f[f.length - 1];
            if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
            else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
        }
    });
}

/* ---------- Catálogo: "Más detalles" con apertura suave ---------- */
document.querySelectorAll(".detalles").forEach(det => {
    const resumen = det.querySelector("summary");
    let abierto = det.open;
    let anim = null;

    resumen.addEventListener("click", e => {
        e.preventDefault();
        abierto = !abierto;

        const borde = det.offsetHeight - det.clientHeight;   // borde superior rojo
        const desde = det.offsetHeight;                      // altura actual (también a mitad de animación)
        if (anim) anim.cancel();

        det.open = true;
        const hasta = abierto ? det.scrollHeight + borde : resumen.offsetHeight + borde;

        det.classList.toggle("cerrando", !abierto);
        det.style.overflow = "hidden";
        anim = det.animate(
            { height: [desde + "px", hasta + "px"] },
            { duration: 450, easing: "cubic-bezier(0.4, 0, 0.2, 1)" }
        );
        anim.onfinish = () => {
            det.open = abierto;
            det.style.overflow = "";
            anim = null;
        };
    });
});

/* ---------- Catálogo: si una foto no carga, prueba con otras extensiones ---------- */
const EXTENSIONES = ["webp", "jpg", "jpeg", "png", "avif"];

function repararFoto(img) {
    const probadas = img._probadas || (img._probadas = [img.getAttribute("src")]);
    const base = img.getAttribute("src").replace(/\.[a-z0-9]+$/i, "");
    const siguiente = EXTENSIONES.map(e => base + "." + e).find(s => !probadas.includes(s));
    if (siguiente) { probadas.push(siguiente); img.src = siguiente; }
}

document.querySelectorAll(".galeria-grid img").forEach(img => {
    img.addEventListener("error", () => repararFoto(img));
    if (img.complete && img.naturalWidth === 0 && img.getAttribute("src")) repararFoto(img);
});

/* ---------- Cookies: preferencias, ventana de gestión y mapa de Google ---------- */
const CLAVE_COOKIES = "cookies-terceros";   // "si" | "no"

function leerCookies() {
    try { return localStorage.getItem(CLAVE_COOKIES); } catch (e) { return null; }
}

function guardarCookies(valor) {
    try { localStorage.setItem(CLAVE_COOKIES, valor); } catch (e) { /* sin almacenamiento */ }
    document.dispatchEvent(new CustomEvent("cookies-cambio"));
}

/* Mapa: solo se carga el iframe de Google si el usuario lo ha aceptado */
const mapa = document.querySelector(".mapa");

function pintarMapa() {
    if (!mapa) return;
    const q = encodeURIComponent(mapa.dataset.consulta);
    const enlace = `https://www.google.com/maps/search/?api=1&query=${q}`;

    if (leerCookies() === "si") {
        mapa.innerHTML = `
            <iframe title="Mapa con la ubicación de Muebles Andrade" src="https://maps.google.com/maps?q=${q}&hl=es&z=15&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>
            <a class="mapa-ver" href="${enlace}" target="_blank" rel="noopener noreferrer">Cómo llegar</a>`;
    } else {
        mapa.innerHTML = `
            <div class="mapa-aviso">
                <svg class="icono" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <p>Para mostrar el mapa interactivo hay que cargar contenido de Google Maps, que puede instalar cookies de terceros.</p>
                <button type="button" class="boton" id="mapa-aceptar">Aceptar y ver mapa</button>
                <a class="enlace" href="${enlace}" target="_blank" rel="noopener noreferrer">Abrir en Google Maps</a>
                <a class="enlace" href="politica-cookies.html#cookies">Política de cookies</a>
            </div>`;
        mapa.querySelector("#mapa-aceptar").addEventListener("click", () => guardarCookies("si"));
    }
}

document.addEventListener("cookies-cambio", pintarMapa);
pintarMapa();

/* Ventana "Gestión de cookies" (la abre cualquier botón .gestion-cookies) */
const modalCookies = document.createElement("div");
modalCookies.className = "cookies-modal";
modalCookies.hidden = true;
modalCookies.setAttribute("role", "dialog");
modalCookies.setAttribute("aria-modal", "true");
modalCookies.setAttribute("aria-labelledby", "cookies-titulo");
modalCookies.innerHTML = `
    <div class="cookies-caja">
        <h2 id="cookies-titulo">Gestión de cookies</h2>
        <p>Elige qué contenido permites. Puedes cambiar tu decisión cuando quieras. Más información en la <a href="politica-cookies.html#cookies">política de cookies</a>.</p>
        <div class="cookies-opcion">
            <div><strong>Necesarias</strong><p>Permiten que la web funcione y recuerde esta elección. Siempre activas.</p></div>
            <input type="checkbox" checked disabled aria-label="Cookies necesarias (siempre activas)">
        </div>
        <div class="cookies-opcion">
            <div><strong>Contenido de terceros</strong><p>Mapa de Google Maps de la página de contacto. Google puede instalar sus propias cookies.</p></div>
            <input type="checkbox" id="cookies-terceros" aria-label="Permitir contenido de terceros">
        </div>
        <div class="cookies-botones">
            <button type="button" data-accion="rechazar">Rechazar</button>
            <button type="button" data-accion="guardar">Guardar selección</button>
            <button type="button" class="principal" data-accion="aceptar">Aceptar todo</button>
        </div>
    </div>`;
document.body.appendChild(modalCookies);

const casillaTerceros = modalCookies.querySelector("#cookies-terceros");
let focoCookies = null;

function abrirCookies() {
    focoCookies = document.activeElement;
    casillaTerceros.checked = leerCookies() === "si";
    modalCookies.hidden = false;
    modalCookies.querySelector("button").focus();
}

function cerrarCookies() {
    modalCookies.hidden = true;
    if (focoCookies) focoCookies.focus();
}

document.addEventListener("click", e => {
    if (e.target.closest(".gestion-cookies")) abrirCookies();
});

modalCookies.addEventListener("click", e => {
    if (e.target === modalCookies) return cerrarCookies();
    const accion = e.target.dataset && e.target.dataset.accion;
    if (!accion) return;
    guardarCookies(accion === "aceptar" ? "si" : accion === "rechazar" ? "no" : (casillaTerceros.checked ? "si" : "no"));
    cerrarCookies();
});

document.addEventListener("keydown", e => {
    if (!modalCookies.hidden && e.key === "Escape") cerrarCookies();
});

/* Primera visita: si aún no hay ninguna decisión guardada, se muestra la ventana */
if (leerCookies() === null) abrirCookies();

/* ---------- Contacto: aviso tras enviar el formulario ---------- */
const aviso = document.getElementById("form-aviso");

if (aviso) {
    const params = new URLSearchParams(location.search);
    const ok = params.has("enviado");
    const error = params.has("error");

    if (ok || error) {
        aviso.textContent = ok
            ? "¡Mensaje enviado! Nos pondremos en contacto contigo lo antes posible."
            : "No se ha podido enviar el mensaje. Revisa los datos e inténtalo de nuevo, o llámanos al 988 460 174.";
        aviso.className = "form-aviso " + (ok ? "ok" : "error");
        aviso.hidden = false;
        aviso.scrollIntoView({ block: "center" });
        history.replaceState(null, "", location.pathname);   // limpia la dirección para que no se repita al recargar
    }
}
