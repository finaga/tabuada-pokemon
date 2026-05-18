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
    lang:          'pt',
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
if (!state.lang) state.lang = 'pt';

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
// ── I18N ──────────────────────────────────────────────────────

var I18N = {
  pt: {
    appTitle: 'Tabuada Pokémon',
    startTitle: 'Tabuada Pokémon!',
    chooseMode: 'Escolha seu modo de jogo, Sofia!',
    modeAdventureTitle: 'Aventura',
    modeAdventureDesc: 'Modo infinito · 5 erros = Game Over',
    modeHardTitle: 'Gym Leader',
    modeHardDesc: 'Cronômetro 10s · Mais divisões · +Shiny!',
    adventureRulesHTML: '<strong>Modo Aventura:</strong><ul>' +
      '<li>Contas infinitas de multiplicação e divisão</li>' +
      '<li>Acertou? <strong>Capturou o Pokémon!</strong></li>' +
      '<li>10 seguidas = próximo Pokémon é <strong>✨ SHINY!</strong></li>' +
      '<li>Errou <strong>5 vezes</strong>? Game Over!</li></ul>',
    hardRulesHTML: '<strong>Modo Gym Leader:</strong><ul>' +
      '<li>Cronômetro de <strong>10 segundos</strong> por conta</li>' +
      '<li>60% das contas são <strong>divisões</strong></li>' +
      '<li>Maior chance de <strong>✨ Shiny!</strong></li>' +
      '<li>Errou <strong>5 vezes</strong>? Game Over!</li></ul>',
    startAdvBtn: 'Começar Aventura!',
    startHardBtn: 'Desafiar o Gym Leader!',
    catchBtn: 'Capturar!',
    pokedexLabel: 'Pokédex',
    medalsTitle: '🏅 Medalhas',
    bestCombo: '🔥 Melhor combo',
    bestCaught: '⚡ Melhor captura',
    teacherBtn: '👨‍🏫 Modo Professor',
    caughtPrefix: '✅ Você capturou ',
    shinySuffix: ' ✨ SHINY ✨',
    timeoutMsg: '⏱️ Tempo esgotado! A resposta era <strong>{a}</strong>. O Pokémon fugiu!',
    wrongMsg: '❌ Errado! A resposta era <strong>{a}</strong>. O Pokémon fugiu!',
    comboMilestone: '✨ COMBO x{n}! Próximo Pokémon é SHINY!',
    comboMid: '🔥 Combo x{n}!',
    newBadge: 'Nova medalha:',
    pokedexComplete: '🌟 POKÉDEX COMPLETA! Você é lendária, Sofia! 🌟',
    faintedTitle: 'Seus Pokémons desmaiaram! 😵',
    faintedSub: 'Volte ao Centro Pokémon e tente de novo!',
    statCaught: 'Capturados',
    statStreak: 'Maior Combo',
    statTotal: 'Contas',
    statTime: 'Tempo Médio',
    errorsPerTable: 'Erros por tabuada',
    retryBtn: 'Tentar de Novo',
    backHomeBtn: 'Voltar ao Menu',
    leaveSessionConfirm: 'Voltar ao menu? Sua sessão vai ser perdida.',
    loading: 'Carregando...',
    noDesc: 'Sem descrição disponível.',
    noConn: 'Sem conexão. Informações não carregadas.',
    height: 'Altura',
    weight: 'Peso',
    cryBtn: '🔊 Ouvir grito',
    teacherPwTitle: '👨‍🏫 Modo Professor',
    teacherPwSub: 'Digite a senha para acessar.',
    pwPlaceholder: 'Senha',
    cancelBtn: 'Cancelar',
    enterBtn: 'Entrar',
    panelTitle: '📊 Painel do Professor',
    tabStats: 'Estatísticas',
    tabData: 'Dados',
    overall: 'Resumo Geral',
    sessions: 'Sessões',
    totalAnswers: 'Total respostas',
    accuracy: 'Taxa de acerto',
    avgTime: 'Tempo médio',
    errorsHist: 'Erros por Tabuada (histórico)',
    last5: 'Últimas 5 Sessões',
    manageData: 'Gerenciar dados',
    exportBtn: '📥 Exportar progresso',
    importBtn: '📤 Importar progresso',
    resetBtn: '🗑️ Resetar Pokédex',
    resetConfirmHTML: '<strong>Tem certeza?</strong> Isso vai apagar TODA a Pokédex e estatísticas.',
    resetYes: 'Sim, apagar tudo',
    closeBtn: 'Fechar',
    exportSuccess: '✅ Progresso exportado!',
    importSuccess: '✅ Progresso importado!',
    importInvalid: '❌ Arquivo inválido.',
    importError: '❌ Erro ao ler arquivo.',
    resetSuccess: '🗑️ Tudo resetado.',
    sessionDate: 'Sessão',
    sessionMode: 'Modo',
    noDataYet: 'Sem dados ainda.',
    noSessions: 'Sem sessões registradas.',
    types: {
      normal:'Normal', fire:'Fogo', water:'Água', electric:'Elétrico',
      grass:'Planta', ice:'Gelo', fighting:'Lutador', poison:'Veneno',
      ground:'Terra', flying:'Voador', psychic:'Psíquico', bug:'Inseto',
      rock:'Pedra', ghost:'Fantasma', dragon:'Dragão', fairy:'Fada',
      steel:'Aço', dark:'Sombrio',
    },
    badges: {
      first:     ['Primeiro Pokémon', '1º Pokémon capturado'],
      ten:       ['Treinadora Iniciante', '10 Pokémons capturados'],
      thirty:    ['Boa Treinadora', '30 Pokémons capturados'],
      fifty:     ['Professora Oak Jr.', '50 Pokémons capturados'],
      hundred:   ['Veterana', '100 Pokémons capturados'],
      allcaught: ['Pokédex Completa', 'Todos os 151 capturados!'],
      shiny1:    ['Primeiro Shiny', '1º Pokémon Shiny capturado'],
      streak20:  ['Combo Master', 'Combo de 20+ em uma sessão'],
      gymleader: ['Gym Leader', 'Jogou no modo Gym Leader'],
    },
  },
  en: {
    appTitle: 'Pokémon Times Tables',
    startTitle: 'Pokémon Times Tables!',
    chooseMode: 'Choose your game mode, Sofia!',
    modeAdventureTitle: 'Adventure',
    modeAdventureDesc: 'Endless mode · 5 mistakes = Game Over',
    modeHardTitle: 'Gym Leader',
    modeHardDesc: '10s timer · More divisions · +Shiny!',
    adventureRulesHTML: '<strong>Adventure Mode:</strong><ul>' +
      '<li>Endless multiplication & division problems</li>' +
      '<li>Got it right? <strong>You caught the Pokémon!</strong></li>' +
      '<li>10 in a row = next Pokémon is <strong>✨ SHINY!</strong></li>' +
      '<li>Get it wrong <strong>5 times</strong>? Game Over!</li></ul>',
    hardRulesHTML: '<strong>Gym Leader Mode:</strong><ul>' +
      '<li><strong>10-second</strong> timer per problem</li>' +
      '<li>60% of problems are <strong>divisions</strong></li>' +
      '<li>Higher chance of <strong>✨ Shiny!</strong></li>' +
      '<li>Get it wrong <strong>5 times</strong>? Game Over!</li></ul>',
    startAdvBtn: 'Start Adventure!',
    startHardBtn: 'Challenge the Gym Leader!',
    catchBtn: 'Catch!',
    pokedexLabel: 'Pokédex',
    medalsTitle: '🏅 Badges',
    bestCombo: '🔥 Best combo',
    bestCaught: '⚡ Best catch',
    teacherBtn: '👨‍🏫 Teacher Mode',
    caughtPrefix: '✅ You caught ',
    shinySuffix: ' ✨ SHINY ✨',
    timeoutMsg: "⏱️ Time's up! The answer was <strong>{a}</strong>. The Pokémon escaped!",
    wrongMsg: '❌ Wrong! The answer was <strong>{a}</strong>. The Pokémon escaped!',
    comboMilestone: '✨ COMBO x{n}! Next Pokémon is SHINY!',
    comboMid: '🔥 Combo x{n}!',
    newBadge: 'New badge:',
    pokedexComplete: '🌟 POKÉDEX COMPLETE! You are legendary, Sofia! 🌟',
    faintedTitle: 'Your Pokémon fainted! 😵',
    faintedSub: 'Return to the Pokémon Center and try again!',
    statCaught: 'Caught',
    statStreak: 'Best Combo',
    statTotal: 'Problems',
    statTime: 'Avg Time',
    errorsPerTable: 'Errors per table',
    retryBtn: 'Try Again',
    backHomeBtn: 'Back to Menu',
    leaveSessionConfirm: 'Back to menu? Your session will be lost.',
    loading: 'Loading...',
    noDesc: 'No description available.',
    noConn: "No connection. Info couldn't load.",
    height: 'Height',
    weight: 'Weight',
    cryBtn: '🔊 Hear cry',
    teacherPwTitle: '👨‍🏫 Teacher Mode',
    teacherPwSub: 'Enter password to access.',
    pwPlaceholder: 'Password',
    cancelBtn: 'Cancel',
    enterBtn: 'Enter',
    panelTitle: '📊 Teacher Panel',
    tabStats: 'Statistics',
    tabData: 'Data',
    overall: 'Overall Summary',
    sessions: 'Sessions',
    totalAnswers: 'Total answers',
    accuracy: 'Accuracy',
    avgTime: 'Avg time',
    errorsHist: 'Errors per Table (history)',
    last5: 'Last 5 Sessions',
    manageData: 'Manage data',
    exportBtn: '📥 Export progress',
    importBtn: '📤 Import progress',
    resetBtn: '🗑️ Reset Pokédex',
    resetConfirmHTML: '<strong>Are you sure?</strong> This will erase ALL Pokédex and statistics.',
    resetYes: 'Yes, erase everything',
    closeBtn: 'Close',
    exportSuccess: '✅ Progress exported!',
    importSuccess: '✅ Progress imported!',
    importInvalid: '❌ Invalid file.',
    importError: '❌ Error reading file.',
    resetSuccess: '🗑️ Everything reset.',
    sessionDate: 'Session',
    sessionMode: 'Mode',
    noDataYet: 'No data yet.',
    noSessions: 'No sessions recorded.',
    types: {
      normal:'Normal', fire:'Fire', water:'Water', electric:'Electric',
      grass:'Grass', ice:'Ice', fighting:'Fighting', poison:'Poison',
      ground:'Ground', flying:'Flying', psychic:'Psychic', bug:'Bug',
      rock:'Rock', ghost:'Ghost', dragon:'Dragon', fairy:'Fairy',
      steel:'Steel', dark:'Dark',
    },
    badges: {
      first:     ['First Pokémon', '1st Pokémon caught'],
      ten:       ['Rookie Trainer', '10 Pokémon caught'],
      thirty:    ['Good Trainer', '30 Pokémon caught'],
      fifty:     ['Professor Oak Jr.', '50 Pokémon caught'],
      hundred:   ['Veteran', '100 Pokémon caught'],
      allcaught: ['Complete Pokédex', 'All 151 caught!'],
      shiny1:    ['First Shiny', '1st Shiny caught'],
      streak20:  ['Combo Master', 'Combo of 20+ in one session'],
      gymleader: ['Gym Leader', 'Played Gym Leader Mode'],
    },
  },
};

