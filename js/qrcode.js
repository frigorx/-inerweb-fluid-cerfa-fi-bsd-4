/**
 * inerWeb Fluide - QR Code Module v1.0
 * Génération et scan de QR codes pour machines et bouteilles
 */

const QRModule = {

  // Générer l'URL d'un QR code via API Google Charts (fiable et sans dépendance)
  getQRUrl(text, size = 200) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&margin=4`;
  },

  // Construire le contenu encodé dans le QR code
  buildQRData(type, code) {
    return `INERWEB:${type}:${code}`;
  },

  // Décoder un QR scanné
  parseQRData(raw) {
    const str = (raw || '').trim();
    // Format INERWEB:MACHINE:MAC-042 ou INERWEB:BOUTEILLE:BOT-001
    if (str.startsWith('INERWEB:')) {
      const parts = str.split(':');
      if (parts.length >= 3) {
        return { type: parts[1].toUpperCase(), code: parts.slice(2).join(':') };
      }
    }
    // Fallback : texte brut = code direct
    return { type: 'INCONNU', code: str };
  },

  // ========== GÉNÉRATION QR CODES ==========

  /**
   * Affiche un QR code dans un élément HTML
   */
  renderQR(containerId, type, code, label = '') {
    const el = document.getElementById(containerId);
    if (!el) return;
    const data = this.buildQRData(type, code);
    const url = this.getQRUrl(data, 180);
    el.innerHTML = `
      <div style="text-align:center;padding:8px;">
        <img src="${url}" alt="QR ${code}" style="width:150px;height:150px;border:1px solid #ddd;border-radius:4px;">
        <div style="font-weight:bold;font-size:13px;margin-top:6px;">${code}</div>
        ${label ? `<div style="font-size:11px;color:#666;">${label}</div>` : ''}
      </div>
    `;
  },

  /**
   * Ouvre une fenêtre d'impression avec les QR codes de toutes les machines et/ou bouteilles
   */
  printQRCodes(options = {}) {
    const { machines = true, bouteilles = true } = options;
    const items = [];

    if (machines && State.machines) {
      State.machines.forEach(m => {
        items.push({
          type: 'MACHINE',
          code: m.code || m.id,
          label: m.nom || m.designation || '',
          detail: m.fluide ? `${m.fluide} — ${m.chargeActuelle || m.charge || '?'} kg` : ''
        });
      });
    }

    if (bouteilles && State.bouteilles) {
      State.bouteilles.forEach(b => {
        items.push({
          type: 'BOUTEILLE',
          code: b.code || b.id,
          label: b.fluide || '',
          detail: `${parseFloat(b.stockActuel || 0).toFixed(2)} kg — ${b.categorie || ''}`
        });
      });
    }

    if (items.length === 0) {
      UI.toast('Aucun équipement à imprimer', 'warning');
      return;
    }

    // Générer la page d'impression
    const win = window.open('', '_blank', 'width=800,height=1000');
    let html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>QR Codes — inerWeb Fluide</title>
    <style>
      @page { size: A4; margin: 10mm; }
      @media print { .no-print { display: none !important; } }
      body { font-family: Calibri, Arial, sans-serif; margin: 0; padding: 10px; }
      .header { text-align: center; margin-bottom: 16px; border-bottom: 2px solid #1b3a63; padding-bottom: 8px; }
      .header h1 { font-size: 18px; color: #1b3a63; margin: 0; }
      .header p { font-size: 11px; color: #666; margin: 4px 0 0; }
      .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
      .qr-card {
        border: 1.5px solid #000;
        border-radius: 6px;
        padding: 8px;
        text-align: center;
        page-break-inside: avoid;
      }
      .qr-card img { width: 120px; height: 120px; }
      .qr-type { font-size: 9px; text-transform: uppercase; color: #fff; padding: 2px 8px; border-radius: 10px; display: inline-block; margin-bottom: 4px; }
      .qr-type.machine { background: #1b3a63; }
      .qr-type.bouteille { background: #e8914a; }
      .qr-code { font-size: 14px; font-weight: bold; margin: 4px 0; }
      .qr-label { font-size: 11px; color: #333; }
      .qr-detail { font-size: 10px; color: #888; }
      .btn-print { display: block; margin: 16px auto; padding: 12px 32px; font-size: 16px; background: #1b3a63; color: white; border: none; border-radius: 8px; cursor: pointer; }
      .btn-print:hover { background: #2a4f7f; }
    </style></head><body>
    <div class="header">
      <h1>QR Codes — inerWeb Fluide</h1>
      <p>Imprimez et collez ces étiquettes sur vos équipements</p>
    </div>
    <button class="btn-print no-print" onclick="window.print()">Imprimer les étiquettes</button>
    <div class="grid">`;

    items.forEach(item => {
      const qrData = this.buildQRData(item.type, item.code);
      const qrUrl = this.getQRUrl(qrData, 200);
      const typeClass = item.type.toLowerCase();
      html += `
        <div class="qr-card">
          <span class="qr-type ${typeClass}">${item.type === 'MACHINE' ? 'Machine' : 'Bouteille'}</span>
          <div><img src="${qrUrl}" alt="${item.code}"></div>
          <div class="qr-code">${item.code}</div>
          <div class="qr-label">${item.label}</div>
          <div class="qr-detail">${item.detail}</div>
        </div>`;
    });

    html += '</div></body></html>';
    win.document.write(html);
    win.document.close();
    win.document.title = 'QR Codes — inerWeb Fluide';
  },

  // ========== SCANNER QR CODE ==========

  _scannerActive: false,
  _scanCallback: null,
  _videoStream: null,

  /**
   * Ouvre le scanner QR dans une modale
   * @param {Function} callback - appelé avec { type, code } quand un QR est scanné
   */
  openScanner(callback) {
    this._scanCallback = callback;

    // Créer la modale scanner si elle n'existe pas
    let overlay = document.getElementById('qr-scanner-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'qr-scanner-overlay';
      overlay.innerHTML = `
        <div style="position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:10000;display:flex;flex-direction:column;align-items:center;justify-content:center;">
          <div style="background:white;border-radius:12px;padding:20px;max-width:400px;width:90%;text-align:center;">
            <h3 style="margin:0 0 12px;color:#1b3a63;">Scanner un QR code</h3>
            <p style="font-size:13px;color:#666;margin:0 0 12px;">Pointez la caméra vers le QR code de la machine ou bouteille</p>
            <div id="qr-video-container" style="position:relative;width:100%;aspect-ratio:1;background:#000;border-radius:8px;overflow:hidden;margin-bottom:12px;">
              <video id="qr-video" style="width:100%;height:100%;object-fit:cover;" autoplay playsinline></video>
              <div style="position:absolute;inset:20%;border:3px solid #e8914a;border-radius:12px;pointer-events:none;"></div>
            </div>
            <div id="qr-scan-status" style="font-size:13px;color:#666;margin-bottom:12px;">En attente...</div>
            <div style="display:flex;gap:8px;justify-content:center;">
              <button id="qr-scan-cancel" style="padding:10px 24px;background:#DC2626;color:white;border:none;border-radius:8px;cursor:pointer;font-size:14px;">Annuler</button>
              <button id="qr-scan-manual" style="padding:10px 24px;background:#64748B;color:white;border:none;border-radius:8px;cursor:pointer;font-size:14px;">Saisie manuelle</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
    }
    overlay.classList.remove('hidden');
    overlay.style.display = '';

    // Bouton annuler
    document.getElementById('qr-scan-cancel').onclick = () => this.closeScanner();

    // Bouton saisie manuelle
    document.getElementById('qr-scan-manual').onclick = () => {
      this.closeScanner();
      const code = prompt('Entrez le code de la machine ou bouteille :');
      if (code && this._scanCallback) {
        // Chercher si c'est une machine ou une bouteille
        const machine = State.machines.find(m => (m.code || m.id) === code.trim());
        const bouteille = State.bouteilles.find(b => (b.code || b.id) === code.trim());
        if (machine) {
          this._scanCallback({ type: 'MACHINE', code: code.trim() });
        } else if (bouteille) {
          this._scanCallback({ type: 'BOUTEILLE', code: code.trim() });
        } else {
          this._scanCallback({ type: 'INCONNU', code: code.trim() });
        }
      }
    };

    this.startCamera();
  },

  async startCamera() {
    const video = document.getElementById('qr-video');
    const status = document.getElementById('qr-scan-status');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 640 } }
      });
      this._videoStream = stream;
      video.srcObject = stream;
      this._scannerActive = true;
      status.textContent = 'Caméra active — scannez le QR code';
      status.style.color = '#16A34A';

      // Scanner en boucle avec Canvas + jsQR (inline minimal)
      this.scanLoop(video);
    } catch (err) {
      console.error('Caméra non disponible:', err);
      status.textContent = 'Caméra non disponible — utilisez la saisie manuelle';
      status.style.color = '#DC2626';
    }
  },

  scanLoop(video) {
    if (!this._scannerActive) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const scan = () => {
      if (!this._scannerActive) return;

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Utiliser BarcodeDetector si disponible (Chrome, Edge, Android)
        if ('BarcodeDetector' in window) {
          const detector = new BarcodeDetector({ formats: ['qr_code'] });
          detector.detect(canvas).then(barcodes => {
            if (barcodes.length > 0) {
              this.onQRDetected(barcodes[0].rawValue);
              return;
            }
            requestAnimationFrame(scan);
          }).catch(() => requestAnimationFrame(scan));
        } else {
          // Fallback : essayer de lire avec l'API ImageData (simple pattern matching)
          // Sur les navigateurs sans BarcodeDetector, proposer saisie manuelle
          const status = document.getElementById('qr-scan-status');
          if (status) {
            status.textContent = 'Scanner QR non supporté sur ce navigateur — utilisez la saisie manuelle';
            status.style.color = '#D97706';
          }
        }
      } else {
        requestAnimationFrame(scan);
      }
    };

    requestAnimationFrame(scan);
  },

  onQRDetected(rawValue) {
    this._scannerActive = false;
    const status = document.getElementById('qr-scan-status');
    if (status) {
      status.textContent = 'QR détecté : ' + rawValue;
      status.style.color = '#16A34A';
    }

    // Vibration feedback
    if (navigator.vibrate) navigator.vibrate(200);

    const parsed = this.parseQRData(rawValue);

    setTimeout(() => {
      this.closeScanner();
      if (this._scanCallback) {
        this._scanCallback(parsed);
      }
    }, 500);
  },

  closeScanner() {
    this._scannerActive = false;

    // Arrêter la caméra
    if (this._videoStream) {
      this._videoStream.getTracks().forEach(t => t.stop());
      this._videoStream = null;
    }

    const overlay = document.getElementById('qr-scanner-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
  }
};
