# Cahier des charges - Application mobile de mesure du clignement oculaire

## 1. Objectif général
Développer une application mobile permettant de mesurer la fréquence et la durée des clignements oculaires dans des conditions standardisées, en s'inspirant du protocole expérimental décrit, pour évaluer l'état dopaminergique chez les patients parkinsoniens.

## 2. Contraintes techniques

### 2.1 Acquisition vidéo
- **Caméra frontale** du smartphone (minimum 30 fps, idéalement 60 fps)
- **Résolution** : HD minimum (1280×720)
- **Distance utilisateur-écran** : 30-40 cm (adaptée au mobile)
- **Éclairage** : Environnement contrôlé, luminosité écran standardisée

### 2.2 Compatibilité
- iOS 14+ et Android 10+
- Smartphones avec caméra frontale ≥ 5 MP
- Processeur capable de traitement vidéo temps réel

## 3. Interface et paradigme expérimental

### 3.1 Calibration initiale
- **Durée** : 30 secondes
- **Procédure** : 
  - Positionnement du visage dans un cadre guide
  - Vérification de la détection des yeux
  - Ajustement automatique de l'exposition
  - Validation de la qualité du tracking

### 3.2 Tâche de saccades adaptée au mobile
- **Point de fixation central** : Croix verte (taille adaptée à l'écran)
- **Durée de fixation** : 2500-3500 ms (aléatoire)
- **Gap** : 200 ms écran noir
- **Cibles** : Points rouges apparaissant alternativement à gauche/droite
- **Excentricité** : Maximum possible selon taille écran (~ 10-15°)
- **Durée cible** : 1000 ms
- **Nombre de trials** : 48 (comme l'original)

### 3.3 Mode simplifié (option)
- Tâche de fixation pure sans saccades (3-5 minutes)
- Pour patients avec difficultés motrices importantes

## 4. Détection et analyse des clignements

### 4.1 Algorithme de détection
- **Pré-traitement** :
  - Détection des landmarks faciaux (yeux)
  - Extraction du ratio hauteur/largeur de l'œil
  - Lissage temporel (équivalent Savitzky-Golay)
  
- **Critères de détection** :
  - Fermeture > 70% de la hauteur maximale
  - Durée : 160-400 ms
  - Exclusion des clignements pendant les saccades
  - Validation par seuil de confiance

### 4.2 Paramètres mesurés
- **Taux de clignement** : nombre/minute
- **Durée moyenne** des clignements (ms)
- **Variabilité** de la durée
- **Distribution temporelle** (histogramme)

## 5. Gestion des données

### 5.1 Enregistrement
- **Métadonnées** : 
  - ID patient anonymisé
  - Temps depuis dernière prise médicamenteuse
  - Type de médicament (lévodopa, dosage)
  - Date/heure de la session
  
- **Format** : JSON structuré avec timestamps précis
- **Stockage local** crypté, export possible

### 5.2 Labels temporels
- Interface pour saisir "minutes depuis dernière pilule"
- Rappels programmables selon horaire de médication

## 6. Contrôle qualité

### 6.1 Indicateurs temps réel
- **Qualité du tracking** : score de confiance affiché
- **Stabilité de la position** : alerte si mouvement excessif
- **Luminosité** : vérification continue

### 6.2 Critères de rejet
- Perte de tracking > 20% du temps
- Mouvements de tête excessifs
- Conditions d'éclairage inadéquates
- Distance visage-écran hors limites

## 7. Interface utilisateur

### 7.1 Mode patient
- **Instructions simples** et visuelles
- **Feedback vocal** optionnel
- **Barre de progression** visible
- **Pauses** possibles entre blocs

### 7.2 Mode clinicien
- **Visualisation** des données en temps réel
- **Comparaison** avec sessions précédentes
- **Export** des résultats (CSV, PDF)
- **Notes cliniques** associables

## 8. Validation et sécurité

### 8.1 Protection des données
- Conformité RGPD
- Pas de stockage cloud sans consentement
- Anonymisation des vidéos

### 8.2 Avertissements
- Non destiné au diagnostic médical
- Usage sous supervision professionnelle
- Limitations techniques explicitées

## 9. Évolutions futures
- Intégration avec capteurs additionnels (smartwatch)
- Analyse par IA pour prédiction ON/OFF
- Mode longitudinal pour suivi au domicile
- Corrélation avec échelles cliniques (UPDRS)

## 10. Stockage local et gestion des données patient

### 10.1 Profil patient (stockage persistant)

#### Données de base
- **Code de pseudonymisation** : 
  - Généré automatiquement (ex: PAT-XXXXXX) ou saisi manuellement
  - Unique et non modifiable après création
  - Affiché en permanence dans l'interface

#### Schéma thérapeutique
- **Médicament principal** :
  - Dosage lévodopa : X mg par prise
  - Avec/sans entacapone (checkbox)
  - Autres médicaments associés (optionnel)
  
- **Fréquence** :
  - Intervalle entre prises : H heures (modifiable)
  - Horaires habituels calculés automatiquement
  - Possibilité d'horaires irréguliers

#### Dernière prise
- **Date et heure** : Format JJ/MM/AAAA HH:MM
- **Mise à jour automatique** basée sur l'intervalle théorique
- **Historique** des 10 dernières prises (pour détecter les oublis)

### 10.2 Workflow de validation pré-test

#### Écran de confirmation (avant chaque test)
```
┌─────────────────────────────────────┐
│  Confirmation dernière prise        │
│                                     │
│  Dernière prise enregistrée :      │
│  [15/03/2024] [14:30]              │
│                                     │
│  ○ Confirmer                       │
│  ○ Modifier                        │
│                                     │
│  Si modifié :                      │
│  [JJ/MM/AAAA] [HH:MM]             │
│                                     │
│  Temps écoulé : 2h 15min           │
│                                     │
│  [Valider] [Annuler]               │
└─────────────────────────────────────┘
```

### 10.3 Stockage des résultats de test

#### Structure de données par test
```json
{
  "test_id": "TEST-20240315-143045",
  "patient_code": "PAT-XXXXXX",
  "timestamp": "2024-03-15T14:30:45",
  "medication_info": {
    "last_dose_time": "2024-03-15T12:15:00",
    "minutes_since_dose": 135,
    "dose_mg": 200,
    "with_entacapone": true
  },
  "results": {
    "blink_rate_per_min": 12.4,
    "mean_blink_duration_ms": 245,
    "duration_std_ms": 32,
    "total_blinks": 62,
    "test_duration_min": 5.0,
    "quality_score": 0.92
  },
  "conditions": {
    "lighting": "adequate",
    "tracking_loss_percent": 8,
    "completed": true
  }
}
```

#### Résumé affiché dans l'historique
- Date et heure du test
- Temps depuis dernière prise (en surbrillance)
- Taux de clignement
- Score de qualité
- Indicateur visuel ON/OFF estimé (si applicable)

### 10.4 Export et partage des données

#### Format CSV
**En-têtes du fichier :**
```
patient_code,test_date,test_time,minutes_since_dose,dose_mg,with_entacapone,
blink_rate_per_min,mean_duration_ms,duration_std_ms,total_blinks,
test_duration_min,quality_score
```

#### Options d'export
- **Période** : 
  - Tout l'historique
  - 30 derniers jours
  - Plage personnalisée
  
- **Contenu** :
  - Données brutes complètes
  - Résumé statistique
  - Graphiques (PDF)

#### Méthodes de partage
- **Email** : Envoi direct avec pièce jointe
- **Applications** : Via système de partage natif (iOS/Android)
- **QR Code** : Pour transfert sécurisé vers système hospitalier
- **Impression** : Format optimisé pour impression A4

### 10.5 Visualisation des tendances

#### Graphique principal
- **Axe X** : Minutes depuis dernière prise (0-300)
- **Axe Y** : Taux de clignement/minute
- **Points** : Chaque test avec code couleur qualité
- **Courbe** : Tendance moyenne (si ≥ 10 tests)

#### Tableau de bord
- **Période ON estimée** : Zone où taux > seuil
- **Période OFF estimée** : Zone où taux < seuil
- **Durée d'action moyenne** : Calculée automatiquement
- **Variabilité** : Écart-type entre sessions

### 10.6 Sécurité et confidentialité

#### Protection des données
- **Chiffrement** : AES-256 pour le stockage local
- **Pas de backup cloud** par défaut
- **Code PIN/biométrie** pour accès à l'app
- **Suppression sécurisée** avec confirmation

#### Audit trail
- Log de toutes les modifications
- Traçabilité des exports
- Impossibilité de modifier les tests validés

## 11. Gestion de l'historique long terme

### 11.1 Stockage local étendu

#### Capacité maximale
- **Conservation automatique** : Minimum 2 ans de données
- **Stockage direct** : Toutes les données restent en format JSON non compressé
- **Estimation** : ~150 Ko par mois d'utilisation intensive (4 tests/jour)
- **Espace total estimé** : ~3.6 Mo pour 2 ans complets
- **Alerte** : Notification si > 80% de la limite de stockage app

#### Accès aux données
- **Toutes périodes** : Accès immédiat et identique
- **Pas de dégradation** : Données complètes conservées
- **Performance** : Optimisation par indexation des dates

### 11.2 Backup automatique local

#### Sur le dispositif
- **iCloud Drive** (iOS) / **Google Drive** (Android) - dossier app privé
- **Activation optionnelle** avec consentement explicite
- **Chiffrement** avant upload
- **Synchronisation** multi-appareils du même patient

#### Export automatique programmé
- **Rappel mensuel** configurable
- **Auto-export** vers dossier local du téléphone
- **Nomenclature** : `Blink_PAT-XXXXXX_202403.csv`
- **Conservation des exports** : Dossier dédié dans l'app

### 11.3 Solution hybride recommandée

#### Serveur institutionnel (optionnel)
- **Pour établissements de santé** uniquement
- **API sécurisée** pour sync avec serveur hospitalier
- **Patient garde le contrôle** : activation/désactivation
- **Pseudonymisation** maintenue

#### Mode "Carnet de suivi"
```
┌─────────────────────────────────────┐
│  Votre historique                   │
│                                     │
│  Stocké localement : 8 mois         │
│  Espace utilisé : 1.2 Mo            │
│  Capacité restante : > 2 ans       │
│                                     │
│  ☑ Backup automatique iCloud        │
│  ☑ Export mensuel (rappel le 1er)  │
│  ☐ Sync hôpital (non configuré)    │
│                                     │
│  [Exporter tout] [Paramètres]       │
└─────────────────────────────────────┘
```

### 11.4 Optimisation du stockage

#### Structure de données optimisée
- **Index par date** pour accès rapide
- **Cache des statistiques** mensuelles pré-calculées
- **Pagination** pour l'affichage (50 tests par page)

#### Gestion de l'espace
- **Stockage illimité** dans la pratique (< 5 Mo même après 5 ans)
- **Option de nettoyage manuel** (suppression sélective)
- **Jamais de suppression automatique**

### 11.5 Avantages de l'absence de compression

- **Simplicité** : Données toujours lisibles directement
- **Fiabilité** : Pas de risque de corruption lors de compression/décompression
- **Performance** : Pas de latence pour décompresser
- **Transparence** : Export direct des données brutes stockées

### 11.6 Fonctionnalités complémentaires

#### Import de données
- **Restauration** depuis fichiers CSV exportés
- **Fusion** avec données existantes
- **Détection des doublons**

#### QR Code patient
- Contient l'ID + clé de chiffrement
- Permet la récupération sur nouveau téléphone
- Scan par le professionnel de santé pour import

#### Mode "Consultation"
- **Génération d'un rapport complet** (PDF)
- **Graphiques sur 6-12-24 mois**
- **Compatible dossier médical** électronique

### 11.7 Stratégie de migration

#### Changement de téléphone
1. Export complet avant changement
2. Installation nouvelle app
3. Import via fichier ou QR code
4. Vérification de l'intégrité

#### Tableau de bord d'historique
```
Résumé de vos données :
- Tests totaux : 487
- Période : 15/09/2023 - 15/03/2024
- Tendance ON/OFF : Amélioration +12%
- Prochain export : dans 16 jours

[Voir graphique 6 mois] [Exporter période]
```