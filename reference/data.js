/* ============================================
   Transfer Radar — Data Layer
   Sample data + localStorage CRUD
   ============================================ */

const DB_KEYS = {
  RUMORS: 'transferRadar_rumors',
  PLAYERS: 'transferRadar_players',
  SOURCES: 'transferRadar_sources',
  SETTINGS: 'transferRadar_settings',
  CONTENT_CALENDAR: 'transferRadar_calendar'
};

// ── Sample Sources (Real Turkish Sports Journalists) ──
const DEFAULT_SOURCES = [
  { id: 's1', name: 'Yağız Sabuncuoğlu', handle: '@yaboreel', team: 'GS', reliability: 88, newsCount: 0, lastDate: null, avatar: 'YS' },
  { id: 's2', name: 'Emre Kaplan', handle: '@emaboreel', team: 'GS', reliability: 82, newsCount: 0, lastDate: null, avatar: 'EK' },
  { id: 's3', name: 'Ertan Süzgün', handle: '@aboreel', team: 'GS', reliability: 75, newsCount: 0, lastDate: null, avatar: 'ES' },
  { id: 's4', name: 'Haluk Yunus Cinel', handle: '@HalukYCinel', team: 'FB', reliability: 80, newsCount: 0, lastDate: null, avatar: 'HC' },
  { id: 's5', name: 'Ekrem Konur', handle: '@Ekremkonur', team: 'Genel', reliability: 70, newsCount: 0, lastDate: null, avatar: 'EK' },
  { id: 's6', name: 'Nicolò Schira', handle: '@NicoSchira', team: 'Genel', reliability: 85, newsCount: 0, lastDate: null, avatar: 'NS' },
  { id: 's7', name: 'Fabrizio Romano', handle: '@FabrizioRomano', team: 'Genel', reliability: 95, newsCount: 0, lastDate: null, avatar: 'FR' },
  { id: 's8', name: 'Sercan Dikme', handle: '@saboreel', team: 'FB', reliability: 78, newsCount: 0, lastDate: null, avatar: 'SD' }
];

