// inerWeb Fluide — © 2026 Franck Henninot — Tous droits réservés (voir LICENSE) — inerweb.ovh
// ============================================================
// Shim DOM minimal partagé par les tests (V9.1). Aucune dépendance
// nouvelle : mini-parseur HTML + querySelector/querySelectorAll
// basiques (#id, .classe, [attribut], balise) + assez d'API pour
// dérouler du code applicatif écrit pour un vrai navigateur (modale,
// wizard, étiquette QR) SANS canvas ni layout réel.
//
// N'EST PAS un test en soi : importé par les fichiers test-*.mjs qui
// en ont besoin (v8/js/wizard/test-wizard.mjs, etc.).
// ============================================================

export class ElementFactice {
  constructor(tag) {
    this.tagName = String(tag || 'div').toUpperCase();
    this.attributs = new Map();
    this.enfants = [];
    this.parent = null;
    this.ecouteurs = {};
    this._innerHTML = '';
    this._value = '';
    this._classes = new Set();
    this._id = '';
    this.offsetParent = {}; // « visible » par défaut pour piegerFocus()
  }

  get id() { return this._id; }
  set id(v) { this._id = v; this.attributs.set('id', v); }

  get className() { return Array.from(this._classes).join(' '); }
  set className(v) {
    this._classes = new Set(String(v).split(/\s+/).filter(Boolean));
  }

  get classList() {
    const self = this;
    return {
      add(...cls) { cls.forEach((c) => self._classes.add(c)); },
      remove(...cls) { cls.forEach((c) => self._classes.delete(c)); },
      toggle(c, force) {
        if (force === undefined) {
          if (self._classes.has(c)) self._classes.delete(c); else self._classes.add(c);
        } else if (force) self._classes.add(c); else self._classes.delete(c);
      },
      contains(c) { return self._classes.has(c); }
    };
  }

  get value() { return this._value; }
  set value(v) { this._value = v; }

  get dataset() {
    const proxy = {};
    for (const [cle, valeur] of this.attributs) {
      if (cle.startsWith('data-')) {
        const cleCamel = cle.slice(5).replace(/-([a-z])/g, (_, l) => l.toUpperCase());
        proxy[cleCamel] = valeur;
      }
    }
    return proxy;
  }

  get style() { return this._style || (this._style = {}); }

  get disabled() { return this.attributs.get('disabled') !== undefined; }
  set disabled(v) {
    if (v) this.attributs.set('disabled', ''); else this.attributs.delete('disabled');
  }

  // childNodes / offsetWidth / offsetHeight : lus tels quels par la lib
  // QR vendored (mode <table> de repli, cf. lib/qrcode.js) — valeurs
  // factices raisonnables (0), suffisantes pour ne jamais planter.
  get childNodes() { return this.enfants; }
  get offsetWidth() { return 0; }
  get offsetHeight() { return 0; }

  get textContent() {
    return this.enfants.map((e) => (typeof e === 'string' ? e : e.textContent)).join('');
  }
  set textContent(v) {
    this.enfants = [String(v)];
  }

  focus() { globalThis.document && (globalThis.document._activeElement = this); }
  click() { this.declencher('click'); }

  setAttribute(nom, valeur) {
    this.attributs.set(nom, String(valeur));
    if (nom === 'id') this._id = String(valeur);
    if (nom === 'class') this._classes = new Set(String(valeur).split(/\s+/).filter(Boolean));
  }
  getAttribute(nom) {
    return this.attributs.has(nom) ? this.attributs.get(nom) : null;
  }
  hasAttribute(nom) { return this.attributs.has(nom); }
  removeAttribute(nom) { this.attributs.delete(nom); }

  appendChild(enfant) {
    if (enfant && typeof enfant === 'object') enfant.parent = this;
    this.enfants.push(enfant);
    return enfant;
  }
  removeChild(enfant) {
    const i = this.enfants.indexOf(enfant);
    if (i >= 0) this.enfants.splice(i, 1);
    return enfant;
  }
  get lastChild() { return this.enfants[this.enfants.length - 1]; }
  hasChildNodes() { return this.enfants.length > 0; }
  remove() {
    if (this.parent) {
      const i = this.parent.enfants.indexOf(this);
      if (i >= 0) this.parent.enfants.splice(i, 1);
    }
  }

  set innerHTML(html) {
    this._innerHTML = html;
    this.enfants = parserHTML(html);
    this.enfants.forEach((e) => { if (e && typeof e !== 'string') e.parent = this; });
  }
  get innerHTML() { return this._innerHTML; }

  addEventListener(type, gestionnaire) {
    (this.ecouteurs[type] = this.ecouteurs[type] || []).push(gestionnaire);
  }
  removeEventListener(type, gestionnaire) {
    const liste = this.ecouteurs[type];
    if (!liste) return;
    const i = liste.indexOf(gestionnaire);
    if (i >= 0) liste.splice(i, 1);
  }
  declencher(type, evenement = {}) {
    (this.ecouteurs[type] || []).forEach((fn) => fn({ target: this, preventDefault() {}, ...evenement }));
  }

  /** Parcours en profondeur de soi + descendants. */
  *parcours() {
    yield this;
    for (const e of this.enfants) {
      if (e && typeof e !== 'string') yield* e.parcours();
    }
  }

  querySelector(selecteur) {
    for (const el of this.parcours()) {
      if (el !== this && correspondSelecteur(el, this, selecteur)) return el;
    }
    return null;
  }
  querySelectorAll(selecteur) {
    const trouves = [];
    for (const el of this.parcours()) {
      if (el !== this && correspondSelecteur(el, this, selecteur)) trouves.push(el);
    }
    return trouves;
  }
}

