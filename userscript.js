// ==UserScript==
// @name         Stop écriture inclusive (Userscript)
// @namespace    https://gregoryklein.io/
// @version      1.4.0
// @description  Convertit l'écriture inclusive (point médian, doublets abrégés, pronoms neutres courants) en texte classique pour faciliter la lecture.
// @author       GK
// @match        *://*/*
// @run-at       document_idle
// ==/UserScript==

// --- TOOLS ---------------------------------------------------------------
const nodesToReject = ["svg", "script", "style", "noscript", "iframe", "input"];

function isContentEditable(node) {
  if (node.nodeType === Node.ELEMENT_NODE) {
    const valuesToAvoid = ["true", "plaintext-only"];
    const contenteditable = node.attributes.getNamedItem("contenteditable");

    return (
      contenteditable !== null && valuesToAvoid.includes(contenteditable.value)
    );
  }
  return false;
}

function hasAnyContentEditableParent(node) {
  let hasReachedDocumentTop = false;
  while (!hasReachedDocumentTop) {
    if (node.parentNode !== null && isContentEditable(node.parentNode)) {
      return true;
    }
    node = node.parentNode;
    hasReachedDocumentTop = node.parentNode === null;
  }
  return false;
}

function acceptNodeFilter(node) {
  const parentNodeName =
    node.parentNode !== null && node.parentNode.nodeName.toLowerCase();

  if (nodesToReject.includes(parentNodeName)) {
    return NodeFilter.FILTER_REJECT;
  }
  if (hasAnyContentEditableParent(node)) {
    return NodeFilter.FILTER_REJECT;
  }
  return NodeFilter.FILTER_ACCEPT;
}

// Preserve case for certain replacements (Iel -> Il, IELS -> ILS…)
const preserveCase = (from, to) => {
  if (from.toUpperCase() === from) return to.toUpperCase();
  if (from[0] === from[0].toUpperCase())
    return to[0].toUpperCase() + to.slice(1);
  return to;
};

// --- REPLACEMENT RULES ----------------------------------------------
const wordFilters = {
  mien: ["miem", "miæn"],
  tous: ["touste", "toustes", "touxe", "touxes"],
  celui: ["cellui", "célui"],
  ceux: ["celleux", "ceulles", "ceuxes", "ceuze"],
  eux: ["elleux", "euxes"],
  ce: ["cès", "cèx"],
  un: ["unæ"],
  lui: ["ellui"],
  il: ["iel", "ielle"],
  ils: ["iels", "ielles", "illes"],
  instituteur: ["instituteurice"],
  copain: ["copaine"],
  copains: ["copaines"],
};

const separators = ["-", "⋅", "·", "•", "‧", "\\."];
const patternSeparators = "(?:" + separators.join("|") + ")";
const startBoundary = "(?<=^|[^\\p{L}])";
const endBoundary = "(?=[^\\p{L}]|$)";

const lexicalReplacements = Object.entries(wordFilters).map(
  ([replaceWith, wordsToReplace]) => {
    let regexpStr = wordsToReplace
      .map((word) => startBoundary + word + endBoundary)
      .join("|");
    return {
      re: new RegExp(regexpStr, "mgiu"),
      to: (m) => preserveCase(m, replaceWith),
    };
  }
);

function isLikelyInclusiveWriting(s) {
  // Check if the text looks like inclusive writing
  if (!s) return false;

  // Avoid URLs and file names
  if (/(https?:\/\/|\w+\.\w+\/)[^\s]*/.test(s)) {
    return false;
  }

  // Special cases like serait-iel
  if (/serait-iel\b/i.test(s)) {
    return true;
  }

  // Check inclusive pronouns
  const pronounPattern = Object.values(wordFilters).flat().join("|");
  if (new RegExp(`\\b(${pronounPattern})\\b`, "i").test(s)) {
    return true;
  }

  // Check separators between letters (but not dots in names like E.Leclerc)
  const sepPattern = `(?<!\\.)(?<!-)\\p{L}[${separators.join("")}]\\p{L}`;
  return new RegExp(sepPattern, "u").test(s);
}

