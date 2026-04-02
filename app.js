// ============================================================
// Astro-Lab — Application interactive SVG avec animations SMIL
// Toutes les animations utilisent des éléments <animate> déclaratifs.
// Le JS ne gère que : navigation, état (compteurs, quiz), toasts, sons.
// ============================================================

// --- Utilitaire audio Web Audio API (sons synthétisés de secours) ---
const _audioCtx = new (window.AudioContext || window.webkitAudioContext)();

/**
 * Génère un bip synthétisé via Web Audio API.
 * @param {number} frequency - Fréquence en Hz
 * @param {number} duration  - Durée en secondes
 * @param {string} type      - Type d'oscillateur (sine, square, sawtooth, triangle)
 */
function generateBeep(frequency, duration, type = "sine") {
  const osc = _audioCtx.createOscillator();
  const gain = _audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, _audioCtx.currentTime);
  gain.gain.setValueAtTime(0.3, _audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, _audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(_audioCtx.destination);
  osc.start(_audioCtx.currentTime);
  osc.stop(_audioCtx.currentTime + duration);
}

/** Son de validation — carillon aigu agréable (800 Hz, 0.3s, sinusoïdale) */
function playOk() { generateBeep(800, 0.3, "sine"); }

/** Son d'erreur — bourdonnement grave (200 Hz, 0.4s, carrée) */
function playBad() { generateBeep(200, 0.4, "square"); }

/** Carillon brillant (1000 Hz, 0.2s, sinusoïdale) */
function playChime() { generateBeep(1000, 0.2, "sine"); }

/** Son de lancement — balayage ascendant de 200 Hz à 800 Hz sur 1 seconde */
function playLaunch() {
  const osc = _audioCtx.createOscillator();
  const gain = _audioCtx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(200, _audioCtx.currentTime);
  osc.frequency.linearRampToValueAtTime(800, _audioCtx.currentTime + 1);
  gain.gain.setValueAtTime(0.3, _audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, _audioCtx.currentTime + 1);
  osc.connect(gain);
  gain.connect(_audioCtx.destination);
  osc.start(_audioCtx.currentTime);
  osc.stop(_audioCtx.currentTime + 1);
}

/** Son de victoire — trois tons ascendants (600, 800, 1000 Hz, 0.2s chacun) */
function playVictory() {
  [600, 800, 1000].forEach((freq, i) => {
    const osc = _audioCtx.createOscillator();
    const gain = _audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, _audioCtx.currentTime + i * 0.25);
    gain.gain.setValueAtTime(0, _audioCtx.currentTime);
    gain.gain.setValueAtTime(0.3, _audioCtx.currentTime + i * 0.25);
    gain.gain.exponentialRampToValueAtTime(0.001, _audioCtx.currentTime + i * 0.25 + 0.2);
    osc.connect(gain);
    gain.connect(_audioCtx.destination);
    osc.start(_audioCtx.currentTime + i * 0.25);
    osc.stop(_audioCtx.currentTime + i * 0.25 + 0.2);
  });
}

// Table de correspondance id -> fonction de secours synthétisée
const _synthFallbacks = {
  welcomeSound: playChime,
  launchSound:  playLaunch,
  chimeSound:   playChime,
  okSound:      playOk,
  badSound:     playBad,
  victorySound: playVictory
};

// --- Fin de l'utilitaire audio ---

const content = document.getElementById("content");
const sceneLabel = document.getElementById("sceneLabel");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

// Espace de noms SVG utilisé pour créer tous les éléments
const SVG_NS = "http://www.w3.org/2000/svg";

let scene = 0;
const totalScenes = 4;
let starsFound = 0;
let quizAnswered = false;
let factsDiscovered = 0;

// --- Fonctions utilitaires (inchangées) ---

function clearContent() {
  while (content.firstChild) content.removeChild(content.firstChild);
}

function setSceneLabel() {
  sceneLabel.textContent = `Scène ${scene + 1}/${totalScenes}`;
}

function makeText(x, y, txt, size = 28, weight = "700", color = "#1f2a44") {
  const t = document.createElementNS(SVG_NS, "text");
  t.setAttribute("x", x);
  t.setAttribute("y", y);
  t.setAttribute("fill", color);
  t.setAttribute("font-size", size);
  t.setAttribute("font-weight", weight);
  t.setAttribute("font-family", "Segoe UI, Arial, sans-serif");
  t.textContent = txt;
  return t;
}

