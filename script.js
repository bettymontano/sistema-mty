
// Defino elementos iniciales:
let AIRE_MTY_2024 = [];
let coloniaGen = 0;
let fechaSeleccionada = null;

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// ---------------- 1) CONFIGURACIÓN GENERAL ----------------

const CONFIG = {
  totalMohos: 20, // Tengo 20 diseños de moho, cada uno con 5 etapas de crecimiento
  stages: ['A','B','C','D','E'],

  // Update: Estos dos diseños los saqué: el 3 y el 4 me salieron muy puntiagudos y no combinan con los demás.
  tiposExcluidos: [3, 4],

  // Dimensiones reales (px) de cada PNG de moho, por tipo y etapa [ancho, alto]. Como cada imagen está recortada a su contenido, estas medidas hacen que el moho crezca con sus proporciones reales del centro hacia afuera.

  mohoDims: {
    1: { A:[217,231], B:[378,384], C:[547,613], D:[666,775], E:[793,967] },
    2: { A:[241,252], B:[364,441], C:[505,600], D:[605,821], E:[668,946] },
    3: { A:[147,147], B:[358,384], C:[519,574], D:[466,708], E:[741,849] },
    4: { A:[152,162], B:[346,491], C:[480,809], D:[571,1112], E:[624,1251] },
    5: { A:[150,157], B:[289,328], C:[468,557], D:[527,685], E:[622,858] },
    6: { A:[149,154], B:[311,391], C:[448,699], D:[574,989], E:[688,1362] },
    7: { A:[169,208], B:[280,429], C:[518,706], D:[622,915], E:[782,1141] },
    8: { A:[222,245], B:[326,403], C:[478,556], D:[659,787], E:[819,1036] },
    9: { A:[105,91], B:[327,281], C:[512,467], D:[542,555], E:[539,601] },
    10: { A:[243,254], B:[411,446], C:[535,704], D:[647,978], E:[700,1045] },
    11: { A:[192,218], B:[303,387], C:[428,587], D:[564,780], E:[652,915] },
    12: { A:[286,302], B:[337,398], C:[531,614], D:[545,798], E:[676,1070] },
    13: { A:[216,225], B:[348,462], C:[493,633], D:[655,950], E:[737,1189] },
    14: { A:[215,184], B:[407,378], C:[571,524], D:[583,587], E:[710,670] },
    15: { A:[187,194], B:[335,330], C:[558,599], D:[628,730], E:[733,880] },
    16: { A:[248,240], B:[408,424], C:[530,527], D:[544,652], E:[621,760] },
    17: { A:[201,215], B:[378,491], C:[499,752], D:[564,887], E:[686,1095] },
    18: { A:[228,257], B:[362,461], C:[534,699], D:[637,890], E:[761,1131] },
    19: { A:[199,176], B:[371,289], C:[506,429], D:[660,576], E:[820,728] },
    20: { A:[252,262], B:[369,494], C:[470,792], D:[596,1106], E:[731,1332] },
  },

  // Me ayudé de Claude para esta función. Cuántas manchas de moho se muestran dependiendo del nivel de contaminación (puse parámetros para simular más o menos un aumento exponencial)
  maxMohos: 180,
  mohosPorPM25(pm) {
    const pts = [
      [0,  8],
      [12, 13],
      [18, 30],
      [30, 52],
      [40, 120],
      [66, this.maxMohos],
    ];
    if (pm <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      if (pm <= x1) {
        const f = (pm - x0) / (x1 - x0);
        return Math.round(y0 + (y1 - y0) * f);
      }
    }
    return this.maxMohos;
  },

  // En días no taaan tóxicos, varias manchas aparecen pero no necesariamente llegan a su etapa final de crecimiento. La cantidad de moho y QUÉ TANTO CRECE aumenta proporcional al nivel de contaminación del día:

  etapaMaxima(toxicidad, esElUltimo) {

    const base = toxicidad;
    const rand = Math.random() * 0.25 - 0.05; // ±ruido
    const score = Math.min(1, Math.max(0, base + rand + (esElUltimo ? 0.3 : 0)));
    if (score < 0.2)  return 'A';
    if (score < 0.40) return 'B';
    if (score < 0.58) return 'C';
    if (score < 0.75) return 'D';
    return 'E';
  },

  // El color del petri dish, como en mi mockup, cambia dependiendo también del nivel de contaminación. (Ver referencia a halftone en mi CSS y aquí más abajo). Hay 3 tonos principales como el color del cielo, un azul muy claro para días limpias, uno como azul acero para los intermedios y gris casi negro cuando está muy contaminado el día:

  petriColor(t) {

    const stops = [
      [199, 217, 232],
      [117, 156, 184],
      [37,  37,  35],
    ];
    const n = stops.length - 1;
    const i = Math.min(Math.floor(t * n), n - 1);
    const local = (t * n) - i;
    const a = stops[i], b = stops[i + 1];
    const r = Math.round(a[0] + (b[0]-a[0]) * local);
    const g = Math.round(a[1] + (b[1]-a[1]) * local);
    const bl = Math.round(a[2] + (b[2]-a[2]) * local);
    return `rgb(${r},${g},${bl})`;
  },

  // Un pequeño delay para que no todas las manchas salgan al mismo tiempo y que no salgan de forma rítmica, si no como palomitas: rápido las primeras y más lento y espaciadas las últimas

  delayParaMoho(index, total) {

    const t = index / Math.max(total - 1, 1);
    return Math.round(t * t * 18000); // ms
  },

  // Clusters: a veces varias manchas del mismo tipo brotan juntas para simular una mancha más grande.
  probCluster: 0.26,
  clusterSpread: 6,
};

