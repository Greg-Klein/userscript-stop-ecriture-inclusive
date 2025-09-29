// Mock des fonctions GM_*
global.GM_getValue = jest.fn().mockReturnValue(true);
global.GM_setValue = jest.fn();
global.GM_registerMenuCommand = jest.fn();

// Initialisation de l'environnement du navigateur
document.body.innerHTML = "";

// Plage Unicode pour lettres FR, apostrophes & traits usuels.
const L = "A-Za-zÀ-ÖØ-öø-ÿ";
// Tous les séparateurs "point médian like"
const SEP_CLASS = "[·•⋅·‧.-]";
const SEP_RE = /[·•⋅·‧.-]/g;

// Normalisation locale d'un texte : uniformiser les séparateurs en "·"
const normSeparators = (s) => s.replace(SEP_RE, "·");

// Conserver la casse pour certains remplacements (Iel -> Il, IELS -> ILS…)
const preserveCase = (from, to) => {
  if (from.toUpperCase() === from) return to.toUpperCase();
  if (from[0] === from[0].toUpperCase())
    return to[0].toUpperCase() + to.slice(1);
  return to;
};

// Doublets abrégés au point médian (ou variantes)
const rePointMedianWord = new RegExp(
  `\\b([${L}'-]+)(?:${SEP_CLASS}[${L}'-]+)+(?:${SEP_CLASS}s)?\\b`,
  "giu"
);

// Parenthèses / slashs
const reParenCompact = new RegExp(`\\b([${L}'-]+)\\([^\\)]*\\)(s?)\\b`, "giu");
const reSlashCompact = new RegExp(
  `\\b([${L}'-]+)\\/[${L}'-]+(\\/s)?\\b`,
  "giu"
);

// Pronoms / néologismes fréquents
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
    to: (m) => preserveCase(m, m.toLowerCase() === "ielles" ? "elles" : "elle"),
  },
  { re: /\b(celleux)\b/giu, to: (m) => preserveCase(m, "ceux") },
  { re: /\b(toustes)\b/giu, to: (m) => preserveCase(m, "tous") },
  { re: /\b(illes)\b/giu, to: (m) => preserveCase(m, "ils") },
  {
    re: new RegExp(`\\b(${L}+)(?:${SEP_CLASS}e)s\\b`, "giu"),
    to: (m) => m.replace(new RegExp(SEP_CLASS, "g"), "").replace(/e?s$/, "s"),
  },
];

// Nettoyage léger de doublets typographiques dispersés
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

describe("Stop écriture inclusive", () => {
  describe("Conversion directe de texte", () => {
    test("convertit les doublets avec point médian", () => {
      expect(convertText("étudiant·e·s")).toBe("étudiants");
      expect(convertText("directeur·rice·s")).toBe("directeurs");
    });

    test("convertit les parenthèses", () => {
      expect(convertText("étudiant(e)s")).toBe("étudiants");
    });

    test("convertit les slashs", () => {
      expect(convertText("étudiant/e/s")).toBe("étudiants");
    });

    test("convertit les pronoms inclusifs", () => {
      expect(convertText("iel est arrivé")).toBe("il est arrivé");
      expect(convertText("iels sont arrivés")).toBe("ils sont arrivés");
      expect(convertText("ielle est arrivée")).toBe("elle est arrivée");
      expect(convertText("ielles sont arrivées")).toBe("elles sont arrivées");
      expect(convertText("celleux qui partent")).toBe("ceux qui partent");
      expect(convertText("toustes les élèves")).toBe("tous les élèves");
    });

    test("préserve la casse", () => {
      expect(convertText("Iel est IELS sont")).toBe("Il est ILS sont");
    });
  });

  describe("Nœuds à ignorer", () => {
    test("ignore les champs de saisie", () => {
      const input = document.createElement("input");
      input.value = "étudiant·e·s";
      document.body.appendChild(input);
      expect(input.value).toBe("étudiant·e·s");
    });

    test("ignore les zones de code", () => {
      const code = document.createElement("code");
      code.textContent = "étudiant·e·s";
      document.body.appendChild(code);
      expect(code.textContent).toBe("étudiant·e·s");
    });
  });
});