function showToast(message) {
  const old = document.getElementById("toast");
  if (old) old.remove();

  const t = document.createElement("div");
  t.id = "toast";
  t.textContent = message;
  Object.assign(t.style, {
    position: "fixed",
    bottom: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    background: "#111827",
    color: "white",
    padding: "10px 14px",
    borderRadius: "10px",
    fontSize: "14px",
    zIndex: "9999",
    boxShadow: "0 8px 24px rgba(0,0,0,.25)"
  });
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 1900);
}

// Fonction audio : essaie d'abord l'élément HTML5 <audio>, sinon utilise le son synthétisé
function playSound(id) {
  // Reprendre le contexte audio si suspendu (politique autoplay des navigateurs)
  if (_audioCtx.state === "suspended") _audioCtx.resume();

  const a = document.getElementById(id);
  if (a && a.readyState >= 2) {
    // Le fichier audio est chargé, on le joue
    a.currentTime = 0;
    a.play().catch(() => {
      // En cas d'échec de lecture, on utilise le son synthétisé
      if (_synthFallbacks[id]) _synthFallbacks[id]();
    });
  } else {
    // Pas d'élément audio ou fichier non disponible : son synthétisé de secours
    if (_synthFallbacks[id]) _synthFallbacks[id]();
  }
}

// --- Fonction utilitaire pour créer un élément SVG avec ses attributs ---
function makeSVG(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  return el;
}

// Interpolation linéaire entre deux couleurs hex sur une durée donnée (ms)
// Utilisé pour les dégradés SVG car SMIL <animate> sur <stop> est peu fiable
function animateColor(element, attr, fromHex, toHex, duration, delay = 0) {
  const from = fromHex.match(/\w\w/g).map(h => parseInt(h, 16));
  const to = toHex.match(/\w\w/g).map(h => parseInt(h, 16));
  const steps = 30;
  const stepTime = duration / steps;

  setTimeout(() => {
    let step = 0;
    const id = setInterval(() => {
      step++;
      const t = step / steps;
      const r = Math.round(from[0] + (to[0] - from[0]) * t);
      const g = Math.round(from[1] + (to[1] - from[1]) * t);
      const b = Math.round(from[2] + (to[2] - from[2]) * t);
      element.setAttribute(attr, `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`);
      if (step >= steps) clearInterval(id);
    }, stepTime);
  }, delay);
}