// ---------------- 2) CONSULTA DEL DÍA CALENDARIO ----------------

function getDatoDeHoy() {
  const hoy = new Date();
  const mes  = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia  = String(hoy.getDate()).padStart(2, '0');
  const fecha2024 = `2024-${mes}-${dia}`;
  return AIRE_MTY_2024.find(d => d.date === fecha2024) || AIRE_MTY_2024[0];
}

// ---------------- 3) ACTUALIZACIÓN DE LA INFO DEL SIDE BAR ----------------

function formatFecha(dateStr) {
  const [, m, d] = dateStr.split('-').map(Number);
  return `${MESES[m-1]} ${d} de 2024`;
}

function actualizarUI(dato) {
  const { date, pm25 } = dato;

  const setAll = (sel, text) =>
    document.querySelectorAll(sel).forEach(el => el.textContent = text);

  setAll('.js-fecha', formatFecha(date));
  setAll('.js-num', pm25.toFixed(1));

  // guarda el día mostrado para que el calendario lo resalte al abrirse
  fechaSeleccionada = date;
}

// ---------------- 4) ANIMACIóN DEL PETRI DISH ----------------

// Color del fondo:

function animarPetri(toxicidad) {
  const bg = document.getElementById('petri-bg');

  // La máscara de halftone va "adelantada" en el mismo gradiente: siempre un pasito más oscura
  const adelanto = 0.06;
  const colorMascara = t => CONFIG.petriColor(Math.min(1, t + adelanto));

  // Reinicia a claro
  bg.style.transition = 'none';
  bg.style.background = CONFIG.petriColor(0);
  bg.style.setProperty('--halftone', colorMascara(0));
  void bg.offsetWidth;

  setTimeout(() => {
    bg.style.transition = 'background 6s ease, --halftone 6s ease';
    bg.style.background = CONFIG.petriColor(toxicidad);
    bg.style.setProperty('--halftone', colorMascara(toxicidad));
  }, 1200);
}

// ---------------- 5) ANIMACIÓN DE MOHO ----------------

// El moho brota desde un punto y se expande hacia afuera
function posicionEnCirculo() {
  const radio = Math.sqrt(Math.random()) * 52;
  const angulo = Math.random() * Math.PI * 2; // porque es un círculo
  const x = 50 + radio * Math.cos(angulo);
  const y = 50 + radio * Math.sin(angulo) * 0.92;
  return { left: x, top: y };
}

