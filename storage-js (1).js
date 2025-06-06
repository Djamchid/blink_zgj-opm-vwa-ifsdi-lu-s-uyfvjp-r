// storage.js - Gestion du stockage local avec IndexedDB

export class Storage {
    constructor() {
        this.dbName = 'BlinkTrackerDB';
        this.version = 1;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                reject(new Error('Erreur d\'ouverture de la base de données'));
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Store pour les patients
                if (!db.objectStoreNames.contains('patients')) {
                    const patientStore = db.createObjectStore('patients', { keyPath: 'code' });
                    patientStore.createIndex('createdAt', 'createdAt', { unique: false });
                }

                // Store pour les tests
                if (!db.objectStoreNames.contains('tests')) {
                    const testStore = db.createObjectStore('tests', { keyPath: 'id', autoIncrement: true });
                    testStore.createIndex('patientCode', 'patientCode', { unique: false });
                    testStore.createIndex('timestamp', 'timestamp', { unique: false });
                    testStore.createIndex('patientTimestamp', ['patientCode', 'timestamp'], { unique: false });
                }

                // Store pour les préférences
                if (!db.objectStoreNames.contains('preferences')) {
                    db.createObjectStore('preferences', { keyPath: 'key' });
                }
            };
        });
    }

    // Gestion des patients
    async savePatient(patientData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['patients'], 'readwrite');
            const store = transaction.objectStore('patients');
            const request = store.put(patientData);

            request.onsuccess = () => resolve(patientData);
            request.onerror = () => reject(new Error('Erreur lors de la sauvegarde du patient'));
        });
    }

    async getPatient(code) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['patients'], 'readonly');
            const store = transaction.objectStore('patients');
            const request = store.get(code);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error('Erreur lors de la récupération du patient'));
        });
    }

    async updatePatient(patientData) {
        return this.savePatient(patientData);
    }

    async getAllPatients() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['patients'], 'readonly');
            const store = transaction.objectStore('patients');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error('Erreur lors de la récupération des patients'));
        });
    }

    // Gestion des tests
    async saveTest(testData) {
        // Ajouter un ID unique basé sur le timestamp
        testData.id = `${testData.patientCode}_${Date.now()}`;
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['tests'], 'readwrite');
            const store = transaction.objectStore('tests');
            const request = store.add(testData);

            request.onsuccess = () => resolve(testData);
            request.onerror = () => reject(new Error('Erreur lors de la sauvegarde du test'));
        });
    }

    async getAllTests(patientCode) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['tests'], 'readonly');
            const store = transaction.objectStore('tests');
            const index = store.index('patientCode');
            const request = index.getAll(patientCode);

            request.onsuccess = () => {
                const tests = request.result;
                // Trier par timestamp décroissant
                tests.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                resolve(tests);
            };
            request.onerror = () => reject(new Error('Erreur lors de la récupération des tests'));
        });
    }

    async getTestsByDate(patientCode, date) {
        const tests = await this.getAllTests(patientCode);
        return tests.filter(test => {
            const testDate = new Date(test.timestamp).toISOString().split('T')[0];
            return testDate === date;
        });
    }

    async getTestsByDateRange(patientCode, startDate, endDate) {
        const tests = await this.getAllTests(patientCode);
        return tests.filter(test => {
            const testDate = new Date(test.timestamp);
            return testDate >= startDate && testDate <= endDate;
        });
    }

    async getRecentTests(patientCode, days) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        return this.getTestsByDateRange(patientCode, startDate, endDate);
    }

    // Préférences et dernière session
    async setLastPatient(patientCode) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['preferences'], 'readwrite');
            const store = transaction.objectStore('preferences');
            const request = store.put({ key: 'lastPatient', value: patientCode });

            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error('Erreur lors de la sauvegarde de la préférence'));
        });
    }

    async getLastPatient() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['preferences'], 'readonly');
            const store = transaction.objectStore('preferences');
            const request = store.get('lastPatient');

            request.onsuccess = async () => {
                if (request.result) {
                    // Vérifier que le patient existe toujours
                    const patient = await this.getPatient(request.result.value);
                    resolve(patient);
                } else {
                    resolve(null);
                }
            };
            request.onerror = () => reject(new Error('Erreur lors de la récupération de la préférence'));
        });
    }

    clearLastPatient() {
        const transaction = this.db.transaction(['preferences'], 'readwrite');
        const store = transaction.objectStore('preferences');
        store.delete('lastPatient');
    }

    // Statistiques de stockage
    async getStorageStats(patientCode) {
        const tests = await this.getAllTests(patientCode);
        
        let totalSize = 0;
        let firstTest = null;
        let lastTest = null;

        if (tests.length > 0) {
            // Estimer la taille des données
            totalSize = new Blob([JSON.stringify(tests)]).size;
            
            // Dates extrêmes
            firstTest = tests[tests.length - 1].timestamp;
            lastTest = tests[0].timestamp;
        }

        return {
            totalTests: tests.length,
            totalSize: totalSize,
            firstTest: firstTest,
            lastTest: lastTest
        };
    }

    // Export/Import pour backup
    async exportAllData() {
        const patients = await this.getAllPatients();
        const allTests = [];

        for (const patient of patients) {
            const tests = await this.getAllTests(patient.code);
            allTests.push(...tests);
        }

        return {
            version: this.version,
            exportDate: new Date().toISOString(),
            patients: patients,
            tests: allTests
        };
    }

    async importData(data) {
        // Validation basique
        if (!data.version || !data.patients || !data.tests) {
            throw new Error('Format de données invalide');
        }

        // Importer les patients
        for (const patient of data.patients) {
            await this.savePatient(patient);
        }

        // Importer les tests
        for (const test of data.tests) {
            // Éviter les doublons
            const existingTests = await this.getTestsByDate(
                test.patientCode, 
                new Date(test.timestamp).toISOString().split('T')[0]
            );
            
            const duplicate = existingTests.find(t => 
                Math.abs(new Date(t.timestamp) - new Date(test.timestamp)) < 1000
            );
            
            if (!duplicate) {
                await this.saveTest(test);
            }
        }
    }

    // Nettoyage
    async deletePatientData(patientCode) {
        // Supprimer tous les tests du patient
        const tests = await this.getAllTests(patientCode);
        
        const transaction = this.db.transaction(['tests'], 'readwrite');
        const store = transaction.objectStore('tests');
        
        for (const test of tests) {
            store.delete(test.id);
        }

        // Supprimer le patient
        const patientTransaction = this.db.transaction(['patients'], 'readwrite');
        const patientStore = patientTransaction.objectStore('patients');
        patientStore.delete(patientCode);
    }

    async clearAllData() {
        const transaction = this.db.transaction(['patients', 'tests', 'preferences'], 'readwrite');
        
        transaction.objectStore('patients').clear();
        transaction.objectStore('tests').clear();
        transaction.objectStore('preferences').clear();
    }
}