// ============================================================
// Scène 0 — Introduction : soleil pulsant, fusée décollante, nuages
// ============================================================
function renderScene0() {
  // Réinitialisation du compteur de faits
  factsDiscovered = 0;
  const factFlags = { sun: false, rocket: false, earth: false };

  // --- Mode nuit complet (noir) au démarrage ---
  const skyTop = document.getElementById("skyTop");
  const skyBottom = document.getElementById("skyBottom");
  const grassTop = document.getElementById("grassTop");
  const grassBottom = document.getElementById("grassBottom");

  // Fond entièrement noir
  skyTop.setAttribute("stop-color", "#000000");
  skyBottom.setAttribute("stop-color", "#050510");
  grassTop.setAttribute("stop-color", "#000000");
  grassBottom.setAttribute("stop-color", "#000000");

  // Étoiles scintillantes dans le ciel nocturne
  const starPositions = [
    [120, 40], [250, 80], [380, 30], [500, 65], [620, 25],
    [700, 55], [160, 120], [340, 140], [480, 130], [600, 110],
    [50, 90], [820, 45], [760, 130], [430, 170], [280, 180]
  ];

  starPositions.forEach(([sx, sy], i) => {
    const nightStar = makeSVG("circle", {
      cx: sx, cy: sy, r: "2", fill: "white", opacity: "0.7",
      class: "night-star"
    });
    const twinkle = makeSVG("animate", {
      attributeName: "opacity",
      values: "0.7;0.15;0.7",
      dur: `${1.5 + (i % 5) * 0.3}s`,
      repeatCount: "indefinite"
    });
    nightStar.appendChild(twinkle);
    content.appendChild(nightStar);
  });

  // ============================================================
  // Soleil brillant — seul élément visible au départ
  // ============================================================
  const sun = makeSVG("circle", {
    cx: "450", cy: "200", r: "55", fill: "#fbbf24"
  });
  sun.style.cursor = "pointer";

  // Halo lumineux autour du soleil pour le faire briller dans le noir
  const halo = makeSVG("circle", {
    cx: "450", cy: "200", r: "80", fill: "#fbbf24", opacity: "0.15"
  });
  const haloPulse = makeSVG("animate", {
    attributeName: "r",
    values: "80;100;80",
    dur: "2s",
    repeatCount: "indefinite"
  });
  halo.appendChild(haloPulse);
  const haloFade = makeSVG("animate", {
    attributeName: "opacity",
    values: "0.15;0.25;0.15",
    dur: "2s",
    repeatCount: "indefinite"
  });
  halo.appendChild(haloFade);
  content.appendChild(halo);

  // Pulsation du soleil
  const pulse = makeSVG("animate", {
    attributeName: "r",
    values: "55;62;55",
    dur: "2s",
    repeatCount: "indefinite"
  });
  sun.appendChild(pulse);
  content.appendChild(sun);

  // --- Indicateur visuel : flèche + texte guidant vers le soleil ---
  const guideGroup = makeSVG("g", { id: "sunGuide" });

  // Flèche pointant vers le soleil
  const arrow = makeSVG("polygon", {
    points: "450,275 440,295 445,295 445,315 455,315 455,295 460,295",
    fill: "#fbbf24"
  });
  // Animation de rebond vertical sur la flèche
  const bounce = makeSVG("animateTransform", {
    attributeName: "transform",
    type: "translate",
    values: "0 0;0 8;0 0",
    dur: "1s",
    repeatCount: "indefinite"
  });
  arrow.appendChild(bounce);
  guideGroup.appendChild(arrow);

  // Texte d'instruction
  const guideText = makeText(350, 350, "Clique ici sur le soleil ☀", 22, "700", "#fbbf24");
  guideGroup.appendChild(guideText);
  content.appendChild(guideGroup);

  // ============================================================
  // Éléments cachés — apparaîtront après le lever du soleil
  // ============================================================

  // Titre (caché au départ)
  const title = makeText(40, 70, "Bienvenue dans Astro-Lab 🚀", 38, "700", "#1f2a44");
  title.setAttribute("opacity", "0");
  content.appendChild(title);

  const subtitle = makeText(40, 110, "Mission: découvrir 3 faits sur l'espace", 22, "500", "#1f2a44");
  subtitle.setAttribute("opacity", "0");
  content.appendChild(subtitle);

  // Indicateur de progression (caché au départ)
  const progressText = makeText(40, 148, "Faits découverts: 0/3", 20, "700", "#065f46");
  progressText.setAttribute("opacity", "0");
  content.appendChild(progressText);

  function updateProgress() {
    factsDiscovered++;
    progressText.textContent = `Faits découverts: ${factsDiscovered}/3`;
    if (factsDiscovered === 3) {
      showToast("Bravo ! Tu as découvert les 3 faits ! Clique Suivant ▶");
      playSound("victorySound");
      unlockNext();
    }
  }

  // Nuages (cachés)
  const clouds = [];
  const cloudData = [
    { cx: 300, cy: 175, rx: 70, ry: 22, dur: "8s", dx: 80 },
    { cx: 600, cy: 195, rx: 55, ry: 18, dur: "10s", dx: -60 }
  ];

  cloudData.forEach((c) => {
    const cloud = makeSVG("ellipse", {
      cx: c.cx, cy: c.cy, rx: c.rx, ry: c.ry,
      fill: "white", opacity: "0"
    });
    const drift = makeSVG("animateTransform", {
      attributeName: "transform",
      type: "translate",
      values: `0 0;${c.dx} 0;0 0`,
      dur: c.dur,
      repeatCount: "indefinite"
    });
    cloud.appendChild(drift);
    content.appendChild(cloud);
    clouds.push(cloud);
  });

  // Fusée (cachée au départ, opacité 0, pas de clics tant qu'invisible)
  const rocketGroup = makeSVG("g", { id: "rocketGroup", opacity: "0", "pointer-events": "none" });
  rocketGroup.style.cursor = "pointer";

  const body = makeSVG("rect", {
    x: "60", y: "260", rx: "18", width: "60", height: "120", fill: "#e5e7eb"
  });
  const nose = makeSVG("polygon", {
    points: "90,215 60,265 120,265", fill: "#ef4444"
  });
  const win = makeSVG("circle", {
    cx: "90", cy: "305", r: "11", fill: "#93c5fd"
  });
  const flame = makeSVG("polygon", {
    points: "90,380 75,410 105,410", fill: "#f97316", opacity: "0"
  });
  const flameShow = makeSVG("animate", {
    attributeName: "opacity",
    from: "0", to: "1",
    dur: "0.1s",
    fill: "freeze",
    begin: "rocketGroup.click"
  });
  flame.appendChild(flameShow);
  rocketGroup.append(body, nose, win, flame);

  const launch = makeSVG("animateTransform", {
    attributeName: "transform",
    type: "translate",
    from: "0 0",
    to: "0 -400",
    dur: "2s",
    fill: "freeze",
    begin: "click"
  });
  rocketGroup.appendChild(launch);
  content.appendChild(rocketGroup);

  const rocketLabel = makeText(30, 440, "Clique la fusée 🚀", 14, "600", "#1f2a44");
  rocketLabel.setAttribute("opacity", "0");
  content.appendChild(rocketLabel);

  rocketGroup.addEventListener("click", () => {
    if (factFlags.rocket) return;
    factFlags.rocket = true;
    showToast("Fait 2: Il faut 3 jours pour aller sur la Lune 🌙");
    playSound("launchSound");
    updateProgress();
  });

  // Terre (cachée au départ, opacité 0, pas de clics tant qu'invisible)
  const earthGroup = makeSVG("g", { id: "earthGroup", opacity: "0", "pointer-events": "none" });
  earthGroup.style.cursor = "pointer";

  const earth = makeSVG("circle", {
    cx: "430", cy: "310", r: "50", fill: "#3b82f6"
  });
  const land1 = makeSVG("ellipse", {
    cx: "415", cy: "295", rx: "18", ry: "14", fill: "#22c55e",
    "pointer-events": "none"
  });
  const land2 = makeSVG("ellipse", {
    cx: "450", cy: "320", rx: "14", ry: "10", fill: "#22c55e",
    "pointer-events": "none"
  });
  const land3 = makeSVG("ellipse", {
    cx: "420", cy: "340", rx: "10", ry: "7", fill: "#22c55e",
    "pointer-events": "none"
  });
  earthGroup.append(earth, land1, land2, land3);

  const spin = makeSVG("animateTransform", {
    attributeName: "transform",
    type: "rotate",
    from: "0 430 310",
    to: "360 430 310",
    dur: "3s",
    repeatCount: "indefinite",
    begin: "click"
  });
  earthGroup.appendChild(spin);
  content.appendChild(earthGroup);

  const earthLabel = makeText(365, 390, "Clique la Terre 🌍", 14, "600", "#1e40af");
  earthLabel.setAttribute("opacity", "0");
  content.appendChild(earthLabel);

  earthGroup.addEventListener("click", () => {
    if (factFlags.earth) return;
    factFlags.earth = true;
    showToast("Fait 3: La Terre tourne sur elle-même en 24 heures 🌍");
    playSound("chimeSound");
    updateProgress();
  });

  // ============================================================
  // Transition nuit → jour déclenchée au clic sur le soleil
  // ============================================================

  // Utilitaire : ajouter un <animate> et le démarrer immédiatement (ou avec délai)
  // begin="indefinite" + beginElementAt(delay) résout le problème des animations
  // dynamiques dont begin="0s" ne fonctionne pas (le temps 0 est déjà passé).
  function startAnim(parent, attrs, delay = 0) {
    const anim = makeSVG("animate", Object.assign({}, attrs, { begin: "indefinite" }));
    parent.appendChild(anim);
    anim.beginElementAt(delay);
    return anim;
  }

  function startAnimTransform(parent, attrs, delay = 0) {
    const anim = makeSVG("animateTransform", Object.assign({}, attrs, { begin: "indefinite" }));
    parent.appendChild(anim);
    anim.beginElementAt(delay);
    return anim;
  }

  sun.addEventListener("click", () => {
    if (factFlags.sun) return;
    factFlags.sun = true;

    // --- Supprimer le guide et le halo du DOM ---
    const guide = document.getElementById("sunGuide");
    if (guide) guide.remove();
    halo.remove();

    // --- Déplacer le soleil vers le coin haut-droit (position finale) ---
    startAnim(sun, {
      attributeName: "cx", from: "450", to: "780",
      dur: "1.5s", fill: "freeze"
    });
    startAnim(sun, {
      attributeName: "cy", from: "200", to: "80",
      dur: "1.5s", fill: "freeze"
    });
    startAnim(sun, {
      attributeName: "r", from: "55", to: "45",
      dur: "1.5s", fill: "freeze"
    });

    // --- Transition du ciel : noir → bleu clair (via JS car SMIL sur <stop> est peu fiable) ---
    animateColor(skyTop, "stop-color", "#000000", "#c7e9ff", 2000);
    animateColor(skyBottom, "stop-color", "#050510", "#f0fbff", 2000);

    // --- Transition de l'herbe : noir → vert ---
    animateColor(grassTop, "stop-color", "#000000", "#9ae6b4", 2000);
    animateColor(grassBottom, "stop-color", "#000000", "#48bb78", 2000);

    // --- Faire disparaître les étoiles nocturnes ---
    document.querySelectorAll(".night-star").forEach((ns) => {
      ns.setAttribute("opacity", "0");
    });

    // --- Apparition progressive via JS (fiable sur tous les navigateurs) ---
    setTimeout(() => {
      clouds.forEach((cloud) => cloud.setAttribute("opacity", "0.85"));
      title.setAttribute("opacity", "1");
    }, 1000);

    setTimeout(() => {
      subtitle.setAttribute("opacity", "1");
    }, 1300);

    setTimeout(() => {
      progressText.setAttribute("opacity", "1");
    }, 1500);

    // --- Faire apparaître la Terre + réactiver les clics ---
    setTimeout(() => {
      earthGroup.setAttribute("opacity", "1");
      earthGroup.setAttribute("pointer-events", "auto");
    }, 1800);

    setTimeout(() => {
      earthLabel.setAttribute("opacity", "1");
    }, 2300);

    // --- Faire apparaître la fusée + réactiver les clics ---
    setTimeout(() => {
      rocketGroup.setAttribute("opacity", "1");
      rocketGroup.setAttribute("pointer-events", "auto");
    }, 2500);

    setTimeout(() => {
      rocketLabel.setAttribute("opacity", "1");
    }, 3000);

    showToast("Fait 1: Le Soleil est une étoile ⭐");
    playSound("okSound");
    updateProgress();
  });
}