// Para los clusters: una posición cerca de un centro dado aleatoriamente
function posicionCerca(centro, spread) {
  const radio = Math.sqrt(Math.random()) * spread;
  const angulo = Math.random() * Math.PI * 2;
  return {
    left: centro.left + radio * Math.cos(angulo),
    top:  centro.top  + radio * Math.sin(angulo) * 0.92,
  };
}

// Esta función es como un gaussian noise para que los grupitos de moho crezcan en clusters
function gauss() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function dentroDelDisco(p) {
  const dx = p.left - 50, dy = (p.top - 50) / 0.92;
  return dx * dx + dy * dy <= 52 * 52;
}

function posicionEnHotspot(centro, sigma) {
  for (let i = 0; i < 8; i++) {
    const p = {
      left: centro.left + gauss() * sigma,
      top:  centro.top  + gauss() * sigma * 0.92,
    };
    if (dentroDelDisco(p)) return p;
  }
  return { ...centro };
}

// Crea el DOM de una mancha de moho. Crece de forma radial, a diferencia de mis hongos anteriores que crecían de abajo hacía arriba. Uso las dimensiones reales de cada PNG:
function crearMoho(num, maxEtapa, pos, size) {
  const dims = CONFIG.mohoDims[num];
  const stages = CONFIG.stages;
  const maxIdx = stages.indexOf(maxEtapa);
  const mostradas = stages.slice(0, maxIdx + 1);

  // dimensión máxima de referencia para mantenerlas todas en tamaños relativamente similares
  const maxDim = (s) => Math.max(dims[s][0], dims[s][1]);
  const ref = Math.max(...mostradas.map(maxDim));

  const wrapper = document.createElement('div');
  wrapper.className = 'moho-instance';
  wrapper.style.left  = `${pos.left}%`;
  wrapper.style.top   = `${pos.top}%`;
  wrapper.style.width = `${size}%`;

  const imgs = mostradas.map((letra, idx) => {
    const [w, h] = dims[letra];
    const img = document.createElement('img');
    img.src = `assets/img/moho${String(num).padStart(2,'0')}/${num}${letra}.png`;
    img.alt = '';

    img.style.width  = `${(w / ref * 100).toFixed(1)}%`;
    img.style.height = `${(h / ref * 100).toFixed(1)}%`;

    // de qué tamaño creme esta etapa, nota del tamaño de la etapa anterior
    const fs = idx === 0
      ? 0.18
      : Math.min(3, maxDim(mostradas[idx - 1]) / maxDim(letra));
    img.style.setProperty('--from-scale', fs.toFixed(3));

    wrapper.appendChild(img);
    return img;
  });

  return { wrapper, imgs };
}

// Stop motion de crecimiento antes de que el moho se quede temblando
function animarMoho(imgs, holdMs, ctrl) {
  const UNFOLD_MS = 190;
  if (imgs.length === 0) return;

  let i = 0;

  function showStage(n) {
    imgs.forEach(im => im.classList.remove('active','unfolding','folding'));
    const im = imgs[n];
    void im.offsetWidth;
    im.classList.add('active','unfolding');
    setTimeout(() => im.classList.remove('unfolding'), UNFOLD_MS);
  }

  // Cada etapa de crecimiento tarda un tiempo ligeramente distinto para darle el look tipo "zombie de the last of us" :) 
  function loop() {
    if (ctrl && ctrl.cancel) return;
    showStage(i);
    if (i < imgs.length - 1) {
      const espera = holdMs * (0.65 + Math.random() * 0.7) + UNFOLD_MS;
      setTimeout(() => { i++; loop(); }, espera);
    }
  }

  loop();
}

// Moho que se retrae al hacerle clic (la reversa de cuando crece)
function retraerMoho(imgs, holdMs, onDone) {
  const FOLD_MS = 190;
  if (imgs.length === 0) { onDone(); return; }

  // arranca desde la etapa que esté visible (por si la clican a media movimiento)
  let i = imgs.findIndex(im => im.classList.contains('active'));
  if (i < 0) i = imgs.length - 1;

  function foldStage(n) {
    imgs.forEach(im => im.classList.remove('active','unfolding','folding'));
    const im = imgs[n];
    void im.offsetWidth;
    im.classList.add('active','folding');
  }

  function loop() {
    foldStage(i);
    const espera = holdMs * (0.5 + Math.random() * 0.5) + FOLD_MS;  // retraerse va poquito más rápido
    if (i > 0) {
      setTimeout(() => { i--; loop(); }, espera);
    } else {

      setTimeout(() => {
        imgs.forEach(im => im.classList.remove('active','folding'));
        onDone();
      }, FOLD_MS + 40);
    }
  }

  loop();
}

