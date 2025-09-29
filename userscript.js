// ==UserScript==
// @name         Stop écriture inclusive (Userscript)
// @namespace    https://gregoryklein.io/
// @version      1.4.0
// @description  Convertit l'écriture inclusive (point médian, doublets abrégés, pronoms neutres courants) en texte classique pour faciliter la lecture.
// @author       GK
// @match        *://*/*
// @run-at       document_idle
// ==/UserScript==

(() => {
  "use strict";

  // --- OUTILS ---------------------------------------------------------------
  // Plage Unicode pour lettres FR, apostrophes & traits usuels.
  const L = "A-Za-zÀ-ÖØ-öø-ÿ";
  // Tous les séparateurs "point médian like"
  const SEP_CLASS = "[·•⋅·‧.-]";
  const SEP_RE = /[·•⋅·‧.-]/g;

  const shouldSkipNode = (node) => {
    if (!node || !node.parentNode) return true;
    const p = node.parentNode;
    if (p.isContentEditable) return true;
    const tag = p.nodeName;
    return /^(SCRIPT|STYLE|NOSCRIPT|CODE|KBD|SAMP|PRE|TEXTAREA|INPUT)$/i.test(
      tag
    );
  };

  // Normalisation locale d'un texte : uniformiser les séparateurs en "·"
  const normSeparators = (s) => s.replace(SEP_RE, "·");

  // Conserver la casse pour certains remplacements (Iel -> Il, IELS -> ILS…)
  const preserveCase = (from, to) => {
    if (from.toUpperCase() === from) return to.toUpperCase();
    if (from[0] === from[0].toUpperCase())
      return to[0].toUpperCase() + to.slice(1);
    return to;
  };

  // --- RÈGLES DE REMPLACEMENT ----------------------------------------------
  // 1) Doublets abrégés au point médian (ou variantes) :
  //    - "arrivé·e·s"  -> "arrivés"
  //    - "lecteur·rice·s" -> "lecteurs"
  //    - "fier·ère"    -> "fier"
  //
  // Heuristique simple et robuste : on conserve la base AVANT le 1er point médian,
  // puis on ajoute "s" si la forme comporte un "·s" final.
  const rePointMedianWord = new RegExp(
    `\\b([${L}'-]+)(?:${SEP_CLASS}[${L}'-]+)+(?:${SEP_CLASS}s)?\\b`,
    "giu"
  );

  // 2) Parenthèses / slashs :
  //    - "copain(ne)s" -> "copains"
  //    - "auteur/trice/s" -> "auteurs"
  // Principe : garder la base avant "(" ou "/" ; si un "s" final optionnel est présent, on le conserve.
  const reParenCompact = new RegExp(
    `\\b([${L}'-]+)\\([^\\)]*\\)(s?)\\b`,
    "giu"
  );
  const reSlashCompact = new RegExp(
    `\\b([${L}'-]+)\\/[${L}'-]+(\\/s)?\\b`,
    "giu"
  );

  // 3) Pronoms / néologismes fréquents :
  //    - iel(s) -> il(s)
  //    - ielle(s) -> elle(s)
  //    - celleux -> ceux ; Celleux -> Ceux
  //    - toustes -> tous ; Toustes -> Tous
  //    - illes (forme inclusive de ils/elles) -> ils
  const lexicalReplacements = [
    {
      re: /\b(iel|iels)\b/giu,
      to: (m) =>
        preserveCase(
          m,
          m.toLowerCase() === "iels" || m.toLowerCase() === "iel"
            ? m.toLowerCase() === "iels"
              ? "ils"
              : "il"
            : "il"
        ),
    },
    {
      re: /\b(ielle|ielles)\b/giu,
      to: (m) =>
        preserveCase(m, m.toLowerCase() === "ielles" ? "elles" : "elle"),
    },
    { re: /\b(celleux)\b/giu, to: (m) => preserveCase(m, "ceux") },
    { re: /\b(toustes)\b/giu, to: (m) => preserveCase(m, "tous") },
    { re: /\b(illes)\b/giu, to: (m) => preserveCase(m, "ils") },
    {
      re: new RegExp(`\\b(${L}+)(?:${SEP_CLASS}e)s\\b`, "giu"),
      to: (m) => m.replace(new RegExp(SEP_CLASS, "g"), "").replace(/e?s$/, "s"),
    },
  ];

  // 4) Nettoyage léger de doublets typographiques dispersés :
  //    - "chef·fe·s" -> "chefs"
  //    - "ambassadeur·rice·s" -> "ambassadeurs"
  //    (déjà couvert par 1), mais garde-fous si « ·s » a disparu lors d'autres remplacements)
  const reTrailingDotS = new RegExp(`${SEP_CLASS}s\\b`, "giu");

  function convertText(s) {
    if (
      !s ||
      (!SEP_RE.test(s) &&
        !/[()\/]/.test(s) &&
        !/\b(iel|iels|ielle|ielles|toustes|celleux|illes)\b/i.test(s))
    ) {
      return s; // rapide: rien à faire
    }
    let out = normSeparators(s);

    // Doublets au point médian (garde la base + 's' éventuel)
    out = out.replace(rePointMedianWord, (match) => {
      // Exemple: "lecteur·rice·s" -> "lecteurs"
      return match.split(SEP_RE)[0] + (match.endsWith("s") ? "s" : "");
    });

    // Doublets (parenthèses)
    out = out.replace(
      reParenCompact,
      (match, base, sFinal) => base + (sFinal || "")
    );
    // Doublets (slash)
    out = out.replace(
      reSlashCompact,
      (match, base, sPart) => base + (sPart ? "s" : "")
    );

    // Lexique (pronoms / néologismes)
    for (const { re, to } of lexicalReplacements) {
      out = out.replace(re, (m) => (typeof to === "function" ? to(m) : to));
    }

    // Nettoyage final résiduel "·s" -> "s"
    out = out.replace(reTrailingDotS, "s");

    return out;
  }

  // --- PARCOURS DU DOM ------------------------------------------------------
  const walkerFilter = {
    acceptNode(node) {
      if (node.nodeType !== 3) return NodeFilter.FILTER_REJECT; // text
      if (shouldSkipNode(node)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  };

  function runOnce(root) {
    try {
      const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT,
        walkerFilter
      );
      const toChange = [];
      let n;
      while ((n = walker.nextNode())) {
        const t = n.nodeValue;
        const conv = convertText(t);
        if (conv !== t) toChange.push([n, conv]);
      }
      for (const [node, v] of toChange) node.nodeValue = v;
    } catch {
      // pas dramatique, on ignore
    }
  }

  // Traitement initial
  runOnce(document.body);

  // Observer dynamique (ajouts/modifs)
  const mo = new MutationObserver((mut) => {
    for (const m of mut) {
      for (const node of m.addedNodes || []) {
        if (node.nodeType === 1) runOnce(node);
        else if (node.nodeType === 3 && !shouldSkipNode(node)) {
          const v = node.nodeValue;
          const c = convertText(v);
          if (c !== v) node.nodeValue = c;
        }
      }
      if (
        m.type === "characterData" &&
        m.target &&
        m.target.nodeType === 3 &&
        !shouldSkipNode(m.target)
      ) {
        const v = m.target.nodeValue;
        const c = convertText(v);
        if (c !== v) m.target.nodeValue = c;
      }
    }
  });

  mo.observe(document.documentElement || document.body, {
    childList: true,
    characterData: true,
    subtree: true,
  });
})();