// ============================================================
// Scène 1 — Chasse aux étoiles cachées
// ============================================================
function renderScene1() {
  content.appendChild(makeText(40, 70, "Scène 2: Trouve les étoiles cachées ✨", 32));
  content.appendChild(makeText(40, 108, "Objectif: clique sur 3 étoiles puis valide ✔", 20, "500"));

  const selected = new Set();
  let validated = false;

  const feedback = makeText(40, 145, "", 20, "700", "#065f46");
  content.appendChild(feedback);

  const positions = [
    [180, 250], [360, 200], [540, 280], [720, 210], [790, 300]
  ];

  const stars = [];

  positions.forEach(([x, y], i) => {
    const star = makeSVG("polygon", {
      points: `${x},${y - 18} ${x + 6},${y - 6} ${x + 20},${y - 6} ${x + 9},${y + 2} ${x + 13},${y + 17} ${x},${y + 8} ${x - 13},${y + 17} ${x - 9},${y + 2} ${x - 20},${y - 6} ${x - 6},${y - 6}`,
      fill: "#facc15",
      stroke: "#a16207",
      opacity: "0.6"
    });
    star.style.cursor = "pointer";
    stars.push(star);

    star.addEventListener("click", () => {
      if (validated) return;
      if (selected.has(i)) {
        // Désélectionner
        selected.delete(i);
        star.setAttribute("fill", "#facc15");
        star.setAttribute("opacity", "0.6");
        playSound("chimeSound");
      } else {
        // Sélectionner
        selected.add(i);
        star.setAttribute("fill", "#34d399");
        star.setAttribute("opacity", "1");
        playSound("chimeSound");
      }
      // counter removed — selection tracked internally
    });

    content.appendChild(star);
  });

  // Bouton Valider
  const valBtn = makeSVG("rect", {
    x: "350", y: "380", rx: "14", width: "200", height: "50",
    fill: "#3b82f6", stroke: "#1d4ed8", "stroke-width": "2"
  });
  valBtn.style.cursor = "pointer";

  // Animation SMIL : flash au clic
  const valFlash = makeSVG("animate", {
    attributeName: "fill",
    values: "#3b82f6;#60a5fa;#3b82f6",
    dur: "0.3s",
    begin: "click",
    fill: "remove"
  });
  valBtn.appendChild(valFlash);

  const valLbl = makeText(390, 413, "✔ Valider", 24, "700", "#ffffff");
  valLbl.style.cursor = "pointer";

  const handleValidate = () => {
    if (validated) return;
    if (selected.size === 3) {
      validated = true;
      showToast("Correct ✅ Il y a bien 3 étoiles !");
      playSound("okSound");
      feedback.textContent = "Bravo ! 3/3 étoiles trouvées";
      feedback.setAttribute("fill", "#065f46");
      valBtn.setAttribute("fill", "#86efac");
      valBtn.setAttribute("stroke", "#065f46");
      valLbl.setAttribute("fill", "#065f46");
      valLbl.textContent = "✔ Correct !";
      valBtn.style.cursor = "default";
      valLbl.style.cursor = "default";
      stars.forEach(s => { s.style.cursor = "default"; });
      unlockNext();
    } else {
      showToast(`Incorrect — tu as sélectionné ${selected.size} étoile${selected.size > 1 ? 's' : ''}. Essaie encore !`);
      playSound("badSound");
      // Animation SMIL : secouer le bouton pour feedback visuel
      const shake = makeSVG("animateTransform", {
        attributeName: "transform",
        type: "translate",
        values: "0,0;-6,0;6,0;-4,0;4,0;0,0",
        dur: "0.4s",
        begin: "indefinite",
        fill: "remove"
      });
      valBtn.appendChild(shake);
      shake.beginElement();
    }
  };

  valBtn.addEventListener("click", handleValidate);
  valLbl.addEventListener("click", handleValidate);

  content.appendChild(valBtn);
  content.appendChild(valLbl);
}

