// app.js - Point d'entrée principal de l'application
import { Storage } from './storage.js';
import { UI } from './ui.js';
import { Camera } from './camera.js';
import { Analysis } from './analysis.js';
import { Export } from './export.js';

class BlinkTrackerApp {
    constructor() {
        this.storage = new Storage();
        this.ui = new UI();
        this.camera = new Camera();
        this.analysis = new Analysis();
        this.export = new Export(this.storage);
        
        this.currentPatient = null;
        this.currentTest = null;
        this.testData = {
            blinks: [],
            startTime: null,
            endTime: null,
            trials: [],
            quality: {
                trackingLoss: 0,
                totalFrames: 0
            }
        };
    }

    async init() {
        try {
            // Initialiser le stockage
            await this.storage.init();
            
            // Configurer les gestionnaires d'événements
            this.setupEventListeners();
            
            // Vérifier si un patient est déjà connecté
            const lastPatient = await this.storage.getLastPatient();
            if (lastPatient) {
                this.currentPatient = lastPatient;
                this.showMainScreen();
            } else {
                this.ui.showScreen('login-screen');
            }
            
            // Demander les permissions caméra au chargement
            await this.requestCameraPermission();
            
        } catch (error) {
            console.error('Erreur d\'initialisation:', error);
            this.ui.showError('Erreur d\'initialisation de l\'application');
        }
    }

    setupEventListeners() {
        // Écran de connexion
        document.getElementById('patient-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handlePatientLogin();
        });
        
        document.getElementById('new-patient-btn').addEventListener('click', () => {
            this.ui.showScreen('setup-screen');
            this.prepareNewPatientForm();
        });
        