function lanzarColonia(dato) {
  const { pm25, toxicity: toxicidad } = dato;
  const colony = document.getElementById('colony');
  colony.innerHTML = '';
  const gen = ++coloniaGen;

  const total = CONFIG.mohosPorPM25(pm25);

  // Para generar un moho al azar
  const tipos = [];
  for (let t = 1; t <= CONFIG.totalMohos; t++) {
    if (!CONFIG.tiposExcluidos.includes(t)) tipos.push(t);
  }
  const randomType = () => tipos[Math.floor(Math.random() * tipos.length)];

  // Armo la lista de manchas y les digo que se formen en "hotspots" para que no crezcan de forma pareja en todo el petri si no un poco más orgánico.
  const placements = [];

  const numHot = Math.max(2, Math.min(6, Math.round(total / 16) + 1));
  const hotspots = [];
  for (let i = 0; i < numHot; i++) {
    hotspots.push({
      centro: posicionEnCirculo(),
      sigma:  5 + Math.random() * 11,
      peso:   0.5 + Math.random(),
    });
  }
  // Elige un hotspot al azar
  const pickHotspot = () => {
    const tot = hotspots.reduce((s, h) => s + h.peso, 0);
    let r = Math.random() * tot;
    for (const h of hotspots) { r -= h.peso; if (r <= 0) return h; }
    return hotspots[hotspots.length - 1];
  };

  // La mayoría del moho se ancla a un hotspot pero no todos
  const P_STRAGGLER = 0.16;

  while (placements.length < total) {
    const restantes = total - placements.length;
    if (restantes >= 3 && Math.random() < CONFIG.probCluster) {

      const num = randomType();
      const h = pickHotspot();
      const centro = posicionEnHotspot(h.centro, h.sigma);
      const cuantas = Math.min(restantes, 4 + Math.floor(Math.random() * 4)); // 4–7 juntos
      for (let k = 0; k < cuantas; k++) {
        placements.push({ num, pos: posicionCerca(centro, CONFIG.clusterSpread) });
      }
    } else if (Math.random() < P_STRAGGLER) {
      placements.push({ num: randomType(), pos: posicionEnCirculo() });
    } else {
      const h = pickHotspot();
      placements.push({ num: randomType(), pos: posicionEnHotspot(h.centro, h.sigma) });
    }
  }

  // A cada mancha le doy parámetros ligeramente distintos (tamaño, rotación, etc) para que aunque se repita el mismo tipo no se vean iguales.
  function configurarVariantes(wrapper) {
    // patrón de temblor
    const amp = Math.pow(Math.random(), 2);
    const variantes = ['tremble-a', 'tremble-b', 'tremble-c'];
    wrapper.style.setProperty('--tr', amp.toFixed(3));
    wrapper.style.setProperty('--tr-name', variantes[Math.floor(Math.random() * variantes.length)]);
    wrapper.style.setProperty('--tr-dur', (0.5 + Math.random() * 2.4).toFixed(2) + 's');
    wrapper.style.setProperty('--tr-delay', '-' + (Math.random() * 3).toFixed(2) + 's');

    wrapper.style.setProperty('--tilt', (Math.random() * 360).toFixed(1) + 'deg');
    wrapper.style.setProperty('--flip', Math.random() < 0.5 ? -1 : 1);

    // Giro lento y continuo de cada manchita
    wrapper.style.setProperty('--spin-dur', (50 + Math.random() * 130).toFixed(0) + 's');
    wrapper.style.setProperty('--spin-dir', Math.random() < 0.5 ? -1 : 1);
    wrapper.style.setProperty('--spin-delay', '-' + (Math.random() * 60).toFixed(0) + 's');
  }

  // Clic en una mancha: se retrae (crece en reversa hasta desaparecer) y 1 s después brota OTRA nueva en su mismo lugar.
  function hacerClicable(wrapper, imgs, holdMs, pos, ctrl) {
    wrapper.addEventListener('click', (e) => {
      e.stopPropagation();
      if (ctrl.retrayendo) return;
      ctrl.retrayendo = true;
      ctrl.cancel = true;
      retraerMoho(imgs, holdMs, () => {
        wrapper.remove();
        setTimeout(() => {
          if (gen !== coloniaGen) return;
          brotarMancha(pos);
        }, 1000);
      });
    });
  }

  function brotarMancha(pos, num = randomType(), esElUltimo = false) {
    const maxEtapa = CONFIG.etapaMaxima(toxicidad, esElUltimo);
    const size = 8 + Math.random() * 7;
    const { wrapper, imgs } = crearMoho(num, maxEtapa, pos, size);
    configurarVariantes(wrapper);

    const holdMs = 150 + Math.random() * 220;
    const ctrl = { cancel: false };   // permite cancelar el crecimiento al hacer clic

    colony.appendChild(wrapper);
    requestAnimationFrame(() => animarMoho(imgs, holdMs, ctrl));
    hacerClicable(wrapper, imgs, holdMs, pos, ctrl);
  }

  // cada mancha aparece escalonada (como palomitas)
  placements.forEach(({ num, pos }, idx) => {
    const esElUltimo = idx === placements.length - 1;
    const delay = CONFIG.delayParaMoho(idx, placements.length);
    setTimeout(() => {
      if (gen !== coloniaGen) return;
      brotarMancha(pos, num, esElUltimo);
    }, delay);
  });
}