// ============================================================
// Scène 2 — Quiz rapide avec orbite animée
// ============================================================
function renderScene2() {
  content.appendChild(makeText(40, 70, "Scène 3: Quiz rapide 🧠", 34));
  content.appendChild(makeText(40, 105, "Question: Quelle planète est la plus proche du Soleil ?", 22, "600"));

  quizAnswered = false;
  let attempts = 0;
  const maxAttempts = 3;

  // Indicateur de tentatives restantes
  const attemptsText = makeText(40, 145, `Tentatives restantes: ${maxAttempts}`, 16, "600", "#6b7280");
  content.appendChild(attemptsText);

  const answers = [
    { text: "A) Vénus", ok: false, x: 70, y: 190 },
    { text: "B) Mercure", ok: true, x: 70, y: 260 },
    { text: "C) Mars", ok: false, x: 70, y: 330 }
  ];

  // Stocker les boutons pour pouvoir les réinitialiser
  const buttons = [];

  answers.forEach((a) => {
    const btn = makeSVG("rect", {
      x: a.x, y: a.y, rx: "12", width: "260", height: "50", fill: "#e5e7eb"
    });
    btn.style.cursor = "pointer";

    // Animation déclarative : retour visuel (flash bleu) au clic sur le bouton
    const clickFeedback = makeSVG("animate", {
      attributeName: "fill",
      values: "#e5e7eb;#bfdbfe;#e5e7eb",
      dur: "0.4s",
      begin: "click",
      fill: "remove"
    });
    btn.appendChild(clickFeedback);

    const lbl = makeText(a.x + 18, a.y + 32, a.text, 22, "700", "#111827");
    lbl.style.cursor = "pointer";

    buttons.push({ btn, lbl, ok: a.ok });

    // Logique du quiz avec possibilité de réessayer
    const handle = () => {
      if (quizAnswered) return;

      if (a.ok) {
        // --- Bonne réponse ---
        quizAnswered = true;
        btn.setAttribute("fill", "#86efac");
        showToast("Correct ✅ Mercure est la plus proche du Soleil !");
        playSound("okSound");
        attemptsText.textContent = "Bravo !";
        attemptsText.setAttribute("fill", "#065f46");
        // Désactiver les autres boutons visuellement
        buttons.forEach((b) => {
          b.btn.style.cursor = "default";
          b.lbl.style.cursor = "default";
        });
        unlockNext();
      } else {
        // --- Mauvaise réponse : permettre de réessayer ---
        attempts++;
        btn.setAttribute("fill", "#fca5a5");
        playSound("badSound");

        if (attempts >= maxAttempts) {
          // Plus de tentatives : révéler la bonne réponse
          quizAnswered = true;
          showToast("La bonne réponse était Mercure. Clique Suivant ▶");
          attemptsText.textContent = "Plus de tentatives !";
          attemptsText.setAttribute("fill", "#dc2626");
          // Mettre en vert la bonne réponse
          buttons.forEach((b) => {
            if (b.ok) b.btn.setAttribute("fill", "#86efac");
            b.btn.style.cursor = "default";
            b.lbl.style.cursor = "default";
          });
          unlockNext();
        } else {
          const remaining = maxAttempts - attempts;
          showToast(`Incorrect, essaie encore ! (${remaining} essai${remaining > 1 ? 's' : ''} restant${remaining > 1 ? 's' : ''})`);
          attemptsText.textContent = `Tentatives restantes: ${remaining}`;

          // Remettre le bouton en gris après 1s pour montrer qu'il est éliminé
          setTimeout(() => {
            btn.setAttribute("fill", "#d1d5db");
            btn.style.cursor = "default";
            lbl.style.cursor = "default";
          }, 800);
        }
      }
    };

    btn.addEventListener("click", handle);
    lbl.addEventListener("click", handle);

    content.appendChild(btn);
    content.appendChild(lbl);
  });

  // --- Orbite animée corrigée (mpath créé via DOM, pas innerHTML) ---
  const centerX = 700, centerY = 270;

  // Ellipse en pointillés pour visualiser l'orbite
  const orbit = makeSVG("ellipse", {
    cx: centerX, cy: centerY, rx: "130", ry: "80",
    fill: "none", stroke: "#93c5fd", "stroke-dasharray": "6 6"
  });
  content.appendChild(orbit);

  // Définir le chemin d'orbite dans un <defs> local pour animateMotion
  const defs = makeSVG("defs", {});
  const orbitPath = makeSVG("path", {
    id: "orbitPath",
    d: `M ${centerX - 130},${centerY} a 130,80 0 1,0 260,0 a 130,80 0 1,0 -260,0`,
    fill: "none"
  });
  defs.appendChild(orbitPath);
  content.appendChild(defs);

  // Planète en orbite avec animateMotion + mpath déclaratif via le DOM
  const planet = makeSVG("circle", {
    r: "16", fill: "#60a5fa"
  });

  const motion = makeSVG("animateMotion", {
    dur: "4s",
    repeatCount: "indefinite"
  });

  // Créer le <mpath> correctement via createElementNS et setAttribute (pas innerHTML)
  const mpath = makeSVG("mpath", {
    href: "#orbitPath"
  });
  motion.appendChild(mpath);

  planet.appendChild(motion);
  content.appendChild(planet);
  content.appendChild(makeText(620, 390, "Orbite animée", 16, "600", "#1d4ed8"));
}

