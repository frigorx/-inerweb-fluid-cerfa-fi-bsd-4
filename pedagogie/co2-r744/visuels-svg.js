/* =====================================================================
   visuels-svg.js — LES DESSINS DE LA LIGNE CO₂
   ---------------------------------------------------------------------
   Repris des deux parcours composés par F. Henninot sur Claude Design
   (« Amélioration du module co2Animate » puis « Anico2mate »), nettoyés
   du runtime Design : les balises <sc-if> ont été retirées en gardant
   leur contenu, et les définitions communes (#co2dome, #co2grid,
   #cycleSub) sont posées une seule fois dans la page par `defs`.

   Les animations sont portées par deux images-clés CSS, `omflow` pour
   les traits de circulation et `ompulse` pour les repères : elles vivent
   dans le style de index.html. Elles PORTENT DU CONTENU (le sens de
   circulation, la position du point critique) : sous prefers-reduced-motion
   elles sont RALENTIES, jamais supprimées.
   ===================================================================== */

window.CO2_SVG = {

  defs: `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<path id="co2dome" fill="none" d="M107.8,559.2 149.6,491.6 190.3,429.8 232.7,373 264,320.3 313.6,271.2 365.8,224.9 395.8,202.8 438,180.6 551.1,176.3 659.9,180.6 696,202.8 716.2,224.9 743.4,271.2 760.5,320.3 771.2,373 777.3,429.8 778.6,491.6 777.1,559.2"></path>
<g id="co2grid">
<path d="M90,560H960M90,426.9H960M90,293.9H960M90,186.5H960M90,117.9H960M90,40H960" stroke="#dfe5ec" stroke-width="1"></path>
<path d="M155.3,40V560M264,40V560M372.8,40V560M481.5,40V560M590.3,40V560M699,40V560M807.8,40V560M916.5,40V560" stroke="#eef1f5" stroke-width="1"></path>
</g>
</defs></svg>`,

  cloche: `<svg viewBox="0 0 1000 620" style="width:100%;height:auto;display:block">
<use href="#co2grid"></use>
<rect x="90" y="40" width="870" height="136.3" fill="#fff1ea"></rect>
<use href="#co2dome" stroke="#1b3a63" stroke-width="3.5"></use>
<path d="M90,176.3H960" stroke="#ff6b35" stroke-width="2.5" stroke-dasharray="10 7"></path>
<circle cx="551.1" cy="176.3" r="10" fill="#ff6b35" stroke="#ffffff" stroke-width="3"></circle>
<circle cx="551.1" cy="176.3" r="19" fill="none" stroke="#ff6b35" stroke-width="2.5" style="animation:ompulse 2s ease-in-out infinite"></circle>
<text x="566" y="131" font-family="Trebuchet MS,sans-serif" font-size="24" font-weight="bold" fill="#c9420d">Point critique</text>
<text x="566" y="157" font-family="Calibri,sans-serif" font-size="21" fill="#c9420d">31,0 °C — 73,8 bar</text>
<text x="110" y="72" font-family="Trebuchet MS,sans-serif" font-size="23" font-weight="bold" fill="#c9420d">ZONE TRANSCRITIQUE — plus de changement d'état</text>
<text x="380" y="330" font-family="Trebuchet MS,sans-serif" font-size="23" font-weight="bold" fill="#1b3a63">Liquide + vapeur</text>
<text x="150" y="250" font-family="Calibri,sans-serif" font-size="21" fill="#6b7885">Liquide</text>
<text x="850" y="250" font-family="Calibri,sans-serif" font-size="21" fill="#6b7885">Vapeur</text>
<path d="M90,40V560H960" stroke="#1b3a63" stroke-width="2.5" fill="none"></path>
<text x="520" y="613" text-anchor="middle" font-family="Trebuchet MS,sans-serif" font-size="19" font-weight="bold" fill="#1b3a63">Enthalpie h (kJ/kg)</text>
<text x="30" y="300" text-anchor="middle" transform="rotate(-90 30 300)" font-family="Trebuchet MS,sans-serif" font-size="20" font-weight="bold" fill="#1b3a63">Pression P (bar, échelle log)</text>
<g font-family="Calibri,sans-serif" font-size="17" fill="#8a96a3">
<text x="72" y="566" text-anchor="end">10</text><text x="72" y="433" text-anchor="end">20</text><text x="72" y="300" text-anchor="end">40</text><text x="72" y="193" text-anchor="end">70</text><text x="72" y="124" text-anchor="end">100</text><text x="72" y="47" text-anchor="end">150</text>
<text x="264" y="583" text-anchor="middle">200</text><text x="481.5" y="583" text-anchor="middle">300</text><text x="699" y="583" text-anchor="middle">400</text><text x="916.5" y="583" text-anchor="middle">500</text>
</g>
</svg>`,

  subcritique: `<svg viewBox="0 0 1000 620" style="width:100%;height:auto;display:block" data-anim="cycle">
<use href="#co2grid"></use>
<use href="#co2dome" stroke="#1b3a63" stroke-width="3.5"></use>
<path d="M90,176.3H960" stroke="#ff6b35" stroke-width="2" stroke-dasharray="8 8" opacity=".5"></path>
<circle cx="551.1" cy="176.3" r="7" fill="#ff6b35"></circle>
<path id="cycleSub" d="M781.7,373 L846.9,202.8 L379.3,202.8 L379.3,373 Z" fill="none" stroke="#1b3a63" stroke-width="5" stroke-linejoin="round"></path>
<path d="M781.7,373 L846.9,202.8" stroke="#ff6b35" stroke-width="5"></path>
<path d="M379.3,373 L771.2,373" stroke="#3a8fd6" stroke-width="5"></path>
<circle r="13" fill="#ff6b35" stroke="#ffffff" stroke-width="3.5">
<animateMotion dur="7s" repeatCount="indefinite" path="M781.7,373 L846.9,202.8 L379.3,202.8 L379.3,373 Z"></animateMotion>
</circle>
<g font-family="Trebuchet MS,sans-serif" font-size="21" font-weight="bold" fill="#1b3a63">
<text x="800" y="398" text-anchor="middle">1 · aspiration</text>
<text x="836" y="190" text-anchor="end">2 · refoulement</text>
<text x="379.3" y="185" text-anchor="middle">3 · sortie condenseur</text>
<text x="379.3" y="405" text-anchor="middle">4 · sortie détendeur</text>
</g>
<g font-family="Calibri,sans-serif" font-size="20" fill="#c9420d"><text x="820" y="290">compression</text></g>
<g font-family="Calibri,sans-serif" font-size="20" fill="#1b3a63"><text x="600" y="240" text-anchor="middle">condensation — palier à température constante</text></g>
<g font-family="Calibri,sans-serif" font-size="20" fill="#2b6ca3"><text x="600" y="440" text-anchor="middle">évaporation + surchauffe</text></g>
<path d="M90,40V560H960" stroke="#1b3a63" stroke-width="2.5" fill="none"></path>
<text x="520" y="613" text-anchor="middle" font-family="Trebuchet MS,sans-serif" font-size="19" font-weight="bold" fill="#1b3a63">Enthalpie h (kJ/kg)</text>
<g font-family="Calibri,sans-serif" font-size="17" fill="#8a96a3">
<text x="72" y="566" text-anchor="end">10</text><text x="72" y="433" text-anchor="end">20</text><text x="72" y="300" text-anchor="end">40</text><text x="72" y="193" text-anchor="end">70</text><text x="72" y="124" text-anchor="end">100</text><text x="72" y="47" text-anchor="end">150</text>
<text x="264" y="583" text-anchor="middle">200</text><text x="481.5" y="583" text-anchor="middle">300</text><text x="699" y="583" text-anchor="middle">400</text><text x="916.5" y="583" text-anchor="middle">500</text>
</g>
</svg>`,

  transcritique: `<svg viewBox="0 0 1000 620" style="width:100%;height:auto;display:block" data-anim="cycle">
<use href="#co2grid"></use>
<rect x="90" y="40" width="870" height="136.3" fill="#fff6f2"></rect>
<use href="#co2dome" stroke="#1b3a63" stroke-width="3.5"></use>
<path d="M90,176.3H960" stroke="#ff6b35" stroke-width="2.5" stroke-dasharray="10 7"></path>
<circle cx="551.1" cy="176.3" r="8" fill="#ff6b35"></circle>
<text x="950" y="196" text-anchor="end" font-family="Calibri,sans-serif" font-size="19" fill="#c9420d">73,8 bar — pression critique</text>
<path d="M781.7,373 L894.8,138.2 L466.3,138.2 L466.3,373 Z" fill="none" stroke="#1b3a63" stroke-width="5" stroke-linejoin="round"></path>
<path d="M781.7,373 L894.8,138.2" stroke="#ff6b35" stroke-width="5"></path>
<path d="M894.8,138.2 L466.3,138.2" stroke="#c9420d" stroke-width="6"></path>
<path d="M466.3,373 L771.2,373" stroke="#3a8fd6" stroke-width="5"></path>
<circle r="13" fill="#ff6b35" stroke="#ffffff" stroke-width="3.5">
<animateMotion dur="7s" repeatCount="indefinite" path="M781.7,373 L894.8,138.2 L466.3,138.2 L466.3,373 Z"></animateMotion>
</circle>
<g font-family="Trebuchet MS,sans-serif" font-size="21" font-weight="bold" fill="#1b3a63">
<text x="800" y="395">1 · aspiration</text>
<text x="878" y="126" text-anchor="end">2 · refoulement</text>
<text x="466.3" y="166" text-anchor="middle">3 · sortie refroidisseur de gaz</text>
<text x="466.3" y="405" text-anchor="middle">4 · sortie détendeur HP</text>
</g>
<g font-family="Trebuchet MS,sans-serif" font-size="22" font-weight="bold" fill="#c9420d"><text x="700" y="72" text-anchor="middle">REFROIDISSEMENT DU GAZ — pas de palier</text></g>
<g font-family="Calibri,sans-serif" font-size="20" fill="#2b6ca3"><text x="640" y="440" text-anchor="middle">évaporation + surchauffe</text></g>
<path d="M466.3,373 L466.3,340" stroke="#c9420d" stroke-width="0"></path>
<path d="M90,40V560H960" stroke="#1b3a63" stroke-width="2.5" fill="none"></path>
<text x="520" y="613" text-anchor="middle" font-family="Trebuchet MS,sans-serif" font-size="19" font-weight="bold" fill="#1b3a63">Enthalpie h (kJ/kg)</text>
<g font-family="Calibri,sans-serif" font-size="17" fill="#8a96a3">
<text x="72" y="566" text-anchor="end">10</text><text x="72" y="433" text-anchor="end">20</text><text x="72" y="300" text-anchor="end">40</text><text x="72" y="193" text-anchor="end">70</text><text x="72" y="124" text-anchor="end">100</text><text x="72" y="47" text-anchor="end">150</text>
<text x="264" y="583" text-anchor="middle">200</text><text x="481.5" y="583" text-anchor="middle">300</text><text x="699" y="583" text-anchor="middle">400</text><text x="916.5" y="583" text-anchor="middle">500</text>
</g>
</svg>`,

  cop: `<svg viewBox="0 0 800 420" style="width:100%;height:auto;display:block">
<path d="M80,40H760M80,117.5H760M80,195H760M80,272.5H760" stroke="#eef1f5" stroke-width="1"></path>
<path d="M193.3,40V350M306.7,40V350M420,40V350M533.3,40V350M646.7,40V350" stroke="#f4f6f9" stroke-width="1"></path>
<path d="M80,113.6 136.7,95.8 193.3,94.3 250,102 306.7,113.6 420,134.5 533.3,154.7 646.7,171.8 760,187.3" fill="none" stroke="#3a8fd6" stroke-width="4"></path>
<path d="M136.7,179.5 193.3,160.1 250,151.6 306.7,146.9 363.3,148.5 420,152.4 533.3,164 646.7,175.6 760,187.3" fill="none" stroke="#1b3a63" stroke-width="4"></path>
<path d="M250,229.9 306.7,214.4 363.3,204.3 420,197.3 476.7,195 533.3,195.8 646.7,201.2 760,208.9" fill="none" stroke="#c9420d" stroke-width="4"></path>
<path d="M193.3,94.3 306.7,146.9 476.7,195" fill="none" stroke="#ff6b35" stroke-width="3" stroke-dasharray="9 7"></path>
<circle cx="193.3" cy="94.3" r="9" fill="#3a8fd6" stroke="#ffffff" stroke-width="3"></circle>
<circle cx="306.7" cy="146.9" r="9" fill="#1b3a63" stroke="#ffffff" stroke-width="3"></circle>
<circle cx="476.7" cy="195" r="9" fill="#c9420d" stroke="#ffffff" stroke-width="3"></circle>
<text x="80" y="88" font-family="Calibri,sans-serif" font-size="18" fill="#3a8fd6">sortie refroidisseur 28 °C</text>
<text x="330" y="140" font-family="Calibri,sans-serif" font-size="18" fill="#1b3a63">35 °C</text>
<text x="500" y="188" font-family="Calibri,sans-serif" font-size="18" fill="#c9420d">42 °C</text>
<text x="500" y="120" font-family="Trebuchet MS,sans-serif" font-size="19" font-weight="bold" fill="#ff6b35">ligne de HP optimale</text>
<path d="M80,40V350H760" fill="none" stroke="#1b3a63" stroke-width="2.5"></path>
<g font-family="Calibri,sans-serif" font-size="17" fill="#8a96a3">
<text x="80" y="374" text-anchor="middle">70</text><text x="193.3" y="374" text-anchor="middle">80</text><text x="306.7" y="374" text-anchor="middle">90</text><text x="420" y="374" text-anchor="middle">100</text><text x="533.3" y="374" text-anchor="middle">110</text><text x="646.7" y="374" text-anchor="middle">120</text><text x="760" y="374" text-anchor="middle">130</text>
</g>
<text x="420" y="404" text-anchor="middle" font-family="Trebuchet MS,sans-serif" font-size="19" font-weight="bold" fill="#1b3a63">Haute pression (bar)</text>
<text x="26" y="195" text-anchor="middle" transform="rotate(-90 26 195)" font-family="Trebuchet MS,sans-serif" font-size="19" font-weight="bold" fill="#1b3a63">COP (allure)</text>
</svg>`,

  booster: `<svg viewBox="0 0 1020 600" style="width:100%;height:auto;display:block">
<path d="M250,180 L250,80 L360,80" fill="none" stroke="#ff6b35" stroke-width="5" stroke-dasharray="14 10" style="animation:omflow 1.1s linear infinite"></path>
<path d="M660,80 L880,80 L880,150" fill="none" stroke="#ff6b35" stroke-width="5" stroke-dasharray="14 10" style="animation:omflow 1.1s linear infinite"></path>
<path d="M880,180 L880,230" fill="none" stroke="#1b3a63" stroke-width="5" stroke-dasharray="14 10" style="animation:omflow 1.1s linear infinite"></path>
<path d="M880,340 L880,400 L620,400 L620,432" fill="none" stroke="#1b3a63" stroke-width="5" stroke-dasharray="14 10" style="animation:omflow 1.1s linear infinite"></path>
<path d="M760,400 L720,400 L720,533" fill="none" stroke="#1b3a63" stroke-width="5" stroke-dasharray="14 10" style="animation:omflow 1.1s linear infinite"></path>
<path d="M620,462 L620,470 L560,470" fill="none" stroke="#3a8fd6" stroke-width="5" stroke-dasharray="14 10" style="animation:omflow 1.1s linear infinite"></path>
<path d="M720,563 L720,570 L560,570" fill="none" stroke="#3a8fd6" stroke-width="5" stroke-dasharray="14 10" style="animation:omflow 1.1s linear infinite"></path>
<path d="M340,470 L250,470 L250,300" fill="none" stroke="#3a8fd6" stroke-width="5" stroke-dasharray="14 10" style="animation:omflow 1.1s linear infinite"></path>
<path d="M340,570 L160,570 L160,495" fill="none" stroke="#3a8fd6" stroke-width="5" stroke-dasharray="14 10" style="animation:omflow 1.1s linear infinite"></path>
<path d="M160,440 L160,300 L250,300" fill="none" stroke="#3a8fd6" stroke-width="5" stroke-dasharray="14 10" style="animation:omflow 1.1s linear infinite"></path>
<path d="M250,300 L250,235" fill="none" stroke="#3a8fd6" stroke-width="5" stroke-dasharray="14 10" style="animation:omflow 1.1s linear infinite"></path>
<path d="M820,245 L250,245" fill="none" stroke="#9c8fd6" stroke-width="5" stroke-dasharray="14 10" style="animation:omflow 1.1s linear infinite"></path>
<rect x="360" y="50" width="300" height="60" rx="8" fill="#ffe4d8" stroke="#ff6b35" stroke-width="3"></rect>
<text x="510" y="78" text-anchor="middle" font-family="Trebuchet MS,sans-serif" font-size="20" font-weight="bold" fill="#c9420d">Refroidisseur de gaz</text>
<text x="510" y="99" text-anchor="middle" font-family="Calibri,sans-serif" font-size="17" fill="#c9420d">ex-condenseur</text>
<g><path d="M866,151 L894,179 M894,151 L866,179" stroke="#1b3a63" stroke-width="4"></path><circle cx="880" cy="165" r="20" fill="none" stroke="#1b3a63" stroke-width="3"></circle></g>
<text x="852" y="160" text-anchor="end" font-family="Trebuchet MS,sans-serif" font-size="19" font-weight="bold" fill="#1b3a63">Détendeur HP</text>
<text x="852" y="181" text-anchor="end" font-family="Calibri,sans-serif" font-size="17" fill="#6b7885">fixe la haute pression</text>
<rect x="800" y="230" width="160" height="110" rx="10" fill="#e8eef5" stroke="#1b3a63" stroke-width="3"></rect>
<path d="M800,300 H960" stroke="#1b3a63" stroke-width="2" stroke-dasharray="6 5"></path>
<text x="880" y="272" text-anchor="middle" font-family="Trebuchet MS,sans-serif" font-size="19" font-weight="bold" fill="#1b3a63">Bouteille</text>
<text x="880" y="292" text-anchor="middle" font-family="Trebuchet MS,sans-serif" font-size="19" font-weight="bold" fill="#1b3a63">flash</text>
<text x="880" y="325" text-anchor="middle" font-family="Calibri,sans-serif" font-size="17" fill="#2b6ca3">liquide</text>
<g><rect x="600" y="232" width="40" height="26" rx="4" fill="#ffffff" stroke="#9c8fd6" stroke-width="3"></rect><path d="M608,245 H632" stroke="#9c8fd6" stroke-width="3"></path></g>
<text x="620" y="224" text-anchor="middle" font-family="Calibri,sans-serif" font-size="17" fill="#6b5fa8">vanne flash gas</text>
<rect x="190" y="180" width="120" height="55" rx="8" fill="#e8eef5" stroke="#1b3a63" stroke-width="3"></rect>
<text x="250" y="214" text-anchor="middle" font-family="Trebuchet MS,sans-serif" font-size="19" font-weight="bold" fill="#1b3a63">Compr. MT</text>
<rect x="100" y="440" width="120" height="55" rx="8" fill="#e8eef5" stroke="#1b3a63" stroke-width="3"></rect>
<text x="160" y="474" text-anchor="middle" font-family="Trebuchet MS,sans-serif" font-size="19" font-weight="bold" fill="#1b3a63">Compr. BT</text>
<rect x="340" y="440" width="220" height="60" rx="8" fill="#dcecfa" stroke="#3a8fd6" stroke-width="3"></rect>
<text x="450" y="465" text-anchor="middle" font-family="Trebuchet MS,sans-serif" font-size="19" font-weight="bold" fill="#1b5580">Évaporateurs MT</text>
<text x="450" y="486" text-anchor="middle" font-family="Calibri,sans-serif" font-size="17" fill="#2b6ca3">meubles positifs</text>
<rect x="340" y="540" width="220" height="60" rx="8" fill="#dcecfa" stroke="#3a8fd6" stroke-width="3"></rect>
<text x="450" y="565" text-anchor="middle" font-family="Trebuchet MS,sans-serif" font-size="19" font-weight="bold" fill="#1b5580">Évaporateurs BT</text>
<text x="450" y="586" text-anchor="middle" font-family="Calibri,sans-serif" font-size="17" fill="#2b6ca3">meubles négatifs</text>
<g><path d="M608,433 L632,461 M632,433 L608,461" stroke="#1b3a63" stroke-width="3.5"></path></g>
<text x="646" y="452" font-family="Calibri,sans-serif" font-size="17" fill="#6b7885">détendeur MT</text>
<g><path d="M708,534 L732,562 M732,534 L708,562" stroke="#1b3a63" stroke-width="3.5"></path></g>
<text x="746" y="553" font-family="Calibri,sans-serif" font-size="17" fill="#6b7885">détendeur BT</text>
<g font-family="Calibri,sans-serif" font-size="17">
<rect x="60" y="20" width="18" height="8" fill="#ff6b35"></rect><text x="86" y="29" fill="#6b7885">HP / gaz chaud</text>
<rect x="220" y="20" width="18" height="8" fill="#1b3a63"></rect><text x="246" y="29" fill="#6b7885">liquide / pression intermédiaire</text>
<rect x="500" y="20" width="18" height="8" fill="#9c8fd6"></rect><text x="526" y="29" fill="#6b7885">flash gas</text>
<rect x="640" y="20" width="18" height="8" fill="#3a8fd6"></rect><text x="666" y="29" fill="#6b7885">BP / aspiration</text>
</g>
</svg>`,

  boosterAnime: `<svg viewBox="0 0 700 620" style="width:100%;height:auto;display:block" data-anim="cycle">
<path d="M150,150 L150,66 L250,66" fill="none" stroke="#ff6b35" stroke-width="6" stroke-dasharray="14 10" style="animation:omflow 1.1s linear infinite"></path>
<path d="M470,66 L600,66 L600,118" fill="none" stroke="#c9420d" stroke-width="6" stroke-dasharray="14 10" style="animation:omflow 1.1s linear infinite"></path>
<path d="M600,152 L600,170" fill="none" stroke="#1b3a63" stroke-width="6" stroke-dasharray="14 10" style="animation:omflow 1.1s linear infinite"></path>
<path d="M600,260 L600,330 L500,330" fill="none" stroke="#1b3a63" stroke-width="6" stroke-dasharray="14 10" style="animation:omflow 1.1s linear infinite"></path>
<path d="M500,330 L430,330 L430,332" fill="none" stroke="#1b3a63" stroke-width="6" stroke-dasharray="14 10" style="animation:omflow 1.1s linear infinite"></path>
<path d="M430,358 L430,380 L400,380" fill="none" stroke="#3a8fd6" stroke-width="6" stroke-dasharray="14 10" style="animation:omflow 1.1s linear infinite"></path>
<path d="M500,330 L500,427" fill="none" stroke="#1b3a63" stroke-width="6" stroke-dasharray="14 10" style="animation:omflow 1.1s linear infinite"></path>
<path d="M500,453 L500,500 L400,500" fill="none" stroke="#3a8fd6" stroke-width="6" stroke-dasharray="14 10" style="animation:omflow 1.1s linear infinite"></path>
<path d="M230,380 L150,380 L150,300" fill="none" stroke="#3a8fd6" stroke-width="6" stroke-dasharray="14 10" style="animation:omflow 1.1s linear infinite"></path>
<path d="M230,500 L85,500 L85,410" fill="none" stroke="#3a8fd6" stroke-width="6" stroke-dasharray="14 10" style="animation:omflow 1.1s linear infinite"></path>
<path d="M85,360 L85,300 L150,300" fill="none" stroke="#ff6b35" stroke-width="6" stroke-dasharray="14 10" style="animation:omflow 1.1s linear infinite"></path>
<path d="M150,300 L150,200" fill="none" stroke="#3a8fd6" stroke-width="6" stroke-dasharray="14 10" style="animation:omflow 1.1s linear infinite"></path>
<path d="M530,190 L400,190 L400,300 L150,300" fill="none" stroke="#9c8fd6" stroke-width="6" stroke-dasharray="14 10" style="animation:omflow 1.1s linear infinite"></path>
<rect x="250" y="40" width="220" height="52" rx="8" fill="#ffe4d8" stroke="#ff6b35" stroke-width="3"></rect>
<text x="360" y="72" text-anchor="middle" font-family="Trebuchet MS,sans-serif" font-size="20" font-weight="bold" fill="#c9420d">Refroidisseur de gaz</text>
<circle cx="600" cy="135" r="17" fill="#ffffff" stroke="#1b3a63" stroke-width="3"></circle>
<path d="M589,124 L611,146 M611,124 L589,146" stroke="#1b3a63" stroke-width="3.5"></path>
<text x="628" y="141" font-family="Calibri,sans-serif" font-size="19" fill="#1b3a63">détendeur HP</text>
<rect x="530" y="170" width="140" height="90" rx="10" fill="#e8eef5" stroke="#1b3a63" stroke-width="3"></rect>
<path d="M530,222 H670" stroke="#1b3a63" stroke-width="2" stroke-dasharray="6 5"></path>
<text x="600" y="216" text-anchor="middle" font-family="Trebuchet MS,sans-serif" font-size="19" font-weight="bold" fill="#1b3a63">Bouteille flash</text>
<rect x="385" y="178" width="30" height="24" rx="4" fill="#ffffff" stroke="#9c8fd6" stroke-width="3"></rect>
<path d="M391,190 H409" stroke="#9c8fd6" stroke-width="3"></path>
<text x="375" y="168" text-anchor="middle" font-family="Calibri,sans-serif" font-size="18" fill="#6b5fa8">vanne flash gas</text>
<rect x="105" y="150" width="90" height="50" rx="8" fill="#e8eef5" stroke="#1b3a63" stroke-width="3"></rect>
<text x="150" y="182" text-anchor="middle" font-family="Trebuchet MS,sans-serif" font-size="19" font-weight="bold" fill="#1b3a63">MT</text>
<rect x="40" y="360" width="90" height="50" rx="8" fill="#e8eef5" stroke="#1b3a63" stroke-width="3"></rect>
<text x="85" y="392" text-anchor="middle" font-family="Trebuchet MS,sans-serif" font-size="19" font-weight="bold" fill="#1b3a63">BT</text>
<text x="150" y="228" text-anchor="middle" font-family="Calibri,sans-serif" font-size="17" fill="#6b7885">compresseur</text>
<text x="85" y="438" text-anchor="middle" font-family="Calibri,sans-serif" font-size="17" fill="#6b7885">compresseur</text>
<rect x="230" y="355" width="170" height="50" rx="8" fill="#dcecfa" stroke="#3a8fd6" stroke-width="3"></rect>
<text x="315" y="386" text-anchor="middle" font-family="Trebuchet MS,sans-serif" font-size="19" font-weight="bold" fill="#1b5580">Évaporateurs MT</text>
<rect x="230" y="475" width="170" height="50" rx="8" fill="#dcecfa" stroke="#3a8fd6" stroke-width="3"></rect>
<text x="315" y="506" text-anchor="middle" font-family="Trebuchet MS,sans-serif" font-size="19" font-weight="bold" fill="#1b5580">Évaporateurs BT</text>
<path d="M419,334 L441,356 M441,334 L419,356" stroke="#1b3a63" stroke-width="3.5"></path>
<path d="M489,429 L511,451 M511,429 L489,451" stroke="#1b3a63" stroke-width="3.5"></path>
<text x="455" y="348" font-family="Calibri,sans-serif" font-size="17" fill="#6b7885">dét. MT</text>
<text x="525" y="444" font-family="Calibri,sans-serif" font-size="17" fill="#6b7885">dét. BT</text>
<g font-family="Trebuchet MS,sans-serif" font-size="16" font-weight="bold" fill="#ffffff">
<circle cx="150" cy="108" r="14" fill="#ff6b35"></circle><text x="150" y="114" text-anchor="middle">K</text>
<circle cx="505" cy="66" r="14" fill="#c9420d"></circle><text x="505" y="72" text-anchor="middle">A</text>
<circle cx="600" cy="160" r="14" fill="#1b3a63"></circle><text x="600" y="166" text-anchor="middle">B</text>
<circle cx="600" cy="243" r="14" fill="#1b3a63"></circle><text x="600" y="249" text-anchor="middle">C</text>
<circle cx="556" cy="192" r="14" fill="#9c8fd6"></circle><text x="556" y="198" text-anchor="middle">D</text>
<circle cx="415" cy="380" r="14" fill="#3a8fd6"></circle><text x="415" y="386" text-anchor="middle">E</text>
<circle cx="205" cy="380" r="14" fill="#3a8fd6"></circle><text x="205" y="386" text-anchor="middle">F</text>
<circle cx="466" cy="500" r="14" fill="#3a8fd6"></circle><text x="466" y="506" text-anchor="middle">G</text>
<circle cx="205" cy="500" r="14" fill="#3a8fd6"></circle><text x="205" y="506" text-anchor="middle">H</text>
<circle cx="85" cy="330" r="14" fill="#ff6b35"></circle><text x="85" y="336" text-anchor="middle">I</text>
<circle cx="122" cy="272" r="14" fill="#3a8fd6"></circle><text x="122" y="278" text-anchor="middle">J</text>
</g>
<circle r="15" fill="#ff6b35" stroke="#ffffff" stroke-width="3.5">
<animateMotion dur="16s" repeatCount="indefinite" calcMode="linear" keyTimes="0;0.35;0.88;1" keyPoints="0;0.447;0.902;1" path="M150,150 L150,66 L250,66 L470,66 L600,66 L600,170 L600,215 L600,260 L600,330 L430,330 L430,380 L400,380 L230,380 L150,380 L150,300 L150,200 Z"></animateMotion>
<animate attributeName="fill" dur="16s" repeatCount="indefinite" calcMode="discrete" keyTimes="0;0.35;0.52;0.9" values="#ff6b35;#1b3a63;#3a8fd6;#ff6b35"></animate>
</circle>
<circle r="15" fill="#ff6b35" stroke="#ffffff" stroke-width="3.5">
<animateMotion dur="16s" repeatCount="indefinite" calcMode="linear" keyTimes="0;0.35;0.88;1" keyPoints="0;0.360;0.921;1" path="M150,150 L150,66 L250,66 L470,66 L600,66 L600,170 L600,215 L600,260 L600,330 L500,330 L500,500 L400,500 L230,500 L85,500 L85,410 L85,360 L85,300 L150,300 L150,200 Z"></animateMotion>
<animate attributeName="fill" dur="16s" repeatCount="indefinite" calcMode="discrete" keyTimes="0;0.35;0.6;0.92" values="#ff6b35;#1b3a63;#3a8fd6;#ff6b35"></animate>
</circle>
<circle r="15" fill="#ff6b35" stroke="#ffffff" stroke-width="3.5">
<animateMotion dur="16s" repeatCount="indefinite" calcMode="linear" keyTimes="0;0.35;0.88;1" keyPoints="0;0.4888;0.8927;1" path="M150,150 L150,66 L250,66 L470,66 L600,66 L600,170 L600,215 L530,190 L400,190 L400,300 L150,300 L150,200 Z"></animateMotion>
<animate attributeName="fill" dur="16s" repeatCount="indefinite" calcMode="discrete" keyTimes="0;0.35;0.6;0.89" values="#ff6b35;#9c8fd6;#9c8fd6;#ff6b35"></animate>
</circle>
</svg>`,

  diagrammeBooster: `<svg viewBox="0 0 1000 620" style="width:100%;height:auto;display:block" data-anim="cycle">
<use href="#co2grid"></use>
<rect x="90" y="40" width="870" height="136.3" fill="#fff6f2"></rect>
<use href="#co2dome" stroke="#1b3a63" stroke-width="3.5"></use>
<path d="M90,176.3H960" stroke="#ff6b35" stroke-width="2" stroke-dasharray="9 7" opacity=".6"></path>
<circle cx="551.1" cy="176.3" r="7" fill="#ff6b35"></circle>
<path d="M90,303.6H960M90,360.9H960M90,503.8H960" stroke="#c8d3e0" stroke-width="1.5" stroke-dasharray="4 8"></path>
<path d="M905.6,138.2 L466.3,138.2" fill="none" stroke="#c9420d" stroke-width="6"></path>
<path d="M466.3,138.2 L466.3,303.6" fill="none" stroke="#1b3a63" stroke-width="5"></path>
<path d="M466.3,303.6 L281.4,303.6" fill="none" stroke="#1b3a63" stroke-width="5"></path>
<path d="M281.4,303.6 L281.4,503.8" fill="none" stroke="#1b3a63" stroke-width="5"></path>
<path d="M466.3,303.6 L757.3,303.6 L757.3,360.9" fill="none" stroke="#9c8fd6" stroke-width="5"></path>
<path d="M281.4,360.9 L779.5,360.9" fill="none" stroke="#3a8fd6" stroke-width="5"></path>
<path d="M281.4,503.8 L788.2,503.8" fill="none" stroke="#3a8fd6" stroke-width="5"></path>
<path d="M788.2,503.8 L853.4,360.9" fill="none" stroke="#ff6b35" stroke-width="5"></path>
<path d="M786,360.9 L905.6,138.2" fill="none" stroke="#ff6b35" stroke-width="6"></path>
<g font-family="Trebuchet MS,sans-serif" font-size="16" font-weight="bold" fill="#ffffff">
<circle cx="905.6" cy="138.2" r="15" fill="#ff6b35"></circle><text x="905.6" y="144" text-anchor="middle">K</text>
<circle cx="466.3" cy="138.2" r="15" fill="#c9420d"></circle><text x="466.3" y="144" text-anchor="middle">A</text>
<circle cx="466.3" cy="303.6" r="15" fill="#1b3a63"></circle><text x="466.3" y="309" text-anchor="middle">B</text>
<circle cx="281.4" cy="303.6" r="15" fill="#1b3a63"></circle><text x="281.4" y="309" text-anchor="middle">C</text>
<circle cx="757.3" cy="303.6" r="15" fill="#9c8fd6"></circle><text x="757.3" y="309" text-anchor="middle">D</text>
<circle cx="281.4" cy="360.9" r="15" fill="#3a8fd6"></circle><text x="281.4" y="366" text-anchor="middle">E</text>
<circle cx="779.5" cy="360.9" r="15" fill="#3a8fd6"></circle><text x="779.5" y="366" text-anchor="middle">F</text>
<circle cx="281.4" cy="503.8" r="15" fill="#3a8fd6"></circle><text x="281.4" y="509" text-anchor="middle">G</text>
<circle cx="788.2" cy="503.8" r="15" fill="#3a8fd6"></circle><text x="788.2" y="509" text-anchor="middle">H</text>
<circle cx="853.4" cy="360.9" r="15" fill="#ff6b35"></circle><text x="853.4" y="366" text-anchor="middle">I</text>
</g>
<g font-family="Calibri,sans-serif" font-size="20" fill="#1b3a63">
<text x="890" y="120" text-anchor="end">K · refoulement MT</text>
<text x="466.3" y="118" text-anchor="middle">A · sortie refroidisseur de gaz</text>
<text x="443" y="288" text-anchor="end" fill="#1b3a63">B · après détendeur HP</text>
<text x="292" y="336" fill="#1b3a63">C · liquide en bouteille</text>
<text x="778" y="288" fill="#6b5fa8">D · flash gas</text>
<text x="800" y="344" fill="#2b6ca3">F · sortie évap MT</text>
<text x="808" y="486" fill="#2b6ca3">H · sortie évap BT</text>
<text x="845" y="400" text-anchor="end" fill="#c9420d">I · refoulement BT</text>
<text x="560" y="398" text-anchor="middle" fill="#2b6ca3">mélange à l'aspiration MT</text>
<text x="600" y="278" text-anchor="middle" fill="#6b5fa8">séparation liquide / vapeur</text>
</g>
<g font-family="Calibri,sans-serif" font-size="18" fill="#8a96a3">
<text x="100" y="132">90 bar</text><text x="100" y="298">38 bar</text><text x="100" y="355">28 bar</text><text x="100" y="498">13 bar</text>
</g>
<path d="M90,40V560H960" stroke="#1b3a63" stroke-width="2.5" fill="none"></path>
<text x="520" y="613" text-anchor="middle" font-family="Trebuchet MS,sans-serif" font-size="19" font-weight="bold" fill="#1b3a63">Enthalpie h (kJ/kg)</text>
<circle r="15" fill="#ff6b35" stroke="#ffffff" stroke-width="3.5">
<animateMotion dur="16s" repeatCount="indefinite" calcMode="linear" keyTimes="0;0.35;0.88;1" keyPoints="0;0.377;0.8424;1" path="M905.6,138.2 L466.3,138.2 L466.3,303.6 L281.4,303.6 L281.4,360.9 L786,360.9 L905.6,138.2 Z"></animateMotion>
<animate attributeName="fill" dur="16s" repeatCount="indefinite" calcMode="discrete" keyTimes="0;0.35;0.52;0.9" values="#ff6b35;#1b3a63;#3a8fd6;#ff6b35"></animate>
</circle>
<circle r="15" fill="#ff6b35" stroke="#ffffff" stroke-width="3.5">
<animateMotion dur="16s" repeatCount="indefinite" calcMode="linear" keyTimes="0;0.35;0.88;1" keyPoints="0;0.3064;0.8719;1" path="M905.6,138.2 L466.3,138.2 L466.3,303.6 L281.4,303.6 L281.4,503.8 L788.2,503.8 L853.4,360.9 L786,360.9 L905.6,138.2 Z"></animateMotion>
<animate attributeName="fill" dur="16s" repeatCount="indefinite" calcMode="discrete" keyTimes="0;0.35;0.6;0.92" values="#ff6b35;#1b3a63;#3a8fd6;#ff6b35"></animate>
</circle>
<circle r="15" fill="#ff6b35" stroke="#ffffff" stroke-width="3.5">
<animateMotion dur="16s" repeatCount="indefinite" calcMode="linear" keyTimes="0;0.35;0.88;1" keyPoints="0;0.4898;0.7952;1" path="M905.6,138.2 L466.3,138.2 L466.3,303.6 L757.3,303.6 L757.3,360.9 L786,360.9 L905.6,138.2 Z"></animateMotion>
<animate attributeName="fill" dur="16s" repeatCount="indefinite" calcMode="discrete" keyTimes="0;0.35;0.6;0.89" values="#ff6b35;#9c8fd6;#9c8fd6;#ff6b35"></animate>
</circle>
</svg>`,

  flashSimple: `<svg viewBox="0 0 340 150" style="width:100%;height:auto;display:block">
<rect x="14" y="46" width="86" height="66" rx="7" fill="#e8eef5" stroke="#1b3a63" stroke-width="2.5"></rect>
<text x="57" y="74" text-anchor="middle" font-family="Calibri,sans-serif" font-size="17" fill="#1b3a63">Bouteille</text>
<text x="57" y="96" text-anchor="middle" font-family="Calibri,sans-serif" font-size="17" fill="#1b3a63">38 bar</text>
<path d="M100,79 L196,79" stroke="#9c8fd6" stroke-width="5" stroke-dasharray="12 8" style="animation:omflow 1.1s linear infinite"></path>
<path d="M136,68 L160,90 M160,68 L136,90" stroke="#1b3a63" stroke-width="3"></path>
<path d="M188,72 L200,79 L188,86 Z" fill="#9c8fd6"></path>
<rect x="204" y="52" width="122" height="54" rx="7" fill="#dcecfa" stroke="#3a8fd6" stroke-width="2.5"></rect>
<text x="265" y="74" text-anchor="middle" font-family="Calibri,sans-serif" font-size="17" fill="#1b5580">Aspiration MT</text>
<text x="265" y="95" text-anchor="middle" font-family="Calibri,sans-serif" font-size="17" fill="#1b5580">28 bar</text>
<text x="148" y="132" text-anchor="middle" font-family="Calibri,sans-serif" font-size="16" fill="#c9420d">détente = énergie perdue</text>
<text x="148" y="34" text-anchor="middle" font-family="Calibri,sans-serif" font-size="16" fill="#6b5fa8">vanne flash gas</text>
</svg>`,

  flashParallele: `<svg viewBox="0 0 340 150" style="width:100%;height:auto;display:block">
<rect x="14" y="46" width="86" height="66" rx="7" fill="#e8eef5" stroke="#1b3a63" stroke-width="2.5"></rect>
<text x="57" y="74" text-anchor="middle" font-family="Calibri,sans-serif" font-size="17" fill="#1b3a63">Bouteille</text>
<text x="57" y="96" text-anchor="middle" font-family="Calibri,sans-serif" font-size="17" fill="#1b3a63">38 bar</text>
<path d="M100,79 L176,79" stroke="#9c8fd6" stroke-width="5" stroke-dasharray="12 8" style="animation:omflow 1.1s linear infinite"></path>
<path d="M168,72 L180,79 L168,86 Z" fill="#9c8fd6"></path>
<rect x="184" y="52" width="104" height="54" rx="7" fill="#e8eef5" stroke="#1b3a63" stroke-width="2.5"></rect>
<text x="236" y="74" text-anchor="middle" font-family="Calibri,sans-serif" font-size="17" fill="#1b3a63">Compresseur</text>
<text x="236" y="95" text-anchor="middle" font-family="Calibri,sans-serif" font-size="17" fill="#1b3a63">parallèle</text>
<path d="M288,79 L318,79" stroke="#ff6b35" stroke-width="5" stroke-dasharray="12 8" style="animation:omflow 1.1s linear infinite"></path>
<text x="236" y="34" text-anchor="middle" font-family="Calibri,sans-serif" font-size="16" fill="#c9420d">→ HP 90 bar</text>
<text x="168" y="132" text-anchor="middle" font-family="Calibri,sans-serif" font-size="16" fill="#1a6b3a">pas de détente inutile</text>
</svg>`,

  flashEjecteur: `<svg viewBox="0 0 340 150" style="width:100%;height:auto;display:block">
<path d="M10,62 L96,62 L128,74 L156,70 L156,88 L128,84 L96,96 L10,96 Z" fill="#fff1ea" stroke="#c9420d" stroke-width="2.5"></path>
<path d="M156,60 L232,50 L232,108 L156,98 Z" fill="#f2f6fa" stroke="#1b3a63" stroke-width="2.5"></path>
<path d="M14,79 L120,79" stroke="#ff6b35" stroke-width="5" stroke-dasharray="12 8" style="animation:omflow .8s linear infinite"></path>
<path d="M170,130 L170,92" stroke="#3a8fd6" stroke-width="5" stroke-dasharray="12 8" style="animation:omflow 1.1s linear infinite"></path>
<path d="M232,79 L318,79" stroke="#7e6fc4" stroke-width="5" stroke-dasharray="12 8" style="animation:omflow 1.1s linear infinite"></path>
<text x="60" y="44" text-anchor="middle" font-family="Calibri,sans-serif" font-size="16" fill="#c9420d">HP moteur</text>
<text x="176" y="146" text-anchor="middle" font-family="Calibri,sans-serif" font-size="16" fill="#1b5580">vapeur BP aspirée</text>
<text x="330" y="60" text-anchor="end" font-family="Calibri,sans-serif" font-size="16" fill="#6b5fa8">→ bouteille</text>
<text x="330" y="105" text-anchor="end" font-family="Calibri,sans-serif" font-size="16" fill="#1a6b3a">38 bar</text>
</svg>`,

  ejecteur: `<svg viewBox="0 0 900 520" style="width:100%;height:auto;display:block" data-anim="cycle">
<path d="M160,120 L430,120 L430,172 L560,172 L800,146 L866,146 L866,244 L800,244 L560,218 L430,218 L430,270 L160,270 Z" fill="#f2f6fa" stroke="#1b3a63" stroke-width="3"></path>
<path d="M200,60 L280,60 L280,122 M200,122 L200,60" fill="#dcecfa" stroke="#3a8fd6" stroke-width="3"></path>
<rect x="200" y="60" width="80" height="62" fill="#dcecfa"></rect>
<path d="M200,60 L200,122 M280,60 L280,122" stroke="#3a8fd6" stroke-width="3"></path>
<path d="M200,60 L280,60" stroke="#3a8fd6" stroke-width="3"></path>
<path d="M40,172 L160,172 L240,188 L300,180" fill="none" stroke="#1b3a63" stroke-width="6" stroke-linejoin="round"></path>
<path d="M40,218 L160,218 L240,202 L300,210" fill="none" stroke="#1b3a63" stroke-width="6" stroke-linejoin="round"></path>
<path d="M240,272 L240,300" stroke="#8a96a3" stroke-width="2"></path>
<path d="M495,222 L495,300" stroke="#8a96a3" stroke-width="2"></path>
<path d="M690,232 L690,300" stroke="#8a96a3" stroke-width="2"></path>
<g font-family="Calibri,sans-serif" font-size="18" fill="#5a6875">
<text x="240" y="322" text-anchor="middle">col — vitesse maxi, pression mini</text>
<text x="495" y="322" text-anchor="middle">chambre de mélange</text>
<text x="690" y="322" text-anchor="middle">diffuseur — recompression</text>
</g>
<g font-family="Calibri,sans-serif" font-size="18" fill="#c9420d">
<text x="36" y="140">Fluide moteur</text><text x="36" y="162">HP ≈ 90 bar</text>
</g>
<g font-family="Calibri,sans-serif" font-size="18" fill="#1b5580">
<text x="240" y="24" text-anchor="middle">Vapeur aspirée</text><text x="240" y="46" text-anchor="middle">BP ≈ 28 bar</text>
</g>
<g font-family="Calibri,sans-serif" font-size="18" fill="#6b5fa8">
<text x="862" y="86" text-anchor="end">Vers la bouteille flash</text><text x="862" y="108" text-anchor="end">≈ 38 bar</text>
</g>
<circle r="9" fill="#ff6b35" stroke="#ffffff" stroke-width="2.5">
<animateMotion dur="4s" repeatCount="indefinite" calcMode="linear" keyTimes="0;0.30;0.36;0.40;0.55;0.72;1" keyPoints="0;0.134;0.236;0.312;0.478;0.643;1" path="M55,195 L160,195 L240,195 L300,195 L430,195 L560,195 L840,195"></animateMotion>
<animate attributeName="fill" dur="4s" repeatCount="indefinite" calcMode="discrete" keyTimes="0;0.55" values="#ff6b35;#7e6fc4"></animate>
</circle>
<circle r="9" fill="#ff6b35" stroke="#ffffff" stroke-width="2.5">
<animateMotion begin="1.3s" dur="4s" repeatCount="indefinite" calcMode="linear" keyTimes="0;0.30;0.36;0.40;0.55;0.72;1" keyPoints="0;0.134;0.236;0.312;0.478;0.643;1" path="M55,183 L160,183 L240,190 L300,188 L430,188 L560,188 L840,188"></animateMotion>
<animate attributeName="fill" begin="1.3s" dur="4s" repeatCount="indefinite" calcMode="discrete" keyTimes="0;0.55" values="#ff6b35;#7e6fc4"></animate>
</circle>
<circle r="9" fill="#ff6b35" stroke="#ffffff" stroke-width="2.5">
<animateMotion begin="2.6s" dur="4s" repeatCount="indefinite" calcMode="linear" keyTimes="0;0.30;0.36;0.40;0.55;0.72;1" keyPoints="0;0.134;0.236;0.312;0.478;0.643;1" path="M55,207 L160,207 L240,200 L300,203 L430,203 L560,203 L840,203"></animateMotion>
<animate attributeName="fill" begin="2.6s" dur="4s" repeatCount="indefinite" calcMode="discrete" keyTimes="0;0.55" values="#ff6b35;#7e6fc4"></animate>
</circle>
<circle r="9" fill="#3a8fd6" stroke="#ffffff" stroke-width="2.5">
<animateMotion begin="0.4s" dur="4s" repeatCount="indefinite" calcMode="linear" keyTimes="0;0.25;0.40;0.55;0.72;1" keyPoints="0;0.109;0.210;0.404;0.593;1" path="M222,55 L222,130 L300,168 L430,186 L560,186 L840,186"></animateMotion>
<animate attributeName="fill" begin="0.4s" dur="4s" repeatCount="indefinite" calcMode="discrete" keyTimes="0;0.55" values="#3a8fd6;#7e6fc4"></animate>
</circle>
<circle r="9" fill="#3a8fd6" stroke="#ffffff" stroke-width="2.5">
<animateMotion begin="1.9s" dur="4s" repeatCount="indefinite" calcMode="linear" keyTimes="0;0.25;0.40;0.55;0.72;1" keyPoints="0;0.109;0.210;0.404;0.593;1" path="M258,55 L258,130 L310,172 L430,205 L560,205 L840,205"></animateMotion>
<animate attributeName="fill" begin="1.9s" dur="4s" repeatCount="indefinite" calcMode="discrete" keyTimes="0;0.55" values="#3a8fd6;#7e6fc4"></animate>
</circle>
<circle r="9" fill="#3a8fd6" stroke="#ffffff" stroke-width="2.5">
<animateMotion begin="3.1s" dur="4s" repeatCount="indefinite" calcMode="linear" keyTimes="0;0.25;0.40;0.55;0.72;1" keyPoints="0;0.109;0.210;0.404;0.593;1" path="M240,55 L240,130 L305,170 L430,196 L560,196 L840,196"></animateMotion>
<animate attributeName="fill" begin="3.1s" dur="4s" repeatCount="indefinite" calcMode="discrete" keyTimes="0;0.55" values="#3a8fd6;#7e6fc4"></animate>
</circle>
<path d="M60,360 L60,500 L866,500" fill="none" stroke="#1b3a63" stroke-width="2.5"></path>
<path d="M60,440 L860,440" stroke="#3a8fd6" stroke-width="2" stroke-dasharray="8 7"></path>
<text x="856" y="432" text-anchor="end" font-family="Calibri,sans-serif" font-size="17" fill="#2b6ca3">pression d'aspiration BP (28 bar)</text>
<path d="M60,378 160,381 240,472 300,466 430,458 560,436 700,416 860,404" fill="none" stroke="#c9420d" stroke-width="4"></path>
<circle cx="240" cy="472" r="8" fill="#c9420d" stroke="#ffffff" stroke-width="2.5"></circle>
<text x="252" y="486" font-family="Calibri,sans-serif" font-size="17" fill="#c9420d">ici la pression passe sous 28 bar : la vapeur est aspirée</text>
<text x="34" y="430" text-anchor="middle" transform="rotate(-90 34 430)" font-family="Trebuchet MS,sans-serif" font-size="18" font-weight="bold" fill="#1b3a63">Pression</text>
<text x="60" y="370" font-family="Calibri,sans-serif" font-size="17" fill="#8a96a3">90 bar</text>
</svg>`,
};
