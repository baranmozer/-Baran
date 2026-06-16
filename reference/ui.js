/* ============================================
   Transfer Radar — UI Components
   Reusable card, modal, notification builders
   ============================================ */

const UI = {
  // ── Transfer Rumor Card ──
  createRumorCard(rumor, source) {
    const typeLabel = getRumorTypeLabel(rumor.type);
    const priorityLabel = getPriorityLabel(rumor.priority);
    const teamClass = rumor.team === 'GS' ? 'team-gs' : rumor.team === 'FB' ? 'team-fb' : '';
    const teamEmoji = rumor.team === 'GS' ? '🟡🔴' : rumor.team === 'FB' ? '🟡🔵' : '⚪';
    const sourceName = source ? source.name : 'Bilinmeyen';
    const sourceAvatar = source ? source.avatar : '??';

    return `
      <div class="rumor-card ${teamClass}" data-rumor-id="${rumor.id}" style="animation-delay: ${Math.random() * 0.2}s">
        <div class="rumor-header">
          <div class="rumor-source">
            <div class="source-avatar">${sourceAvatar}</div>
            <div>
              <span class="source-name">${sourceName}</span>
              ${source ? `<span class="text-muted" style="font-size:12px;"> ${source.handle}</span>` : ''}
            </div>
          </div>
          <span class="rumor-time">${timeAgo(rumor.createdAt)}</span>
        </div>
        
        <div class="rumor-content">${this.escapeHtml(rumor.content)}</div>
        
        <div class="rumor-meta">
          <span class="badge ${getTeamBadgeClass(rumor.team)}">${teamEmoji} ${rumor.team}</span>
          <span class="badge ${typeLabel.class}">${typeLabel.icon} ${typeLabel.text}</span>
          <span class="badge ${priorityLabel.class}">${priorityLabel.icon} ${priorityLabel.text}</span>
          ${rumor.videoCreated ? '<span class="badge badge-confirmed">📹 Video Hazır</span>' : ''}
          <span style="font-size:13px;color:var(--text-muted);margin-left:auto;">⚽ ${this.escapeHtml(rumor.playerName)}</span>
        </div>
        
        <div class="rumor-actions">
          <button class="btn btn-primary btn-sm" onclick="App.quickVideo('${rumor.id}')" ${rumor.videoCreated ? 'disabled style="opacity:0.5"' : ''}>
            🎬 Video Oluştur
          </button>
          <button class="btn btn-secondary btn-sm" onclick="App.navigate('player/${rumor.playerId}')">
            📊 Futbolcu Detay
          </button>
          <button class="btn btn-ghost btn-sm" onclick="App.toggleStar('${rumor.id}')">
            ${rumor.starred ? '⭐' : '☆'} ${rumor.starred ? 'Favoride' : 'Favori'}
          </button>
          <button class="btn btn-ghost btn-sm" onclick="App.deleteRumor('${rumor.id}')" style="margin-left:auto;color:var(--error);">
            🗑️
          </button>
        </div>
      </div>
    `;
  },

  // ── Player Card (Grid view) ──
  createPlayerCard(player) {
    const trendIcon = player.marketValueTrend === 'up' ? '📈' : player.marketValueTrend === 'down' ? '📉' : '➡️';

    return `
      <div class="player-card" onclick="App.navigate('player/${player.id}')" style="cursor:pointer;">
        <div class="player-card-header">
          <span class="badge badge-info player-position-badge">${player.positionShort}</span>
          <div class="player-info">
            <div class="player-avatar">⚽</div>
            <div class="player-details">
              <h3>${this.escapeHtml(player.name)}</h3>
              <div class="player-team-age">
                <span>${this.escapeHtml(player.currentTeam)}</span>
                <span>•</span>
                <span>${player.age} yaş</span>
                <span>•</span>
                <span>${player.nationality}</span>
              </div>
              <div class="player-value">${trendIcon} ${player.marketValue}</div>
            </div>
          </div>
        </div>
        <div class="player-card-stats">
          <div class="player-stat">
            <div class="stat-num">${player.stats.goals}</div>
            <div class="stat-lbl">Gol</div>
          </div>
          <div class="player-stat">
            <div class="stat-num">${player.stats.assists}</div>
            <div class="stat-lbl">Asist</div>
          </div>
          <div class="player-stat">
            <div class="stat-num">${player.stats.matches}</div>
            <div class="stat-lbl">Maç</div>
          </div>
          <div class="player-stat">
            <div class="stat-num">${player.stats.rating}</div>
            <div class="stat-lbl">Puan</div>
          </div>
        </div>
      </div>
    `;
  },

  // ── Player Detail View ──
  createPlayerDetail(player) {
    const trendIcon = player.marketValueTrend === 'up' ? '📈' : player.marketValueTrend === 'down' ? '📉' : '➡️';

    return `
      <div class="animate-fade-in">
        <button class="btn btn-ghost mb-24" onclick="App.navigate('players')">← Geri Dön</button>
        
        <div class="two-col">
          <!-- Left: Profile -->
          <div>
            <div class="player-card" style="cursor:default;">
              <div class="player-card-header">
                <span class="badge badge-info player-position-badge">${player.positionShort} • ${this.escapeHtml(player.position)}</span>
                <div class="player-info">
                  <div class="player-avatar" style="width:80px;height:80px;font-size:36px;">⚽</div>
                  <div class="player-details">
                    <h3 style="font-size:26px;">${this.escapeHtml(player.name)}</h3>
                    <div class="player-team-age">
                      <span>${this.escapeHtml(player.currentTeam)}</span>
                      <span>•</span>
                      <span>${player.age} yaş</span>
                      <span>•</span>
                      <span>${player.nationality}</span>
                    </div>
                    <div class="player-value" style="font-size:18px;margin-top:8px;">${trendIcon} ${player.marketValue}</div>
                    <div class="text-muted" style="font-size:12px;margin-top:2px;">Sözleşme: ${player.contractEnd}</div>
                  </div>
                </div>
              </div>
              <div class="player-card-stats">
                <div class="player-stat">
                  <div class="stat-num">${player.stats.goals}</div>
                  <div class="stat-lbl">Gol</div>
                </div>
                <div class="player-stat">
                  <div class="stat-num">${player.stats.assists}</div>
                  <div class="stat-lbl">Asist</div>
                </div>
                <div class="player-stat">
                  <div class="stat-num">${player.stats.matches}</div>
                  <div class="stat-lbl">Maç</div>
                </div>
                <div class="player-stat">
                  <div class="stat-num">${player.stats.rating}</div>
                  <div class="stat-lbl">Puan</div>
                </div>
              </div>
              <div class="player-card-footer">
                <button class="btn btn-primary btn-sm" onclick="App.navigate('script?player=${player.id}')">📝 Senaryoya Aktar</button>
                <button class="btn btn-secondary btn-sm" onclick="App.navigate('thumbnail?player=${player.id}')">🎨 Thumbnail Yap</button>
              </div>
            </div>

            <!-- Performance Bars -->
            <div class="card mt-24">
              <div class="card-title">📊 Performans Detay</div>
              <div style="margin-top:16px;">
                ${this.createStatBar('Gol', player.stats.goals, 30, 'accent')}
                ${this.createStatBar('Asist', player.stats.assists, 20, 'accent')}
                ${this.createStatBar('Maç', player.stats.matches, 40, 'success')}
                ${this.createStatBar('Puan', player.stats.rating, 10, 'gs')}
                ${this.createStatBar('Sarı Kart', player.stats.yellowCards, 15, 'warning')}
                ${this.createStatBar('Kırmızı Kart', player.stats.redCards, 5, 'error')}
              </div>
            </div>
          </div>

          <!-- Right: Last 5 + Career -->
          <div>
            <!-- Last 5 Matches -->
            <div class="card">
              <div class="card-title">📅 Son 5 Maç</div>
              <table class="data-table" style="margin-top:12px;">
                <thead>
                  <tr>
                    <th>Tarih</th>
                    <th>Rakip</th>
                    <th>⚽</th>
                    <th>🅰️</th>
                    <th>⭐</th>
                  </tr>
                </thead>
                <tbody>
                  ${player.last5.map(m => `
                    <tr>
                      <td class="text-muted">${m.date}</td>
                      <td>${this.escapeHtml(m.opponent)}</td>
                      <td style="font-weight:700;${m.goals > 0 ? 'color:var(--success)' : ''}">${m.goals}</td>
                      <td style="font-weight:700;${m.assists > 0 ? 'color:var(--info)' : ''}">${m.assists}</td>
                      <td>
                        <span style="font-weight:700;color:${m.rating >= 8 ? 'var(--success)' : m.rating >= 7 ? 'var(--warning)' : 'var(--error)'}">${m.rating}</span>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <!-- Career History -->
            <div class="card mt-24">
              <div class="card-title">🏆 Kariyer</div>
              <table class="data-table" style="margin-top:12px;">
                <thead>
                  <tr>
                    <th>Takım</th>
                    <th>Yıllar</th>
                    <th>⚽ Gol</th>
                    <th>📋 Maç</th>
                  </tr>
                </thead>
                <tbody>
                  ${player.career.map(c => `
                    <tr>
                      <td style="font-weight:600;">${this.escapeHtml(c.team)}</td>
                      <td class="text-muted">${c.years}</td>
                      <td style="font-weight:700;">${c.goals}</td>
                      <td>${c.matches}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <!-- Quick Actions -->
            <div class="card mt-24">
              <div class="card-title">⚡ Hızlı Aksiyonlar</div>
              <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px;">
                <button class="btn btn-primary w-full" onclick="App.navigate('script?player=${player.id}')">📝 Video Senaryosu Oluştur</button>
                <button class="btn btn-secondary w-full" onclick="App.navigate('thumbnail?player=${player.id}')">🎨 YouTube Thumbnail Yap</button>
                <button class="btn btn-secondary w-full" onclick="App.copyPlayerStats('${player.id}')">📋 İstatistikleri Kopyala</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // ── Stat Bar ──
  createStatBar(label, value, max, colorClass = 'accent') {
    const pct = Math.min((value / max) * 100, 100);
    const colorMap = {
      accent: 'var(--accent)',
      success: 'var(--success)',
      warning: 'var(--warning)',
      error: 'var(--error)',
      gs: 'var(--gs-gold)',
      fb: 'var(--fb-navy)'
    };
    const color = colorMap[colorClass] || colorMap.accent;

    return `
      <div class="stat-bar-group">
        <div class="stat-bar-label">
          <span>${label}</span>
          <span class="stat-bar-value">${value}</span>
        </div>
        <div class="stat-bar">
          <div class="stat-bar-fill" style="width:${pct}%;background:${color};"></div>
        </div>
      </div>
    `;
  },

  // ── Source Card ──
  createSourceCard(source) {
    const teamClass = source.team === 'GS' ? 'gs' : source.team === 'FB' ? 'fb' : 'general';
    const reliabilityColor = source.reliability >= 85 ? 'var(--success)' : source.reliability >= 70 ? 'var(--warning)' : 'var(--error)';

    return `
      <div class="source-card" data-source-id="${source.id}">
        <div class="source-avatar ${teamClass}">${source.avatar}</div>
        <div class="source-info">
          <div class="source-name">${this.escapeHtml(source.name)}</div>
          <div class="source-handle">${this.escapeHtml(source.handle)} • <span class="badge badge-${teamClass === 'general' ? 'info' : teamClass}" style="font-size:10px;">${source.team}</span></div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">${source.newsCount || 0} haber ${source.lastDate ? '• Son: ' + timeAgo(source.lastDate) : ''}</div>
        </div>
        <div class="source-reliability">
          <div class="reliability-value" style="color:${reliabilityColor}">%${source.reliability}</div>
          <div class="reliability-label">Güvenilirlik</div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="App.deleteSource('${source.id}')" title="Sil" style="color:var(--error);margin-left:8px;">🗑️</button>
      </div>
    `;
  },

  // ── Toast Notification ──
  showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const iconMap = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${iconMap[type]}</span>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-out');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  // ── Modal ──
  showModal(title, bodyHtml, footerHtml = '') {
    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;

    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="modal-close" onclick="UI.closeModal()">✕</button>
        </div>
        <div class="modal-body">${bodyHtml}</div>
        ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
      </div>
    `;
    overlay.classList.add('active');

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) UI.closeModal();
    });
  },

  closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.classList.remove('active');
  },

  // ── Empty State ──
  createEmptyState(icon, title, text, actionHtml = '') {
    return `
      <div class="empty-state">
        <div class="empty-icon">${icon}</div>
        <div class="empty-title">${title}</div>
        <div class="empty-text">${text}</div>
        ${actionHtml}
      </div>
    `;
  },

  // ── Mini Calendar ──
  createMiniCalendar(contentDates = []) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = now.getDate();

    const dayNames = ['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'];
    const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

    let html = `<div style="text-align:center;font-weight:700;margin-bottom:12px;font-size:14px;">${monthNames[month]} ${year}</div>`;
    html += '<div class="calendar-mini">';

    // Day headers
    dayNames.forEach(d => {
      html += `<div class="calendar-day-header">${d}</div>`;
    });

    // Empty cells before first day
    const startDay = firstDay === 0 ? 6 : firstDay - 1; // Monday start
    for (let i = 0; i < startDay; i++) {
      html += '<div class="calendar-day"></div>';
    }

    // Days
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = d === today;
      const hasContent = contentDates.includes(d);
      html += `<div class="calendar-day ${isToday ? 'today' : ''} ${hasContent ? 'has-content' : ''}">${d}</div>`;
    }

    html += '</div>';
    return html;
  },

  // ── Helper: Escape HTML ──
  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};