        // Configuration nouveau patient
        document.getElementById('setup-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleNewPatient();
        });
        
        // Écran principal
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.handleLogout();
        });
        
        document.getElementById('update-dose-btn').addEventListener('click', () => {
            this.showDoseUpdateDialog();
        });
        
        document.getElementById('start-test-btn').addEventListener('click', () => {
            this.startPreTest();
        });
        
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const screen = e.currentTarget.dataset.screen;
                this.handleNavigation(screen);
            });
        });
        
        // Écran pré-test
        document.querySelector('input[name="dose-confirm"]').addEventListener('change', (e) => {
            const modifySection = document.getElementById('modify-dose-section');
            if (e.target.value === 'modify') {
                modifySection.classList.remove('hidden');
            } else {
                modifySection.classList.add('hidden');
            }
        });
        
        document.getElementById('proceed-test-btn').addEventListener('click', () => {
            this.proceedToCalibration();
        });
        
        // Calibration
        document.getElementById('skip-calibration').addEventListener('click', () => {
            this.startTest();
        });
        
        // Test
        document.getElementById('abort-test').addEventListener('click', () => {
            this.abortTest();
        });
        
        // Résultats
        document.getElementById('save-result-btn').addEventListener('click', () => {
            this.saveTestResult();
        });
        
        document.getElementById('retry-test-btn').addEventListener('click', () => {
            this.startPreTest();
        });
        
        // Export
        document.querySelector('input[name="export-period"]').addEventListener('change', (e) => {
            const customPeriod = document.getElementById('custom-period');
            if (e.target.value === 'custom') {
                customPeriod.classList.remove('hidden');
            } else {
                customPeriod.classList.add('hidden');
            }
        });
        
        document.getElementById('export-btn').addEventListener('click', () => {
            this.handleExport();
        });
        
        document.getElementById('share-btn').addEventListener('click', () => {
            this.handleShare();
        });
        
        // Historique
        document.getElementById('history-filter').addEventListener('change', (e) => {
            this.updateHistoryDisplay(parseInt(e.target.value));
        });
    }

    async requestCameraPermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'user' } 
            });
            stream.getTracks().forEach(track => track.stop());
        } catch (error) {
            console.warn('Permission caméra non accordée:', error);
        }
    }

    async handlePatientLogin() {
        const patientCode = document.getElementById('patient-code').value.trim();
        
        this.ui.showLoading('Chargement du profil...');
        
        try {
            const patient = await this.storage.getPatient(patientCode);
            if (patient) {
                this.currentPatient = patient;
                await this.storage.setLastPatient(patientCode);
                this.showMainScreen();
            } else {
                this.ui.hideLoading();
                this.ui.showError('Patient non trouvé');
            }
        } catch (error) {
            this.ui.hideLoading();
            this.ui.showError('Erreur lors du chargement du patient');
        }
    }

    prepareNewPatientForm() {
        // Générer un code patient
        const code = this.generatePatientCode();
        document.getElementById('patient-code').value = code;
        
        // Définir l'heure actuelle pour la dernière dose
        const now = new Date();
        const dateTimeLocal = now.toISOString().slice(0, 16);
        document.getElementById('last-dose-time').value = dateTimeLocal;
    }

    generatePatientCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = 'PAT-';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    async handleNewPatient() {
        const patientData = {
            code: document.getElementById('patient-code').value || this.generatePatientCode(),
            levodopaDose: parseInt(document.getElementById('levodopa-dose').value),
            withEntacapone: document.getElementById('with-entacapone').checked,
            doseInterval: parseFloat(document.getElementById('dose-interval').value),
            lastDoseTime: new Date(document.getElementById('last-dose-time').value).toISOString(),
            createdAt: new Date().toISOString()
        };
        
        this.ui.showLoading('Création du profil...');
        
        try {
            await this.storage.savePatient(patientData);
            this.currentPatient = patientData;
            await this.storage.setLastPatient(patientData.code);
            this.showMainScreen();
        } catch (error) {
            this.ui.hideLoading();
            this.ui.showError('Erreur lors de la création du patient');
        }
    }

    showMainScreen() {
        this.ui.hideLoading();
        this.ui.showScreen('main-screen');
        
        // Mettre à jour les informations affichées
        document.getElementById('current-patient').textContent = this.currentPatient.code;
        this.updateMedicationDisplay();
        this.updateTodayStats();
    }

    async updateMedicationDisplay() {
        const lastDose = new Date(this.currentPatient.lastDoseTime);
        const now = new Date();
        const minutesSince = Math.floor((now - lastDose) / 60000);
        
        document.getElementById('last-dose-display').textContent = 
            lastDose.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        document.getElementById('time-since-dose').textContent = `${minutesSince} min`;
        
        // Colorer selon l'état estimé
        const expectedDuration = this.currentPatient.doseInterval * 60; // en minutes
        const element = document.getElementById('time-since-dose');
        if (minutesSince < expectedDuration * 0.8) {
            element.style.color = 'var(--secondary-color)';
        } else {
            element.style.color = 'var(--warning-color)';
        }
    }

    async updateTodayStats() {
        const today = new Date().toISOString().split('T')[0];
        const tests = await this.storage.getTestsByDate(this.currentPatient.code, today);
        
        document.getElementById('tests-today').textContent = tests.length;
        
        if (tests.length > 0) {
            const lastTest = tests[tests.length - 1];
            document.getElementById('last-blink-rate').textContent = 
                `${lastTest.results.blinkRatePerMin.toFixed(1)}/min`;
        }
    }

    handleLogout() {
        this.currentPatient = null;
        this.storage.clearLastPatient();
        this.ui.showScreen('login-screen');
        document.getElementById('patient-code').value = '';
    }

    showDoseUpdateDialog() {
        const now = new Date();
        const dateTimeLocal = now.toISOString().slice(0, 16);
        
        // Créer un dialogue simple
        const newTime = prompt('Nouvelle heure de prise (HH:MM):', 
            now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
        
        if (newTime) {
            const [hours, minutes] = newTime.split(':');
            const newDoseTime = new Date();
            newDoseTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            
            this.currentPatient.lastDoseTime = newDoseTime.toISOString();
            this.storage.updatePatient(this.currentPatient);
            this.updateMedicationDisplay();
        }
    }

    startPreTest() {
        this.ui.showScreen('pretest-screen');
        
        const lastDose = new Date(this.currentPatient.lastDoseTime);
        const now = new Date();
        const minutesSince = Math.floor((now - lastDose) / 60000);
        
        document.getElementById('confirm-dose-time').textContent = 
            lastDose.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        document.getElementById('confirm-time-elapsed').textContent = 
            `${minutesSince} min écoulées`;
        
        // Réinitialiser le formulaire
        document.querySelector('input[name="dose-confirm"][value="confirm"]').checked = true;
        document.getElementById('modify-dose-section').classList.add('hidden');
    }

    async proceedToCalibration() {
        // Vérifier si la dose a été modifiée
        const doseConfirm = document.querySelector('input[name="dose-confirm"]:checked').value;
        
        if (doseConfirm === 'modify') {
            const newDoseTime = document.getElementById('new-dose-time').value;
            if (newDoseTime) {
                this.currentPatient.lastDoseTime = new Date(newDoseTime).toISOString();
                await this.storage.updatePatient(this.currentPatient);
            }
        }
        
        // Passer à la calibration
        this.ui.showScreen('calibration-screen');
        this.startCalibration();
    }

    async startCalibration() {
        try {
            await this.camera.init('calibration-video', 'calibration-canvas');
            
            // Démarrer la détection
            this.camera.onFaceDetected = (detected) => {
                this.updateCalibrationStatus('face-detected', detected);
            };
            
            this.camera.onEyesDetected = (detected) => {
                this.updateCalibrationStatus('eyes-detected', detected);
                
                // Si tout est OK, activer automatiquement le test après 3 secondes
                if (detected && this.isCalibrationComplete()) {
                    setTimeout(() => {
                        this.startTest();
                    }, 3000);
                }
            };
            
            this.camera.onLightingOK = (ok) => {
                this.updateCalibrationStatus('lighting-ok', ok);
            };
            
            await this.camera.start();
            
        } catch (error) {
            console.error('Erreur de calibration:', error);
            this.ui.showError('Impossible d\'accéder à la caméra');
            this.ui.showScreen('main-screen');
        }
    }

    updateCalibrationStatus(item, active) {
        const element = document.getElementById(item);
        if (active) {
            element.classList.add('active');
            element.querySelector('.indicator').textContent = '✅';
        } else {
            element.classList.remove('active');
            element.querySelector('.indicator').textContent = '⚪';
        }
    }

    isCalibrationComplete() {
        return document.querySelectorAll('.calibration-status .status-item.active').length === 3;
    }

    async startTest() {
        // Arrêter la calibration
        this.camera.stop();
        
        // Afficher l'écran de test
        this.ui.showScreen('test-screen');
        
        // Réinitialiser les données du test
        this.testData = {
            blinks: [],
            startTime: new Date(),
            endTime: null,
            trials: [],
            quality: {
                trackingLoss: 0,
                totalFrames: 0
            }
        };
        
        // Initialiser la caméra pour le test
        await this.camera.init('test-video', 'test-canvas');
        
        // Configurer la détection des clignements
        this.camera.onBlinkDetected = (blink) => {
            this.testData.blinks.push(blink);
            document.getElementById('blink-count').textContent = this.testData.blinks.length;
        };
        
        this.camera.onQualityUpdate = (quality) => {
            this.testData.quality = quality;
            const score = Math.round((1 - quality.trackingLoss / quality.totalFrames) * 100);
            document.getElementById('quality-score').textContent = `${score}%`;
        };
        
        await this.camera.start();
        
        // Démarrer la tâche de saccades
        this.runSaccadeTask();
    }

    async runSaccadeTask() {
        const totalTrials = 48;
        let currentTrial = 0;
        
        const runTrial = async () => {
            if (currentTrial >= totalTrials) {
                this.endTest();
                return;
            }
            
            // Mettre à jour la progression
            document.getElementById('trial-progress').textContent = `${currentTrial + 1}/${totalTrials}`;
            
            // Point de fixation
            this.showStimulus('fixation-point');
            const fixationDuration = 2500 + Math.random() * 1000; // 2500-3500ms
            
            await this.delay(fixationDuration);
            
            // Gap
            this.hideAllStimuli();
            await this.delay(200);
            
            // Cible
            const targetSide = Math.random() < 0.5 ? 'left' : 'right';
            this.showStimulus(`target-${targetSide}`);
            
            // Enregistrer le trial
            this.testData.trials.push({
                number: currentTrial + 1,
                targetSide: targetSide,
                timestamp: new Date()
            });
            
            await this.delay(1000);
            
            // Cacher la cible
            this.hideAllStimuli();
            
            currentTrial++;
            
            // Pause courte avant le prochain trial
            await this.delay(500);
            
            // Continuer
            runTrial();
        };
        
        // Démarrer après un court délai
        await this.delay(1000);
        runTrial();
    }

    showStimulus(id) {
        this.hideAllStimuli();
        document.getElementById(id).classList.remove('hidden');
    }

    hideAllStimuli() {
        document.querySelectorAll('.stimulus').forEach(s => s.classList.add('hidden'));
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    abortTest() {
        if (confirm('Êtes-vous sûr de vouloir arrêter le test ?')) {
            this.camera.stop();
            this.ui.showScreen('main-screen');
        }
    }

    endTest() {
        this.testData.endTime = new Date();
        this.camera.stop();
        
        // Analyser les résultats
        const results = this.analysis.analyzeTest(this.testData);
        
        // Afficher les résultats
        this.showResults(results);
    }

    showResults(results) {
        this.ui.showScreen('results-screen');
        
        // Calculer le temps depuis la dose
        const lastDose = new Date(this.currentPatient.lastDoseTime);
        const testTime = new Date(this.testData.startTime);
        const minutesSinceDose = Math.floor((testTime - lastDose) / 60000);
        
        // Afficher les résultats
        document.getElementById('result-blink-rate').textContent = 
            results.blinkRatePerMin.toFixed(1);
        document.getElementById('result-duration').textContent = 
            `${Math.round(results.meanBlinkDuration)} ms`;
        document.getElementById('result-time-dose').textContent = 
            `${minutesSinceDose} min`;
        document.getElementById('result-quality').textContent = 
            `${Math.round(results.qualityScore * 100)}%`;
        
        // Estimer l'état ON/OFF
        const state = this.analysis.estimateState(
            results.blinkRatePerMin, 
            minutesSinceDose, 
            this.currentPatient.doseInterval * 60
        );
        
        const stateElement = document.querySelector('.state-badge');
        stateElement.textContent = state.toUpperCase();
        stateElement.className = `state-badge ${state}`;
        
        // Stocker temporairement les résultats
        this.currentTest = {
            patientCode: this.currentPatient.code,
            timestamp: this.testData.startTime.toISOString(),
            medicationInfo: {
                lastDoseTime: this.currentPatient.lastDoseTime,
                minutesSinceDose: minutesSinceDose,
                doseMg: this.currentPatient.levodopaDose,
                withEntacapone: this.currentPatient.withEntacapone
            },
            results: results,
            conditions: {
                lighting: 'adequate',
                trackingLossPercent: Math.round((this.testData.quality.trackingLoss / 
                    this.testData.quality.totalFrames) * 100),
                completed: true
            }
        };
    }

    async saveTestResult() {
        if (!this.currentTest) return;
        
        this.ui.showLoading('Enregistrement...');
        
        try {
            await this.storage.saveTest(this.currentTest);
            this.ui.hideLoading();
            this.ui.showScreen('main-screen');
            this.updateTodayStats();
            this.currentTest = null;
        } catch (error) {
            this.ui.hideLoading();
            this.ui.showError('Erreur lors de l\'enregistrement');
        }
    }

    async handleNavigation(screen) {
        // Mettre à jour la navigation active
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.screen === screen);
        });
        
        switch (screen) {
            case 'main':
                this.ui.showScreen('main-screen');
                this.updateMedicationDisplay();
                this.updateTodayStats();
                break;
                
            case 'history':
                this.ui.showScreen('history-screen');
                this.updateHistoryDisplay(7);
                break;
                
            case 'export':
                this.ui.showScreen('export-screen');
                this.updateExportInfo();
                break;
        }
    }

    async updateHistoryDisplay(days) {
        const tests = await this.storage.getRecentTests(this.currentPatient.code, days);
        
        // Mettre à jour le graphique
        this.ui.updateChart(tests);
        
        // Mettre à jour la liste
        const listContainer = document.getElementById('history-list');
        listContainer.innerHTML = '';
        
        tests.forEach(test => {
            const item = document.createElement('div');
            item.className = 'history-item';
            
            const date = new Date(test.timestamp);
            const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            const dateStr = date.toLocaleDateString('fr-FR');
            
            item.innerHTML = `
                <div class="history-item-info">
                    <h4>${dateStr}</h4>
                    <p>${time} - ${test.medicationInfo.minutesSinceDose} min après dose</p>
                </div>
                <div class="history-item-value">
                    <div class="rate">${test.results.blinkRatePerMin.toFixed(1)}/min</div>
                    <div class="quality">Qualité: ${Math.round(test.results.qualityScore * 100)}%</div>
                </div>
            `;
            
            listContainer.appendChild(item);
        });
    }

    async updateExportInfo() {
        const stats = await this.storage.getStorageStats(this.currentPatient.code);
        
        document.getElementById('storage-size').textContent = 
            `${(stats.totalSize / 1024 / 1024).toFixed(2)} Mo`;
        document.getElementById('total-tests').textContent = stats.totalTests;
        
        if (stats.firstTest && stats.lastTest) {
            const first = new Date(stats.firstTest).toLocaleDateString('fr-FR');
            const last = new Date(stats.lastTest).toLocaleDateString('fr-FR');
            document.getElementById('data-period').textContent = `${first} - ${last}`;
        }
    }

    async handleExport() {
        const period = document.querySelector('input[name="export-period"]:checked').value;
        const format = document.querySelector('input[name="export-format"]:checked').value;
        
        this.ui.showLoading('Préparation de l\'export...');
        
        try {
            let tests;
            
            if (period === 'all') {
                tests = await this.storage.getAllTests(this.currentPatient.code);
            } else if (period === '30') {
                tests = await this.storage.getRecentTests(this.currentPatient.code, 30);
            } else {
                // Période personnalisée
                const start = new Date(document.getElementById('export-start').value);
                const end = new Date(document.getElementById('export-end').value);
                tests = await this.storage.getTestsByDateRange(
                    this.currentPatient.code, start, end
                );
            }
            
            if (format === 'csv') {
                await this.export.exportToCSV(tests, this.currentPatient);
            } else {
                await this.export.exportToPDF(tests, this.currentPatient);
            }
            
            this.ui.hideLoading();
            
        } catch (error) {
            this.ui.hideLoading();
            this.ui.showError('Erreur lors de l\'export');
        }
    }

    async handleShare() {
        if (navigator.share) {
            try {
                const tests = await this.storage.getRecentTests(this.currentPatient.code, 30);
                const csvData = await this.export.generateCSV(tests, this.currentPatient);
                
                const file = new File([csvData], `BlinkTracker_${this.currentPatient.code}.csv`, {
                    type: 'text/csv'
                });
                
                await navigator.share({
                    title: 'Données BlinkTracker',
                    text: `Export des données de suivi pour ${this.currentPatient.code}`,
                    files: [file]
                });
            } catch (error) {
                console.error('Erreur de partage:', error);
            }
        } else {
            this.ui.showError('Le partage n\'est pas supporté sur ce navigateur');
        }
    }
}

// Démarrer l'application
window.addEventListener('DOMContentLoaded', () => {
    const app = new BlinkTrackerApp();
    app.init();
    
    // Enregistrer le service worker pour le mode PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(console.error);
    }
});