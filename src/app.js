/* ============================================================
   TABUADA POKÉMON v4
   ============================================================ */

// ── Storage ──────────────────────────────────────────────────

const V3_KEY = 'tabuadaPokemon_v3';
const V4_KEY = 'tabuadaPokemon_v4';

function defaultState() {
  return {
    bestStreak:    0,
    bestCaught:    0,
    pokedex:       {},
    errorMap:      {},
    successMap:    {},
    badges:        {},
    pokemonCache:  {},
    settings:      { muted: false },
    sessions:      [],
    totalQuestions: 0,
    totalCorrect:   0,
    totalTimeMs:    0,
  };
}

function migrateV3(old) {
  const s         = defaultState();
  s.pokedex       = old.pokedex       || {};
  s.errorMap      = old.errorMap      || {};
  s.successMap    = old.successMap    || {};
  s.badges        = old.badges        || {};
  s.pokemonCache  = old.pokemonCache  || {};
  s.settings      = old.settings      || { muted: false };
  s.sessions      = old.sessions      || [];
  s.totalQuestions = old.totalQuestions || 0;
  s.totalCorrect   = old.totalCorrect   || 0;
  s.totalTimeMs    = old.totalTimeMs    || 0;
  s.bestCaught     = old.bestScore      || 0;
  return s;
}

function loadState() {
  try {
    const v4 = localStorage.getItem(V4_KEY);
    if (v4) return Object.assign(defaultState(), JSON.parse(v4));
    const v3 = localStorage.getItem(V3_KEY);
    if (v3) {
      const m = migrateV3(JSON.parse(v3));
      localStorage.setItem(V4_KEY, JSON.stringify(m));
      return m;
    }
  } catch(_) { /* */ }
  return defaultState();
}

const state = loadState();

function save() {
  try { localStorage.setItem(V4_KEY, JSON.stringify(state)); } catch(_) { /* */ }
}

// ── Audio ─────────────────────────────────────────────────────

let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch(_) { return null; }
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function tone(freq, ms, type, vol) {
  if (state.settings.muted) return;
  const c = getCtx();
  if (!c) return;
  const osc  = c.createOscillator();
  const gain = c.createGain();
  osc.type = type || 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol || 0.15, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + ms / 1000);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + ms / 1000);
}

function soundCorrect() {
  tone(523, 100, 'square', 0.12);
  setTimeout(function() { tone(659, 100, 'square', 0.12); }, 80);
  setTimeout(function() { tone(784, 180, 'square', 0.12); }, 160);
}
function soundWrong() {
  tone(330, 200, 'sawtooth', 0.10);
  setTimeout(function() { tone(220, 250, 'sawtooth', 0.10); }, 150);
}
function soundShiny() {
  [880, 1175, 1568, 2093].forEach(function(f, i) {
    setTimeout(function() { tone(f, 120, 'triangle', 0.10); }, i * 70);
  });
}
function soundCombo() {
  tone(659, 80, 'square', 0.12);
  setTimeout(function() { tone(880, 80, 'square', 0.12); }, 60);
}
function soundMilestone() {
  [523, 659, 784, 1047, 784, 1047].forEach(function(f, i) {
    setTimeout(function() { tone(f, 150, 'square', 0.12); }, i * 100);
  });
}
function soundGameOver() {
  [392, 370, 349, 330].forEach(function(f, i) {
    setTimeout(function() { tone(f, 250, 'sawtooth', 0.12); }, i * 200);
  });
}

let cryAudio = null;
function playCry(id) {
  if (state.settings.muted) return;
  if (cryAudio) { cryAudio.pause(); cryAudio = null; }
  cryAudio = new Audio('https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/legacy/' + id + '.ogg');
  cryAudio.volume = 0.4;
  cryAudio.play().catch(function() {});
}
function stopCry() {
  if (cryAudio) { cryAudio.pause(); cryAudio = null; }
}

// ── Pokémon data ───────────────────────────────────────────────