// ============================================================
// Scène 3 — Fin de mission : médaille, confettis, bouton recommencer
// ============================================================
function renderScene3() {
  content.appendChild(makeText(40, 70, "Fin de mission 🎉", 40));
  content.appendChild(makeText(40, 120, "Tu as terminé le module interactif.", 24, "500"));
  content.appendChild(makeText(40, 165, "Compétences utilisées:", 22, "700"));

  const points = [
    "• Navigation entre scènes",
    "• Interaction utilisateur (clics)",
    "• Animations SVG",
    "• Logique de mini-jeu et quiz"
  ];

  points.forEach((p, i) => {
    content.appendChild(makeText(60, 210 + i * 40, p, 22, "500", "#1f2937"));
  });

  // --- Confettis décoratifs tombant depuis le haut de la scène ---
  const confettiColors = ["#fbbf24", "#ef4444", "#3b82f6", "#10b981", "#f97316", "#8b5cf6"];
  const confettiData = [
    { x: 80,  dur: "2.5s", delay: "0s",   color: 0 },
    { x: 170, dur: "3.2s", delay: "0.3s", color: 1 },
    { x: 260, dur: "2.8s", delay: "0.7s", color: 2 },
    { x: 350, dur: "3.5s", delay: "0.1s", color: 3 },
    { x: 440, dur: "2.2s", delay: "0.5s", color: 4 },
    { x: 530, dur: "3.0s", delay: "0.9s", color: 5 },
    { x: 620, dur: "2.6s", delay: "0.2s", color: 0 },
    { x: 710, dur: "3.3s", delay: "0.6s", color: 1 },
    { x: 800, dur: "2.9s", delay: "0.4s", color: 2 },
    { x: 860, dur: "3.1s", delay: "0.8s", color: 3 }
  ];

  confettiData.forEach((c) => {
    const confetti = makeSVG("circle", {
      cx: c.x, cy: "10", r: "5",
      fill: confettiColors[c.color]
    });

    // Chute déclarative du haut vers le bas
    const fall = makeSVG("animateTransform", {
      attributeName: "transform",
      type: "translate",
      from: "0 0",
      to: "0 500",
      dur: c.dur,
      repeatCount: "indefinite",
      begin: c.delay
    });
    confetti.appendChild(fall);

    // Clignotement d'opacité continu
    const opBlink = makeSVG("animate", {
      attributeName: "opacity",
      values: "1;0.3;1",
      dur: "1.5s",
      repeatCount: "indefinite"
    });
    confetti.appendChild(opBlink);

    content.appendChild(confetti);
  });

  // --- Médaille avec pulsation d'opacité + secousse au clic ---
  const medal = makeSVG("circle", {
    cx: "760", cy: "240", r: "68", fill: "#fbbf24"
  });
  medal.style.cursor = "pointer";

  // Pulsation d'opacité continue (conservée)
  const shine = makeSVG("animate", {
    attributeName: "opacity",
    values: "1;.65;1",
    dur: "1.2s",
    repeatCount: "indefinite"
  });
  medal.appendChild(shine);

  // Secousse de rotation déclenchée au clic sur la médaille
  const shake = makeSVG("animateTransform", {
    attributeName: "transform",
    type: "rotate",
    values: "0 760 240;-15 760 240;15 760 240;-10 760 240;10 760 240;0 760 240",
    dur: "0.5s",
    begin: "click"
  });
  medal.appendChild(shake);

  medal.addEventListener("click", () => {
    playSound("victorySound");
  });

  content.appendChild(medal);
  content.appendChild(makeText(718, 248, "🏅", 42, "700"));

  // Texte "Excellent!" avec animation d'apparition (scale-up depuis 0)
  const excellentGroup = makeSVG("g", {
    transform: "translate(685, 335) scale(0)"
  });
  const excellentText = makeText(0, 0, "Excellent!", 24, "700", "#92400e");
  excellentGroup.appendChild(excellentText);
  content.appendChild(excellentGroup);

  // Après 0.7s : jouer le son de victoire + afficher "Excellent!" avec un scale-up
  setTimeout(() => {
    playSound("victorySound");
    // Animation scale-up déclarative sur le texte "Excellent!"
    excellentGroup.setAttribute("transform", "translate(685, 335) scale(1)");

    // Secousse de la médaille synchronisée avec le son
    const celebShake = makeSVG("animateTransform", {
      attributeName: "transform",
      type: "rotate",
      values: "0 760 240;-12 760 240;12 760 240;-8 760 240;8 760 240;0 760 240",
      dur: "0.6s",
      begin: "indefinite"
    });
    medal.appendChild(celebShake);
    celebShake.beginElement();
  }, 700);

  // --- Bouton "Recommencer" pour revenir à la scène 0 ---
  const btnGroup = makeSVG("g", {});
  btnGroup.style.cursor = "pointer";

  const btnRect = makeSVG("rect", {
    x: "350", y: "430", rx: "12", width: "200", height: "45",
    fill: "#3b82f6"
  });

  // Retour visuel déclaratif au clic sur le bouton
  const btnFeedback = makeSVG("animate", {
    attributeName: "fill",
    values: "#3b82f6;#2563eb;#3b82f6",
    dur: "0.3s",
    begin: "click"
  });
  btnRect.appendChild(btnFeedback);

  const btnLabel = makeText(385, 460, "Recommencer ↺", 20, "700", "#ffffff");

  btnGroup.append(btnRect, btnLabel);

  // Clic JS uniquement pour la navigation vers la scène 0
  btnGroup.addEventListener("click", () => {
    scene = 0;
    render();
  });

  content.appendChild(btnGroup);
}

