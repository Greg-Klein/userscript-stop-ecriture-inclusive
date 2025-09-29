# Stop Écriture Inclusive (Userscript)

Un userscript qui convertit automatiquement l'écriture inclusive en texte classique pour faciliter la lecture.

## Fonctionnalités

Le script convertit automatiquement :

- Les doublets avec point médian :

  - `étudiant·e·s` → `étudiants`
  - `directeur·rice·s` → `directeurs`
  - `fier·ère` → `fier`

- Les doublets avec parenthèses :

  - `étudiant(e)s` → `étudiants`
  - `auteur(trice)s` → `auteurs`

- Les doublets avec slash :

  - `étudiant/e/s` → `étudiants`
  - `auteur/trice/s` → `auteurs`

- Les pronoms inclusifs :
  - `iel`, `iels` → `il`, `ils`
  - `ielle`, `ielles` → `elle`, `elles`
  - `celleux` → `ceux`
  - `toustes` → `tous`
  - `illes` → `ils`

## Installation

1. Installez une extension de gestion de userscripts :

   - [Tampermonkey](https://www.tampermonkey.net/) (recommandé)
   - [Greasemonkey](https://www.greasespot.net/)
   - [Violentmonkey](https://violentmonkey.github.io/)

2. Installez le script en cliquant sur ce lien : [Stop Écriture Inclusive](https://raw.githubusercontent.com/gregoryklein/stop-ecriture-inclusive/master/userscript.js)

## Développement

### Prérequis

- Node.js (v14 ou supérieur)
- npm

### Installation

```bash
git clone https://github.com/gregoryklein/stop-ecriture-inclusive.git
cd stop-ecriture-inclusive
npm install
```

### Tests

Le projet utilise Jest pour les tests. Pour lancer les tests :

```bash
npm test
```

### Structure du code

- `userscript.js` : Le script principal
- `userscript.test.js` : Les tests unitaires
- `package.json` : Configuration du projet et dépendances

## Fonctionnement

Le script :

1. Surveille les modifications du DOM
2. Détecte le texte contenant de l'écriture inclusive
3. Convertit ce texte en utilisant des expressions régulières
4. Met à jour le DOM avec le texte converti

Les zones de saisie (input, textarea) et le code (balises code, pre) sont ignorés.

## Licence

ISC

## Auteur

GK