const POKEDEX = [
  'Bulbasaur','Ivysaur','Venusaur','Charmander','Charmeleon','Charizard',
  'Squirtle','Wartortle','Blastoise','Caterpie','Metapod','Butterfree',
  'Weedle','Kakuna','Beedrill','Pidgey','Pidgeotto','Pidgeot',
  'Rattata','Raticate','Spearow','Fearow','Ekans','Arbok',
  'Pikachu','Raichu','Sandshrew','Sandslash','Nidoran♀','Nidorina',
  'Nidoqueen','Nidoran♂','Nidorino','Nidoking','Clefairy','Clefable',
  'Vulpix','Ninetales','Jigglypuff','Wigglytuff','Zubat','Golbat',
  'Oddish','Gloom','Vileplume','Paras','Parasect','Venonat',
  'Venomoth','Diglett','Dugtrio','Meowth','Persian','Psyduck',
  'Golduck','Mankey','Primeape','Growlithe','Arcanine','Poliwag',
  'Poliwhirl','Poliwrath','Abra','Kadabra','Alakazam','Machop',
  'Machoke','Machamp','Bellsprout','Weepinbell','Victreebel','Tentacool',
  'Tentacruel','Geodude','Graveler','Golem','Ponyta','Rapidash',
  'Slowpoke','Slowbro','Magnemite','Magneton',"Farfetch'd",'Doduo',
  'Dodrio','Seel','Dewgong','Grimer','Muk','Shellder',
  'Cloyster','Gastly','Haunter','Gengar','Onix','Drowzee',
  'Hypno','Krabby','Kingler','Voltorb','Electrode','Exeggcute',
  'Exeggutor','Cubone','Marowak','Hitmonlee','Hitmonchan','Lickitung',
  'Koffing','Weezing','Rhyhorn','Rhydon','Chansey','Tangela',
  'Kangaskhan','Horsea','Seadra','Goldeen','Seaking','Staryu',
  'Starmie','Mr. Mime','Scyther','Jynx','Electabuzz','Magmar',
  'Pinsir','Tauros','Magikarp','Gyarados','Lapras','Ditto',
  'Eevee','Vaporeon','Jolteon','Flareon','Porygon','Omanyte',
  'Omastar','Kabuto','Kabutops','Aerodactyl','Snorlax','Articuno',
  'Zapdos','Moltres','Dratini','Dragonair','Dragonite','Mewtwo','Mew',
];

const TYPE_COLORS = {
  normal:'--type-normal', fire:'--type-fire', water:'--type-water',
  electric:'--type-electric', grass:'--type-grass', ice:'--type-ice',
  fighting:'--type-fighting', poison:'--type-poison', ground:'--type-ground',
  flying:'--type-flying', psychic:'--type-psychic', bug:'--type-bug',
  rock:'--type-rock', ghost:'--type-ghost', dragon:'--type-dragon',
  fairy:'--type-fairy', steel:'--type-steel', dark:'--type-dark',
};
const TYPE_NAMES_PT = {
  normal:'Normal', fire:'Fogo', water:'Água', electric:'Elétrico',
  grass:'Planta', ice:'Gelo', fighting:'Lutador', poison:'Veneno',
  ground:'Terra', flying:'Voador', psychic:'Psíquico', bug:'Inseto',
  rock:'Pedra', ghost:'Fantasma', dragon:'Dragão', fairy:'Fada',
  steel:'Aço', dark:'Sombrio',
};

function pad3(n) { return String(n).padStart(3, '0'); }
function getPokemonName(id) { return POKEDEX[id - 1] || ('Pokémon #' + pad3(id)); }
function spriteUrl(id, shiny) {
  var base = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
  return shiny ? base + '/shiny/' + id + '.png' : base + '/' + id + '.png';
}

function renderTypeBadges(container, types) {
  container.innerHTML = '';
  if (!types || !types.length) return;
  types.forEach(function(t) {
    var badge = document.createElement('span');
    badge.className = 'type-badge';
    badge.style.background = 'var(' + (TYPE_COLORS[t] || '--type-normal') + ')';
    badge.textContent = TYPE_NAMES_PT[t] || t;
    container.appendChild(badge);
  });
}

function fetchPokemonData(id) {
  if (state.pokemonCache[id]) return Promise.resolve(state.pokemonCache[id]);
  return Promise.all([
    fetch('https://pokeapi.co/api/v2/pokemon/' + id),
    fetch('https://pokeapi.co/api/v2/pokemon-species/' + id),
  ]).then(function(responses) {
    if (!responses[0].ok || !responses[1].ok) throw new Error();
    return Promise.all([responses[0].json(), responses[1].json()]);
  }).then(function(data) {
    var poke    = data[0];
    var species = data[1];
    var entries = species.flavor_text_entries || [];
    var entry   = entries.find(function(e) { return e.language.name === 'en'; });
    var desc    = entry ? entry.flavor_text.replace(/[\f\n\r]/g, ' ').replace(/\s+/g, ' ').trim() : '';
    var result  = {
      types:       poke.types.map(function(t) { return t.type.name; }),
      heightM:     poke.height / 10,
      weightKg:    poke.weight / 10,
      description: desc,
    };
    state.pokemonCache[id] = result;
    save();
    return result;
  }).catch(function() { return null; });
}

function pickPokemonId(isShiny) {
  var pokedex = state.pokedex;
  var i, avail = [];
  if (isShiny) {
    var shinyCaught = {};
    Object.keys(pokedex).forEach(function(k) {
      if (pokedex[k].shiny) shinyCaught[k] = true;
    });
    for (i = 1; i <= 151; i++) if (!shinyCaught[i]) avail.push(i);
    return avail.length ? avail[Math.floor(Math.random() * avail.length)] : Math.ceil(Math.random() * 151);
  }
  for (i = 1; i <= 151; i++) if (!pokedex[i]) avail.push(i);
  return avail.length ? avail[Math.floor(Math.random() * avail.length)] : Math.ceil(Math.random() * 151);
}

// ── Badges ────────────────────────────────────────────────────