/**
 * Sélecteur CSS restreint : descendance par espace (« .a .b »), et par
 * token une combinaison quelconque de balise/#id/.classe/[attribut]
 * accolés (« button.carte-choix », « .wizard-etape.active »).
 * @param {ElementFactice} el - élément candidat
 * @param {ElementFactice} racine - portée de la recherche (this de l'appelant)
 * @param {string} selecteur
 */
function correspondSelecteur(el, racine, selecteur) {
  const tokens = selecteur.trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return false;
  const dernier = tokens[tokens.length - 1];
  if (!correspondToken(el, dernier)) return false;
  if (tokens.length === 1) return true;
  // Vérifie que chaque ancêtre requis se retrouve, dans l'ordre, en
  // remontant depuis el jusqu'à racine (algorithme simple, suffisant
  // pour les sélecteurs à 2 niveaux utilisés dans le code applicatif).
  let courant = el.parent;
  for (let i = tokens.length - 2; i >= 0; i -= 1) {
    let trouve = false;
    while (courant && courant !== racine.parent) {
      if (correspondToken(courant, tokens[i])) { trouve = true; break; }
      courant = courant.parent;
    }
    if (!trouve) return false;
    courant = courant.parent;
  }
  return true;
}

/** Un token de sélecteur : balise, #id, .classe(s), [attribut] combinés. */
function correspondToken(el, token) {
  const re = /(#[a-zA-Z0-9_-]+)|(\.[a-zA-Z0-9_-]+)|(\[[a-zA-Z0-9-]+(="[^"]*")?\])|^([a-zA-Z][a-zA-Z0-9-]*)/g;
  let m;
  let reste = token;
  let matched = false;
  while ((m = re.exec(token))) {
    matched = true;
    const morceau = m[0];
    if (morceau.startsWith('#')) {
      if (el.id !== morceau.slice(1)) return false;
    } else if (morceau.startsWith('.')) {
      if (!el._classes || !el._classes.has(morceau.slice(1))) return false;
    } else if (morceau.startsWith('[')) {
      const mm = morceau.match(/^\[([a-zA-Z0-9-]+)(="([^"]*)")?\]$/);
      const [, attr, , val] = mm;
      if (!el.attributs || !el.attributs.has(attr)) return false;
      if (val !== undefined && el.attributs.get(attr) !== val) return false;
    } else {
      if (el.tagName !== morceau.toUpperCase()) return false;
    }
  }
  return matched;
}

/** Parseur HTML minimal : balises ouvrantes/fermantes, attributs, texte. */
function parserHTML(html) {
  const racine = new ElementFactice('root');
  const pile = [racine];
  const AUTO_FERMANTES = new Set(['input', 'br', 'hr', 'img']);

  const re = /<!--[\s\S]*?-->|<\/([a-zA-Z0-9-]+)\s*>|<([a-zA-Z0-9-]+)((?:\s+[a-zA-Z0-9-]+(?:="[^"]*"|='[^']*')?)*)\s*\/?>|([^<]+)/g;
  let m;
  while ((m = re.exec(html))) {
    const [, ferm, ouvr, attrsStr, texte] = m;
    if (ferm) {
      for (let i = pile.length - 1; i > 0; i--) {
        if (pile[i].tagName === ferm.toUpperCase()) {
          pile.length = i;
          break;
        }
      }
    } else if (ouvr) {
      const el = new ElementFactice(ouvr);
      if (attrsStr) {
        const reAttr = /([a-zA-Z0-9-]+)(?:=("([^"]*)"|'([^']*)'))?/g;
        let a;
        while ((a = reAttr.exec(attrsStr))) {
          const [, nom, , valDouble, valSimple] = a;
          const val = valDouble !== undefined ? valDouble : (valSimple !== undefined ? valSimple : '');
          el.setAttribute(nom, decoderEntites(val));
        }
      }
      pile[pile.length - 1].appendChild(el);
      if (!AUTO_FERMANTES.has(ouvr.toLowerCase())) pile.push(el);
    } else if (texte && texte.trim() !== '') {
      pile[pile.length - 1].appendChild(decoderEntites(texte));
    }
  }
  return racine.enfants;
}

function decoderEntites(s) {
  return String(s)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * Installe un document + window factices sur globalThis. À appeler
 * AVANT d'importer tout module applicatif qui touche au DOM à l'import
 * (ex. lib/qrcode.js détecte document.documentElement dès son exécution).
 * @returns {{ document: object, window: object }}
 */
export function installerDocumentFactice() {
  const racine = new ElementFactice('document');
  racine.tagName = 'DOCUMENT';
  const documentElement = new ElementFactice('html');
  const head = new ElementFactice('head');
  const body = new ElementFactice('body');
  racine.appendChild(documentElement);
  documentElement.appendChild(head);
  documentElement.appendChild(body);

  const doc = {
    documentElement,
    head,
    body,
    _activeElement: body,
    get activeElement() { return doc._activeElement; },
    createElement(tag) { return new ElementFactice(tag); },
    createElementNS(_ns, tag) { return new ElementFactice(tag); },
    createDocumentFragment() {
      const frag = new ElementFactice('fragment');
      frag.appendChild = ElementFactice.prototype.appendChild.bind(frag);
      return frag;
    },
    getElementById(id) {
      for (const el of racine.parcours()) if (el.id === id) return el;
      return null;
    },
    querySelector(sel) { return racine.querySelector(sel); },
    querySelectorAll(sel) { return racine.querySelectorAll(sel); },
    addEventListener() {},
    removeEventListener() {}
  };

  const win = {
    location: { hash: '' },
    addEventListener() {},
    removeEventListener() {},
    print() {},
    confirm: () => true
  };

  globalThis.document = doc;
  globalThis.window = win;
  globalThis.requestAnimationFrame = (fn) => { fn(); return 0; };

  return { document: doc, window: win };
}