// All 151 Gen 1 Pokémon descriptions
var DESC = {
  pt: [
    'Tem uma planta nas costas que cresce com a luz do sol.',
    'A planta nas costas começa a florescer. Pesa mais do que parece.',
    'A enorme flor libera um perfume calmante.',
    'A chama na cauda mostra como ele está se sentindo.',
    'Quando bravo, sua chama queima ainda mais forte.',
    'Cospe fogo intenso e voa pelos céus em busca de oponentes fortes.',
    'Esconde-se no casco quando se sente em perigo.',
    'A cauda peluda é símbolo de sua longa vida.',
    'Possui canhões de água potentes em seu casco.',
    'Solta um cheiro forte das antenas para afastar inimigos.',
    'Está se preparando para evoluir. Não pode se mover muito.',
    'Coleta pólen de flores com suas pequenas pernas.',
    'Tem um ferrão venenoso na cabeça. Adora folhas.',
    'Quase imóvel, mas pode endurecer ainda mais se atacado.',
    'Voa em alta velocidade e ataca com seus três ferrões.',
    'Pássaro comum em florestas e gramados. Muito dócil.',
    'Caça pequenos Pokémon em seu vasto território.',
    'Voa a velocidades incríveis em busca de presas.',
    'Morde tudo que vê. Os dentes não param de crescer.',
    'Seus dentes afiados podem cortar madeira dura.',
    'Pequeno mas barulhento. Avisa o bando sobre perigos.',
    'Voa por dias sem cansar, à procura de presas.',
    'Cobra de movimentos silenciosos. Engole presas inteiras.',
    'Os padrões em seu corpo intimidam os inimigos.',
    'Acumula eletricidade nas bochechas. Solta choques quando assustado.',
    'A cauda libera eletricidade no chão para se aterrar.',
    'Cava no chão seco e se enrola para se defender.',
    'Suas garras afiadas escavam túneis profundos.',
    'Possui um chifre pequeno com veneno suave.',
    'Protege seus filhotes com ferocidade.',
    'Rainha resistente. Esmaga inimigos com seu corpo.',
    'Mais agressivo que sua versão fêmea. Chifre maior.',
    'Chifre poderoso e venenoso. Não recua de uma briga.',
    'Rei poderoso. Sua cauda derruba torres.',
    'Pequeno e raro. Diz-se que dança ao luar.',
    'Esconde-se nas montanhas. Audição apurada.',
    'Nasce com uma cauda que se divide ao crescer.',
    'Tem nove caudas mágicas e vida muito longa.',
    'Canta canções de ninar que põem qualquer um para dormir.',
    'Corpo macio e elástico. Olhos grandes e expressivos.',
    'Vive em cavernas escuras. Usa ondas sonoras para se guiar.',
    'Suga sangue de suas vítimas com presas afiadas.',
    'Caminha à noite para espalhar suas sementes.',
    'Solta um odor terrível para afastar predadores.',
    'A flor enorme libera pólen tóxico.',
    'Cogumelos parasitas crescem em suas costas.',
    'O cogumelo agora controla o inseto hospedeiro.',
    'Olhos compostos enxergam até no escuro.',
    'As escamas das asas paralisam quem as toca.',
    'Só sua cabecinha aparece na terra. Cava sem parar.',
    'Três Digletts trabalhando juntos. Cava profundo e rápido.',
    'Adora coisas brilhantes e moedas. Anda sozinho.',
    'Elegante e orgulhoso. Tem uma joia na testa.',
    'Sempre com dor de cabeça. Libera poderes psíquicos sem perceber.',
    'Nadador veloz. Garras palmadas e mente afiada.',
    'Pequeno macaco furioso. Bate em qualquer coisa quando irritado.',
    'Vive em fúria constante. Persegue qualquer um por horas.',
    'Cãozinho leal e corajoso. Late forte quando estranhos aparecem.',
    'Cão lendário das chamas. Corre a velocidades incríveis.',
    'Espirais em sua barriga giram quando ele se move.',
    'Adora água. Fica fraco se a pele secar.',
    'Nadador profissional. Punhos fortes como aço.',
    'Dorme 18 horas por dia. Teleporta quando assustado.',
    'A colher amplifica seus poderes mentais.',
    'Inteligência incrível. Lembra de tudo desde o nascimento.',
    'Filhote musculoso. Treina diariamente para ficar mais forte.',
    'Corpo de aço. Pode levantar 10 toneladas com facilidade.',
    'Tem quatro braços e desfere mil golpes por segundo.',
    'Corpo fino e flexível. Suas raízes se movem como pés.',
    'Pendura-se em galhos esperando presas.',
    'Planta carnívora gigante. Engole presas inteiras.',
    'Quase invisível na água. Tentáculos venenosos.',
    'Possui 80 tentáculos cheios de toxinas.',
    'Pedra com braços. Confundido com rochas comuns.',
    'Rola montanha abaixo. Quebra árvores no caminho.',
    'Casco duro como diamante. Troca de casca ao crescer.',
    'Cavalo com crina de fogo. Recém-nascido já corre.',
    'Corre a 240 km/h com sua cauda em chamas.',
    'Sempre pensando em algo. Dócil e devagar.',
    'Um Shellder mordeu sua cauda, dando-lhe poderes psíquicos.',
    'Flutua usando magnetismo. Adora eletricidade.',
    'Três Magnemites unidos. Emite campos magnéticos fortes.',
    'Carrega um talo de planta como espada. Muito territorial.',
    'Pássaro de duas cabeças. Quase nunca dorme.',
    'Três cabeças expressam três humores diferentes.',
    'Adora águas geladas. Pode quebrar gelo com sua cabeça.',
    'Nada graciosamente em águas frias. Pelo branco brilhante.',
    'Massa de lodo nasceu da poluição. Cheira muito mal.',
    'Lodo tóxico. Mata plantas com seu cheiro.',
    'Concha dura como diamante. Língua sempre para fora.',
    'Casca quase indestrutível. Dispara espinhos.',
    'Quase totalmente feito de gás. Encolhe ao vento.',
    'Adora pregar peças. Sua língua pode causar paralisia.',
    'Esconde-se nas sombras. Rouba calor dos vivos.',
    'Cobra gigante de pedras. Cava túneis a alta velocidade.',
    'Hipnotiza para comer sonhos de pessoas dormindo.',
    'Balança o pêndulo para hipnotizar suas presas.',
    'Caranguejo pequeno. Pinças regeneram quando perdidas.',
    'Tem uma pinça gigantesca capaz de dobrar aço.',
    'Parece uma Pokébola. Explode com facilidade.',
    'Pokébola viva. A descarga é tremenda.',
    'Aglomerado de seis ovos que se comunicam por telepatia.',
    'Cabeças se desenvolvem em árvore. Cada uma pensa diferente.',
    'Usa o crânio de sua mãe sobre a cabeça. Vive solitário.',
    'Lutador feroz com um osso como arma.',
    'Pernas elásticas para chutes poderosos.',
    'Punhos rápidos como pistões. Treina sem parar.',
    'Língua duas vezes maior que seu corpo. Lambe tudo.',
    'Cheio de gás venenoso. Flutua no ar.',
    'Dois corpos gasosos. Gases combinados são mais tóxicos.',
    'Cabeça dura. Corre em linha reta até bater em algo.',
    'Couraça resiste até a lava. Caminha sobre duas patas.',
    'Sempre carrega um ovo nutritivo. Muito gentil.',
    'Coberto de cipós azuis que se renovam constantemente.',
    'Leva seu filhote na bolsa. Muito protetora.',
    'Cavalo-marinho pequeno. Cospe tinta quando assustado.',
    'Espinhos venenosos nas barbatanas. Nadador agressivo.',
    'Peixe gracioso com chifre pontudo. Nada bem na corrente.',
    'Cria ninhos no fundo dos rios. Macho protege os ovos.',
    'Estrela do mar. Núcleo brilha como uma joia.',
    'Núcleo em forma de joia emite raios coloridos.',
    'Cria paredes invisíveis com gestos das mãos.',
    'Foices afiadas como navalhas. Caçador veloz.',
    'Dança hipnótica. Fala em uma língua misteriosa.',
    'Atrai eletricidade. Aparece em tempestades.',
    'Vive em vulcões ativos. Corpo quente como brasas.',
    'Pinças no topo da cabeça esmagam inimigos.',
    'Touro furioso. Três caudas chicoteiam sem parar.',
    'Apenas pula. Quase nenhum poder de luta.',
    'Furioso e destrutivo. Causa tempestades quando aparece.',
    'Gentil gigante do mar. Carrega pessoas nas costas.',
    'Transforma-se em qualquer Pokémon que ver.',
    'Genética instável. Pode evoluir de muitas formas.',
    'Corpo se mistura com a água, ficando invisível.',
    'Pelos eriçados disparam pequenos raios elétricos.',
    'Bolsa de fogo dentro do corpo. Temperatura altíssima.',
    'Pokémon feito de código. Vive em computadores.',
    'Fóssil pré-histórico. Concha em espiral.',
    'Boca cheia de dentes para esmagar conchas.',
    'Fóssil ancestral. Olhos extras nas costas.',
    'Caçador veloz dos mares antigos. Foices afiadas.',
    'Pterodáctilo pré-histórico. Voa em altíssima velocidade.',
    'Dorme e come o dia todo. Pesa mais que um caminhão.',
    'Lendário pássaro de gelo. Aparece em montanhas nevadas.',
    'Lendário pássaro elétrico. Aparece em tempestades.',
    'Lendário pássaro de fogo. Asas envoltas em chamas.',
    'Dragão pequeno. Cresce constantemente trocando de pele.',
    'Corpo elegante e místico. Controla o clima.',
    'Dragão amável. Voa pelos oceanos salvando navegantes.',
    'Criado em laboratório. O Pokémon mais poderoso já visto.',
    'Lendário. Contém o DNA de todos os Pokémon.',
  ],
  en: [
    'Has a plant on its back that grows with sunlight.',
    'The bud on its back is starting to bloom. Heavier than it looks.',
    'The huge flower releases a calming scent.',
    "The flame on its tail shows how it's feeling.",
    'When angry, its flame burns hotter.',
    'Breathes intense fire. Flies the skies seeking strong foes.',
    'Hides in its shell when it senses danger.',
    'Its fluffy tail is a sign of long life.',
    'Powerful water cannons sit atop its shell.',
    'Releases a strong smell from its antennae to ward off enemies.',
    'Preparing to evolve. Can barely move.',
    'Gathers pollen from flowers with tiny legs.',
    'Has a venomous stinger on its head. Loves leaves.',
    'Mostly motionless, but can harden further if attacked.',
    'Flies at high speeds and attacks with three stingers.',
    'Common bird in forests and meadows. Very docile.',
    'Hunts small Pokémon in its vast territory.',
    'Flies at incredible speeds searching for prey.',
    'Bites everything in sight. Teeth never stop growing.',
    'Sharp teeth can cut through hard wood.',
    'Small but noisy. Warns the flock about danger.',
    'Flies for days without tiring, hunting for prey.',
    'Silent-moving snake. Swallows prey whole.',
    'Patterns on its body intimidate enemies.',
    'Stores electricity in its cheeks. Shocks when startled.',
    'Its tail discharges electricity into the ground.',
    'Burrows in dry ground and curls up to defend itself.',
    'Sharp claws dig deep tunnels.',
    'Has a small horn with mild venom.',
    'Fiercely protects its young.',
    'Tough queen. Crushes foes with her body.',
    'More aggressive than the female. Larger horn.',
    'Powerful, venomous horn. Never backs down from a fight.',
    'Powerful king. Its tail can topple towers.',
    'Small and rare. Said to dance in moonlight.',
    'Hides in the mountains. Has sharp hearing.',
    'Born with a tail that splits as it grows.',
    'Has nine mystical tails and a very long life.',
    'Sings lullabies that put anyone to sleep.',
    'Soft, elastic body. Big expressive eyes.',
    'Lives in dark caves. Navigates by sound waves.',
    'Drains blood from its victims with sharp fangs.',
    'Walks at night to scatter its seeds.',
    'Releases a terrible odor to drive off predators.',
    'Its huge flower releases toxic pollen.',
    'Parasitic mushrooms grow on its back.',
    'The mushroom now controls the host bug.',
    'Compound eyes can see even in the dark.',
    'Scales on its wings paralyze whoever touches them.',
    'Only its little head pokes out. Digs nonstop.',
    'Three Digletts working together. Digs deep and fast.',
    'Loves shiny things and coins. Walks alone.',
    'Elegant and proud. Has a jewel on its forehead.',
    'Always has a headache. Releases psychic power unknowingly.',
    'Fast swimmer. Webbed claws and a sharp mind.',
    'Small furious monkey. Hits anything when angry.',
    'Always enraged. Chases foes for hours.',
    'Loyal and brave pup. Barks loudly at strangers.',
    'Legendary fire dog. Runs at incredible speeds.',
    'Spirals on its belly spin when it moves.',
    'Loves water. Weakens if its skin dries out.',
    'Pro swimmer. Fists as hard as steel.',
    'Sleeps 18 hours a day. Teleports when scared.',
    'The spoon amplifies its mental power.',
    'Incredible intelligence. Remembers everything since birth.',
    'Muscular cub. Trains daily to grow stronger.',
    'Body of steel. Can lift 10 tons easily.',
    'Has four arms and throws a thousand punches per second.',
    'Thin, flexible body. Its roots move like feet.',
    'Hangs from branches waiting for prey.',
    'Giant carnivorous plant. Swallows prey whole.',
    'Almost invisible in water. Venomous tentacles.',
    'Has 80 tentacles full of toxins.',
    'A rock with arms. Often mistaken for ordinary stones.',
    'Rolls down mountainsides. Smashes trees in its path.',
    'Shell as hard as diamond. Sheds it as it grows.',
    'Horse with a fiery mane. Newborns can already run.',
    'Gallops at 150 mph with a flaming tail.',
    'Always thinking about something. Gentle and slow.',
    'A Shellder bit its tail, giving it psychic powers.',
    'Floats using magnetism. Loves electricity.',
    'Three united Magnemites. Emits strong magnetic fields.',
    'Carries a plant stalk as a sword. Very territorial.',
    'Two-headed bird. Hardly ever sleeps.',
    'Three heads express three different moods.',
    'Loves icy waters. Can crack ice with its head.',
    'Swims gracefully in cold waters. Brilliant white fur.',
    'Sludge creature born from pollution. Smells awful.',
    'Toxic sludge. Kills plants with its stench.',
    'Shell as hard as diamond. Tongue always sticking out.',
    'Almost indestructible shell. Fires spikes.',
    'Almost entirely gas. Shrinks in the wind.',
    'Loves pranks. Its lick can paralyze.',
    'Hides in shadows. Steals heat from the living.',
    'Giant snake of rocks. Tunnels at high speeds.',
    'Hypnotizes prey to eat the dreams of sleepers.',
    'Swings its pendulum to hypnotize prey.',
    'Small crab. Pincers regrow when lost.',
    'Has a giant pincer that can bend steel.',
    'Looks like a Poké Ball. Explodes easily.',
    'A living Poké Ball. Its discharge is huge.',
    'Cluster of six eggs that talk by telepathy.',
    'Heads grow into a tree. Each thinks differently.',
    "Wears its mother's skull on its head. Lives alone.",
    'Fierce fighter wielding a bone as a weapon.',
    'Elastic legs for powerful kicks.',
    'Fists fast as pistons. Trains nonstop.',
    'Tongue twice as long as its body. Licks everything.',
    'Full of poisonous gas. Floats in the air.',
    'Two gas bodies. Combined gas is more toxic.',
    'Tough head. Runs in a straight line until it hits something.',
    'Armor resists even lava. Walks on two legs.',
    'Always carries a nutritious egg. Very kind.',
    'Covered in blue vines that constantly renew.',
    'Carries its baby in its pouch. Very protective.',
    'Small seahorse. Spits ink when startled.',
    'Venomous spines on its fins. Aggressive swimmer.',
    'Graceful fish with a pointed horn. Swims well in currents.',
    'Makes nests at the bottom of rivers. Males guard the eggs.',
    'Sea star. Core shines like a jewel.',
    'Jewel-shaped core emits colorful rays.',
    'Creates invisible walls with hand gestures.',
    'Razor-sharp scythes. Swift hunter.',
    'Hypnotic dance. Speaks a mysterious language.',
    'Draws electricity. Appears in thunderstorms.',
    'Lives in active volcanoes. Body hot as embers.',
    'Pincers on its head crush enemies.',
    'Furious bull. Three tails whip without stop.',
    'Just flops around. Almost no fighting power.',
    'Furious and destructive. Causes storms when it appears.',
    'Gentle giant of the sea. Carries people on its back.',
    'Transforms into any Pokémon it sees.',
    'Unstable genetics. Can evolve in many ways.',
    'Body blends into water, becoming invisible.',
    'Bristly fur shoots tiny lightning bolts.',
    'Holds fire inside its body. Extremely hot.',
    'Pokémon made of code. Lives in computers.',
    'Prehistoric fossil. Spiral shell.',
    'Mouth full of teeth for crushing shells.',
    'Ancient fossil. Extra eyes on its back.',
    'Swift hunter of ancient seas. Sharp scythes.',
    'Prehistoric pterodactyl. Flies at top speed.',
    'Sleeps and eats all day. Heavier than a truck.',
    'Legendary ice bird. Appears on snowy mountains.',
    'Legendary electric bird. Appears in storms.',
    'Legendary fire bird. Wings wrapped in flames.',
    'Small dragon. Constantly grows by shedding skin.',
    'Elegant and mystical body. Controls the weather.',
    'Kind dragon. Flies oceans saving sailors.',
    'Created in a lab. The most powerful Pokémon ever seen.',
    'Legendary. Contains the DNA of every Pokémon.',
  ],
};

