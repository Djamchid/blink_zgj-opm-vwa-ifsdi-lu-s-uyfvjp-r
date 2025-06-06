# BlinkTracker - Application de suivi des clignements pour la maladie de Parkinson

## Description

BlinkTracker est une application web progressive (PWA) conçue pour mesurer la fréquence et la durée des clignements oculaires chez les patients atteints de la maladie de Parkinson. L'application permet d'évaluer l'état dopaminergique en fonction du temps écoulé depuis la dernière prise de lévodopa.

## Fonctionnalités principales

- 📷 **Détection des clignements** via la caméra frontale
- 📊 **Analyse en temps réel** du taux de clignement
- 💊 **Suivi médicamenteux** avec horodatage des prises
- 📈 **Historique et tendances** avec visualisation graphique
- 💾 **Export des données** en CSV et PDF
- 🔒 **Stockage local sécurisé** avec pseudonymisation
- 📱 **Mode hors ligne** grâce à la technologie PWA

## Installation

### Hébergement sur GitHub Pages

1. Forkez ce repository
2. Activez GitHub Pages dans les paramètres du repository
3. L'application sera accessible à : `https://[votre-username].github.io/blinktracker/`

### Installation locale

```bash
# Cloner le repository
git clone https://github.com/[votre-username]/blinktracker.git

# Naviguer dans le dossier
cd blinktracker

# Lancer un serveur local (Python)
python -m http.server 8000

# Ou avec Node.js
npx http-server -p 8000
```

Accédez à l'application via : `http://localhost:8000`

## Structure des fichiers

```
blinktracker/
├── index.html          # Structure HTML de l'application
├── styles.css          # Styles et mise en page
├── app.js             # Point d'entrée principal
├── storage.js         # Gestion du stockage IndexedDB
├── ui.js              # Gestion de l'interface
├── camera.js          # Détection vidéo et clignements
├── analysis.js        # Analyse des données
├── export.js          # Export CSV/PDF
├── manifest.json      # Configuration PWA
├── sw.js              # Service Worker
└── README.md          # Ce fichier
```

## Utilisation

### Premier démarrage

1. **Autoriser l'accès à la caméra** lors de la première utilisation
2. **Créer un profil patient** avec un code anonyme
3. **Configurer le traitement** : dose de lévodopa et intervalle

### Réaliser un test

1. **Confirmer l'heure** de la dernière prise médicamenteuse
2. **Calibration** : positionnez votre visage dans le cadre
3. **Test de saccades** : suivez les points qui apparaissent (48 trials)
4. **Résultats** : consultez le taux de clignement et l'état estimé

### Consulter l'historique

- Visualisez l'évolution sur un graphique temporel
- Filtrez par période (7 jours, 30 jours, etc.)
- Identifiez les patterns ON/OFF

### Exporter les données

- **CSV** : pour analyse dans Excel ou logiciels statistiques
- **PDF** : rapport complet avec graphiques et recommandations

## Configuration technique

### Prérequis

- Navigateur moderne supportant :
  - getUserMedia API
  - IndexedDB
  - Service Workers
- Connexion HTTPS (requis pour la caméra)
- Caméra frontale de qualité suffisante

### Navigateurs supportés

- Chrome/Edge 88+
- Safari 14.1+
- Firefox 78+

### Limitations iOS

- Safari uniquement (pas de PWA complète)
- Notifications limitées
- Export via partage natif

## Sécurité et confidentialité

- **Aucune donnée** n'est envoyée vers un serveur
- **Stockage local** uniquement (IndexedDB)
- **Pseudonymisation** des patients
- **Chiffrement** optionnel des exports
- **Pas de stockage** des vidéos

## Personnalisation

### Modifier les seuils de détection

Dans `camera.js` :
```javascript
this.blinkThreshold = {
    earThreshold: 0.21,    // Seuil EAR
    minDuration: 160,      // Durée min (ms)
    maxDuration: 400       // Durée max (ms)
};
```

### Ajuster les paramètres d'analyse

Dans `analysis.js` :
```javascript
this.normalBlinkRate = {
    min: 15,
    max: 25,
    pdOff: 12,
    pdOn: 18
};
```

## Dépannage

### La caméra ne fonctionne pas
- Vérifiez les permissions du navigateur
- Assurez-vous d'utiliser HTTPS
- Testez avec un autre navigateur

### Détection imprécise
- Améliorez l'éclairage
- Rapprochez-vous de la caméra (30-40 cm)
- Évitez les mouvements brusques

### Problèmes de stockage
- Vérifiez l'espace disponible
- Exportez et supprimez les anciennes données
- Videz le cache du navigateur si nécessaire

## Développement

### Ajouter une fonctionnalité

1. Créez une nouvelle branche
2. Développez dans le module approprié
3. Testez sur mobile et desktop
4. Soumettez une pull request

### Tests recommandés

- Test avec différentes conditions d'éclairage
- Test avec lunettes/sans lunettes
- Test de performance sur appareils anciens
- Test de l'export/import de données

## Licence

MIT License - Voir fichier LICENSE

## Crédits

- MediaPipe Face Mesh pour la détection faciale
- Inspiration du protocole de l'article scientifique fourni
- Icônes : Emoji natifs pour simplicité

## Support

Pour toute question ou problème :
- Ouvrez une issue sur GitHub
- Consultez la documentation MediaPipe
- Référez-vous aux études sur le taux de clignement dans la maladie de Parkinson

## Avertissement

Cette application est un outil de suivi et ne remplace pas un avis médical professionnel. Consultez toujours votre neurologue pour l'ajustement de votre traitement.