// ---------------- 6) RENDER + SELECTOR DE FECHA ----------------

// Dibuja los datos del día seleccionado (o por defecto el de hoy en 2024)
function render(dato) {
  if (!dato) return;
  actualizarUI(dato);
  animarPetri(dato.toxicity);
  // un respiro antes de que empiece a brotar el moho
  setTimeout(() => lanzarColonia(dato), 600);
}

// Calendario propio (el nativo no se puede estilar) que solo navega meses del 2024
function setupCalendario() {
  const cal = document.getElementById('cal');
  if (!cal) return;

  const titulo  = document.getElementById('cal-title');
  const grid    = document.getElementById('cal-days');
  const btnPrev = cal.querySelector('.cal-prev');
  const btnNext = cal.querySelector('.cal-next');

  let verMes = 0;   // 0–11, mes que se está mostrando o sea 12 meses

  // Dibuja la cuadrícula del mes actual (huecos + días).
  function pintar() {
    titulo.textContent = `${MESES[verMes]} 2024`;
    grid.innerHTML = '';

    const primerDia = new Date(2024, verMes, 1).getDay();
    const totalDias = new Date(2024, verMes + 1, 0).getDate();

    for (let i = 0; i < primerDia; i++) {
      const hueco = document.createElement('span');
      hueco.className = 'cal-blank';
      grid.appendChild(hueco);
    }
    for (let d = 1; d <= totalDias; d++) {
      const ds = `2024-${String(verMes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cal-day';
      btn.textContent = d;
      if (ds === fechaSeleccionada) btn.classList.add('is-selected');
      btn.addEventListener('click', () => elegir(ds));
      grid.appendChild(btn);
    }

    btnPrev.disabled = (verMes === 0);    // no salir de 2024
    btnNext.disabled = (verMes === 11);
  }

  // Elige un día, renderiza la colonia y se cierra el calendario
  function elegir(ds) {
    const dato = AIRE_MTY_2024.find(d => d.date === ds);
    if (dato) render(dato);
    cerrar();
  }

  function abrir(anchor) {

    verMes = fechaSeleccionada ? Number(fechaSeleccionada.split('-')[1]) - 1
                               : new Date().getMonth();
    pintar();
    cal.hidden = false;
    posicionar(anchor);
    document.addEventListener('pointerdown', fueraClick, true);
    document.addEventListener('keydown', escClose);
  }
  function cerrar() {
    cal.hidden = true;
    document.removeEventListener('pointerdown', fueraClick, true);
    document.removeEventListener('keydown', escClose);
  }
  function fueraClick(e) {
    if (!cal.contains(e.target) && !e.target.closest('[data-pick-date]')) cerrar();
  }
  function escClose(e) { if (e.key === 'Escape') cerrar(); }

  function posicionar(anchor) {
    const r  = anchor.getBoundingClientRect();
    const cr = cal.getBoundingClientRect();
    let top = r.bottom + 8;
    if (top + cr.height > window.innerHeight - 8) top = r.top - cr.height - 8;
    let left = Math.min(r.left, window.innerWidth - cr.width - 8);
    cal.style.top  = `${Math.max(8, top)}px`;
    cal.style.left = `${Math.max(8, left)}px`;
  }

  btnPrev.addEventListener('click', () => { if (verMes > 0)  { verMes--; pintar(); } });
  btnNext.addEventListener('click', () => { if (verMes < 11) { verMes++; pintar(); } });
  cal.querySelector('.cal-today').addEventListener('click', () => {
    const hoy = getDatoDeHoy();
    if (hoy) elegir(hoy.date);
  });
  cal.querySelector('.cal-clear').addEventListener('click', cerrar);

  // Cada botón "Elegir otra fecha" abre/cierra el calendario
  document.querySelectorAll('[data-pick-date]').forEach(btn =>
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      cal.hidden ? abrir(btn) : cerrar();
    }));
}

// Animación de la esquinita del postit
function setupPostit() {
  const postit = document.getElementById('postit');
  if (!postit) return;

  const frames = [...postit.querySelectorAll('.pf')];
  if (frames.length === 0) return;

  let idx = 0;
  let timer = null;

  const mostrar = (i) => {
    idx = i;
    frames.forEach((f, n) => { f.style.opacity = n === i ? '1' : '0'; });
  };

  const animarHacia = (destino) => {
    clearInterval(timer);
    timer = setInterval(() => {
      if (idx === destino) { clearInterval(timer); return; }
      mostrar(idx + (destino > idx ? 1 : -1));
    }, 70);
  };

  postit.addEventListener('mouseenter', () => animarHacia(frames.length - 1));
  postit.addEventListener('mouseleave', () => animarHacia(0));
}

// Menú desplegable (tablet/móvil): "Menú" abre/cierra un panel con Acerca y Contacto

function setupMenu() {
  const menu = document.getElementById('ui-menu');
  const panel = document.querySelector('.ui-menu-panel');
  if (!menu || !panel) return;

  const cerrar = () => {
    panel.hidden = true;
    menu.setAttribute('aria-expanded', 'false');
  };
  const abrir = () => {
    panel.hidden = false;
    menu.setAttribute('aria-expanded', 'true');
  };

  menu.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    panel.hidden ? abrir() : cerrar();
  });
  document.addEventListener('pointerdown', (e) => {
    if (!panel.hidden && !e.target.closest('.ui-menu-wrap')) cerrar();
  }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrar(); });
}

// Info en la "i" de PM2.5: en desktop se muestra con hover (CSS); en tablet/celular se alterna con tap
function setupTip() {
  const icon = document.querySelector('.pu-info');
  const tip  = document.querySelector('.pu-tip');
  if (!icon || !tip) return;

  icon.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    tip.classList.toggle('is-open');
  });
  document.addEventListener('pointerdown', (e) => {
    if (tip.classList.contains('is-open') &&
        e.target instanceof Element &&
        !e.target.closest('.pu-info-wrap')) {
      tip.classList.remove('is-open');
    }
  }, true);
}

// Acerca: postal de Monterrey que se voltea.
function setupAcerca() {
  const overlay = document.getElementById('acerca-overlay');
  const postal  = document.getElementById('postal');
  if (!overlay || !postal) return;

  const inner = postal.querySelector('.postal-inner');
  const panel = document.querySelector('.ui-menu-panel');
  const menuBtn = document.getElementById('ui-menu');

  let abierto = false;
  let flipTimer = null;
  let hideTimer = null;

  function abrir() {
    if (abierto) return;
    abierto = true;
    clearTimeout(flipTimer);
    clearTimeout(hideTimer);

    // cierra el menú de móvil si es que está abierto
    if (panel) panel.hidden = true;
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');

    overlay.hidden = false;
    postal.hidden = false;
    postal.classList.remove('is-flipped');
    void postal.offsetWidth;

    overlay.classList.add('is-on');
    postal.classList.add('is-open');

    // se voltea la postal
    flipTimer = setTimeout(() => postal.classList.add('is-flipped'), 1100);
    document.addEventListener('keydown', escClose);
  }

  function cerrar() {
    if (!abierto) return;
    abierto = false;
    clearTimeout(flipTimer);

    overlay.classList.remove('is-on');
    postal.classList.remove('is-open');
    document.removeEventListener('keydown', escClose);

    hideTimer = setTimeout(() => {
      overlay.hidden = true;
      postal.hidden = true;
      postal.classList.remove('is-flipped');
    }, 450);
  }

  function escClose(e) { if (e.key === 'Escape') cerrar(); }

  document.querySelectorAll('[data-acerca]').forEach(a =>
    a.addEventListener('click', (e) => { e.preventDefault(); abrir(); }));

  // clic sobre la postal: la voltea (por si alguien quiere ver las montañas de Monterrey)
  inner.addEventListener('click', (e) => {
    e.stopPropagation();
    clearTimeout(flipTimer);
    postal.classList.toggle('is-flipped');
  });

  // clic en el fondo (fuera de la postal) cierra
  overlay.addEventListener('click', cerrar);
}

// Hice el contacto como un overlay con un formulario súper simple, siguiendo la estética del calendario que hice más arriba para que tuviera continuidad visual. 
function setupContacto() {
  const overlay = document.getElementById('contacto');
  if (!overlay) return;

  const formView = overlay.querySelector('.contacto-form');
  const okView   = overlay.querySelector('.contacto-ok');
  const panel    = document.querySelector('.ui-menu-panel');   // menú móvil
  const menuBtn  = document.getElementById('ui-menu');

  function abrir() {

    if (panel) panel.hidden = true;
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');

    formView.hidden = false;
    okView.hidden = true;
    overlay.hidden = false;
    document.addEventListener('keydown', esc);
    setTimeout(() => formView.querySelector('input')?.focus(), 0);
  }
  function cerrar() {
    overlay.hidden = true;
    document.removeEventListener('keydown', esc);
    formView.reset();
  }
  function esc(e) { if (e.key === 'Escape') cerrar(); }

  document.querySelectorAll('[data-contacto]').forEach(a =>
    a.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); abrir(); }));

  // clic en el fondo (fuera de la tarjeta) cierra
  overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(); });
  overlay.querySelector('.contacto-x').addEventListener('click', cerrar);
  overlay.querySelector('.contacto-cerrar').addEventListener('click', cerrar);

  // envío (no tiene servidor para enviarse, pero simula la experiencia)
  formView.addEventListener('submit', (e) => {
    e.preventDefault();
    formView.hidden = true;
    okView.hidden = false;
  });
}

// ---------------- 6.5) RESPONSIVE / GESTOR ANTI-EMPALMES ----------------

// NOTA: como lo comenté en mi CSS, mis objetos están acomodados en pantalla sin seguir un grid o un flex traidicional, si no de forma estática, por lo que con ayuda de IA pude generar unas reglas que ayudan al tema de responsividad. La principal es que los objetos tienen jerarquías y si por alguna razón el tamaño de la pantalla hace que se empalmen, el de menor jerarquía se esconde.

// Pantalla en modo vertical (igual que el media query del CSS).
const mqStack = window.matchMedia('(max-width: 900px), (max-aspect-ratio: 23/20)');

// Cajitas o círculos ajustados a cada oelemento
const SEL_ANCLAS_RECT = ['#ui-top', '#postit', '.ed-title'];

// Jerarquías bajas que se pueden y deben ocultar si se empalman con las altas
const SEL_OCULTABLES = ['#lapicero', '#slides'];

const MARGEN_COLISION = -10;
const ENCOGER = 0.88;
const RADIO_PETRI = 0.97;

function rectDe(sel, f = ENCOGER) {
  const el = document.querySelector(sel);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  const dx = r.width * (1 - f) / 2, dy = r.height * (1 - f) / 2;
  return { left: r.left + dx, right: r.right - dx, top: r.top + dy, bottom: r.bottom - dy };
}

// El petri como círculo
function circuloPetri() {
  const el = document.querySelector('#petri');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (!r.width) return null;
  return { cx: (r.left + r.right) / 2, cy: (r.top + r.bottom) / 2, rad: (r.width / 2) * RADIO_PETRI };
}

// Reglas de empalme

// Empalme de cajitas
function seEmpalman(a, b, m = 0) {
  return !(a.right + m < b.left || a.left - m > b.right ||
           a.bottom + m < b.top || a.top - m > b.bottom);
}

// Empalme con el petri
function rectChocaCirculo(rect, c, m = 0) {
  const nx = Math.max(rect.left, Math.min(c.cx, rect.right));
  const ny = Math.max(rect.top,  Math.min(c.cy, rect.bottom));
  const dx = c.cx - nx, dy = c.cy - ny;
  return (dx * dx + dy * dy) < (c.rad + m) * (c.rad + m);
}

function gestionarEmpalmes() {

  if (document.body.classList.contains('intro')) return;

  const ocultables = SEL_OCULTABLES
    .map(sel => document.querySelector(sel))
    .filter(Boolean);
  ocultables.forEach(el => el.classList.remove('oculto-colision'));
  if (mqStack.matches) return;

  requestAnimationFrame(() => {
    const anclas = SEL_ANCLAS_RECT.map(s => rectDe(s)).filter(Boolean);
    const petri = circuloPetri();
    for (const sel of SEL_OCULTABLES) {
      const c = rectDe(sel);
      if (!c) continue;
      const choca = anclas.some(a => seEmpalman(a, c, MARGEN_COLISION)) ||
                    (petri && rectChocaCirculo(c, petri, MARGEN_COLISION));
      document.querySelector(sel)?.classList.toggle('oculto-colision', choca);
    }
  });
}

// En formato vertical el petri es prioridad 1 y va anclado para que los demas elemnetos se adapten a él

function ajustarPetriStack() {
  const wrap = document.getElementById('petri-wrap');
  const ed = document.getElementById('editorial');
  if (!wrap || !ed) return;

  if (document.body.classList.contains('intro')) return;

  // reseteo el petri para medir dónde lo deja el CSS por su cuenta
  wrap.style.top = '';
  wrap.style.bottom = '';

  if (!mqStack.matches) return;

  const MARGEN = 24;
  const naturalTop = wrap.getBoundingClientRect().top;
  const deseado = ed.getBoundingClientRect().bottom + MARGEN;
  if (deseado > naturalTop) {
    wrap.style.top = `${Math.round(deseado)}px`;
    wrap.style.bottom = 'auto';
  }
}

// Corro el "gestor de empalmes" al cargar, cuando terminan de cargar las imágenes 
function setupLayout() {
  let t = null;
  const run = () => { gestionarEmpalmes(); ajustarPetriStack(); };
  window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(run, 120); });
  window.addEventListener('load', run);
  run();
}

// Le quito la clase .intro cuando termina la entrada de los elementos
function setupIntro() {
  if (!document.body.classList.contains('intro')) return;
  setTimeout(() => {
    document.body.classList.remove('intro');
    gestionarEmpalmes();
    ajustarPetriStack();
  }, 1700);
}

// ---------------- 7) INIT ----------------

document.addEventListener('DOMContentLoaded', async () => {
  // Carga data.json como si fuera una API
  try {
    const resp = await fetch('data.json');
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    AIRE_MTY_2024 = await resp.json();
  } catch (err) {
    console.error('No se pudo cargar data.json. ¿Estás sirviendo el sitio ' +
                  'con un servidor (python3 -m http.server)? file:// no permite fetch.', err);
    return;
  }

  setupCalendario();
  setupPostit();
  setupMenu();
  setupTip();
  setupAcerca();
  setupContacto();
  setupLayout();
  setupIntro();
  render(getDatoDeHoy());
});
