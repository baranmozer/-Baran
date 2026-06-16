/* ============================================
   Transfer Radar — Main Application Logic
   SPA Routing, Event Handling, and Rendering
   ============================================ */

const App = {
  // ── State ──
  currentRoute: 'dashboard',
  params: {},

  // ── Initialize ──
  init() {
    DataStore.init();
    this.initRouter();
    this.initEventListeners();
    
    // Initial Render
    this.handleRoute();
  },

  // ── Router ──
  initRouter() {
    window.addEventListener('hashchange', () => this.handleRoute());
  },

  navigate(path) {
    window.location.hash = path;
  },

  handleRoute() {
    const hash = window.location.hash.substring(1) || 'dashboard';
    const [path, queryString] = hash.split('?');
    this.currentRoute = path;
    
    // Parse query params
    this.params = {};
    if (queryString) {
      const urlParams = new URLSearchParams(queryString);
      for (const [key, value] of urlParams) {
        this.params[key] = value;
      }
    }

    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.remove('active');
      if (el.dataset.route === this.currentRoute || (this.currentRoute.startsWith('player') && el.dataset.route === 'players')) {
        el.classList.add('active');
      }
    });

    // Close mobile sidebar if open
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('active');

    // Route dispatch
    const contentArea = document.getElementById('main-content-area');
    contentArea.innerHTML = ''; // Clear current
    
    window.scrollTo(0, 0);

    switch (this.currentRoute) {
      case 'dashboard':
        this.renderDashboard(contentArea);
        break;
      case 'add-rumor':
        this.renderAddRumor(contentArea);
        break;
      case 'players':
        this.renderPlayers(contentArea);
        break;
      case 'script':
        this.renderScriptGenerator(contentArea);
        break;
      case 'thumbnail':
        this.renderThumbnailGen(contentArea);
        break;
      case 'sources':
        this.renderSources(contentArea);
        break;
      case 'settings':
        this.renderSettings(contentArea);
        break;
      default:
        if (this.currentRoute.startsWith('player/')) {
          const playerId = this.currentRoute.split('/')[1];
          this.renderPlayerDetail(contentArea, playerId);
        } else {
          this.renderDashboard(contentArea);
        }
        break;
    }
  },

  // ── Global Event Listeners ──
  initEventListeners() {
    // Mobile sidebar toggle
    document.getElementById('sidebar-toggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.add('open');
      document.getElementById('sidebar-overlay').classList.add('active');
    });

    document.getElementById('sidebar-overlay').addEventListener('click', () => {
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('sidebar-overlay').classList.remove('active');
    });
  },

  // ── Render: Dashboard ──
  renderDashboard(container) {
    const stats = DataStore.getStats();
    const rumors = DataStore.getRumors();
    const rumorsByDate = this.groupRumorsByDate(rumors);
    const contentDates = Object.keys(rumorsByDate).map(d => new Date(d).getDate());

    let html = `
      <div class="page-header animate-fade-in">
        <h1 class="page-title">🎬 İçerik Merkezi</h1>
        <div class="page-subtitle">Bugün hangi videoyu çekeceğiz? Transfer gündemindeki son gelişmeler.</div>
      </div>

      <div class="stats-grid animate-scale-in">
        <div class="stat-card accent">
          <div class="stat-icon">🔥</div>
          <div class="stat-value">${stats.hotRumors}</div>
          <div class="stat-label">Sıcak Haber (Video Bekleyen)</div>
        </div>
        <div class="stat-card success">
          <div class="stat-icon">📹</div>
          <div class="stat-value">${stats.completedVideos}</div>
          <div class="stat-label">Tamamlanan Video</div>
        </div>
        <div class="stat-card gs">
          <div class="stat-icon">🟡🔴</div>
          <div class="stat-value">${stats.gsRumors}</div>
          <div class="stat-label">GS Gündemi</div>
        </div>
        <div class="stat-card fb">
          <div class="stat-icon">🟡🔵</div>
          <div class="stat-value">${stats.fbRumors}</div>
          <div class="stat-label">FB Gündemi</div>
        </div>
      </div>

      <div class="two-col mt-32 stagger-children">
        <!-- Left: Feed -->
        <div>
          <div class="flex items-center justify-between mb-16">
            <h2 class="card-title" style="margin:0;">📰 Son Transfer Haberleri</h2>
            <div class="filter-tabs" style="margin:0;">
              <button class="filter-tab active" onclick="App.filterDashboardFeed('all', this)">Tümü</button>
              <button class="filter-tab gs" onclick="App.filterDashboardFeed('GS', this)">GS</button>
              <button class="filter-tab fb" onclick="App.filterDashboardFeed('FB', this)">FB</button>
            </div>
          </div>
          <div id="dashboard-feed">
            ${this.buildFeedHtml(rumors.slice(0, 10))}
          </div>
          ${rumors.length > 10 ? `<button class="btn btn-secondary w-full mt-16" onclick="App.navigate('add-rumor')">Tüm Haberleri Gör</button>` : ''}
        </div>

        <!-- Right: Actions & Calendar -->
        <div>
          <!-- Quick Video Generator -->
          <div class="card mb-24">
            <h3 class="card-title mb-16">⚡ Hızlı İçerik Üret</h3>
            <div class="flex-col gap-8">
              <button class="btn btn-primary w-full" onclick="App.navigate('script')">📝 Günlük Transfer Özeti Videosu Yap</button>
              <button class="btn btn-secondary w-full" onclick="App.navigate('add-rumor')">➕ Yeni Transfer Haberi Ekle</button>
              <button class="btn btn-secondary w-full" onclick="App.navigate('thumbnail')">🎨 Sadece Thumbnail Yap</button>
            </div>
          </div>

          <!-- Calendar -->
          <div class="card">
            <h3 class="card-title mb-16">📅 İçerik Takvimi</h3>
            ${UI.createMiniCalendar(contentDates)}
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
  },

  filterDashboardFeed(filter, btnEl) {
    // Update active tab styling
    const tabs = btnEl.parentElement.querySelectorAll('.filter-tab');
    tabs.forEach(t => t.classList.remove('active'));
    btnEl.classList.add('active');

    // Filter rumors
    const rumors = DataStore.getRumors(filter);
    const feedHtml = this.buildFeedHtml(rumors.slice(0, 10));
    document.getElementById('dashboard-feed').innerHTML = feedHtml;
  },

  buildFeedHtml(rumors) {
    if (!rumors || rumors.length === 0) {
      return UI.createEmptyState('📭', 'Haber Yok', 'Bu filtreye uygun transfer haberi bulunamadı.');
    }
    const sources = DataStore.getSources();
    return rumors.map(r => {
      const source = sources.find(s => s.id === r.sourceId);
      return UI.createRumorCard(r, source);
    }).join('');
  },

  groupRumorsByDate(rumors) {
    const groups = {};
    rumors.forEach(r => {
      const date = new Date(r.createdAt).toISOString().split('T')[0];
      if (!groups[date]) groups[date] = [];
      groups[date].push(r);
    });
    return groups;
  },

  // ── Render: Add Rumor ──
  renderAddRumor(container) {
    const sources = DataStore.getSources();
    const players = DataStore.getPlayers();

    let html = `
      <div class="page-header animate-fade-in">
        <h1 class="page-title">➕ Haber Ekle</h1>
        <div class="page-subtitle">X'ten veya haber sitelerinden yeni bir iddiayı sisteme girin.</div>
      </div>

      <div class="two-col animate-scale-in">
        <!-- Add Form -->
        <div class="card">
          <form id="add-rumor-form" onsubmit="App.submitRumor(event)">
            <div class="form-group">
              <label class="form-label">Transfer İddiası / Haber Metni</label>
              <textarea class="form-textarea" id="r-content" placeholder="Tweet veya haber metnini buraya yapıştırın..." required></textarea>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Futbolcu</label>
                <select class="form-select" id="r-player" required>
                  <option value="">-- Futbolcu Seç --</option>
                  ${players.map(p => `<option value="${p.id}">${p.name} (${p.currentTeam})</option>`).join('')}
                </select>
                <div class="form-hint">Listede yoksa önce <a href="#players">Futbolcular</a>'dan ekleyin.</div>
              </div>
              <div class="form-group">
                <label class="form-label">Hedef Takım</label>
                <select class="form-select" id="r-team" required>
                  <option value="GS">Galatasaray</option>
                  <option value="FB">Fenerbahçe</option>
                  <option value="BJK">Beşiktaş</option>
                  <option value="TS">Trabzonspor</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Kaynak (Muhabir)</label>
                <select class="form-select" id="r-source" required>
                  <option value="">-- Kaynak Seç --</option>
                  ${sources.map(s => `<option value="${s.id}">${s.name} (%${s.reliability})</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">İddia Türü</label>
                <select class="form-select" id="r-type">
                  <option value="rumor">Söylenti</option>
                  <option value="strong">Güçlü İddia</option>
                  <option value="confirmed">Kesin / KAP</option>
                  <option value="denied">Yalanlandı</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Öncelik (Video Aciliyeti)</label>
              <div class="radio-group" id="r-priority-group">
                <div class="radio-option active" data-val="normal" onclick="App.selectRadio(this)">📌 Normal</div>
                <div class="radio-option" data-val="hot" onclick="App.selectRadio(this)">🔥 Acil Çekim</div>
                <div class="radio-option" data-val="low" onclick="App.selectRadio(this)">💤 Düşük</div>
              </div>
              <input type="hidden" id="r-priority" value="normal">
            </div>

            <div class="mt-24">
              <button type="submit" class="btn btn-primary w-full">Haberi Kaydet</button>
            </div>
          </form>
        </div>

        <!-- Recent Rumors List -->
        <div>
          <h3 class="card-title mb-16">Son Eklenenler</h3>
          <div id="recent-rumors-list">
             ${this.buildFeedHtml(DataStore.getRumors().slice(0, 5))}
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
  },

  selectRadio(el) {
    const group = el.closest('.radio-group');
    group.querySelectorAll('.radio-option').forEach(o => o.classList.remove('active'));
    el.classList.add('active');
    const input = group.nextElementSibling;
    if (input && input.tagName === 'INPUT') {
      input.value = el.dataset.val;
    }
  },

  submitRumor(e) {
    e.preventDefault();
    const playerId = document.getElementById('r-player').value;
    const player = DataStore.getPlayer(playerId);
    
    const rumor = {
      content: document.getElementById('r-content').value,
      playerId: playerId,
      playerName: player ? player.name : 'Bilinmeyen',
      team: document.getElementById('r-team').value,
      sourceId: document.getElementById('r-source').value,
      type: document.getElementById('r-type').value,
      priority: document.getElementById('r-priority').value
    };

    const added = DataStore.addRumor(rumor);
    UI.showToast('Haber başarıyla kaydedildi.', 'success');
    document.getElementById('add-rumor-form').reset();
    
    // Refresh recent list
    document.getElementById('recent-rumors-list').innerHTML = this.buildFeedHtml(DataStore.getRumors().slice(0, 5));
  },

  // ── Render: Players ──
  renderPlayers(container) {
    const players = DataStore.getPlayers();

    let html = `
      <div class="page-header animate-fade-in">
        <h1 class="page-title">👤 Futbolcu Veritabanı</h1>
        <div class="page-subtitle">İstatistikler, performans verileri ve videoya hazır analiz kartları.</div>
      </div>

      <div class="search-bar animate-scale-in">
        <span class="search-icon">🔍</span>
        <input type="text" class="form-input" id="player-search" placeholder="İsim, takım veya mevki ile futbolcu ara..." onkeyup="App.handlePlayerSearch(this.value)">
      </div>

      <div class="player-grid" id="player-grid-container">
        ${players.map(p => UI.createPlayerCard(p)).join('')}
      </div>
    `;

    container.innerHTML = html;
  },

  handlePlayerSearch(query) {
    const players = DataStore.searchPlayers(query);
    const container = document.getElementById('player-grid-container');
    if (players.length === 0) {
      container.innerHTML = UI.createEmptyState('🕵️‍♂️', 'Futbolcu Bulunamadı', 'Bu isimle eşleşen futbolcu veritabanında yok.');
      container.style.display = 'block';
    } else {
      container.style.display = 'grid';
      container.innerHTML = players.map(p => UI.createPlayerCard(p)).join('');
    }
  },

  // ── Render: Player Detail ──
  renderPlayerDetail(container, playerId) {
    const player = DataStore.getPlayer(playerId);
    if (!player) {
      container.innerHTML = UI.createEmptyState('❌', 'Hata', 'Futbolcu bulunamadı.', `<button class="btn btn-primary" onclick="App.navigate('players')">Geri Dön</button>`);
      return;
    }
    container.innerHTML = UI.createPlayerDetail(player);
  },

  // ── Render: Script Generator ──
  renderScriptGenerator(container) {
    const rumors = DataStore.getRumors('pending');
    const templates = ScriptGenerator.getTemplateList();
    
    // Auto-select from params
    const selectedPlayerId = this.params.player || '';
    const selectedRumorId = this.params.rumor || '';

    let html = `
      <div class="page-header animate-fade-in">
        <h1 class="page-title">📝 Senaryo Motoru</h1>
        <div class="page-subtitle">Haber ve verileri birleştirerek saniyeler içinde YouTube video senaryosu oluştur.</div>
      </div>

      <div class="two-col animate-scale-in">
        <!-- Configuration -->
        <div class="card">
          <div class="form-group">
            <label class="form-label">Video Şablonu</label>
            <select class="form-select" id="script-template" onchange="App.handleScriptTemplateChange()">
              ${templates.map(t => `<option value="${t.id}">${t.icon} ${t.name} (${t.estimatedDuration})</option>`).join('')}
            </select>
          </div>

          <div id="script-target-selector" class="form-group">
            <label class="form-label">Hangi Transfer Haberi?</label>
            <select class="form-select" id="script-rumor">
              <option value="">-- Haber Seç --</option>
              ${rumors.map(r => `<option value="${r.id}" ${r.id === selectedRumorId ? 'selected' : (r.playerId === selectedPlayerId ? 'selected' : '')}>${r.playerName} ➡️ ${r.team} (${timeAgo(r.createdAt)})</option>`).join('')}
            </select>
            <div class="form-hint">Sadece videosu çekilmemiş (bekleyen) haberler listelenir.</div>
          </div>

          <div class="mt-24">
            <button class="btn btn-primary w-full" onclick="App.generateScript()">✨ Senaryoyu Üret</button>
          </div>
        </div>

        <!-- Result -->
        <div class="script-editor" id="script-result-container" style="display:none;">
          <div class="script-toolbar">
            <button class="btn btn-ghost btn-sm" onclick="App.copyScript()"><span style="font-size:16px;">📋</span> Kopyala</button>
            <button class="btn btn-ghost btn-sm" onclick="App.downloadScript()"><span style="font-size:16px;">⬇️</span> İndir</button>
            <span class="text-muted" style="font-size:12px;margin-left:auto;" id="script-meta-info"></span>
          </div>
          <div class="script-content" id="script-content-area" contenteditable="true" style="outline:none;">
            <!-- Script blocks will go here -->
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
    
    // Auto-generate if came with params
    if (selectedPlayerId || selectedRumorId) {
      setTimeout(() => this.generateScript(), 100);
    }
  },

  handleScriptTemplateChange() {
    const templateId = document.getElementById('script-template').value;
    const selectorDiv = document.getElementById('script-target-selector');
    if (templateId === 'daily-roundup') {
      selectorDiv.style.display = 'none'; // Uses all rumors
    } else {
      selectorDiv.style.display = 'block';
    }
  },

  generateScript() {
    const templateId = document.getElementById('script-template').value;
    let scriptData = null;

    if (templateId === 'daily-roundup') {
      // Daily roundup uses all today's active rumors
      const rumors = DataStore.getRumors();
      const players = DataStore.getPlayers();
      const sources = DataStore.getSources();
      scriptData = ScriptGenerator.generateDailyRoundup(rumors, players, sources);
    } else {
      // Specific rumor
      const rumorId = document.getElementById('script-rumor').value;
      if (!rumorId) {
        UI.showToast('Lütfen bir transfer haberi seçin.', 'warning');
        return;
      }
      
      const rumors = DataStore.getRumors();
      const rumor = rumors.find(r => r.id === rumorId);
      const player = DataStore.getPlayer(rumor.playerId);
      const source = DataStore.getSource(rumor.sourceId);
      
      scriptData = ScriptGenerator.generate(templateId, rumor, player, source);
      
      // Store current generated rumor id for mark done action
      this._currentGeneratedRumorId = rumorId;
    }

    if (scriptData) {
      this._currentScript = scriptData; // Store for export
      
      // Render to UI
      const resultContainer = document.getElementById('script-result-container');
      const contentArea = document.getElementById('script-content-area');
      const metaInfo = document.getElementById('script-meta-info');
      
      let html = '';
      scriptData.sections.forEach(s => {
        // Highlight vars (optional visual aid)
        let text = s.text.replace(/\{([^}]+)\}/g, '<span class="var-highlight">{$1}</span>');
        
        html += `
          <div class="script-section">
            <div class="section-time">[${s.time}]</div>
            <div class="section-title">${s.title}</div>
            <div class="section-text">${text}</div>
          </div>
        `;
      });
      
      contentArea.innerHTML = html;
      metaInfo.innerHTML = `⏱️ ~${scriptData.estimatedDuration} | 📝 ${scriptData.totalWords} kelime`;
      resultContainer.style.display = 'block';
      
      UI.showToast('Senaryo başarıyla üretildi.', 'success');
    }
  },

  copyScript() {
    if (!this._currentScript) return;
    const text = ScriptGenerator.exportAsText(this._currentScript);
    navigator.clipboard.writeText(text).then(() => {
      UI.showToast('Senaryo panoya kopyalandı.', 'success');
      
      // Ask to mark as video created if it was a specific rumor
      if (this._currentGeneratedRumorId) {
        DataStore.markVideoCreated(this._currentGeneratedRumorId);
      }
    });
  },
  
  downloadScript() {
    if (!this._currentScript) return;
    const text = ScriptGenerator.exportAsText(this._currentScript);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `senaryo-${this._currentScript.playerName.replace(/\s+/g, '-').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    if (this._currentGeneratedRumorId) {
      DataStore.markVideoCreated(this._currentGeneratedRumorId);
    }
  },

  // ── Render: Thumbnail Gen ──
  renderThumbnailGen(container) {
    const players = DataStore.getPlayers();
    const selectedPlayerId = this.params.player || '';

    let html = `
      <div class="page-header animate-fade-in">
        <h1 class="page-title">🎨 Thumbnail Oluşturucu</h1>
        <div class="page-subtitle">YouTube videoları için Canvas API ile yüksek kaliteli küçük resimler.</div>
      </div>

      <div class="two-col animate-scale-in">
        <!-- Settings -->
        <div class="card">
          <div class="form-group">
            <label class="form-label">Şablon Seçimi</label>
            <div class="thumbnail-templates" id="thumb-templates-container">
              ${Object.values(ThumbnailGenerator.templates).map(t => `
                <div class="thumbnail-template-option ${t.id === 'breaking' ? 'active' : ''}" data-id="${t.id}" onclick="App.selectThumbTemplate('${t.id}')">
                  <div class="template-icon">${t.icon}</div>
                  <div class="template-name">${t.name}</div>
                </div>
              `).join('')}
            </div>
            <input type="hidden" id="thumb-template" value="breaking">
          </div>

          <div class="section-divider"></div>

          <div class="form-group">
            <label class="form-label">Veri Kaynağı (Otomatik Doldur)</label>
            <select class="form-select" id="thumb-player-select" onchange="App.autoFillThumbData()">
              <option value="">-- Futbolcu Seçerek Doldur --</option>
              ${players.map(p => `<option value="${p.id}" ${p.id === selectedPlayerId ? 'selected' : ''}>${p.name}</option>`).join('')}
            </select>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Ana Başlık (Büyük)</label>
              <input type="text" class="form-input" id="thumb-title" value="SON DAKİKA" oninput="App.updateThumb()">
            </div>
            <div class="form-group">
              <label class="form-label">Alt Başlık (Ufak)</label>
              <input type="text" class="form-input" id="thumb-subtitle" value="TRANSFER HABERİ" oninput="App.updateThumb()">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Futbolcu Adı</label>
              <input type="text" class="form-input" id="thumb-player" value="OYUNCU ADI" oninput="App.updateThumb()">
            </div>
            <div class="form-group">
              <label class="form-label">Takım Teması</label>
              <select class="form-select" id="thumb-team" onchange="App.updateThumb()">
                <option value="GS">Galatasaray (Sarı-Kırmızı)</option>
                <option value="FB">Fenerbahçe (Sarı-Lacivert)</option>
                <option value="">Genel (Şablon Rengi)</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Sol Alt Değer (Örn: Piyasa Değeri)</label>
              <input type="text" class="form-input" id="thumb-value" value="€15M" oninput="App.updateThumb()">
            </div>
            <div class="form-group">
              <label class="form-label">Sağ Alt Metin (Örn: İstatistik)</label>
              <input type="text" class="form-input" id="thumb-stats" value="10 GOL | 5 ASİST" oninput="App.updateThumb()">
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label">Özel Fotoğraf URL (Opsiyonel)</label>
            <input type="text" class="form-input" id="thumb-image-url" placeholder="https://example.com/player.png" onchange="App.updateThumb()">
            <div class="form-hint">Arkaplanı transparan PNG tavsiye edilir. Boş bırakılırsa silüet çizilir.</div>
          </div>
        </div>

        <!-- Preview -->
        <div>
          <div class="thumbnail-preview-container">
            <div class="thumbnail-canvas-wrapper">
              <canvas id="yt-thumbnail"></canvas>
            </div>
            <div class="flex gap-16">
              <button class="btn btn-primary flex-1" onclick="App.downloadThumbnail()"><span style="font-size:18px;">⬇️</span> PNG Olarak İndir (1280x720)</button>
              <button class="btn btn-secondary" onclick="App.updateThumb()">🔄 Yenile</button>
            </div>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
    
    // Initialize Canvas
    setTimeout(() => {
      ThumbnailGenerator.init('yt-thumbnail');
      if (selectedPlayerId) {
        this.autoFillThumbData();
      } else {
        this.updateThumb();
      }
    }, 100);
  },

  selectThumbTemplate(id) {
    document.querySelectorAll('.thumbnail-template-option').forEach(el => el.classList.remove('active'));
    document.querySelector(`.thumbnail-template-option[data-id="${id}"]`).classList.add('active');
    document.getElementById('thumb-template').value = id;
    
    // Smart auto-change titles based on template
    if (id === 'breaking') { document.getElementById('thumb-title').value = 'SON DAKİKA'; }
    if (id === 'confirmed') { document.getElementById('thumb-title').value = 'RESMİLEŞTİ'; }
    if (id === 'denied') { document.getElementById('thumb-title').value = 'YALANLANDI'; }
    if (id === 'vs') { document.getElementById('thumb-title').value = 'BÜYÜK KAPIŞMA'; document.getElementById('thumb-team').value = '';}
    
    this.updateThumb();
  },

  autoFillThumbData() {
    const playerId = document.getElementById('thumb-player-select').value;
    if (!playerId) return;
    
    const player = DataStore.getPlayer(playerId);
    if (player) {
      document.getElementById('thumb-player').value = player.name.toUpperCase();
      document.getElementById('thumb-value').value = player.marketValue;
      document.getElementById('thumb-stats').value = `${player.stats.goals} GOL | ${player.stats.assists} ASİST`;
      this.updateThumb();
    }
  },

  updateThumb() {
    ThumbnailGenerator.render({
      templateId: document.getElementById('thumb-template').value,
      title: document.getElementById('thumb-title').value,
      subtitle: document.getElementById('thumb-subtitle').value,
      playerName: document.getElementById('thumb-player').value,
      teamTheme: document.getElementById('thumb-team').value,
      value: document.getElementById('thumb-value').value,
      statsText: document.getElementById('thumb-stats').value,
      customImageSrc: document.getElementById('thumb-image-url').value || null,
      showStats: true
    });
  },

  downloadThumbnail() {
    const name = document.getElementById('thumb-player').value.replace(/\s+/g, '-').toLowerCase() || 'thumbnail';
    ThumbnailGenerator.download(`transfer-radar-${name}.png`);
    UI.showToast('Thumbnail başarıyla indirildi.', 'success');
  },

  // ── Render: Sources ──
  renderSources(container) {
    const sources = DataStore.getSources();
    
    let html = `
      <div class="page-header animate-fade-in">
        <h1 class="page-title">📋 Kaynaklar & Muhabirler</h1>
        <div class="page-subtitle">Takip edilen X hesapları ve güvenilirlik puanları.</div>
      </div>

      <div class="two-col animate-scale-in">
        <div class="stagger-children">
          <h3 class="card-title mb-16">Galatasaray Muhabirleri</h3>
          <div class="flex-col gap-16 mb-32">
            ${sources.filter(s => s.team === 'GS').map(s => UI.createSourceCard(s)).join('')}
          </div>
          
          <h3 class="card-title mb-16">Fenerbahçe Muhabirleri</h3>
          <div class="flex-col gap-16">
            ${sources.filter(s => s.team === 'FB').map(s => UI.createSourceCard(s)).join('')}
          </div>
        </div>
        
        <div>
          <h3 class="card-title mb-16">Genel Muhabirler (Yabancı)</h3>
          <div class="flex-col gap-16 mb-32 stagger-children">
            ${sources.filter(s => s.team === 'Genel').map(s => UI.createSourceCard(s)).join('')}
          </div>
          
          <div class="card">
            <h3 class="card-title mb-16">➕ Yeni Kaynak Ekle</h3>
            <form onsubmit="App.submitSource(event)">
              <div class="form-group">
                <label class="form-label">Ad Soyad</label>
                <input type="text" id="src-name" class="form-input" required>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">X Handle (@)</label>
                  <input type="text" id="src-handle" class="form-input" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Takım Alanı</label>
                  <select id="src-team" class="form-select" required>
                    <option value="GS">Galatasaray</option>
                    <option value="FB">Fenerbahçe</option>
                    <option value="Genel">Genel/Yabancı</option>
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Güvenilirlik Puanı (0-100)</label>
                <input type="number" id="src-rel" class="form-input" min="0" max="100" value="70" required>
              </div>
              <button type="submit" class="btn btn-primary w-full mt-16">Kaynağı Ekle</button>
            </form>
          </div>
        </div>
      </div>
    `;
    
    container.innerHTML = html;
  },

  submitSource(e) {
    e.preventDefault();
    const name = document.getElementById('src-name').value;
    const avatar = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    
    DataStore.addSource({
      name: name,
      handle: document.getElementById('src-handle').value,
      team: document.getElementById('src-team').value,
      reliability: parseInt(document.getElementById('src-rel').value),
      avatar: avatar
    });
    
    UI.showToast('Kaynak eklendi.', 'success');
    this.handleRoute(); // re-render
  },

  deleteSource(id) {
    if (confirm('Bu kaynağı silmek istediğinize emin misiniz?')) {
      DataStore.deleteSource(id);
      UI.showToast('Kaynak silindi.', 'info');
      this.handleRoute();
    }
  },

  // ── Render: Settings ──
  renderSettings(container) {
    const settings = DataStore.getSettings();
    
    let html = `
      <div class="page-header animate-fade-in">
        <h1 class="page-title">⚙️ Ayarlar</h1>
        <div class="page-subtitle">Kanal ayarları ve veri yönetimi.</div>
      </div>

      <div class="two-col animate-scale-in">
        <div class="card">
          <h3 class="card-title mb-16">Kanal Ayarları</h3>
          <form onsubmit="App.saveSettings(event)">
            <div class="form-group">
              <label class="form-label">YouTube Kanal Adı</label>
              <input type="text" id="set-channel" class="form-input" value="${settings.channelName}">
            </div>
            
            <div class="form-group">
              <label class="form-label">API-Football Key (Opsiyonel)</label>
              <input type="password" id="set-api" class="form-input" value="${settings.apiKey}" placeholder="Gerçek zamanlı veri çekmek isterseniz">
              <div class="form-hint">RapidAPI üzerinden alınan key. Yoksa lokal veriler kullanılır.</div>
            </div>
            
            <button type="submit" class="btn btn-primary mt-16">Ayarları Kaydet</button>
          </form>
        </div>

        <div class="card">
          <h3 class="card-title mb-16">Veri Yönetimi</h3>
          <p class="text-muted" style="font-size:14px;margin-bottom:20px;">Tüm verileriniz tarayıcınızda (localStorage) saklanmaktadır. Verilerinizi kaybetmemek için dışa aktarabilirsiniz.</p>
          
          <div class="flex-col gap-16">
            <button class="btn btn-secondary w-full" onclick="App.exportData()">📦 Tüm Verileri Yedekle (JSON İndir)</button>
            
            <div style="position:relative;">
              <button class="btn btn-secondary w-full" onclick="document.getElementById('import-file').click()">📥 Yedekten Geri Yükle</button>
              <input type="file" id="import-file" style="display:none;" accept=".json" onchange="App.importData(event)">
            </div>
            
            <div class="section-divider" style="margin:8px 0;"></div>
            
            <button class="btn btn-ghost w-full" style="color:var(--error);border:1px solid rgba(255,0,0,0.2);" onclick="App.resetData()">⚠️ Tüm Verileri Sıfırla (Fabrika Ayarlarına Dön)</button>
          </div>
        </div>
      </div>
    `;
    
    container.innerHTML = html;
  },

  saveSettings(e) {
    e.preventDefault();
    DataStore.updateSettings({
      channelName: document.getElementById('set-channel').value,
      apiKey: document.getElementById('set-api').value
    });
    UI.showToast('Ayarlar kaydedildi.', 'success');
  },

  exportData() {
    const jsonStr = DataStore.exportAll();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transfer-radar-yedek-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    UI.showToast('Yedek dosyası indirildi.', 'success');
  },

  importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (DataStore.importAll(ev.target.result)) {
        UI.showToast('Veriler başarıyla geri yüklendi.', 'success');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        UI.showToast('Geçersiz yedek dosyası.', 'error');
      }
    };
    reader.readAsText(file);
  },

  resetData() {
    if (confirm('DİKKAT! Tüm haberleriniz, kaynaklarınız ve ayarlarınız silinecek. Fabrika ayarlarına dönmek istediğinize emin misiniz?')) {
      DataStore.resetAll();
      UI.showToast('Sistem sıfırlandı.', 'info');
      setTimeout(() => window.location.hash = 'dashboard', 1000);
    }
  },

  // ── Global Actions ──
  toggleStar(rumorId) {
    const isStarred = DataStore.toggleStar(rumorId);
    UI.showToast(isStarred ? 'Favorilere eklendi.' : 'Favorilerden çıkarıldı.', 'info');
    // Minimal re-render if on dashboard
    if (this.currentRoute === 'dashboard') this.handleRoute();
  },

  deleteRumor(rumorId) {
    if (confirm('Bu haberi silmek istediğinize emin misiniz?')) {
      DataStore.deleteRumor(rumorId);
      UI.showToast('Haber silindi.', 'info');
      this.handleRoute();
    }
  },

  quickVideo(rumorId) {
    const rumor = DataStore.getRumors().find(r => r.id === rumorId);
    if (rumor) {
      this.navigate(`script?rumor=${rumorId}&player=${rumor.playerId}`);
    }
  },

  copyPlayerStats(playerId) {
    const player = DataStore.getPlayer(playerId);
    if (!player) return;
    
    const text = `
📊 ${player.name} (${player.currentTeam})
Yaş: ${player.age} | Pozisyon: ${player.position}
Değer: ${player.marketValue}
-- Bu Sezon --
Maç: ${player.stats.matches}
Gol: ${player.stats.goals}
Asist: ${player.stats.assists}
    `.trim();
    
    navigator.clipboard.writeText(text).then(() => {
      UI.showToast('İstatistikler panoya kopyalandı.', 'success');
    });
  }
};

// Initialize App on load
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