// ── Sample Players (Realistic stats) ──
const DEFAULT_PLAYERS = [
  {
    id: 'p1',
    name: 'Victor Osimhen',
    age: 27,
    nationality: '🇳🇬 Nijerya',
    position: 'Forvet',
    positionShort: 'FW',
    currentTeam: 'Napoli',
    marketValue: '€75M',
    marketValueTrend: 'down',
    contractEnd: '2027',
    stats: { goals: 18, assists: 5, matches: 32, rating: 7.4, yellowCards: 4, redCards: 0 },
    last5: [
      { date: '01.06', opponent: 'Juventus', goals: 1, assists: 0, rating: 7.8 },
      { date: '25.05', opponent: 'AC Milan', goals: 2, assists: 1, rating: 9.1 },
      { date: '18.05', opponent: 'Lazio', goals: 0, assists: 0, rating: 6.2 },
      { date: '11.05', opponent: 'Roma', goals: 1, assists: 1, rating: 8.0 },
      { date: '04.05', opponent: 'Inter', goals: 0, assists: 1, rating: 7.1 }
    ],
    career: [
      { team: 'Napoli', years: '2020-', goals: 76, matches: 133 },
      { team: 'Lille', years: '2019-2020', goals: 18, matches: 38 },
      { team: 'Charleroi', years: '2018-2019', goals: 20, matches: 36 }
    ]
  },
  {
    id: 'p2',
    name: 'Marcus Rashford',
    age: 28,
    nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿 İngiltere',
    position: 'Sol Kanat',
    positionShort: 'LW',
    currentTeam: 'Manchester United',
    marketValue: '€55M',
    marketValueTrend: 'down',
    contractEnd: '2028',
    stats: { goals: 8, assists: 4, matches: 33, rating: 6.8, yellowCards: 3, redCards: 0 },
    last5: [
      { date: '01.06', opponent: 'Arsenal', goals: 0, assists: 0, rating: 6.0 },
      { date: '25.05', opponent: 'Chelsea', goals: 1, assists: 0, rating: 7.2 },
      { date: '18.05', opponent: 'Liverpool', goals: 0, assists: 1, rating: 6.8 },
      { date: '11.05', opponent: 'Tottenham', goals: 1, assists: 0, rating: 7.5 },
      { date: '04.05', opponent: 'West Ham', goals: 0, assists: 0, rating: 5.9 }
    ],
    career: [
      { team: 'Manchester United', years: '2015-', goals: 131, matches: 398 }
    ]
  },
  {
    id: 'p3',
    name: 'Paulo Dybala',
    age: 31,
    nationality: '🇦🇷 Arjantin',
    position: 'Ofansif Orta Saha',
    positionShort: 'CAM',
    currentTeam: 'Roma',
    marketValue: '€20M',
    marketValueTrend: 'down',
    contractEnd: '2026',
    stats: { goals: 12, assists: 8, matches: 30, rating: 7.6, yellowCards: 2, redCards: 0 },
    last5: [
      { date: '01.06', opponent: 'Napoli', goals: 1, assists: 1, rating: 8.2 },
      { date: '25.05', opponent: 'Lazio', goals: 0, assists: 2, rating: 7.9 },
      { date: '18.05', opponent: 'Fiorentina', goals: 1, assists: 0, rating: 7.5 },
      { date: '11.05', opponent: 'Atalanta', goals: 0, assists: 0, rating: 6.4 },
      { date: '04.05', opponent: 'Torino', goals: 2, assists: 0, rating: 8.8 }
    ],
    career: [
      { team: 'Roma', years: '2022-', goals: 34, matches: 88 },
      { team: 'Juventus', years: '2015-2022', goals: 82, matches: 236 },
      { team: 'Palermo', years: '2012-2015', goals: 21, matches: 89 }
    ]
  },
  {
    id: 'p4',
    name: 'Jhon Arias',
    age: 27,
    nationality: '🇨🇴 Kolombiya',
    position: 'Sağ Kanat',
    positionShort: 'RW',
    currentTeam: 'Fluminense',
    marketValue: '€12M',
    marketValueTrend: 'up',
    contractEnd: '2027',
    stats: { goals: 10, assists: 11, matches: 35, rating: 7.3, yellowCards: 5, redCards: 0 },
    last5: [
      { date: '01.06', opponent: 'Flamengo', goals: 1, assists: 2, rating: 8.5 },
      { date: '25.05', opponent: 'Palmeiras', goals: 0, assists: 1, rating: 7.2 },
      { date: '18.05', opponent: 'Corinthians', goals: 1, assists: 0, rating: 7.0 },
      { date: '11.05', opponent: 'Santos', goals: 0, assists: 1, rating: 7.4 },
      { date: '04.05', opponent: 'Botafogo', goals: 1, assists: 1, rating: 8.1 }
    ],
    career: [
      { team: 'Fluminense', years: '2021-', goals: 32, matches: 140 },
      { team: 'Patriotas', years: '2019-2021', goals: 8, matches: 45 }
    ]
  },
  {
    id: 'p5',
    name: 'Domenico Berardi',
    age: 30,
    nationality: '🇮🇹 İtalya',
    position: 'Sağ Kanat',
    positionShort: 'RW',
    currentTeam: 'Sassuolo',
    marketValue: '€18M',
    marketValueTrend: 'stable',
    contractEnd: '2027',
    stats: { goals: 14, assists: 9, matches: 28, rating: 7.5, yellowCards: 3, redCards: 0 },
    last5: [
      { date: '01.06', opponent: 'Monza', goals: 2, assists: 1, rating: 9.0 },
      { date: '25.05', opponent: 'Empoli', goals: 1, assists: 0, rating: 7.6 },
      { date: '18.05', opponent: 'Lecce', goals: 0, assists: 2, rating: 7.8 },
      { date: '11.05', opponent: 'Verona', goals: 1, assists: 0, rating: 7.2 },
      { date: '04.05', opponent: 'Cagliari', goals: 0, assists: 0, rating: 6.5 }
    ],
    career: [
      { team: 'Sassuolo', years: '2012-', goals: 130, matches: 352 }
    ]
  },
  {
    id: 'p6',
    name: 'Davinson Sánchez',
    age: 29,
    nationality: '🇨🇴 Kolombiya',
    position: 'Stoper',
    positionShort: 'CB',
    currentTeam: 'Galatasaray',
    marketValue: '€10M',
    marketValueTrend: 'stable',
    contractEnd: '2026',
    stats: { goals: 3, assists: 1, matches: 34, rating: 7.1, yellowCards: 7, redCards: 1 },
    last5: [
      { date: '01.06', opponent: 'Fenerbahçe', goals: 1, assists: 0, rating: 7.8 },
      { date: '25.05', opponent: 'Beşiktaş', goals: 0, assists: 0, rating: 7.2 },
      { date: '18.05', opponent: 'Trabzonspor', goals: 0, assists: 0, rating: 6.8 },
      { date: '11.05', opponent: 'Başakşehir', goals: 0, assists: 1, rating: 7.0 },
      { date: '04.05', opponent: 'Samsunspor', goals: 1, assists: 0, rating: 7.5 }
    ],
    career: [
      { team: 'Galatasaray', years: '2023-', goals: 5, matches: 68 },
      { team: 'Tottenham', years: '2017-2023', goals: 4, matches: 120 },
      { team: 'Ajax', years: '2016-2017', goals: 2, matches: 43 }
    ]
  },
  {
    id: 'p7',
    name: 'Dusan Tadic',
    age: 37,
    nationality: '🇷🇸 Sırbistan',
    position: 'Ofansif Orta Saha',
    positionShort: 'CAM',
    currentTeam: 'Fenerbahçe',
    marketValue: '€5M',
    marketValueTrend: 'down',
    contractEnd: '2026',
    stats: { goals: 9, assists: 14, matches: 36, rating: 7.3, yellowCards: 4, redCards: 0 },
    last5: [
      { date: '01.06', opponent: 'Galatasaray', goals: 0, assists: 2, rating: 7.6 },
      { date: '25.05', opponent: 'Beşiktaş', goals: 1, assists: 1, rating: 8.0 },
      { date: '18.05', opponent: 'Antalyaspor', goals: 0, assists: 0, rating: 6.5 },
      { date: '11.05', opponent: 'Kasımpaşa', goals: 1, assists: 1, rating: 7.8 },
      { date: '04.05', opponent: 'Konyaspor', goals: 0, assists: 1, rating: 7.2 }
    ],
    career: [
      { team: 'Fenerbahçe', years: '2023-', goals: 15, matches: 72 },
      { team: 'Ajax', years: '2018-2023', goals: 60, matches: 199 },
      { team: 'Southampton', years: '2014-2018', goals: 23, matches: 162 }
    ]
  },
  {
    id: 'p8',
    name: 'Michy Batshuayi',
    age: 31,
    nationality: '🇧🇪 Belçika',
    position: 'Forvet',
    positionShort: 'FW',
    currentTeam: 'Fenerbahçe',
    marketValue: '€4M',
    marketValueTrend: 'down',
    contractEnd: '2026',
    stats: { goals: 11, assists: 2, matches: 30, rating: 6.9, yellowCards: 2, redCards: 0 },
    last5: [
      { date: '01.06', opponent: 'Galatasaray', goals: 1, assists: 0, rating: 7.2 },
      { date: '25.05', opponent: 'Beşiktaş', goals: 0, assists: 0, rating: 6.0 },
      { date: '18.05', opponent: 'Antalyaspor', goals: 2, assists: 0, rating: 8.5 },
      { date: '11.05', opponent: 'Kasımpaşa', goals: 0, assists: 1, rating: 6.8 },
      { date: '04.05', opponent: 'Konyaspor', goals: 1, assists: 0, rating: 7.0 }
    ],
    career: [
      { team: 'Fenerbahçe', years: '2023-', goals: 18, matches: 60 },
      { team: 'Chelsea', years: '2016-2023', goals: 25, matches: 77 },
      { team: 'Marseille', years: '2014-2016', goals: 33, matches: 78 }
    ]
  }
];

