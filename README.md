# Astro-Lab — Application Ludo-Educative Interactive

**TP - Module LSS | Master 1 STIC | Universite de Guelma**
---

## Description

Astro-Lab est une application web interactive a vocation ludo-educative, destinee aux enfants de moins de 12 ans. L'application propose un voyage spatial a travers 4 scenes interactives utilisant les technologies **SVG** et **SMIL**.

## Technologies utilisees

- **SVG** (Scalable Vector Graphics) : graphiques vectoriels, animations declaratives (`<animate>`, `<animateTransform>`, `<animateMotion>`)
- **SMIL** (Synchronized Multimedia Integration Language) : orchestration temporelle multimedia (fichier `presentation.smil`)
- **HTML5 / CSS3 / JavaScript** : structure, style et logique applicative
- **Web Audio API** : synthese sonore en fallback (aucun fichier MP3 requis)

## Structure du projet

```
Astro-Lab/
  index.html          Page principale (shell HTML + scene SVG)
  app.js              Logique applicative (scenes, navigation, audio)
  
```

## Les 4 scenes

| Scene | Titre | Description |
|-------|-------|-------------|
| 1/4 | Exploration spatiale | Scene nuit-vers-jour : cliquer sur le soleil declenche le lever du jour, puis decouvrir 3 faits interactifs (soleil, terre, fusee) |
| 2/4 | Trouve les etoiles cachees | Selectionner exactement 3 etoiles parmi 5, puis valider sa reponse |
| 3/4 | Quiz rapide | Question a choix multiples avec 3 tentatives maximum |
| 4/4 | Fin de mission | Scene de victoire avec confettis, medaille et son de celebration |

## Fonctionnalites

- **Navigation guidee** : le bouton "Suivant" est verrouille tant que l'objectif de la scene n'est pas atteint
- **Interactions SVG** : clics declenchant animations et sons
- **Animations declaratives SMIL** : `<animate>`, `<animateTransform>`, `<animateMotion>` integrees dans le SVG
- **Feedback audio** : sons synthetises via Web Audio API (pas de fichiers externes requis)
- **Accessibilite enfant** : boutons min 44px, textes lisibles, retours visuels clairs
- **Responsive** : adapte aux ecrans via `viewBox` SVG

## Lancement

Ouvrir `index.html` dans un navigateur moderne (Chrome, Firefox, Edge).

Aucune installation ni serveur requis — l'application fonctionne entierement en local.

## Navigation

- **Precedent / Suivant** : boutons en bas de page
- Le bouton "Suivant" se debloque uniquement apres avoir complete l'objectif de chaque scene
- Le bouton "Precedent" est desactive sur la premiere scene

## Auteur
salah eddine gueroui
Etudiant Master 1 STIC — Universite 8 Mai 1945, Guelma
