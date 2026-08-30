import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, 'svg');
fs.mkdirSync(OUT, { recursive: true });

const C = {
  navy: '#1B3A63', ink: '#10233C', orange: '#C9451A', blue: '#3D7FCA',
  soft: '#84B7EC', green: '#1E7E54', red: '#C0392B', amber: '#B06A00',
  line: '#B8C7D9', pale: '#F3F7FB', white: '#FFFFFF',
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const text = (x, y, value, cls = 'body', anchor = 'start') =>
  `<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}">${esc(value)}</text>`;
const fitText = (x, y, value, cls, maxWidth, anchor = 'start') => {
  const fontSize = { title: 54, subtitle: 32, body: 36, small: 30, tiny: 25, 'panel-title': 34, equip: 27 }[cls] || 30;
  const estimatedWidth = String(value).length * fontSize * 0.56;
  const adjustedSize = estimatedWidth > maxWidth
    ? Math.max(18, Math.floor(maxWidth / (String(value).length * 0.56)))
    : fontSize;
  const fit = adjustedSize < fontSize ? ` style="font-size:${adjustedSize}px"` : '';
  return `<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}"${fit}>${esc(value)}</text>`;
};
const line = (x1, y1, x2, y2, cls = 'pipe') =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}"/>`;
const arrow = (x1, y1, x2, y2, cls = 'flow') =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}" marker-end="url(#arrow)"/>`;
const panel = (x, y, w, h, title, body = '', kind = 'normal') => {
  const cls = kind === 'danger' ? 'panel danger' : kind === 'safe' ? 'panel safe' : 'panel';
  return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" class="${cls}"/>${fitText(x + 24, y + 46, title, 'panel-title', w - 48)}${body ? fitText(x + 24, y + 88, body, 'small', w - 48) : ''}</g>`;
};
const badge = (x, y, value, kind = 'navy') =>
  `<g><rect x="${x}" y="${y}" width="${Math.max(88, value.length * 22 + 28)}" height="50" rx="25" class="badge ${kind}"/>${text(x + 18, y + 35, value, 'badge-text')}</g>`;
const stop = (x, y, label = 'STOP') =>
  `<g><path d="M ${x+22} ${y} H ${x+70} L ${x+92} ${y+22} V ${y+70} L ${x+70} ${y+92} H ${x+22} L ${x} ${y+70} V ${y+22} Z" class="stop"/>${text(x+46, y+58, label, 'stop-text', 'middle')}</g>`;
const cylinder = (x, y, label, color = C.navy) =>
  `<g transform="translate(${x} ${y})"><rect x="18" y="18" width="70" height="164" rx="28" fill="white" stroke="${color}" stroke-width="6"/><rect x="36" y="0" width="34" height="28" rx="5" fill="white" stroke="${color}" stroke-width="6"/><line x1="53" y1="0" x2="53" y2="-15" stroke="${color}" stroke-width="6"/><text x="53" y="105" class="equip" text-anchor="middle">${esc(label)}</text></g>`;
const gauge = (x, y, label) =>
  `<g transform="translate(${x} ${y})"><circle cx="0" cy="0" r="48" class="device"/><path d="M -30 12 A 33 33 0 0 1 30 12" class="thin"/><line x1="0" y1="0" x2="24" y2="-20" class="accent"/><circle cx="0" cy="0" r="6" fill="${C.navy}"/>${text(0, 78, label, 'small', 'middle')}</g>`;
const detector = (x, y, label = 'Détecteur adapté') =>
  `<g transform="translate(${x} ${y})"><rect x="0" y="20" width="72" height="126" rx="14" class="device"/><rect x="16" y="43" width="40" height="28" rx="4" class="screen"/><path d="M 36 20 C 40 -20, 92 -26, 112 4" class="pipe" fill="none"/><circle cx="114" cy="5" r="8" fill="${C.orange}"/>${text(36, 178, label, 'small', 'middle')}</g>`;
const worker = (x, y, opts = {}) => {
  const helmet = opts.helmet !== false;
  const goggles = opts.goggles !== false;
  return `<g transform="translate(${x} ${y})"><circle cx="0" cy="0" r="30" class="person"/>${helmet ? '<path d="M -36 -6 Q 0 -42 36 -6" class="helmet"/><line x1="-40" y1="-4" x2="40" y2="-4" class="accent"/>' : ''}${goggles ? '<path d="M -23 0 H -3 M 3 0 H 23 M -3 0 H 3" class="thin"/>' : ''}<path d="M -45 80 Q 0 38 45 80 V 180 H -45 Z" class="person"/><line x1="-45" y1="88" x2="-90" y2="140" class="person-line"/><line x1="45" y1="88" x2="90" y2="140" class="person-line"/></g>`;
};
const machine = (x, y, w = 210, h = 160, label = 'INSTALLATION') =>
  `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16" class="device"/><circle cx="${x+w-58}" cy="${y+78}" r="42" class="thin"/><path d="M ${x+w-58} ${y+42} L ${x+w-45} ${y+78} L ${x+w-83} ${y+65} Z M ${x+w-58} ${y+114} L ${x+w-70} ${y+78} L ${x+w-32} ${y+91} Z" fill="${C.soft}" stroke="${C.navy}" stroke-width="3"/>${text(x+18, y+h-18, label, 'equip')}</g>`;

const styles = `
  .title{font:700 54px 'Trebuchet MS',Arial,sans-serif;fill:${C.navy}}
  .subtitle{font:600 32px Calibri,Arial,sans-serif;fill:${C.ink}}
  .body{font:600 36px Calibri,Arial,sans-serif;fill:${C.ink}}
  .small{font:600 30px Calibri,Arial,sans-serif;fill:${C.ink}}
  .tiny{font:600 25px Calibri,Arial,sans-serif;fill:${C.ink}}
  .panel-title{font:700 34px 'Trebuchet MS',Arial,sans-serif;fill:${C.navy}}
  .equip{font:700 27px Calibri,Arial,sans-serif;fill:${C.navy}}
  .badge-text{font:700 27px Calibri,Arial,sans-serif;fill:white}
  .stop-text{font:700 25px Calibri,Arial,sans-serif;fill:${C.red}}
  .panel{fill:white;stroke:${C.navy};stroke-width:4}
  .panel.danger{stroke:${C.red};stroke-width:6;stroke-dasharray:18 12}
  .panel.safe{stroke:${C.green};stroke-width:7;stroke-dasharray:3 8}
  .badge.navy{fill:${C.navy}} .badge.orange{fill:${C.orange}} .badge.green{fill:${C.green}}
  .pipe{fill:none;stroke:${C.navy};stroke-width:7;stroke-linecap:round;stroke-linejoin:round}
  .thin{fill:none;stroke:${C.navy};stroke-width:4;stroke-linecap:round;stroke-linejoin:round}
  .accent{fill:none;stroke:${C.orange};stroke-width:7;stroke-linecap:round;stroke-linejoin:round}
  .flow{fill:none;stroke:${C.blue};stroke-width:7;stroke-linecap:round;stroke-linejoin:round}
  .danger-line{fill:none;stroke:${C.red};stroke-width:8;stroke-dasharray:18 12}
  .safe-line{fill:none;stroke:${C.green};stroke-width:8;stroke-dasharray:3 11}
  .device{fill:white;stroke:${C.navy};stroke-width:6}
  .screen{fill:${C.pale};stroke:${C.blue};stroke-width:4}
  .person{fill:white;stroke:${C.navy};stroke-width:6}
  .person-line{fill:none;stroke:${C.navy};stroke-width:12;stroke-linecap:round}
  .helmet{fill:${C.pale};stroke:${C.navy};stroke-width:5}
  .stop{fill:white;stroke:${C.red};stroke-width:7;stroke-dasharray:16 9}
  .step{fill:white;stroke:${C.navy};stroke-width:5}
  .step-safe{fill:white;stroke:${C.green};stroke-width:7;stroke-dasharray:3 9}
  .warn{fill:white;stroke:${C.orange};stroke-width:6;stroke-dasharray:16 9}
`;

const svg = ({ id, title, desc, content, h = 720 }) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:dc="http://purl.org/dc/elements/1.1/" viewBox="0 0 1200 ${h}" role="img" aria-labelledby="title desc">
  <title id="title">${esc(title)}</title><desc id="desc">${esc(desc)}</desc>
  <metadata><dc:title>${esc(title)}</dc:title><dc:description>${esc(desc)}</dc:description><dc:creator>F. Henninot (direction métier) et OpenAI Codex (dessin SVG original)</dc:creator><dc:source>Création originale inerWeb, pack HabFluide intérieur v2</dc:source><dc:rights>© 2026 Franck Henninot, inerWeb. Tous droits réservés.</dc:rights></metadata>
  <defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 Z" fill="${C.blue}"/></marker><pattern id="gas" width="38" height="38" patternUnits="userSpaceOnUse"><circle cx="7" cy="8" r="4" fill="${C.soft}"/><circle cx="28" cy="25" r="5" fill="${C.blue}" opacity=".45"/></pattern></defs>
  <style>${styles}</style><rect width="1200" height="${h}" fill="white"/>
  ${fitText(50, 72, title, 'title', 1100)}${content}
</svg>`;

const assets = [
  {
    id: 'securite-espace-clos', title: 'Espace clos : mesurer avant d’entrer',
    desc: 'Un local en contrebas contient une nappe de gaz. Le technicien reste dehors, ventile, mesure l’atmosphère et alerte. Il ne descend pas secourir sans protection adaptée.',
    uses: ['Chapitre 1, leçon 1'],
    content: `${panel(55,115,710,500,'Le danger est dans le local','Gaz invisible en point bas','danger')}<path d="M 95 185 H 705 V 560 H 95 Z" fill="none" stroke="${C.navy}" stroke-width="7"/><rect x="105" y="390" width="590" height="160" fill="url(#gas)" stroke="${C.blue}" stroke-width="3"/>${worker(860,265)}${detector(980,310,'Mesure avant entrée')}${arrow(850,520,700,470)}${badge(790,125,'1  VENTILER','green')}${badge(790,190,'2  MESURER','navy')}${badge(790,255,'3  ALERTER','orange')}${stop(1030,500)}${text(790,635,'Personne au sol :','body')}${text(790,680,'ne pas descendre','body')}`,
  },
  {
    id: 'securite-projection-fluide', title: 'Projection de fluide : sortir de l’axe',
    desc: 'Un raccord sous pression projette du fluide dans son axe. Le technicien porte gants et lunettes, vérifie la pression et se place sur le côté avant de desserrer.',
    uses: ['Chapitre 1, leçon 2'],
    content: `${machine(70,245,310,220,'CIRCUIT SOUS PRESSION')}<path d="M 380 350 H 630" class="pipe"/><path d="M 630 350 l 38 -34 v 68 z" class="device"/>${arrow(670,350,860,350,'danger-line')}${worker(1010,260)}${text(715,310,'AXE DU JET','panel-title')}${panel(70,120,310,90,'1  Lire la pression','', 'safe')}${panel(445,120,310,90,'2  Mettre les EPI','', 'safe')}${panel(820,120,310,90,'3  Se décaler','', 'safe')}${gauge(225,545,'Manomètre relu')}${badge(455,540,'GANTS','navy')}${badge(455,610,'LUNETTES','navy')}${stop(845,515,'AXE')}`,
  },
  {
    id: 'securite-decomposition-fluide', title: 'Flamme : fluide récupéré avant brasage',
    desc: 'La planche oppose le geste interdit, chauffer un circuit contenant du fluide, et le geste sûr : récupérer, inerter à l’azote sec, garder la sortie ouverte puis braser.',
    uses: ['Chapitre 1, leçon 3'],
    content: `${panel(55,120,510,520,'INTERDIT','Flamme + fluide résiduel','danger')}<path d="M 115 370 H 505" class="pipe"/><path d="M 280 360 C 260 315 295 290 280 250 C 340 285 360 330 330 370 Z" fill="${C.orange}" stroke="${C.red}" stroke-width="5"/><path d="M 300 240 C 360 175 430 205 455 145" class="danger-line"/>${text(110,610,'Gaz toxiques et corrosifs','body')}${panel(635,120,510,520,'ORDRE SÛR','Récupérer → azote sec → braser','safe')}${cylinder(685,270,'N₂',C.green)}${arrow(790,370,1010,370)}<path d="M 850 370 H 1090" class="pipe"/>${text(688,610,'Sortie ouverte','small')}${badge(850,510,'FLUIDE ABSENT','green')}`,
  },
  {
    id: 'securite-pression-residuelle', title: 'À l’arrêt, le circuit reste sous pression',
    desc: 'Une installation arrêtée reste sous pression. La température ambiante peut augmenter la pression. Avant ouverture : isoler, mesurer, récupérer et vérifier.',
    uses: ['Chapitre 1, leçon 4'],
    content: `${machine(95,240,360,240,'MACHINE ARRÊTÉE')}<circle cx="285" cy="360" r="70" fill="white" stroke="${C.red}" stroke-width="7" stroke-dasharray="16 10"/>${text(285,350,'PRESSION','small','middle')}${text(285,395,'PRÉSENTE','small','middle')}${arrow(470,360,710,360)}${gauge(800,360,'Mesurer')}${panel(885,220,250,280,'AVANT OUVERTURE','Isoler','safe')}${text(910,340,'Récupérer','small')}${text(910,390,'Vérifier','small')}${text(95,610,'Arrêt électrique ≠ circuit vide','body')}${badge(720,535,'PAS DE CHIFFRE DEVINÉ','orange')}`,
  },
  {
    id: 'consignation-cinq-etapes', title: 'Consignation : cinq étapes dans l’ordre',
    desc: 'Séparer, condamner, identifier, vérifier l’absence de tension avec un VAT contrôlé avant et après, puis mettre à la terre si nécessaire.',
    uses: ['Chapitre 1, leçon 5', 'Chapitre 12, sécurité électrique'],
    content: `${['SÉPARER','CONDAMNER','IDENTIFIER','VÉRIFIER','MISE À LA TERRE\nSI NÉCESSAIRE'].map((v,i)=>{const x=42+i*232;const [a,b]=v.split('\n');return `<g><circle cx="${x+82}" cy="210" r="58" class="step${i===3?'-safe':''}"/>${text(x+82,225,String(i+1),'title','middle')}${text(x+82,325,a,'tiny','middle')}${b?text(x+82,360,b,'tiny','middle'):''}${i<4?arrow(x+145,210,x+220,210):''}</g>`}).join('')}<path d="M 710 455 H 1010" class="pipe"/>${gauge(710,455,'Source connue AVANT')}${gauge(1010,455,'Source connue APRÈS')}${badge(785,565,'VAT SUR LES DEUX BORNES','green')}${text(600,675,'Une coupure ne prouve jamais l’absence de tension','body','middle')}`,
  },
  {
    id: 'co2-local-protege', title: 'Local CO₂ : voir l’alarme avant d’entrer',
    desc: 'Le technicien reste à l’extérieur. La signalisation et l’alarme sont visibles avant ouverture. La ventilation, la détection et l’implantation du capteur sont vérifiées selon l’installation et la norme applicable.',
    uses: ['Chapitre 2, leçons 4 et 5', 'Chapitre 19, arrivée sur site'],
    content: `<rect x="80" y="135" width="690" height="470" rx="18" class="device"/><rect x="575" y="245" width="140" height="260" class="device"/>${text(645,380,'PORTE','small','middle')}<rect x="110" y="430" width="430" height="150" fill="url(#gas)" stroke="${C.blue}" stroke-width="4"/>${detector(160,300,'Capteur selon étude')}${arrow(410,500,690,500)}${text(430,545,'Ventilation adaptée','small','middle')}<g transform="translate(600 150)"><circle cx="70" cy="50" r="42" fill="white" stroke="${C.red}" stroke-width="7" stroke-dasharray="15 9"/>${text(70,62,'ALARME','tiny','middle')}</g>${worker(930,285)}${stop(1050,145)}${text(830,555,'Lire dehors.','body')}${text(830,600,'Ne pas entrer.','body')}${fitText(80,680,'Détection fixe lorsque la norme l’impose — jamais une règle universelle sans étude','small',1040)}`,
  },
  {
    id: 'categories-champs', title: 'Une catégorie = un fluide et un champ d’activité',
    desc: 'Les catégories A1 et A2 concernent les fluides fluorés et les hydrocarbures, B le CO2, C l’ammoniac, D la récupération, E le contrôle d’étanchéité sans ouvrir et V la climatisation des véhicules.',
    uses: ['Chapitre 4, activité'],
    content: `${[['A1','Fluorés + HC','Toutes activités','navy'],['A2','Faible charge','Toutes activités','navy'],['B','CO₂ / R-744','Catégorie dédiée','green'],['C','NH₃ / R-717','Catégorie dédiée','orange'],['D','Récupérer','Champ limité','navy'],['E','Contrôle sans ouvrir','Champ limité','navy'],['V','Véhicules','Champ dédié','navy']].map((a,i)=>{const col=i%4,row=Math.floor(i/4),x=45+col*290,y=130+row*250;return `${panel(x,y,260,205,a[0],a[1],i===2?'safe':i===3?'danger':'normal')}${text(x+24,y+145,a[2],'tiny')}`}).join('')}${badge(630,640,'A1 / A2 ≠ B / C','orange')}`,
  },
  {
    id: 'croix-frigoriste-etats', title: 'Croix du frigoriste : organes, états et énergie',
    desc: 'Circuit frigorifique conventionnel : condenseur en haut, compresseur à droite, évaporateur en bas, détendeur à gauche. Les états vapeur et liquide et les échanges de chaleur sont indiqués.',
    uses: ['Chapitre 5, croix du frigoriste', 'Chapitre 5, activité'],
    content: `<rect x="390" y="120" width="420" height="105" rx="15" class="device"/>${text(600,185,'CONDENSEUR','panel-title','middle')}${text(600,265,'rejette la chaleur','small','middle')}<rect x="900" y="275" width="230" height="140" rx="70" class="device"/>${text(1015,360,'COMPRESSEUR','small','middle')}<rect x="390" y="510" width="420" height="105" rx="15" class="device"/>${text(600,575,'ÉVAPORATEUR','panel-title','middle')}${text(600,485,'prend la chaleur','small','middle')}<path d="M 90 290 H 280 L 335 345 L 280 400 H 90 Z" class="device"/>${text(205,355,'DÉTENDEUR','small','middle')}<path d="M 335 345 V 172 H 390 M 810 172 H 1015 V 275 M 1015 415 V 562 H 810 M 390 562 H 205 V 400" class="pipe"/>${arrow(825,172,980,172)}${arrow(1015,230,1015,270)}${arrow(365,562,225,562)}${arrow(205,500,205,410)}${badge(405,300,'LIQUIDE HP','navy')}${badge(780,235,'VAPEUR HP','orange')}${badge(765,640,'VAPEUR BP','navy')}${badge(75,470,'MÉLANGE BP','green')}`,
  },
  {
    id: 'logph-lecture', title: 'Diagramme log p-h : lire sans inventer',
    desc: 'Le diagramme log p-h montre la pression en ordonnée logarithmique et l’enthalpie en abscisse. Les zones liquide, mélange et vapeur sont séparées par les courbes de bulle et de rosée.',
    uses: ['Chapitre 6, leçons 1 et 2'],
    content: `${line(125,600,1080,600,'pipe')}${line(125,600,125,135,'pipe')}${text(600,675,'ENTHALPIE h (kJ/kg)','body','middle')}${text(55,380,'log p','body','middle')}<path d="M 360 580 C 385 470 420 280 565 170 C 710 280 748 470 780 580" fill="none" stroke="${C.navy}" stroke-width="8"/><path d="M 240 500 H 900 L 1020 295" class="accent"/><path d="M 1018 295 V 230 H 850" class="accent"/><path d="M 850 230 H 345" class="accent"/><path d="M 345 230 L 240 500" class="accent"/>${text(285,390,'LIQUIDE','panel-title','middle')}${text(565,430,'MÉLANGE','panel-title','middle')}${text(900,430,'VAPEUR','panel-title','middle')}${text(405,205,'BULLE','tiny','middle')}${text(715,205,'ROSÉE','tiny','middle')}${badge(845,120,'PRESSION ABSOLUE','orange')}`,
  },
  {
    id: 'mesures-surchauffe-sous-refroidissement', title: 'Deux écarts, deux points de mesure',
    desc: 'La surchauffe est mesurée en sortie d’évaporateur côté aspiration avec pression et température. Le sous-refroidissement est mesuré en sortie de condenseur côté liquide. Les valeurs constructeur font foi.',
    uses: ['Chapitre 7, leçons et activité'],
    content: `${machine(65,250,330,220,'ÉVAPORATEUR')}<path d="M 395 360 H 610" class="pipe"/>${gauge(485,245,'Pression BP')}<rect x="620" y="300" width="65" height="120" rx="10" class="device"/>${text(652,370,'T°','body','middle')}${panel(700,135,430,235,'SURCHAUFFE','T tube − T saturation rosée','safe')}${machine(65,500,330,160,'CONDENSEUR')}<path d="M 395 580 H 610" class="pipe"/>${gauge(485,505,'Pression HP')}<rect x="620" y="540" width="65" height="120" rx="10" class="device"/>${text(652,610,'T°','body','middle')}${panel(700,410,430,235,'SOUS-REFROIDISSEMENT','T saturation bulle − T tube','normal')}${badge(760,655,'VALEURS CONSTRUCTEUR','orange')}`,
  },
  {
    id: 'compresseurs-comparatif', title: 'Quatre compresseurs, une même fonction',
    desc: 'Comparaison schématique de quatre technologies de compresseur : piston, scroll, vis et rotatif. Tous aspirent une vapeur basse pression et refoulent une vapeur haute pression.',
    uses: ['Chapitre 9, technologies et activité'],
    content: `${[['PISTON','M 95 310 H 245 V 480 H 95 Z M 120 360 H 220 M 170 360 V 270'],['SCROLL','M 380 370 C 380 270 550 260 550 370 C 550 470 410 470 410 390 C 410 320 515 320 515 380'],['VIS','M 675 300 H 835 V 470 H 675 Z M 700 335 C 730 300 760 390 790 350 C 820 310 840 400 815 435'],['ROTATIF','M 955 380 A 90 90 0 1 0 1135 380 A 90 90 0 1 0 955 380 M 1045 380 L 1100 330']].map((a,i)=>{const x=55+i*285;return `${panel(x,130,260,440,a[0],'BP → HP')}<path d="${a[1]}" class="pipe"/>${arrow(x+45,600,x+215,600)}`}).join('')}${text(600,690,'Un compresseur comprime du gaz — jamais du liquide','body','middle')}`,
  },
  {
    id: 'ligne-liquide-protection', title: 'La ligne liquide : chaque organe protège le suivant',
    desc: 'De la sortie du condenseur au détendeur : réservoir, filtre déshydrateur, voyant liquide, électrovanne puis détendeur. L’ordre fonctionnel est explicité.',
    uses: ['Chapitre 12, ligne liquide', 'Chapitre 12, activité'],
    content: `${text(80,150,'SORTIE CONDENSEUR','small')}${arrow(80,330,1110,330)}${[[['RÉSERVOIR'],'stocker'],[['FILTRE'],'retient humidité'],[['VOYANT'],'observer'],[['ÉLECTRO-','VANNE'],'fermer'],[['DÉTENDEUR'],'abaisse pression']].map((a,i)=>{const x=85+i*220;const labels=a[0];return `<g><rect x="${x}" y="245" width="150" height="170" rx="18" class="device"/>${labels.map((label,j)=>text(x+75,300+j*35,label,'tiny','middle')).join('')}${fitText(x+75,465,a[1],'tiny',190,'middle')}</g>`}).join('')}${badge(385,555,'ORDRE FONCTIONNEL','green')}${fitText(600,665,'Débrancher un organe sans comprendre son rôle = diagnostic perdu','body',1050,'middle')}`,
  },
  {
    id: 'sequence-mise-en-service', title: 'Avant la première charge : l’ordre est verrouillé',
    desc: 'Séquence d’intervention : assemblage contrôlé, épreuve à l’azote sec selon la documentation, contrôle d’étanchéité, tirage au vide avec vacuomètre, tenue du vide puis charge pesée.',
    uses: ['Chapitre 13, leçons et activité'],
    content: `${['ASSEMBLER','AZOTE SEC','CONTRÔLER','TIRER AU VIDE','TENUE DU VIDE','CHARGER PESÉ'].map((v,i)=>{const x=35+i*193;return `<g><circle cx="${x+75}" cy="265" r="62" class="${i===5?'step-safe':'step'}"/>${text(x+75,280,String(i+1),'title','middle')}${text(x+75,380,v,'tiny','middle')}${i<5?arrow(x+140,265,x+185,265):''}</g>`}).join('')}${cylinder(155,470,'N₂',C.green)}${gauge(470,560,'Vacuomètre')}${machine(690,470,210,155,'CIRCUIT')}${badge(930,495,'BALANCE','navy')}${text(600,690,'Pression, durée, vide et charge : documentation constructeur','body','middle')}`,
  },
  {
    id: 'recherche-fuite-geste', title: 'Détecteur : contrôler, balayer, confirmer',
    desc: 'Le détecteur est testé avant utilisation. La sonde passe lentement autour du raccord et en partie basse. Une alerte se confirme et le résultat est consigné.',
    uses: ['Chapitre 14, méthode directe et activité'],
    content: `${panel(40,140,330,480,'1  CONTRÔLER','Appareil + gaz recherché','safe')}${detector(155,270,'Test avant usage')}${panel(435,140,330,480,'2  BALAYER','Lentement autour du raccord','normal')}<path d="M 505 375 H 700" class="pipe"/><circle cx="600" cy="375" r="28" class="device"/><path d="M 490 470 C 520 300 690 285 720 470" class="accent"/>${panel(830,140,330,480,'3  CONFIRMER','Puis écrire au registre','safe')}${badge(900,280,'ALERTE','orange')}${text(995,410,'Localiser','small','middle')}${text(995,465,'Réparer','small','middle')}${text(995,520,'Recontrôler','small','middle')}${text(600,690,'Méthode indirecte : soupçonner — méthode directe : localiser','body','middle')}`,
  },
  {
    id: 'recuperation-securisee', title: 'Récupération : circuit fermé, bouteille pesée',
    desc: 'Le fluide circule de l’installation vers une station compatible puis une bouteille de récupération posée sur une balance. La bouteille est identifiée et pesée avant et après.',
    uses: ['Chapitre 15, leçons et activité'],
    content: `${machine(55,270,260,200,'INSTALLATION')}<rect x="440" y="265" width="260" height="210" rx="18" class="device"/>${text(570,350,'STATION','panel-title','middle')}${text(570,405,'COMPATIBLE','small','middle')}${cylinder(845,250,'RÉCUP.',C.orange)}<rect x="805" y="455" width="160" height="42" rx="8" class="device"/>${text(885,545,'BALANCE','small','middle')}${arrow(315,370,430,370)}${arrow(710,370,835,370)}${badge(70,145,'1  PESER AVANT','navy')}${badge(440,145,'2  CIRCUIT FERMÉ','green')}${badge(805,145,'3  PESER APRÈS','navy')}${text(600,650,'Un fluide par bouteille — identification et traçabilité','body','middle')}`,
  },
  {
    id: 'brasage-balayage-azote', title: 'Brasage sous balayage d’azote sec',
    desc: 'Avant brasage le fluide est récupéré. Un faible débit d’azote sec traverse le tube, la sortie reste ouverte et la flamme chauffe le joint. Ce balayage n’est pas une épreuve de pression.',
    uses: ['Chapitre 16, leçons et activité'],
    content: `${cylinder(55,260,'N₂',C.green)}${gauge(245,330,'Mano-détendeur')}<path d="M 315 330 H 1085" class="pipe"/>${arrow(330,330,970,330)}<path d="M 700 320 C 680 275 720 240 705 195 C 775 235 790 285 755 330 Z" fill="${C.orange}" stroke="${C.red}" stroke-width="5"/>${text(720,165,'JOINT BRASÉ','panel-title','middle')}${text(930,400,'SORTIE OUVERTE','small','middle')}${badge(55,520,'FLUIDE RÉCUPÉRÉ','green')}${badge(420,520,'FAIBLE DÉBIT','navy')}${badge(760,520,'PAS UNE ÉPREUVE','orange')}${text(600,665,'Azote sec uniquement — jamais oxygène ni air comprimé','body','middle')}`,
  },
  {
    id: 'r290-zone-intervention', title: 'R-290 : préparer la zone avant le geste',
    desc: 'Zone d’intervention sur hydrocarbure : plaque et FDS lues, ventilation active, détecteur hydrocarbures, sources d’ignition supprimées, balisage, outillage et récupération compatibles.',
    uses: ['Chapitre 1, activité', 'Chapitre 18, leçons et activité'],
    content: `${machine(430,250,320,220,'MONOBLOC R-290')}${detector(105,280,'Détecteur HC')}${worker(940,300)}<path d="M 385 205 H 795 V 550 H 385 Z" fill="none" stroke="${C.red}" stroke-width="7" stroke-dasharray="22 14"/>${text(590,590,'ZONE BALISÉE','panel-title','middle')}${arrow(430,500,265,500)}${text(105,575,'Ventilation active','small')}${stop(805,170,'FEU')}${badge(55,125,'PLAQUE + FDS','navy')}${badge(405,125,'OUTILLAGE HC','green')}${badge(765,125,'ZÉRO IGNITION','orange')}${text(600,680,'Si la zone n’est pas conforme : décision STOP','body','middle')}`,
  },
  {
    id: 'co2-nh3-deux-risques', title: 'CO₂ et NH₃ : reconnaître, puis s’arrêter',
    desc: 'Deux colonnes distinguent le CO2 R744, catégorie B, haute pression et danger respiratoire, de l’ammoniac R717, catégorie C, toxique et légèrement inflammable. A1 et A2 ne donnent aucune équivalence.',
    uses: ['Chapitre 19, leçons et activité'],
    content: `${panel(55,130,510,470,'CO₂ — R-744 — CATÉGORIE B','Haute pression + danger respiratoire','safe')}${cylinder(105,300,'CO₂',C.blue)}${gauge(340,375,'Matériel dédié')}${text(105,555,'Détection / ventilation','small')}${panel(635,130,510,470,'NH₃ — R-717 — CATÉGORIE C','Toxique + légèrement inflammable','danger')}${cylinder(685,300,'NH₃',C.orange)}${detector(900,290,'Détection adaptée')}${text(685,555,'Évacuer selon le site','small')}${badge(380,625,'A1 / A2 : AUCUNE ÉQUIVALENCE','orange')}`,
  },
];

for (const asset of assets) {
  fs.writeFileSync(path.join(OUT, `${asset.id}.svg`), svg(asset), 'utf8');
}

const manifest = {
  nom: 'Packaging illustrations intérieures HabFluide v2',
  statut: 'BROUILLON — validation métier et BAT papier requis',
  couverture: 'hors périmètre',
  doctrine: 'SVG originaux, fond blanc, palette inerWeb, couleur jamais seule, aucun média tiers',
  count: assets.length,
  assets: assets.map(({ id, title, desc, uses }) => ({ id, fichier: `svg/${id}.svg`, titre: title, description: desc, usages: uses })),
};
fs.writeFileSync(path.join(ROOT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');

const sources = `# Sources et droits — packaging illustrations intérieures HabFluide v2\n\n` +
  `Les ${assets.length} SVG de ce dossier sont des créations originales produites pour inerWeb. ` +
  `Aucune photographie, illustration constructeur, image générative ou ressource tierce n'est intégrée.\n\n` +
  `- Direction métier et validation finale : F. Henninot.\n` +
  `- Construction SVG : OpenAI Codex, sous direction de F. Henninot.\n` +
  `- Références métier : corpus local HabFluide et référentiel réglementaire déjà présent dans le projet.\n` +
  `- Statut : brouillon jusqu'au bon à tirer explicite.\n`;
fs.writeFileSync(path.join(ROOT, 'SOURCES-IMAGES.md'), sources, 'utf8');

const readme = `# Packaging illustrations intérieures HabFluide v2\n\n` +
  `Pack local au livre, sans modification de la couverture ni du dépôt pilote-fluides.\n\n` +
  `## Contenu\n\n- ${assets.length} planches SVG originales dans \`svg/\`.\n- \`manifest.json\` : inventaire et destinations.\n- \`SOURCES-IMAGES.md\` : provenance et droits.\n- \`build-pack.mjs\` : générateur reproductible.\n- \`qa-pack.mjs\` : contrôle des SVG et aperçu global.\n- \`qa-pdf-integration.py\` : contrôle des planches réellement embarquées dans le PDF intérieur.\n\n` +
  `## Refaire et contrôler le pack\n\n\`node illustrations-interieures-v2/build-pack.mjs\`\n\n\`node illustrations-interieures-v2/qa-pack.mjs\`\n\nAprès reconstruction du PDF intérieur :\n\n\`python illustrations-interieures-v2/qa-pdf-integration.py\`\n\nCommandes à lancer depuis \`livret/\`.\n\n` +
  `## Statut\n\nBROUILLON. Une QA technique ne remplace pas la validation métier ni le BAT papier.\n`;
fs.writeFileSync(path.join(ROOT, 'README.md'), readme, 'utf8');

console.log(`Pack HabFluide intérieur v2 : ${assets.length} SVG générés dans ${OUT}`);