// ── Sample Transfer Rumors ──
const DEFAULT_RUMORS = [
  {
    id: 'r1',
    playerName: 'Victor Osimhen',
    playerId: 'p1',
    team: 'GS',
    sourceId: 's2',
    type: 'strong',
    priority: 'hot',
    content: 'Osimhen transferi için Napoli ile görüşmeler olumlu ilerliyor. Galatasaray, kiralama opsiyonunu satın alma hakkıyla birlikte değerlendiriyor. Oyuncunun bonservis bedeli üzerinde pazarlık sürüyor.',
    tweetUrl: '',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    starred: true,
    videoCreated: false
  },
  {
    id: 'r2',
    playerName: 'Marcus Rashford',
    playerId: 'p2',
    team: 'FB',
    sourceId: 's4',
    type: 'rumor',
    priority: 'hot',
    content: 'Fenerbahçe\'nin Manchester United\'ın yıldızı Marcus Rashford için temas kurduğu öğrenildi. Oyuncunun menajerliğini yapan ekiple görüşmeler başladı. Maaş konusu en büyük engel olarak görülüyor.',
    tweetUrl: '',
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    starred: false,
    videoCreated: false
  },
  {
    id: 'r3',
    playerName: 'Paulo Dybala',
    playerId: 'p3',
    team: 'GS',
    sourceId: 's7',
    type: 'confirmed',
    priority: 'hot',
    content: 'Here we go! Paulo Dybala, Galatasaray ile 2+1 yıllık sözleşme konusunda anlaştı. Roma ile ayrılık konusunda mutabakat sağlandı. Oyuncu önümüzdeki hafta İstanbul\'a gelecek.',
    tweetUrl: '',
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    starred: true,
    videoCreated: true
  },
  {
    id: 'r4',
    playerName: 'Jhon Arias',
    playerId: 'p4',
    team: 'FB',
    sourceId: 's5',
    type: 'strong',
    priority: 'normal',
    content: 'Fenerbahçe, Fluminense\'nin yıldızı Jhon Arias için 10 milyon Euro + bonuslar şeklinde bir teklif hazırladı. Kolombiyalı kanat oyuncusu Süper Lig\'e sıcak bakıyor.',
    tweetUrl: '',
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    starred: false,
    videoCreated: false
  },
  {
    id: 'r5',
    playerName: 'Domenico Berardi',
    playerId: 'p5',
    team: 'GS',
    sourceId: 's6',
    type: 'rumor',
    priority: 'normal',
    content: 'Galatasaray\'ın Sassuolo\'nun yıldızı Domenico Berardi\'yi gündemine aldığı iddia edildi. İtalyan kanat oyuncusu geçen sezon sakatlığından döndükten sonra 14 gol attı.',
    tweetUrl: '',
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    starred: false,
    videoCreated: false
  },
  {
    id: 'r6',
    playerName: 'Davinson Sánchez',
    playerId: 'p6',
    team: 'GS',
    sourceId: 's1',
    type: 'denied',
    priority: 'low',
    content: 'Davinson Sánchez\'in Galatasaray\'dan ayrılacağı iddialarını kulüp yalanladı. Kolombiyalı stoper ile sözleşme uzatma görüşmeleri devam ediyor.',
    tweetUrl: '',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    starred: false,
    videoCreated: false
  },
  {
    id: 'r7',
    playerName: 'Dusan Tadic',
    playerId: 'p7',
    team: 'FB',
    sourceId: 's8',
    type: 'confirmed',
    priority: 'normal',
    content: 'Dusan Tadic, Fenerbahçe ile sözleşmesini 1 yıl daha uzattı. Sırp yıldız, "İstanbul\'da çok mutluyum, burada kalmak istiyorum" açıklamasını yaptı.',
    tweetUrl: '',
    createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
    starred: false,
    videoCreated: true
  }
];