var BADGES = [
  { id: 'first',     icon: '🌱', name: 'Primeiro Pokémon',     desc: '1º Pokémon capturado' },
  { id: 'ten',       icon: '🎒', name: 'Treinadora Iniciante', desc: '10 Pokémons capturados' },
  { id: 'thirty',    icon: '⭐', name: 'Boa Treinadora',        desc: '30 Pokémons capturados' },
  { id: 'fifty',     icon: '🏆', name: 'Professora Oak Jr.',   desc: '50 Pokémons capturados' },
  { id: 'hundred',   icon: '👑', name: 'Veterana',              desc: '100 Pokémons capturados' },
  { id: 'allcaught', icon: '🌟', name: 'Pokédex Completa',     desc: 'Todos os 151 capturados!' },
  { id: 'shiny1',    icon: '✨', name: 'Primeiro Shiny',        desc: '1º Pokémon Shiny capturado' },
  { id: 'streak20',  icon: '🔥', name: 'Combo Master',          desc: 'Combo de 20+ em uma sessão' },
  { id: 'gymleader', icon: '🏋️', name: 'Gym Leader',            desc: 'Jogou no modo Gym Leader' },
];

function checkAndAwardBadges(sess) {
  var captured = Object.keys(state.pokedex).length;
  var hasShiny  = Object.values(state.pokedex).some(function(p) { return p.shiny; });
  var maxStreak = sess ? (sess.maxStreak || 0) : 0;
  var isHard    = sess && sess.mode === 'hardmode';

  var checks = [
    ['first',     captured >= 1],
    ['ten',       captured >= 10],
    ['thirty',    captured >= 30],
    ['fifty',     captured >= 50],
    ['hundred',   captured >= 100],
    ['allcaught', captured >= 151],
    ['shiny1',    hasShiny],
    ['streak20',  maxStreak >= 20],
    ['gymleader', isHard],
  ];

  var newBadges = [];
  checks.forEach(function(pair) {
    var id = pair[0], cond = pair[1];
    if (cond && !state.badges[id]) {
      state.badges[id] = true;
      var def = BADGES.find(function(b) { return b.id === id; });
      if (def) newBadges.push(def);
    }
  });
  if (newBadges.length) {
    save();
    newBadges.forEach(function(b, i) {
      setTimeout(function() { showToast('🏅 Nova medalha: ' + b.name + '!', 2500); }, i * 900);
    });
  }
  if (captured >= 151 && !state._pokedexCelebrated) {
    state._pokedexCelebrated = true;
    setTimeout(function() { showToast('🌟 POKÉDEX COMPLETA! Você é lendária, Sofia! 🌟', 4000, 'shiny-toast'); }, 1400);
  }
}

// ── UI helpers ────────────────────────────────────────────────

function $(id) { return document.getElementById(id); }

var toastTimer = null;
function showToast(text, duration, extraClass) {
  var t = $('toast');
  t.textContent = text;
  t.className = 'toast show' + (extraClass ? ' ' + extraClass : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function() { t.className = 'toast'; }, duration || 2000);
}

function renderLives(remaining) {
  var c = $('hudLives');
  if (!c) return;
  c.innerHTML = '';
  for (var i = 0; i < 10; i++) {
    var s = document.createElement('span');
    s.textContent = i < remaining ? '❤️' : '🖤';
    c.appendChild(s);
  }
}

function renderShinyMeter(streak) {
  var fill  = $('shinyMeterFill');
  var count = $('shinyMeterCount');
  if (!fill || !count) return;
  var progress = streak % 10;
  fill.style.width = (progress / 10 * 100) + '%';
  count.textContent = progress + '/10';
}

function flashShinyMeter() {
  var fill  = $('shinyMeterFill');
  var count = $('shinyMeterCount');
  if (!fill || !count) return;
  fill.style.width = '100%';
  fill.classList.add('full');
  count.textContent = '10/10 ✨';
  setTimeout(function() {
    fill.classList.remove('full');
    fill.style.width = '0%';
    count.textContent = '0/10';
  }, 700);
}

function playPokeballAnim() {
  var el = $('pokeballAnim');
  el.classList.remove('animating');
  void el.offsetWidth;
  el.classList.add('animating');
  setTimeout(function() { el.classList.remove('animating'); }, 1000);
}

function renderResultChart(containerId, errorMap, totalMap) {
  var container = $(containerId);
  container.innerHTML = '';
  var hasData = false;
  for (var t = 1; t <= 9; t++) {
    var errors = errorMap[t] || 0;
    var total  = totalMap[t] || 0;
    if (!total) continue;
    hasData = true;
    var pct = (errors / total) * 100;
    var row = document.createElement('div');
    row.className = 'result-chart-row';
    var label = document.createElement('div');
    label.className = 'result-chart-label';
    label.textContent = '× ' + t;
    var bar  = document.createElement('div');
    bar.className = 'result-chart-bar';
    var fill = document.createElement('div');
    fill.className = 'result-chart-fill' + (errors === 0 ? ' no-errors' : '');
    fill.style.width = (errors === 0 ? 8 : pct) + '%';
    bar.appendChild(fill);
    var cnt = document.createElement('div');
    cnt.className = 'result-chart-count' + (errors === 0 ? ' zero' : '');
    cnt.textContent = errors + '/' + total;
    row.appendChild(label);
    row.appendChild(bar);
    row.appendChild(cnt);
    container.appendChild(row);
  }
  if (!hasData) {
    container.innerHTML = '<div style="text-align:center;color:var(--muted);font-size:12px;">Sem dados.</div>';
  }
}