function t(key) {
  var dict = I18N[state.lang || 'pt'] || I18N.pt;
  var path = key.split('.');
  var val = dict, fallback = I18N.pt;
  for (var i = 0; i < path.length && val != null; i++) val = val[path[i]];
  if (val == null) {
    val = fallback;
    for (var j = 0; j < path.length && val != null; j++) val = val[path[j]];
  }
  return val == null ? key : val;
}

function getDesc(id) {
  var arr = DESC[state.lang || 'pt'] || DESC.pt;
  return arr[id - 1] || '';
}

function pad3(n) { return String(n).padStart(3, '0'); }
function getPokemonName(id) { return POKEDEX[id - 1] || ('Pokémon #' + pad3(id)); }
function spriteUrl(id, shiny) {
  var base = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
  return shiny ? base + '/shiny/' + id + '.png' : base + '/' + id + '.png';
}

function renderTypeBadges(container, types) {
  container.innerHTML = '';
  if (!types || !types.length) return;
  types.forEach(function(tp) {
    var badge = document.createElement('span');
    badge.className = 'type-badge';
    badge.style.background = 'var(' + (TYPE_COLORS[tp] || '--type-normal') + ')';
    badge.textContent = t('types.' + tp) || tp;
    container.appendChild(badge);
  });
}