// ── Default Settings ──
const DEFAULT_SETTINGS = {
  channelName: 'Transfer Radar',
  apiKey: '',
  defaultTemplate: 'transfer-bomb',
  autoSave: true,
  theme: 'dark'
};

// ── Data Access Layer ──
const DataStore = {
  // Generic CRUD
  _get(key, defaults) {
    try {
      const data = localStorage.getItem(key);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn(`Error reading ${key}:`, e);
    }
    return defaults;
  },

  _set(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error(`Error writing ${key}:`, e);
      return false;
    }
  },

  // ── Initialize ──
  init() {
    if (!localStorage.getItem(DB_KEYS.SOURCES)) {
      this._set(DB_KEYS.SOURCES, DEFAULT_SOURCES);
    }
    if (!localStorage.getItem(DB_KEYS.PLAYERS)) {
      this._set(DB_KEYS.PLAYERS, DEFAULT_PLAYERS);
    }
    if (!localStorage.getItem(DB_KEYS.RUMORS)) {
      this._set(DB_KEYS.RUMORS, DEFAULT_RUMORS);
    }
    if (!localStorage.getItem(DB_KEYS.SETTINGS)) {
      this._set(DB_KEYS.SETTINGS, DEFAULT_SETTINGS);
    }
  },

  // ── Rumors ──
  getRumors(filter = 'all') {
    let rumors = this._get(DB_KEYS.RUMORS, DEFAULT_RUMORS);
    rumors.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (filter === 'GS') return rumors.filter(r => r.team === 'GS');
    if (filter === 'FB') return rumors.filter(r => r.team === 'FB');
    if (filter === 'starred') return rumors.filter(r => r.starred);
    if (filter === 'pending') return rumors.filter(r => !r.videoCreated);
    return rumors;
  },

  addRumor(rumor) {
    const rumors = this._get(DB_KEYS.RUMORS, []);
    rumor.id = 'r' + Date.now();
    rumor.createdAt = new Date().toISOString();
    rumor.starred = false;
    rumor.videoCreated = false;
    rumors.unshift(rumor);
    this._set(DB_KEYS.RUMORS, rumors);

    // Update source news count
    if (rumor.sourceId) {
      const sources = this.getSources();
      const source = sources.find(s => s.id === rumor.sourceId);
      if (source) {
        source.newsCount = (source.newsCount || 0) + 1;
        source.lastDate = new Date().toISOString();
        this._set(DB_KEYS.SOURCES, sources);
      }
    }

    return rumor;
  },

  updateRumor(id, updates) {
    const rumors = this._get(DB_KEYS.RUMORS, []);
    const idx = rumors.findIndex(r => r.id === id);
    if (idx !== -1) {
      rumors[idx] = { ...rumors[idx], ...updates };
      this._set(DB_KEYS.RUMORS, rumors);
      return rumors[idx];
    }
    return null;
  },

  deleteRumor(id) {
    let rumors = this._get(DB_KEYS.RUMORS, []);
    rumors = rumors.filter(r => r.id !== id);
    this._set(DB_KEYS.RUMORS, rumors);
  },

  toggleStar(id) {
    const rumors = this._get(DB_KEYS.RUMORS, []);
    const rumor = rumors.find(r => r.id === id);
    if (rumor) {
      rumor.starred = !rumor.starred;
      this._set(DB_KEYS.RUMORS, rumors);
      return rumor.starred;
    }
    return false;
  },

  markVideoCreated(id) {
    return this.updateRumor(id, { videoCreated: true });
  },

  // ── Players ──
  getPlayers() {
    return this._get(DB_KEYS.PLAYERS, DEFAULT_PLAYERS);
  },

  getPlayer(id) {
    const players = this.getPlayers();
    return players.find(p => p.id === id);
  },

  searchPlayers(query) {
    if (!query) return this.getPlayers();
    const q = query.toLowerCase();
    return this.getPlayers().filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.currentTeam.toLowerCase().includes(q) ||
      p.position.toLowerCase().includes(q) ||
      p.nationality.toLowerCase().includes(q)
    );
  },

  addPlayer(player) {
    const players = this._get(DB_KEYS.PLAYERS, []);
    player.id = 'p' + Date.now();
    players.push(player);
    this._set(DB_KEYS.PLAYERS, players);
    return player;
  },

  // ── Sources ──
  getSources(teamFilter) {
    let sources = this._get(DB_KEYS.SOURCES, DEFAULT_SOURCES);
    if (teamFilter) sources = sources.filter(s => s.team === teamFilter);
    return sources;
  },

  getSource(id) {
    return this.getSources().find(s => s.id === id);
  },

  addSource(source) {
    const sources = this._get(DB_KEYS.SOURCES, []);
    source.id = 's' + Date.now();
    source.newsCount = 0;
    source.lastDate = null;
    sources.push(source);
    this._set(DB_KEYS.SOURCES, sources);
    return source;
  },

  updateSource(id, updates) {
    const sources = this._get(DB_KEYS.SOURCES, []);
    const idx = sources.findIndex(s => s.id === id);
    if (idx !== -1) {
      sources[idx] = { ...sources[idx], ...updates };
      this._set(DB_KEYS.SOURCES, sources);
      return sources[idx];
    }
    return null;
  },

  deleteSource(id) {
    let sources = this._get(DB_KEYS.SOURCES, []);
    sources = sources.filter(s => s.id !== id);
    this._set(DB_KEYS.SOURCES, sources);
  },

  // ── Settings ──
  getSettings() {
    return this._get(DB_KEYS.SETTINGS, DEFAULT_SETTINGS);
  },

  updateSettings(updates) {
    const settings = this.getSettings();
    const merged = { ...settings, ...updates };
    this._set(DB_KEYS.SETTINGS, merged);
    return merged;
  },

  // ── Stats (for dashboard) ──
  getStats() {
    const rumors = this.getRumors();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return {
      totalRumors: rumors.length,
      todayRumors: rumors.filter(r => new Date(r.createdAt) >= today).length,
      pendingVideos: rumors.filter(r => !r.videoCreated).length,
      completedVideos: rumors.filter(r => r.videoCreated).length,
      gsRumors: rumors.filter(r => r.team === 'GS').length,
      fbRumors: rumors.filter(r => r.team === 'FB').length,
      hotRumors: rumors.filter(r => r.priority === 'hot' && !r.videoCreated).length,
      starredRumors: rumors.filter(r => r.starred).length
    };
  },

  // ── Export / Import ──
  exportAll() {
    return JSON.stringify({
      rumors: this.getRumors(),
      players: this.getPlayers(),
      sources: this.getSources(),
      settings: this.getSettings(),
      exportDate: new Date().toISOString()
    }, null, 2);
  },

  importAll(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      if (data.rumors) this._set(DB_KEYS.RUMORS, data.rumors);
      if (data.players) this._set(DB_KEYS.PLAYERS, data.players);
      if (data.sources) this._set(DB_KEYS.SOURCES, data.sources);
      if (data.settings) this._set(DB_KEYS.SETTINGS, data.settings);
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  },

  resetAll() {
    Object.values(DB_KEYS).forEach(key => localStorage.removeItem(key));
    this.init();
  }
};

