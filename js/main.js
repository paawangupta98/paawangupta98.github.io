// ── Particles ──────────────────────────────────────────────
function initParticles(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let particles = [];
  const COUNT = 70;

  function resize() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }

  function Particle() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.vx = (Math.random() - 0.5) * 0.5;
    this.vy = (Math.random() - 0.5) * 0.5;
    this.r = Math.random() * 1.5 + 0.5;
    this.alpha = Math.random() * 0.5 + 0.1;
  }

  for (let i = 0; i < COUNT; i++) particles.push(new Particle());

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(226, 54, 54, ${p.alpha})`;
      ctx.fill();
    });

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(226, 54, 54, ${0.12 * (1 - dist / 120)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', resize);
  draw();
}

// ── Typed text ────────────────────────────────────────────
function initTyped(el, texts, speed = 80, pause = 2000) {
  if (!el) return;
  let ti = 0, ci = 0, deleting = false;
  function tick() {
    const text = texts[ti];
    if (!deleting) {
      el.textContent = text.slice(0, ++ci);
      if (ci === text.length) { deleting = true; setTimeout(tick, pause); return; }
    } else {
      el.textContent = text.slice(0, --ci);
      if (ci === 0) { deleting = false; ti = (ti + 1) % texts.length; }
    }
    setTimeout(tick, deleting ? speed / 2 : speed);
  }
  tick();
}

// ── Fade-in observer ─────────────────────────────────────
function initFadeIn() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.remove('hidden');
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.fade-in').forEach(el => {
    el.classList.add('hidden');
    obs.observe(el);
  });
}

// ── Hamburger menu ───────────────────────────────────────
function initNav() {
  const btn = document.querySelector('.hamburger');
  const menu = document.querySelector('.mobile-menu');
  if (!btn || !menu) return;
  btn.addEventListener('click', () => {
    menu.classList.toggle('open');
    const spans = btn.querySelectorAll('span');
    if (menu.classList.contains('open')) {
      spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
      spans[1].style.opacity = '0';
      spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
    } else {
      spans.forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
    }
  });
}

// ── Toast ─────────────────────────────────────────────────
function showToast(msg) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ── Copy to clipboard ─────────────────────────────────────
function copyText(text) {
  navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard!')).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    showToast('Copied!');
  });
}

// ── Unit Converter ────────────────────────────────────────
const UNITS = {
  Length: {
    m: 1, km: 0.001, cm: 100, mm: 1000, mi: 0.000621371,
    yd: 1.09361, ft: 3.28084, 'in': 39.3701,
  },
  Weight: {
    kg: 1, g: 1000, mg: 1e6, lb: 2.20462, oz: 35.274, t: 0.001,
  },
  Temperature: { C: 'C', F: 'F', K: 'K' },
  Area: {
    'm²': 1, 'km²': 1e-6, 'cm²': 1e4, 'ft²': 10.7639, 'in²': 1550, acre: 0.000247105, ha: 1e-4,
  },
  Volume: {
    L: 1, mL: 1000, 'm³': 0.001, gal: 0.264172, qt: 1.05669, pt: 2.11338, cup: 4.22675, floz: 33.814,
  },
  Speed: {
    'm/s': 1, 'km/h': 3.6, mph: 2.23694, knot: 1.94384, 'ft/s': 3.28084,
  },
  Time: {
    s: 1, ms: 1000, min: 1/60, h: 1/3600, day: 1/86400, week: 1/604800,
  },
};

function convertUnits(cat, val, from, to) {
  if (cat === 'Temperature') {
    let c;
    if (from === 'C') c = val;
    else if (from === 'F') c = (val - 32) * 5/9;
    else c = val - 273.15;
    if (to === 'C') return c;
    if (to === 'F') return c * 9/5 + 32;
    return c + 273.15;
  }
  const u = UNITS[cat];
  return (val / u[from]) * u[to];
}

function initConverter() {
  const catTabs = document.querySelectorAll('.category-tab');
  const fromSel = document.getElementById('from-unit');
  const toSel = document.getElementById('to-unit');
  const fromInput = document.getElementById('from-val');
  const resultVal = document.getElementById('result-val');
  const resultUnit = document.getElementById('result-unit');
  if (!catTabs.length) return;

  let currentCat = 'Length';

  function populateUnits(cat) {
    const opts = Object.keys(UNITS[cat]);
    [fromSel, toSel].forEach((sel, i) => {
      sel.innerHTML = opts.map(u => `<option value="${u}">${u}</option>`).join('');
      if (i === 1 && opts.length > 1) sel.selectedIndex = 1;
    });
  }

  function calculate() {
    const val = parseFloat(fromInput.value);
    if (isNaN(val)) { resultVal.textContent = '—'; return; }
    const result = convertUnits(currentCat, val, fromSel.value, toSel.value);
    const formatted = Math.abs(result) >= 1e6 || (Math.abs(result) < 0.0001 && result !== 0)
      ? result.toExponential(4) : parseFloat(result.toFixed(6)).toString();
    resultVal.textContent = formatted;
    resultUnit.textContent = `${fromInput.value} ${fromSel.value} = ${formatted} ${toSel.value}`;
  }

  catTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      catTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentCat = tab.dataset.cat;
      populateUnits(currentCat);
      calculate();
    });
  });

  document.getElementById('swap-units')?.addEventListener('click', () => {
    const tmp = fromSel.value; fromSel.value = toSel.value; toSel.value = tmp; calculate();
  });

  fromInput?.addEventListener('input', calculate);
  fromSel?.addEventListener('change', calculate);
  toSel?.addEventListener('change', calculate);

  populateUnits(currentCat);
  calculate();
}

// ── Quick Notes ───────────────────────────────────────────
const NOTE_KEYS = ['note-1', 'note-2', 'note-3'];

function initNotes() {
  const textarea = document.getElementById('notes-area');
  const charCount = document.getElementById('char-count');
  const noteTabs = document.querySelectorAll('.note-tab');
  if (!textarea) return;

  let activeKey = NOTE_KEYS[0];

  function load(key) {
    textarea.value = localStorage.getItem(key) || '';
    updateCount();
  }

  function save() {
    localStorage.setItem(activeKey, textarea.value);
    updateCount();
  }

  function updateCount() {
    if (charCount) charCount.textContent = `${textarea.value.length} chars`;
  }

  noteTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      save();
      noteTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeKey = NOTE_KEYS[parseInt(tab.dataset.note) - 1];
      load(activeKey);
    });
  });

  textarea.addEventListener('input', save);

  document.getElementById('copy-notes')?.addEventListener('click', () => {
    copyText(textarea.value || '');
  });

  document.getElementById('clear-notes')?.addEventListener('click', () => {
    if (confirm('Clear this note?')) { textarea.value = ''; save(); }
  });

  document.getElementById('download-notes')?.addEventListener('click', () => {
    const blob = new Blob([textarea.value], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${activeKey}.txt`;
    a.click();
  });

  load(activeKey);
}