// ── Pokédex render ────────────────────────────────────────────

function renderPokedex(newPid) {
  var grid = $('pokedexGrid');
  grid.innerHTML = '';
  var count = 0;
  for (var i = 1; i <= 151; i++) {
    (function(id) {
      var slot = document.createElement('div');
      slot.className = 'pokedex-slot';
      slot.dataset.id = id;
      if (id === newPid) slot.classList.add('new-capture');

      var numEl = document.createElement('div');
      numEl.className = 'slot-num';
      numEl.textContent = '#' + pad3(id);

      var imgWrap = document.createElement('div');
      imgWrap.className = 'slot-img';

      var nameEl = document.createElement('div');
      nameEl.className = 'slot-name';

      var captured = state.pokedex[id];
      if (captured) {
        count++;
        slot.classList.add('captured');
        if (captured.shiny) slot.classList.add('shiny');
        var img = document.createElement('img');
        img.src = spriteUrl(id, captured.shiny);
        img.alt = getPokemonName(id);
        imgWrap.appendChild(img);
        nameEl.textContent = getPokemonName(id);
      } else {
        var q = document.createElement('div');
        q.className = 'slot-q';
        q.textContent = '?';
        imgWrap.appendChild(q);
        nameEl.textContent = '???';
      }

      slot.appendChild(numEl);
      slot.appendChild(imgWrap);
      slot.appendChild(nameEl);
      grid.appendChild(slot);
    })(i);
  }

  $('pokedexCount').textContent = count;
  $('bestStreak').textContent   = state.bestStreak || 0;
  $('bestCaught').textContent   = state.bestCaught  || 0;
}

function renderBadges() {
  var grid = $('badgesGrid');
  grid.innerHTML = '';
  BADGES.forEach(function(b) {
    var el = document.createElement('div');
    el.className = 'badge' + (state.badges[b.id] ? ' earned' : '');
    el.textContent = b.icon;
    var tip = document.createElement('div');
    tip.className = 'badge-tooltip';
    tip.textContent = b.name;
    el.appendChild(tip);
    grid.appendChild(el);
  });
}

// ── Pokédex drawer ────────────────────────────────────────────