// ── Helper: Time ago in Turkish ──
function timeAgo(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return 'Az önce';
  if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} saat önce`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} gün önce`;
  return date.toLocaleDateString('tr-TR');
}

// ── Helper: Format date Turkish ──
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// ── Helper: Rumor type label ──
function getRumorTypeLabel(type) {
  const map = {
    confirmed: { text: 'Kesin', class: 'badge-confirmed', icon: '✅' },
    strong: { text: 'Güçlü İddia', class: 'badge-hot', icon: '🔥' },
    rumor: { text: 'Söylenti', class: 'badge-rumor', icon: '💬' },
    denied: { text: 'Yalanlandı', class: 'badge-denied', icon: '❌' }
  };
  return map[type] || map.rumor;
}

// ── Helper: Priority label ──
function getPriorityLabel(priority) {
  const map = {
    hot: { text: 'Acil', class: 'badge-hot', icon: '🔥' },
    normal: { text: 'Normal', class: 'badge-info', icon: '📌' },
    low: { text: 'Düşük', class: 'badge-denied', icon: '💤' }
  };
  return map[priority] || map.normal;
}

// ── Helper: Team badge class ──
function getTeamBadgeClass(team) {
  if (team === 'GS') return 'badge-gs';
  if (team === 'FB') return 'badge-fb';
  return 'badge-info';
}

// ── Helper: Generate unique ID ──
function generateId(prefix = '') {
  return prefix + Date.now() + Math.random().toString(36).substr(2, 5);
}
