/* ============================================
   Transfer Radar — Thumbnail Generator
   HTML5 Canvas API for YouTube thumbnails
   ============================================ */

const ThumbnailGenerator = {
  // Constants for 1280x720 (Standard YouTube)
  WIDTH: 1280,
  HEIGHT: 720,
  
  templates: {
    'breaking': {
      id: 'breaking',
      name: '🔥 Transfer Bombası',
      icon: '🔥',
      bgType: 'gradient',
      bgColors: ['#1a0000', '#ff0033'], // Dark red to bright red
      textColor: '#ffffff',
      accentColor: '#FFD700', // Gold
      overlay: 'fire'
    },
    'confirmed': {
      id: 'confirmed',
      name: '✅ Resmi Transfer',
      icon: '✅',
      bgType: 'gradient',
      bgColors: ['#001a0a', '#00e676'], // Dark green to bright green
      textColor: '#ffffff',
      accentColor: '#ffffff',
      overlay: 'check'
    },
    'denied': {
      id: 'denied',
      name: '❌ Yalanlandı',
      icon: '❌',
      bgType: 'gradient',
      bgColors: ['#1a1a2e', '#4a4a6a'], // Dark blue/gray
      textColor: '#ffffff',
      accentColor: '#ff5252', // Red
      overlay: 'cross'
    },
    'vs': {
      id: 'vs',
      name: '🆚 Karşılaştırma',
      icon: '⚔️',
      bgType: 'split',
      bgColors: ['#FF1744', '#1A237E'], // GS vs FB defaults
      textColor: '#ffffff',
      accentColor: '#FFD700',
      overlay: 'vs'
    }
  },

  // State
  currentCanvas: null,
  ctx: null,
  currentConfig: null,

  // ── Initialize ──
  init(canvasId) {
    this.currentCanvas = document.getElementById(canvasId);
    if (!this.currentCanvas) {
      console.error('Canvas not found:', canvasId);
      return false;
    }
    
    // Set actual size
    this.currentCanvas.width = this.WIDTH;
    this.currentCanvas.height = this.HEIGHT;
    this.ctx = this.currentCanvas.getContext('2d');
    
    // Default config
    this.currentConfig = {
      templateId: 'breaking',
      title: 'SON DAKİKA',
      subtitle: 'TRANSFER HABERİ',
      playerName: 'VICTOR OSIMHEN',
      teamTheme: 'GS', // GS or FB
      value: '€75M',
      showStats: true,
      statsText: '18 GOL | 5 ASİST',
      customImageSrc: null // URL to custom image if uploaded
    };
    
    return true;
  },

  // ── Render ──
  async render(config = null) {
    if (config) {
      this.currentConfig = { ...this.currentConfig, ...config };
    }
    
    const cfg = this.currentConfig;
    const template = this.templates[cfg.templateId];
    
    if (!this.ctx || !template) return;
    
    // 1. Background
    this._drawBackground(template, cfg.teamTheme);
    
    // 2. Effects/Overlay
    this._drawOverlay(template.overlay);
    
    // 3. Player Image Placeholder (or real image if provided)
    await this._drawPlayerImage(cfg.customImageSrc, cfg.teamTheme);
    
    // 4. Text & Typography
    this._drawText(cfg, template);
    
    // 5. Badges/Stats
    if (cfg.showStats) {
      this._drawStatsBadge(cfg.statsText, cfg.value);
    }
    
    // 6. Branding
    this._drawBranding();
  },

  // ── Draw Methods ──
  _drawBackground(template, teamTheme) {
    let colors = template.bgColors;
    
    // Override colors if team theme is selected and template is breaking/confirmed
    if ((template.id === 'breaking' || template.id === 'confirmed') && teamTheme) {
       if (teamTheme === 'GS') colors = ['#800000', '#FF1744']; // GS Red
       if (teamTheme === 'FB') colors = ['#000033', '#1A237E']; // FB Navy
    }
    
    if (template.bgType === 'split') {
      // Diagonal split
      this.ctx.fillStyle = colors[0];
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.lineTo(this.WIDTH, 0);
      this.ctx.lineTo(0, this.HEIGHT);
      this.ctx.fill();
      
      this.ctx.fillStyle = colors[1];
      this.ctx.beginPath();
      this.ctx.moveTo(this.WIDTH, 0);
      this.ctx.lineTo(this.WIDTH, this.HEIGHT);
      this.ctx.lineTo(0, this.HEIGHT);
      this.ctx.fill();
      
      // Separator line
      this.ctx.strokeStyle = '#FFD700';
      this.ctx.lineWidth = 10;
      this.ctx.beginPath();
      this.ctx.moveTo(0, this.HEIGHT);
      this.ctx.lineTo(this.WIDTH, 0);
      this.ctx.stroke();
    } else {
      // Radial Gradient from center-right
      const grad = this.ctx.createRadialGradient(
        this.WIDTH * 0.7, this.HEIGHT * 0.5, 0,
        this.WIDTH * 0.5, this.HEIGHT * 0.5, this.WIDTH
      );
      grad.addColorStop(0, colors[1]);
      grad.addColorStop(1, colors[0]);
      
      this.ctx.fillStyle = grad;
      this.ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);
    }
  },

  _drawOverlay(type) {
    this.ctx.save();
    
    // Vignette
    const vignette = this.ctx.createRadialGradient(
      this.WIDTH/2, this.HEIGHT/2, this.HEIGHT/2,
      this.WIDTH/2, this.HEIGHT/2, this.WIDTH
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.6)');
    this.ctx.fillStyle = vignette;
    this.ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);

    // Subtle Grid
    this.ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    this.ctx.lineWidth = 2;
    for (let x = 0; x < this.WIDTH; x += 100) {
      this.ctx.beginPath(); this.ctx.moveTo(x, 0); this.ctx.lineTo(x, this.HEIGHT); this.ctx.stroke();
    }
    for (let y = 0; y < this.HEIGHT; y += 100) {
      this.ctx.beginPath(); this.ctx.moveTo(0, y); this.ctx.lineTo(this.WIDTH, y); this.ctx.stroke();
    }

    this.ctx.restore();
  },

  async _drawPlayerImage(src, teamTheme) {
    if (src) {
      try {
        const img = await this._loadImage(src);
        // Draw image on the right side
        // Very basic fitting
        const scale = Math.min(this.WIDTH * 0.6 / img.width, this.HEIGHT * 0.9 / img.height);
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        const x = this.WIDTH - drawW - 50;
        const y = this.HEIGHT - drawH;
        
        // Shadow for depth
        this.ctx.shadowColor = 'rgba(0,0,0,0.8)';
        this.ctx.shadowBlur = 40;
        this.ctx.shadowOffsetX = -10;
        this.ctx.drawImage(img, x, y, drawW, drawH);
        this.ctx.shadowBlur = 0; // reset
        
      } catch (e) {
        console.warn('Could not load custom image, using placeholder.', e);
        this._drawPlaceholderSilhouette(teamTheme);
      }
    } else {
      this._drawPlaceholderSilhouette(teamTheme);
    }
  },

  _drawPlaceholderSilhouette(teamTheme) {
    this.ctx.save();
    
    const x = this.WIDTH - 450;
    const y = this.HEIGHT;
    
    // Draw a stylized generic player silhouette
    this.ctx.fillStyle = 'rgba(0,0,0,0.6)';
    this.ctx.shadowColor = 'rgba(0,0,0,0.9)';
    this.ctx.shadowBlur = 50;
    
    this.ctx.beginPath();
    // Head
    this.ctx.arc(x + 150, y - 500, 70, 0, Math.PI * 2);
    // Shoulders
    this.ctx.moveTo(x + 150, y - 430);
    this.ctx.bezierCurveTo(x + 300, y - 400, x + 350, y - 200, x + 350, y);
    this.ctx.lineTo(x - 50, y);
    this.ctx.bezierCurveTo(x - 50, y - 200, x, y - 400, x + 150, y - 430);
    this.ctx.fill();

    // Add a glowing outline based on team
    let glowColor = '#FF0033';
    if (teamTheme === 'GS') glowColor = '#FFD700';
    if (teamTheme === 'FB') glowColor = '#FFEB3B';

    this.ctx.strokeStyle = glowColor;
    this.ctx.lineWidth = 5;
    this.ctx.stroke();

    // "FOTOĞRAF" text
    this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
    this.ctx.font = '900 48px Inter';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('FUTBOLCU', x + 150, y - 200);

    this.ctx.restore();
  },

  _drawText(cfg, template) {
    this.ctx.save();
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';

    const paddingX = 80;
    let currentY = 120;

    // ── Subtitle (e.g. "TRANSFER HABERİ") ──
    if (cfg.subtitle) {
      this.ctx.fillStyle = template.accentColor;
      this.ctx.font = '800 36px Inter';
      this.ctx.fillText(cfg.subtitle.toUpperCase(), paddingX, currentY);
      currentY += 50;
    }

    // ── Main Title (e.g. "SON DAKİKA") ──
    if (cfg.title) {
      this.ctx.fillStyle = template.textColor;
      // Shadow for pop
      this.ctx.shadowColor = 'rgba(0,0,0,0.8)';
      this.ctx.shadowOffsetX = 4;
      this.ctx.shadowOffsetY = 4;
      this.ctx.shadowBlur = 10;
      
      this.ctx.font = '900 110px Inter';
      this.ctx.fillText(cfg.title.toUpperCase(), paddingX - 5, currentY); // slight offset for tight kerning feel
      currentY += 120;
      
      this.ctx.shadowColor = 'transparent'; // reset
    }

    // ── Player Name ──
    if (cfg.playerName) {
      // Wrap text in a box
      this.ctx.font = '900 72px Inter';
      const textMetrics = this.ctx.measureText(cfg.playerName.toUpperCase());
      const boxWidth = textMetrics.width + 40;
      const boxHeight = 90;

      // Box background
      let boxColor = '#FF0000';
      if (cfg.teamTheme === 'GS') boxColor = '#FFD700';
      if (cfg.teamTheme === 'FB') boxColor = '#FFEB3B';

      this.ctx.fillStyle = boxColor;
      this.ctx.beginPath();
      this.ctx.roundRect(paddingX, currentY, boxWidth, boxHeight, 10);
      this.ctx.fill();

      // Text inside box
      this.ctx.fillStyle = (cfg.teamTheme === 'GS' || cfg.teamTheme === 'FB') ? '#000000' : '#FFFFFF';
      this.ctx.fillText(cfg.playerName.toUpperCase(), paddingX + 20, currentY + 10);
    }

    this.ctx.restore();
  },

  _drawStatsBadge(statsText, value) {
    this.ctx.save();
    
    // Draw at bottom left
    const startX = 80;
    const startY = this.HEIGHT - 120;

    // Stats Pill
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.roundRect(startX, startY, 450, 60, 30);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.font = '800 28px Inter';
    this.ctx.textBaseline = 'middle';
    
    // Value part (Green)
    this.ctx.fillStyle = '#00E676';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`💶 ${value}`, startX + 25, startY + 30);

    // Divider
    this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
    this.ctx.fillRect(startX + 180, startY + 15, 2, 30);

    // Stats part (White)
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillText(statsText, startX + 200, startY + 30);

    this.ctx.restore();
  },

  _drawBranding() {
    this.ctx.save();
    this.ctx.font = '800 24px Inter';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.textAlign = 'right';
    this.ctx.textBaseline = 'bottom';
    this.ctx.fillText('TRANSFER RADAR', this.WIDTH - 40, this.HEIGHT - 30);
    
    // YouTube Icon approx
    this.ctx.fillStyle = 'rgba(255, 0, 0, 0.6)';
    this.ctx.beginPath();
    this.ctx.roundRect(this.WIDTH - 290, this.HEIGHT - 55, 40, 28, 6);
    this.ctx.fill();
    this.ctx.fillStyle = '#FFF';
    this.ctx.beginPath();
    this.ctx.moveTo(this.WIDTH - 275, this.HEIGHT - 48);
    this.ctx.lineTo(this.WIDTH - 265, this.HEIGHT - 41);
    this.ctx.lineTo(this.WIDTH - 275, this.HEIGHT - 34);
    this.ctx.fill();
    
    this.ctx.restore();
  },

  // ── Utilities ──
  _loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  },

  download(filename = 'thumbnail.png') {
    if (!this.currentCanvas) return;
    const link = document.createElement('a');
    link.download = filename;
    link.href = this.currentCanvas.toDataURL('image/png');
    link.click();
  }
};