function openDrawer() {
  if (window.innerWidth >= 768) return;
  $('pokedexDrawer').classList.add('open');
  $('drawerBackdrop').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeDrawer() {
  if (window.innerWidth >= 768) return;
  $('pokedexDrawer').classList.remove('open');
  $('drawerBackdrop').classList.remove('open');
  document.body.style.overflow = '';
}

// ── Pokémon detail modal ──────────────────────────────────────

function openPokemonModal(id) {
  if (!state.pokedex[id]) return;
  var captured = state.pokedex[id];
  $('pdNum').textContent    = '#' + pad3(id);
  $('pdName').textContent   = getPokemonName(id);
  $('pdSprite').src         = spriteUrl(id, captured.shiny);
  $('pdDesc').innerHTML     = '<span class="loading-spinner"></span> Carregando...';
  $('pdHeight').textContent = '—';
  $('pdWeight').textContent = '—';
  $('pdTypes').innerHTML    = '';
  $('pdCryBtn').onclick     = function() { playCry(id); };
  $('pokemonDetailOverlay').style.display = 'flex';

  fetchPokemonData(id).then(function(data) {
    if (!data) {
      $('pdDesc').textContent = 'Sem conexão. Informações não carregadas.';
      return;
    }
    renderTypeBadges($('pdTypes'), data.types);
    $('pdHeight').textContent = data.heightM.toFixed(1) + ' m';
    $('pdWeight').textContent = data.weightKg.toFixed(1) + ' kg';
    $('pdDesc').textContent   = data.description || 'Sem descrição disponível.';
  });
}

function closePokemonModal() {
  $('pokemonDetailOverlay').style.display = 'none';
  stopCry();
}

// ── Game constants ────────────────────────────────────────────

var MAX_ERRORS     = 10;
var HARD_TIMER     = 10;
var SHINY_BASE     = 0.05;
var SHINY_HARD     = 0.10;
var SHINY_BOOST    = 0.02;
var SHINY_MAX      = 0.40;
var DIV_PCT_NORMAL = 0.50;
var DIV_PCT_HARD   = 0.60;

// ── Session ───────────────────────────────────────────────────

var session = null;

function newSession(mode) {
  return {
    mode: mode,
    correct: 0, errors: 0, streak: 0, maxStreak: 0, caught: 0,
    answeredCount: 0, forcedShinyNext: false, awaiting: false,
    currentPokemonId: null, currentIsShiny: false, currentQuestion: null,
    questionStartTime: 0, totalAnswerTimeMs: 0,
    errorTables: {}, successTables: {},
    timerInterval: null, timerSeconds: HARD_TIMER,
  };
}

function shinyChance() {
  var base  = SHINY_BASE + (session.mode === 'hardmode' ? SHINY_HARD : 0);
  var boost = Math.min(session.streak, 5) * SHINY_BOOST;
  return Math.min(SHINY_MAX, base + boost);
}

function weightedTable() {
  var pool = [];
  for (var t = 1; t <= 9; t++) {
    var w = 1 + Math.min(state.errorMap[t] || 0, 5);
    for (var i = 0; i < w; i++) pool.push(t);
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

function nextQuestion() {
  var divPct = session.mode === 'hardmode' ? DIV_PCT_HARD : DIV_PCT_NORMAL;
  var isDiv  = Math.random() < divPct;
  var a = weightedTable();
  var b = Math.floor(Math.random() * 9) + 1;
  return isDiv
    ? { type: 'div', a: a * b, b: a,  answer: b,     table: a }
    : { type: 'mul', a: a,     b: b,  answer: a * b, table: a };
}

// ── Render question ───────────────────────────────────────────

function renderQuestion() {
  if (!session) return;
  var q = nextQuestion();
  session.currentQuestion = q;

  var isShiny = session.forcedShinyNext || (Math.random() < shinyChance());
  session.forcedShinyNext = false;
  var pid = pickPokemonId(isShiny);
  session.currentPokemonId = pid;
  session.currentIsShiny   = isShiny;

  $('question').textContent       = q.a + ' ' + (q.type === 'mul' ? '×' : '÷') + ' ' + q.b + ' = ?';
  $('pokemonSprite').src          = spriteUrl(pid, isShiny);
  $('pokemonSprite').alt          = getPokemonName(pid);
  $('pokemonNameText').textContent = getPokemonName(pid);
  $('pokemonNum').textContent     = '#' + pad3(pid);
  $('shinyTag').style.display     = isShiny ? 'inline-block' : 'none';

  var typesEl = $('pokemonTypes');
  typesEl.innerHTML = '';
  fetchPokemonData(pid).then(function(data) {
    if (session && session.currentPokemonId === pid) {
      renderTypeBadges(typesEl, data ? data.types : []);
    }
  });

  renderLives(MAX_ERRORS - session.errors);
  renderShinyMeter(session.streak);
  $('hudStreak').textContent = '🔥 ' + session.streak;
  $('hudStreak').classList.toggle('hot', session.streak >= 5);

  var fb = $('feedback');
  fb.className = 'feedback empty';
  fb.innerHTML = '&nbsp;';

  var input = $('answer');
  input.value    = '';
  input.disabled = false;
  $('submitBtn').disabled = false;
  setTimeout(function() {
    input.focus();
    $('playArea').scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, 100);

  session.questionStartTime = performance.now();
  if (session.mode === 'hardmode') startTimer();
}

// ── Timer ─────────────────────────────────────────────────────

function startTimer() {
  clearTimer();
  session.timerSeconds = HARD_TIMER;
  updateTimer();
  $('timerBar').style.display = 'block';
  session.timerInterval = setInterval(function() {
    session.timerSeconds--;
    updateTimer();
    if (session.timerSeconds <= 0) { clearTimer(); onTimeout(); }
  }, 1000);
}

function clearTimer() {
  if (session && session.timerInterval) {
    clearInterval(session.timerInterval);
    session.timerInterval = null;
  }
}

function updateTimer() {
  var pct  = (session.timerSeconds / HARD_TIMER) * 100;
  var fill = $('timerFill');
  fill.style.width = pct + '%';
  fill.classList.toggle('urgent', session.timerSeconds <= 3);
  $('timerText').textContent = session.timerSeconds;
}

function onTimeout() {
  if (!session || session.awaiting) return;
  setAwaiting();
  handleWrong(true);
}

// ── Answer checking ───────────────────────────────────────────

function setAwaiting() {
  session.awaiting        = true;
  $('answer').disabled    = true;
  $('submitBtn').disabled = true;
}

function checkAnswer() {
  if (!session || session.awaiting) return;
  clearTimer();

  var val = parseInt($('answer').value, 10);
  if (isNaN(val)) { $('answer').focus(); return; }

  var q       = session.currentQuestion;
  var elapsed = performance.now() - session.questionStartTime;
  session.totalAnswerTimeMs += elapsed;
  session.answeredCount++;
  state.totalQuestions = (state.totalQuestions || 0) + 1;
  state.totalTimeMs    = (state.totalTimeMs    || 0) + elapsed;

  setAwaiting();
  if (val === q.answer) handleCorrect(q);
  else                  handleWrong(false);
}

function handleCorrect(q) {
  session.correct++;
  session.streak++;
  session.maxStreak = Math.max(session.maxStreak, session.streak);

  state.totalCorrect             = (state.totalCorrect || 0) + 1;
  state.successMap[q.table]      = (state.successMap[q.table] || 0) + 1;
  session.successTables[q.table] = (session.successTables[q.table] || 0) + 1;

  var pid     = session.currentPokemonId;
  var isShiny = session.currentIsShiny;
  var existing = state.pokedex[pid];
  var isNew    = !existing || (isShiny && !existing.shiny);
  if (isNew) { state.pokedex[pid] = { id: pid, shiny: isShiny }; session.caught++; }

  if (isShiny) soundShiny(); else soundCorrect();

  if (session.streak > 0 && session.streak % 10 === 0) {
    session.forcedShinyNext = true;
    soundMilestone();
    flashShinyMeter();
    showToast('✨ COMBO x' + session.streak + '! Próximo Pokémon é SHINY!', 3000, 'shiny-toast');
  } else if (session.streak > 0 && session.streak % 5 === 0) {
    soundCombo();
    showToast('🔥 Combo x' + session.streak + '!', 1500);
  }

  playPokeballAnim();

  var fb = $('feedback');
  fb.className = 'feedback correct';
  fb.innerHTML = '✅ Você capturou ' + getPokemonName(pid) + (isShiny ? ' ✨ SHINY ✨' : '') + '!';

  renderPokedex(isNew ? pid : null);
  checkAndAwardBadges(session);
  renderBadges();
  save();

  setTimeout(function() { advanceQuestion(); }, isShiny ? 1700 : 1100);
}

function handleWrong(isTimeout) {
  var q = session.currentQuestion;
  session.errors++;
  session.streak          = 0;
  session.forcedShinyNext = false;

  state.errorMap[q.table]        = (state.errorMap[q.table] || 0) + 1;
  session.errorTables[q.table]   = (session.errorTables[q.table] || 0) + 1;

  soundWrong();
  renderLives(MAX_ERRORS - session.errors);
  renderShinyMeter(0);
  $('hudStreak').textContent = '🔥 0';
  $('hudStreak').classList.remove('hot');

  var fb = $('feedback');
  fb.className = 'feedback wrong';
  fb.innerHTML = isTimeout
    ? '⏱️ Tempo esgotado! A resposta era <strong>' + q.answer + '</strong>. O Pokémon fugiu!'
    : '❌ Errado! A resposta era <strong>' + q.answer + '</strong>. O Pokémon fugiu!';

  save();
  setTimeout(function() {
    if (session && session.errors >= MAX_ERRORS) endGame();
    else advanceQuestion();
  }, 1500);
}

function advanceQuestion() {
  if (!session) return;
  session.awaiting = false;
  renderQuestion();
}

// ── End game ──────────────────────────────────────────────────

function endGame() {
  clearTimer();

  if (session.maxStreak > (state.bestStreak || 0)) state.bestStreak = session.maxStreak;
  if (session.caught    > (state.bestCaught  || 0)) state.bestCaught  = session.caught;

  checkAndAwardBadges(session);
  renderBadges();

  var record = {
    date: new Date().toISOString(),
    mode: session.mode,
    caught: session.caught,
    errors: session.errors,
    answered: session.answeredCount,
    avgTime: session.answeredCount > 0
      ? (session.totalAnswerTimeMs / session.answeredCount / 1000).toFixed(1)
      : null,
    maxStreak: session.maxStreak,
    outcome: 'gameover',
  };
  state.sessions = state.sessions || [];
  state.sessions.unshift(record);
  if (state.sessions.length > 50) state.sessions = state.sessions.slice(0, 50);

  save();

  var avgTime = record.avgTime ? record.avgTime + 's' : '—';
  $('goCaught').textContent = session.caught;
  $('goStreak').textContent = session.maxStreak;
  $('goTotal').textContent  = session.answeredCount;
  $('goTime').textContent   = avgTime;
  $('faintedSprite').src    = spriteUrl(session.currentPokemonId || 25, false);
  $('bestStreak').textContent = state.bestStreak || 0;
  $('bestCaught').textContent = state.bestCaught  || 0;

  var totalsPerTable = {};
  Object.keys(session.successTables).forEach(function(t) {
    totalsPerTable[t] = session.successTables[t];
  });
  Object.keys(session.errorTables).forEach(function(t) {
    totalsPerTable[t] = (totalsPerTable[t] || 0) + session.errorTables[t];
  });
  renderResultChart('goChart', session.errorTables, totalsPerTable);

  soundGameOver();
  session = null;
  $('gameOverOverlay').style.display = 'flex';
}

// ── Start / show start screen ─────────────────────────────────

function startSession(mode) {
  session = newSession(mode);
  $('gameOverOverlay').style.display = 'none';
  $('startOverlay').style.display    = 'none';
  $('playArea').style.display        = 'block';
  $('gameHud').style.display         = 'flex';
  $('shinyMeterWrap').style.display  = 'flex';
  $('homeBtn').style.display         = 'flex';
  $('timerBar').style.display        = mode === 'hardmode' ? 'block' : 'none';
  renderPokedex();
  renderBadges();
  renderQuestion();
}

function showStartScreen() {
  clearTimer();
  session = null;
  $('playArea').style.display        = 'none';
  $('gameHud').style.display         = 'none';
  $('shinyMeterWrap').style.display  = 'none';
  $('homeBtn').style.display         = 'none';
  $('gameOverOverlay').style.display = 'none';
  $('startOverlay').style.display    = 'flex';
}

// ── Teacher mode ──────────────────────────────────────────────

var TEACHER_PW = '2026SF';

function openTeacherPasswordModal() {
  $('teacherPwInput').value = '';
  $('teacherPwInput').classList.remove('error');
  $('teacherPwOverlay').style.display = 'flex';
  setTimeout(function() { $('teacherPwInput').focus(); }, 100);
}

function tryTeacherLogin() {
  if ($('teacherPwInput').value.trim() === TEACHER_PW) {
    $('teacherPwOverlay').style.display = 'none';
    openTeacherPanel();
  } else {
    $('teacherPwInput').classList.add('error');
  }
}

function openTeacherPanel() {
  document.querySelectorAll('.teacher-tab').forEach(function(t) {
    t.classList.toggle('active', t.dataset.tab === 'stats');
  });
  $('teacherStats').classList.remove('hidden');
  $('teacherData').classList.add('hidden');
  $('tmResetConfirm').classList.remove('visible');
  populateTeacherStats();
  $('teacherOverlay').style.display = 'flex';
}

function populateTeacherStats() {
  var sessions = state.sessions || [];
  $('tmSessions').textContent = sessions.length;
  $('tmTotal').textContent    = state.totalQuestions || 0;
  $('tmAccuracy').textContent = state.totalQuestions > 0
    ? Math.round((state.totalCorrect / state.totalQuestions) * 100) + '%' : '—';
  $('tmAvgTime').textContent = state.totalQuestions > 0
    ? (state.totalTimeMs / state.totalQuestions / 1000).toFixed(1) + 's' : '—';

  var chart = $('tmTablesChart');
  chart.innerHTML = '';
  var hasData = false;
  for (var t = 1; t <= 9; t++) {
    var errs  = state.errorMap[t]   || 0;
    var succ  = state.successMap[t] || 0;
    var total = errs + succ;
    if (!total) continue;
    hasData = true;
    var errPct = (errs / total) * 100;
    var row = document.createElement('div');
    row.className = 'result-chart-row';
    row.innerHTML =
      '<div class="result-chart-label">× ' + t + '</div>' +
      '<div class="result-chart-bar"><div class="result-chart-fill' +
        (errs === 0 ? ' no-errors' : '') + '" style="width:' + (errs === 0 ? 8 : errPct) + '%"></div></div>' +
      '<div class="result-chart-count' + (errs === 0 ? ' zero' : '') + '">' + errs + '/' + total + '</div>';
    chart.appendChild(row);
  }
  if (!hasData) {
    chart.innerHTML = '<div style="text-align:center;color:var(--muted);font-size:12px;padding:10px;">Sem dados ainda.</div>';
  }

  var list = $('tmSessionList');
  list.innerHTML = '';
  if (!sessions.length) {
    list.innerHTML = '<div style="color:var(--muted);text-align:center;padding:10px;">Sem sessões registradas.</div>';
  } else {
    sessions.slice(0, 5).forEach(function(s) {
      var d = new Date(s.date);
      var dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      var modeStr = s.mode === 'hardmode' ? '🏋️ Gym Leader' : '🗺️ Aventura';
      var row = document.createElement('div');
      row.style.cssText = 'padding:7px 10px;background:var(--gray-light);border-radius:8px;margin-bottom:4px;display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:12px;';
      row.innerHTML = '<span><strong>' + dateStr + '</strong> · ' + modeStr + '</span>' +
        '<span>' + (s.caught || s.correct || 0) + ' cap. · combo ' + s.maxStreak + '</span>';
      list.appendChild(row);
    });
  }
}

function exportProgress() {
  var blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href   = url;
  a.download = 'tabuada-pokemon-sofia-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('✅ Progresso exportado!');
}

function importProgress(file) {
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var data = JSON.parse(e.target.result);
      if (typeof data === 'object' && data.pokedex !== undefined) {
        Object.assign(state, defaultState(), data);
        save();
        renderPokedex();
        renderBadges();
        populateTeacherStats();
        showToast('✅ Progresso importado!');
      } else {
        showToast('❌ Arquivo inválido.');
      }
    } catch(_) { showToast('❌ Erro ao ler arquivo.'); }
  };
  reader.readAsText(file);
}

function resetAllData() {
  var fresh = defaultState();
  Object.keys(state).forEach(function(k) { delete state[k]; });
  Object.assign(state, fresh);
  save();
  renderPokedex();
  renderBadges();
  populateTeacherStats();
  $('tmResetConfirm').classList.remove('visible');
  showToast('🗑️ Tudo resetado.');
}

// ── Mode selector ─────────────────────────────────────────────

var selectedMode = 'adventure';

function selectMode(mode) {
  selectedMode = mode;
  document.querySelectorAll('.mode-card').forEach(function(c) {
    c.classList.toggle('selected', c.dataset.mode === mode);
  });
  var rules = $('modeRules');
  if (mode === 'hardmode') {
    rules.innerHTML = '<strong>Modo Gym Leader:</strong><ul>' +
      '<li>Cronômetro de <strong>10 segundos</strong> por conta</li>' +
      '<li>60% das contas são <strong>divisões</strong></li>' +
      '<li>Maior chance de <strong>✨ Shiny!</strong></li>' +
      '<li>Errou <strong>10 vezes</strong>? Game Over!</li></ul>';
    $('startBtn').textContent = 'Desafiar o Gym Leader!';
  } else {
    rules.innerHTML = '<strong>Modo Aventura:</strong><ul>' +
      '<li>Contas infinitas de multiplicação e divisão</li>' +
      '<li>Acertou? <strong>Capturou o Pokémon!</strong></li>' +
      '<li>10 seguidas = próximo Pokémon é <strong>✨ SHINY!</strong></li>' +
      '<li>Errou <strong>10 vezes</strong>? Game Over!</li></ul>';
    $('startBtn').textContent = 'Começar Aventura!';
  }
}

function updateMuteBtn() {
  $('muteBtn').textContent = state.settings.muted ? '🔇' : '🔊';
  $('muteBtn').classList.toggle('active', state.settings.muted);
}

// ── Init ──────────────────────────────────────────────────────

function init() {
  renderPokedex();
  renderBadges();
  updateMuteBtn();
  selectMode('adventure');

  $('startOverlay').style.display    = 'flex';
  $('playArea').style.display        = 'none';
  $('gameHud').style.display         = 'none';
  $('shinyMeterWrap').style.display  = 'none';
  $('homeBtn').style.display         = 'none';

  // Answer
  $('submitBtn').addEventListener('click', function() { getCtx(); checkAnswer(); });
  $('answer').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); getCtx(); checkAnswer(); }
  });

  // Mode selection
  document.querySelectorAll('.mode-card').forEach(function(c) {
    c.addEventListener('click', function() { selectMode(c.dataset.mode); });
  });

  // Start
  $('startBtn').addEventListener('click', function() { getCtx(); startSession(selectedMode); });

  // Game over
  $('restartBtn').addEventListener('click', function() { startSession(selectedMode); });
  $('goHomeBtn').addEventListener('click', showStartScreen);

  // Home mid-game
  $('homeBtn').addEventListener('click', function() {
    if (session && !confirm('Voltar ao menu? Sua sessão vai ser perdida.')) return;
    clearTimer();
    showStartScreen();
  });

  // Mute
  $('muteBtn').addEventListener('click', function() {
    state.settings.muted = !state.settings.muted;
    save();
    updateMuteBtn();
  });

  // Pokédex drawer
  $('pokedexNavBtn').addEventListener('click', function() { renderPokedex(); openDrawer(); });
  $('drawerClose').addEventListener('click', closeDrawer);
  $('drawerBackdrop').addEventListener('click', closeDrawer);

  // Pokédex card → detail modal
  $('pokedexGrid').addEventListener('click', function(e) {
    var slot = e.target.closest('.pokedex-slot');
    if (!slot || !slot.classList.contains('captured')) return;
    var id = parseInt(slot.dataset.id, 10);
    if (id) { closeDrawer(); openPokemonModal(id); }
  });

  // Pokémon detail modal
  $('pdClose').addEventListener('click', closePokemonModal);
  $('pokemonDetailOverlay').addEventListener('click', function(e) {
    if (e.target === $('pokemonDetailOverlay')) closePokemonModal();
  });

  // Teacher mode
  $('teacherModeBtn').addEventListener('click', openTeacherPasswordModal);
  $('teacherPwCancel').addEventListener('click', function() { $('teacherPwOverlay').style.display = 'none'; });
  $('teacherPwOk').addEventListener('click', tryTeacherLogin);
  $('teacherPwInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); tryTeacherLogin(); }
  });
  $('teacherClose').addEventListener('click', function() { $('teacherOverlay').style.display = 'none'; });

  document.querySelectorAll('.teacher-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.teacher-tab').forEach(function(t) { t.classList.remove('active'); });
      tab.classList.add('active');
      var target = tab.dataset.tab;
      $('teacherStats').classList.toggle('hidden', target !== 'stats');
      $('teacherData').classList.toggle('hidden', target !== 'data');
    });
  });

  $('tmExportBtn').addEventListener('click', exportProgress);
  $('tmImportBtn').addEventListener('click', function() { $('tmImportFile').click(); });
  $('tmImportFile').addEventListener('change', function(e) {
    var f = e.target.files[0];
    if (f) importProgress(f);
    e.target.value = '';
  });
  $('tmResetBtn').addEventListener('click', function() { $('tmResetConfirm').classList.add('visible'); });
  $('tmResetCancel').addEventListener('click', function() { $('tmResetConfirm').classList.remove('visible'); });
  $('tmResetYes').addEventListener('click', resetAllData);

  // Prevent iOS zoom on input focus
  $('answer').addEventListener('focus', function() { document.body.style.fontSize = '16px'; });

  // Scroll answer into view when keyboard opens (iOS visualViewport)
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function() {
      var input = $('answer');
      if (document.activeElement === input) {
        setTimeout(function() {
          $('playArea').scrollIntoView({ block: 'start', behavior: 'smooth' });
        }, 50);
      }
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