// ── YT Downloader ────────────────────────────────────────
function initYtDownloader() {
  const urlInput  = document.getElementById('yt-url');
  const qualSel   = document.getElementById('yt-quality');
  const fmtSel    = document.getElementById('yt-format');
  const cmdText   = document.getElementById('yt-cmd-text');
  const copyBtn   = document.getElementById('copy-cmd');
  const cobaltBtn = document.getElementById('yt-cobalt-btn');
  if (!urlInput) return;

  function buildCmd() {
    const url     = urlInput.value.trim() || 'YOUR_URL_HERE';
    const quality = qualSel?.value || 'best';
    const fmt     = fmtSel?.value  || 'mp4';
    let cmd;
    if (quality === 'audio') {
      cmd = `yt-dlp -x --audio-format mp3 "${url}"`;
    } else if (quality === 'best') {
      cmd = `yt-dlp -f "bestvideo+bestaudio" --merge-output-format ${fmt} "${url}"`;
    } else {
      cmd = `yt-dlp -f "bestvideo[height<=${quality}]+bestaudio" --merge-output-format ${fmt} "${url}"`;
    }
    if (cmdText) cmdText.textContent = cmd;
  }

  urlInput.addEventListener('input', buildCmd);
  qualSel?.addEventListener('change', buildCmd);
  fmtSel?.addEventListener('change', buildCmd);
  copyBtn?.addEventListener('click', () => copyText(cmdText?.textContent || ''));

  cobaltBtn?.addEventListener('click', () => {
    const url = urlInput.value.trim();
    if (!url) { showToast('Paste a URL first'); return; }
    copyText(url);
    showToast('URL copied! Paste it on cobalt.tools');
    setTimeout(() => window.open('https://cobalt.tools', '_blank', 'noopener'), 600);
  });

  buildCmd();
}

// ── App selector ──────────────────────────────────────────
function initAppSelector() {
  const cards = document.querySelectorAll('.app-card');
  const panels = document.querySelectorAll('.app-panel');
  if (!cards.length) return;

  function showApp(appId) {
    cards.forEach(c => c.classList.remove('selected'));
    panels.forEach(p => { p.style.display = 'none'; });

    const targetCard = document.querySelector(`.app-card[data-app="${appId}"]`);
    const targetPanel = document.getElementById(`app-${appId}`);
    if (targetCard) targetCard.classList.add('selected');
    if (targetPanel) targetPanel.style.display = 'block';
  }

  cards.forEach(card => {
    card.addEventListener('click', () => showApp(card.dataset.app));
  });

  showApp(cards[0].dataset.app);
}

// ── Boot ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initFadeIn();
  initParticles('particles-canvas');
  initTyped(document.getElementById('typed-text'), [
    'Software Engineer',
    'Backend Developer',
    'Problem Solver',
    'Open Source Enthusiast',
    'Builder',
  ]);
  initAppSelector();
  initConverter();
  initNotes();
  initYtDownloader();
});