function removeInclusiveWriting(s) {
  if (!s || !isLikelyInclusiveWriting(s)) {
    return s; // fast: nothing to do
  }

  let out = s;

  // Save only real compound names (with capitals) and names with dots
  const savedWords = {};
  let counter = 0;
  const placeholder = (m) => {
    const key = `__SAVED_${counter++}__`;
    savedWords[key] = m;
    return key;
  };
  out = out.replace(
    /[A-Z][a-z]+(?:-[A-Z][a-z]+)+|[A-Z](?:\.[A-Z][a-z]+)+/g,
    placeholder
  );

  // Handle very specific cases first before any other processing
  // Use a special placeholder for serait-il
  const seraitIlPlaceholder = "__SERAIT_IL__";
  out = out.replace(/serait-iel\b/gi, seraitIlPlaceholder);
  out = out.replace(/serait-il[·•⋅‧\.-]elle\b/gi, seraitIlPlaceholder);

  // Special handling to preserve case of "Cher"
  out = out.replace(/([Cc]her)[·•⋅‧\.-]e[·•⋅‧\.-]s\b/gi, (m, prefix) => {
    return prefix === "Cher" ? "Chers" : "chers";
  });

  // Special cases
  const specialCases = [
    {
      pattern: `${startBoundary}serait${patternSeparators}elle${endBoundary}`,
      replacement: "serait-il",
    },
    {
      pattern: `${startBoundary}be${patternSeparators}aux${patternSeparators}lles${endBoundary}`,
      replacement: "beaux",
    },
    {
      pattern: `${startBoundary}be${patternSeparators}aux${endBoundary}`,
      replacement: "beaux",
    },
    {
      pattern: `${startBoundary}quelqu'un${patternSeparators}e${endBoundary}`,
      replacement: "quelqu'un",
    },
    {
      pattern: `${startBoundary}prêt${patternSeparators}e${endBoundary}`,
      replacement: "prêt",
    },
    {
      pattern: `${startBoundary}([Cc]her)${patternSeparators}e${endBoundary}`,
      replacement: (m, prefix) => prefix,
    },
    {
      // Handle -rice endings
      pattern: `${startBoundary}([\\p{L}]+)(?:eur|teur)${patternSeparators}rice(?:${patternSeparators}s)?${endBoundary}`,
      replacement: (m, prefix) => `${prefix}eur${m.endsWith("s") ? "s" : ""}`,
    },
    {
      // Handle -e and -s endings (except after serait)
      pattern: `(?<!\\.)(?<!-)(?<!serait)(?<=\\p{L})${patternSeparators}e(?:${patternSeparators}s)?${endBoundary}`,
      replacement: (m) => (m.endsWith("s") ? "s" : ""),
    },
    {
      // Handle doublets with separator (except compound names with hyphen and already treated cases)
      pattern: `(?<!\\.)(?<!-)(?<!-il)(?<!serait-)${startBoundary}([\\p{L}]+)${patternSeparators}[\\p{L}]+(?:${patternSeparators}s)?${endBoundary}`,
      replacement: (m, prefix) => prefix + (m.endsWith("s") ? "s" : ""),
    },
  ];

  // Apply special cases
  for (const { pattern, replacement } of specialCases) {
    out = out.replace(new RegExp(pattern, "mgiu"), replacement);
  }

  // Replace inclusive pronouns via lexicalReplacements
  for (const { re, to } of lexicalReplacements) {
    out = out.replace(re, (m) => (typeof to === "function" ? to(m) : to));
  }

  // Restore compound names and names with dots
  for (const [key, value] of Object.entries(savedWords)) {
    out = out.replace(key, value);
  }

  // Restore serait-il
  out = out.replace(new RegExp(seraitIlPlaceholder, "g"), "serait-il");

  // Clean up multiple spaces
  out = out.replace(/\s+/g, " ");

  return out;
}

// For testing purposes
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    removeInclusiveWriting,
    isContentEditable,
    hasAnyContentEditableParent,
    acceptNodeFilter,
  };
}

(() => {
  if (typeof window === "undefined") return; // Skip browser code in Node.js

  ("use strict");

  // --- DOM TRAVERSAL ------------------------------------------------------
  function textNodesUnder(node) {
    let n,
      a = [],
      walk = document.createTreeWalker(
        node,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => acceptNodeFilter(node),
        },
        false
      );
    while ((n = walk.nextNode())) a.push(n);
    return a;
  }

  function fixTextNode(textNode) {
    let originalText = textNode.textContent;
    let fixedText = removeInclusiveWriting(textNode.textContent);
    if (originalText === fixedText) {
      return;
    }
    textNode.textContent = fixedText;
  }

  function fixTextsUnderNode(node) {
    let pageTextNodes = textNodesUnder(node);
    pageTextNodes.forEach((textNode) => fixTextNode(textNode));
  }

  function processMutationRecord(mutationRecord) {
    switch (mutationRecord.type) {
      case "childList":
        mutationRecord.addedNodes.forEach((node) => fixTextsUnderNode(node));
        break;

      case "characterData":
        if (
          acceptNodeFilter(mutationRecord.target) === NodeFilter.FILTER_ACCEPT
        ) {
          fixTextNode(mutationRecord.target);
        }
        break;
    }
  }

  function setBodyObserver() {
    const bodyObserver = new MutationObserver((mutationsList) => {
      mutationsList.forEach((mutationRecord) => {
        processMutationRecord(mutationRecord);
      });
    });
    bodyObserver.observe(document.body, {
      attributes: false,
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  // Initial processing
  fixTextsUnderNode(document.body);
  setBodyObserver();
})();