// Restaurer les couleurs de jour (utilisé quand on quitte la scène 0)
function resetDayColors() {
  const skyTop = document.getElementById("skyTop");
  const skyBottom = document.getElementById("skyBottom");
  const grassTop = document.getElementById("grassTop");
  const grassBottom = document.getElementById("grassBottom");
  if (skyTop) skyTop.setAttribute("stop-color", "#c7e9ff");
  if (skyBottom) skyBottom.setAttribute("stop-color", "#f0fbff");
  if (grassTop) grassTop.setAttribute("stop-color", "#9ae6b4");
  if (grassBottom) grassBottom.setAttribute("stop-color", "#48bb78");
}

// ============================================================
// Rendu principal et navigation entre scènes
// ============================================================
function unlockNext() {
  nextBtn.disabled = false;
  nextBtn.style.opacity = "1";
  nextBtn.style.cursor = "pointer";
}

function lockNext() {
  nextBtn.disabled = true;
  nextBtn.style.opacity = "0.4";
  nextBtn.style.cursor = "not-allowed";
}

function render() {
  clearContent();
  setSceneLabel();
  prevBtn.disabled = scene === 0;

  // Scène 4 (dernière): pas de suivant ; Scènes 0-2: verrouillé jusqu'à complétion
  if (scene === totalScenes - 1) {
    lockNext();
  } else if (scene <= 2) {
    lockNext();
  } else {
    unlockNext();
  }

  // Restaurer le mode jour pour les scènes 1-3
  if (scene !== 0) resetDayColors();

  if (scene === 0) renderScene0();
  if (scene === 1) renderScene1();
  if (scene === 2) renderScene2();
  if (scene === 3) renderScene3();
}

// Boutons de navigation
prevBtn.addEventListener("click", () => {
  if (scene > 0) scene--;
  render();
});

nextBtn.addEventListener("click", () => {
  if (scene < totalScenes - 1) scene++;
  render();
});

// Premier rendu au chargement
render();