function fetchPokemonData(id) {
  if (state.pokemonCache[id]) return Promise.resolve(state.pokemonCache[id]);
  return fetch('https://pokeapi.co/api/v2/pokemon/' + id)
    .then(function(r) { if (!r.ok) throw new Error(); return r.json(); })
    .then(function(poke) {
      var result = {
        types:    poke.types.map(function(tp) { return tp.type.name; }),
        heightM:  poke.height / 10,
        weightKg: poke.weight / 10,
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
  { id: 'first',     icon: '🌱' },
  { id: 'ten',       icon: '🎒' },
  { id: 'thirty',    icon: '⭐' },
  { id: 'fifty',     icon: '🏆' },
  { id: 'hundred',   icon: '👑' },
  { id: 'allcaught', icon: '🌟' },
  { id: 'shiny1',    icon: '✨' },
  { id: 'streak20',  icon: '🔥' },
  { id: 'gymleader', icon: '🏋️' },
];
function badgeName(id) { var b = t('badges.' + id); return Array.isArray(b) ? b[0] : id; }
function badgeDesc(id) { var b = t('badges.' + id); return Array.isArray(b) ? b[1] : ''; }

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
      setTimeout(function() { showToast('🏅 ' + t('newBadge') + ' ' + badgeName(b.id) + '!', 2500); }, i * 900);
    });
  }
  if (captured >= 151 && !state._pokedexCelebrated) {
    state._pokedexCelebrated = true;
    setTimeout(function() { showToast(t('pokedexComplete'), 4000, 'shiny-toast'); }, 1400);
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
  for (var i = 0; i < MAX_ERRORS; i++) {
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
  for (var tbl = 1; tbl <= 9; tbl++) {
    var errors = errorMap[tbl] || 0;
    var total  = totalMap[tbl] || 0;
    if (!total) continue;
    hasData = true;
    var pct = (errors / total) * 100;
    var row = document.createElement('div');
    row.className = 'result-chart-row';
    var label = document.createElement('div');
    label.className = 'result-chart-label';
    label.textContent = '× ' + tbl;
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
  var newSlotRef = null;
  for (var i = 1; i <= 151; i++) {
    (function(id) {
      var slot = document.createElement('div');
      slot.className = 'pokedex-slot';
      slot.dataset.id = id;
      if (id === newPid) { newSlotRef = slot; }

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

  if (newSlotRef) {
    var slotToAnimate = newSlotRef;
    setTimeout(function() {
      slotToAnimate.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      setTimeout(function() {
        slotToAnimate.classList.add('new-capture');
      }, 420);
    }, 80);
  }
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
    tip.textContent = badgeName(b.id);
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
  var isShiny  = !!captured.shiny;

  $('pdNum').textContent    = '#' + pad3(id);
  $('pdName').textContent   = getPokemonName(id);
  $('pdSprite').src         = spriteUrl(id, isShiny);
  $('pdDesc').innerHTML     = '<span class="loading-spinner"></span> ' + t('loading');
  $('pdHeight').textContent = '—';
  $('pdWeight').textContent = '—';
  $('pdTypes').innerHTML    = '';
  $('pdCryBtn').onclick     = function() { playCry(id); };

  var overlay = $('pokemonDetailOverlay');
  overlay.classList.toggle('shiny-modal', isShiny);
  var shinyTag = $('pdShinyTag');
  shinyTag.style.display = isShiny ? 'block' : 'none';

  overlay.style.display = 'flex';

  // Description is bundled — show immediately
  $('pdDesc').textContent = getDesc(id) || t('noDesc');

  fetchPokemonData(id).then(function(data) {
    if (!data) {
      if (!getDesc(id)) $('pdDesc').textContent = t('noConn');
      return;
    }
    renderTypeBadges($('pdTypes'), data.types);
    $('pdHeight').textContent = data.heightM.toFixed(1) + ' m';
    $('pdWeight').textContent = data.weightKg.toFixed(1) + ' kg';
  });
}

function closePokemonModal() {
  $('pokemonDetailOverlay').style.display = 'none';
  stopCry();
}

// ── Game constants ────────────────────────────────────────────

var MAX_ERRORS     = 5;
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
  for (var tbl = 1; tbl <= 9; tbl++) {
    var w = 1 + Math.min(state.errorMap[tbl] || 0, 5);
    for (var i = 0; i < w; i++) pool.push(tbl);
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
    showToast(t('comboMilestone').replace('{n}', session.streak), 3000, 'shiny-toast');
  } else if (session.streak > 0 && session.streak % 5 === 0) {
    soundCombo();
    showToast(t('comboMid').replace('{n}', session.streak), 1500);
  }

  playPokeballAnim();

  var fb = $('feedback');
  fb.className = 'feedback correct';
  fb.innerHTML = t('caughtPrefix') + getPokemonName(pid) + (isShiny ? t('shinySuffix') : '') + '!';

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
  fb.innerHTML = (isTimeout ? t('timeoutMsg') : t('wrongMsg')).replace('{a}', q.answer);

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
  Object.keys(session.successTables).forEach(function(k) {
    totalsPerTable[k] = session.successTables[k];
  });
  Object.keys(session.errorTables).forEach(function(k) {
    totalsPerTable[k] = (totalsPerTable[k] || 0) + session.errorTables[k];
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
  document.querySelectorAll('.teacher-tab').forEach(function(tab) {
    tab.classList.toggle('active', tab.dataset.tab === 'stats');
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
  for (var tbl = 1; tbl <= 9; tbl++) {
    var errs  = state.errorMap[tbl]   || 0;
    var succ  = state.successMap[tbl] || 0;
    var total = errs + succ;
    if (!total) continue;
    hasData = true;
    var errPct = (errs / total) * 100;
    var row = document.createElement('div');
    row.className = 'result-chart-row';
    row.innerHTML =
      '<div class="result-chart-label">× ' + tbl + '</div>' +
      '<div class="result-chart-bar"><div class="result-chart-fill' +
        (errs === 0 ? ' no-errors' : '') + '" style="width:' + (errs === 0 ? 8 : errPct) + '%"></div></div>' +
      '<div class="result-chart-count' + (errs === 0 ? ' zero' : '') + '">' + errs + '/' + total + '</div>';
    chart.appendChild(row);
  }
  if (!hasData) {
    chart.innerHTML = '<div style="text-align:center;color:var(--muted);font-size:12px;padding:10px;">' + t('noDataYet') + '</div>';
  }

  var list = $('tmSessionList');
  list.innerHTML = '';
  if (!sessions.length) {
    list.innerHTML = '<div style="color:var(--muted);text-align:center;padding:10px;">' + t('noSessions') + '</div>';
  } else {
    sessions.slice(0, 5).forEach(function(s) {
      var d = new Date(s.date);
      var locale = state.lang === 'en' ? 'en-US' : 'pt-BR';
      var dateStr = d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      var modeStr = s.mode === 'hardmode' ? '🏋️ ' + t('modeHardTitle') : '🗺️ ' + t('modeAdventureTitle');
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
  showToast(t('exportSuccess'));
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
        showToast(t('importSuccess'));
      } else {
        showToast(t('importInvalid'));
      }
    } catch(_) { showToast(t('importError')); }
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
  showToast(t('resetSuccess'));
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
    rules.innerHTML = t('hardRulesHTML');
    $('startBtn').textContent = t('startHardBtn');
  } else {
    rules.innerHTML = t('adventureRulesHTML');
    $('startBtn').textContent = t('startAdvBtn');
  }
}

function updateMuteBtn() {
  $('muteBtn').textContent = state.settings.muted ? '🔇' : '🔊';
  $('muteBtn').classList.toggle('active', state.settings.muted);
}

// ── Language ──────────────────────────────────────────────────

function applyLang() {
  // Static text via data-i18n
  document.querySelectorAll('[data-i18n]').forEach(function(el) {
    var key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-html]').forEach(function(el) {
    el.innerHTML = t(el.getAttribute('data-i18n-html'));
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
    el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
  });

  // Toggle button labels (shows the OTHER language)
  var label = state.lang === 'pt' ? 'EN' : 'PT';
  var b1 = document.getElementById('langBtn');       if (b1) b1.textContent = label;
  var b2 = document.getElementById('langBtnStart');  if (b2) b2.textContent = label;

  // <html lang> for accessibility
  document.documentElement.lang = state.lang === 'pt' ? 'pt-BR' : 'en';
  document.title = t('appTitle');

  // Re-render dynamic UI: badges (tooltips), pokédex (count label stays), rules HTML
  renderBadges();
  if (typeof selectMode === 'function' && typeof selectedMode !== 'undefined') {
    selectMode(selectedMode);
  }
  // If pokémon detail modal is open, refresh its description + type badges
  var pdOverlay = document.getElementById('pokemonDetailOverlay');
  if (pdOverlay && pdOverlay.style.display === 'flex') {
    var numTxt = document.getElementById('pdNum').textContent || '#000';
    var pid = parseInt(numTxt.replace('#',''), 10);
    if (pid) {
      document.getElementById('pdDesc').textContent = getDesc(pid) || t('noDesc');
      var cached = state.pokemonCache[pid];
      if (cached) renderTypeBadges(document.getElementById('pdTypes'), cached.types);
    }
  }
  // Re-render current encounter's type badge (in active gameplay)
  if (typeof session !== 'undefined' && session && session.currentPokemonId) {
    var encCached = state.pokemonCache[session.currentPokemonId];
    var encTypes  = document.getElementById('pokemonTypes');
    if (encCached && encTypes) renderTypeBadges(encTypes, encCached.types);
  }
  // If teacher panel is open, repopulate stats
  if (document.getElementById('teacherOverlay').style.display === 'flex') {
    populateTeacherStats();
  }
}

function setLang(lang) {
  if (lang !== 'pt' && lang !== 'en') return;
  state.lang = lang;
  save();
  applyLang();
}

function toggleLang() {
  setLang(state.lang === 'pt' ? 'en' : 'pt');
}

// ── Init ──────────────────────────────────────────────────────

function init() {
  applyLang();
  renderPokedex();
  renderBadges();
  updateMuteBtn();
  selectMode('adventure');

  // Language toggle
  var langBtn = document.getElementById('langBtn');
  if (langBtn) langBtn.addEventListener('click', toggleLang);
  var langBtnStart = document.getElementById('langBtnStart');
  if (langBtnStart) langBtnStart.addEventListener('click', toggleLang);

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
    if (session && !confirm(t('leaveSessionConfirm'))) return;
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
      document.querySelectorAll('.teacher-tab').forEach(function(tt) { tt.classList.remove('active'); });
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
