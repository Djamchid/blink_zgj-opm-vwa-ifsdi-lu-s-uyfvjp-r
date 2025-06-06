// export.js - Gestion des exports de données

export class Export {
    constructor(storage) {
        this.storage = storage;
    }

    // Export CSV
    async exportToCSV(tests, patientData) {
        const csv = this.generateCSV(tests, patientData);
        const filename = `BlinkTracker_${patientData.code}_${this.getDateString()}.csv`;
        
        this.downloadFile(csv, filename, 'text/csv');
    }

    generateCSV(tests, patientData) {
        // En-têtes CSV
        const headers = [
            'patient_code',
            'test_date',
            'test_time',
            'minutes_since_dose',
            'dose_mg',
            'with_entacapone',
            'blink_rate_per_min',
            'mean_duration_ms',
            'duration_std_ms',
            'total_blinks',
            'test_duration_min',
            'quality_score',
            'estimated_state',
            'day_of_week',
            'hour_of_day'
        ];

        // Lignes de données
        const rows = tests.map(test => {
            const date = new Date(test.timestamp);
            const state = this.estimateState(
                test.results.blinkRatePerMin,
                test.medicationInfo.minutesSinceDose
            );

            return [
                patientData.code,
                date.toLocaleDateString('fr-FR'),
                date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                test.medicationInfo.minutesSinceDose,
                test.medicationInfo.doseMg,
                test.medicationInfo.withEntacapone ? 'Oui' : 'Non',
                test.results.blinkRatePerMin.toFixed(2),
                Math.round(test.results.meanBlinkDuration),
                Math.round(test.results.stdBlinkDuration),
                test.results.totalBlinks,
                test.results.testDurationMin.toFixed(2),
                (test.results.qualityScore * 100).toFixed(0),
                state,
                this.getDayName(date.getDay()),
                date.getHours()
            ];
        });

        // Construire le CSV
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => this.escapeCSV(cell)).join(','))
        ].join('\n');

        // Ajouter BOM pour Excel
        return '\ufeff' + csvContent;
    }

    escapeCSV(value) {
        if (value === null || value === undefined) return '';
        
        const stringValue = String(value);
        
        // Échapper les guillemets et entourer de guillemets si nécessaire
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
        }
        
        return stringValue;
    }

    // Export PDF
    async exportToPDF(tests, patientData) {
        const analysis = this.analyzeDataForReport(tests);
        const html = this.generateHTMLReport(tests, patientData, analysis);
        
        // Ouvrir dans une nouvelle fenêtre pour impression/sauvegarde PDF
        const printWindow = window.open('', '_blank');
        printWindow.document.write(html);
        printWindow.document.close();
        
        // Attendre le chargement puis lancer l'impression
        printWindow.onload = () => {
            printWindow.print();
        };
    }

    generateHTMLReport(tests, patientData, analysis) {
        const date = new Date();
        
        return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Rapport BlinkTracker - ${patientData.code}</title>
    <style>
        @page {
            size: A4;
            margin: 2cm;
        }
        
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
        }
        
        h1, h2, h3 {
            color: #2196F3;
        }
        
        h1 {
            text-align: center;
            border-bottom: 2px solid #2196F3;
            padding-bottom: 10px;
        }
        
        .header-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            padding: 15px;
            background: #f5f5f5;
            border-radius: 5px;
        }
        
        .section {
            margin-bottom: 30px;
            page-break-inside: avoid;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        
        th {
            background: #2196F3;
            color: white;
        }
        
        tr:nth-child(even) {
            background: #f9f9f9;
        }
        
        .chart {
            margin: 20px 0;
            border: 1px solid #ddd;
            padding: 10px;
            background: white;
        }
        
        .summary-box {
            background: #e3f2fd;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
        }
        
        .recommendation {
            background: #fff3e0;
            padding: 10px;
            border-left: 4px solid #ff9800;
            margin: 10px 0;
        }
        
        .footer {
            margin-top: 50px;
            text-align: center;
            color: #666;
            font-size: 0.9em;
        }
        
        @media print {
            body {
                margin: 0;
            }
            .no-print {
                display: none;
            }
        }
    </style>
</head>
<body>
    <h1>Rapport BlinkTracker</h1>
    
    <div class="header-info">
        <div>
            <strong>Patient :</strong> ${patientData.code}<br>
            <strong>Date du rapport :</strong> ${date.toLocaleDateString('fr-FR')}<br>
            <strong>Période analysée :</strong> ${this.getPeriodString(tests)}
        </div>
        <div>
            <strong>Traitement :</strong><br>
            Lévodopa ${patientData.levodopaDose} mg<br>
            ${patientData.withEntacapone ? 'Avec Entacapone' : 'Sans Entacapone'}<br>
            Intervalle : ${patientData.doseInterval} heures
        </div>
    </div>
    
    <div class="section">
        <h2>Résumé</h2>
        <div class="summary-box">
            <p><strong>Nombre total de tests :</strong> ${tests.length}</p>
            <p><strong>Taux de clignement moyen :</strong> ${analysis.meanBlinkRate.toFixed(1)} /min</p>
            <p><strong>Plage :</strong> ${analysis.minBlinkRate.toFixed(1)} - ${analysis.maxBlinkRate.toFixed(1)} /min</p>
            <p><strong>Tendance :</strong> ${this.getTrendDescription(analysis.trend)}</p>
            <p><strong>Période ON optimale :</strong> ${analysis.optimalOnPeriod} minutes après la dose</p>
        </div>
    </div>
    
    <div class="section">
        <h2>Évolution temporelle</h2>
        <div class="chart">
            ${this.generateSVGChart(tests)}
        </div>
    </div>
    
    <div class="section">
        <h2>Analyse par période de la journée</h2>
        <table>
            <tr>
                <th>Période</th>
                <th>Nombre de tests</th>
                <th>Taux moyen</th>
                <th>État prédominant</th>
            </tr>
            ${this.generatePeriodAnalysis(tests)}
        </table>
    </div>
    
    <div class="section">
        <h2>Tests récents</h2>
        <table>
            <tr>
                <th>Date</th>
                <th>Heure</th>
                <th>Temps après dose</th>
                <th>Taux</th>
                <th>État</th>
                <th>Qualité</th>
            </tr>
            ${this.generateRecentTestsTable(tests.slice(0, 10))}
        </table>
    </div>
    
    <div class="section">
        <h2>Recommandations</h2>
        ${this.generateRecommendations(analysis)}
    </div>
    
    <div class="footer">
        <p>Rapport généré par BlinkTracker le ${date.toLocaleString('fr-FR')}</p>
        <p>Ce rapport est destiné à un usage médical. Consultez votre neurologue pour toute modification de traitement.</p>
    </div>
</body>
</html>
        `;
    }

    generateSVGChart(tests) {
        // Créer un graphique SVG simple
        const width = 700;
        const height = 300;
        const margin = { top: 20, right: 20, bottom: 40, left: 50 };
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;

        // Préparer les données
        const data = tests.map(test => ({
            x: test.medicationInfo.minutesSinceDose,
            y: test.results.blinkRatePerMin,
            date: new Date(test.timestamp)
        })).slice(0, 50); // Limiter à 50 points pour la lisibilité

        // Échelles
        const xMax = 300;
        const yMax = Math.max(...data.map(d => d.y)) * 1.1;
        
        const xScale = (x) => (x / xMax) * chartWidth;
        const yScale = (y) => chartHeight - (y / yMax) * chartHeight;

        let svg = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(${margin.left},${margin.top})">
        <!-- Zones ON/OFF -->
        <rect x="0" y="0" width="${xScale(240)}" height="${chartHeight}" 
              fill="rgba(76, 175, 80, 0.1)" />
        <rect x="${xScale(240)}" y="0" width="${xScale(60)}" height="${chartHeight}" 
              fill="rgba(255, 152, 0, 0.1)" />
        
        <!-- Axes -->
        <line x1="0" y1="${chartHeight}" x2="${chartWidth}" y2="${chartHeight}" 
              stroke="#ccc" stroke-width="1" />
        <line x1="0" y1="0" x2="0" y2="${chartHeight}" 
              stroke="#ccc" stroke-width="1" />
        
        <!-- Graduations X -->`;

        for (let i = 0; i <= 5; i++) {
            const x = i * 60;
            const xPos = xScale(x);
            svg += `
        <line x1="${xPos}" y1="${chartHeight}" x2="${xPos}" y2="${chartHeight + 5}" 
              stroke="#666" stroke-width="1" />
        <text x="${xPos}" y="${chartHeight + 20}" text-anchor="middle" 
              font-size="12" fill="#666">${i}h</text>`;
        }

        // Graduations Y
        for (let i = 0; i <= 4; i++) {
            const y = (yMax / 4) * i;
            const yPos = yScale(y);
            svg += `
        <line x1="-5" y1="${yPos}" x2="0" y2="${yPos}" 
              stroke="#666" stroke-width="1" />
        <text x="-10" y="${yPos + 5}" text-anchor="end" 
              font-size="12" fill="#666">${Math.round(y)}</text>`;
        }

        // Points de données
        data.forEach(point => {
            const x = xScale(point.x);
            const y = yScale(point.y);
            svg += `
        <circle cx="${x}" cy="${y}" r="4" 
                fill="rgba(33, 150, 243, 0.7)" 
                stroke="rgba(33, 150, 243, 1)" 
                stroke-width="2" />`;
        });

        svg += `
    </g>
</svg>`;

        return svg;
    }

    analyzeDataForReport(tests) {
        const blinkRates = tests.map(t => t.results.blinkRatePerMin);
        
        // Analyser la tendance
        let trend = 'stable';
        if (tests.length >= 10) {
            const recent = blinkRates.slice(0, 5);
            const older = blinkRates.slice(-5);
            const recentAvg = recent.reduce((a, b) => a + b) / recent.length;
            const olderAvg = older.reduce((a, b) => a + b) / older.length;
            
            if (recentAvg > olderAvg * 1.1) trend = 'improving';
            else if (recentAvg < olderAvg * 0.9) trend = 'declining';
        }

        // Trouver la période ON optimale
        const byMinutesSinceDose = {};
        tests.forEach(test => {
            const minutes = Math.round(test.medicationInfo.minutesSinceDose / 30) * 30;
            if (!byMinutesSinceDose[minutes]) {
                byMinutesSinceDose[minutes] = [];
            }
            byMinutesSinceDose[minutes].push(test.results.blinkRatePerMin);
        });

        let optimalPeriod = 0;
        let maxRate = 0;
        Object.entries(byMinutesSinceDose).forEach(([minutes, rates]) => {
            const avg = rates.reduce((a, b) => a + b) / rates.length;
            if (avg > maxRate && parseInt(minutes) < 240) {
                maxRate = avg;
                optimalPeriod = parseInt(minutes);
            }
        });

        return {
            meanBlinkRate: blinkRates.reduce((a, b) => a + b) / blinkRates.length,
            minBlinkRate: Math.min(...blinkRates),
            maxBlinkRate: Math.max(...blinkRates),
            trend: trend,
            optimalOnPeriod: optimalPeriod,
            totalTests: tests.length
        };
    }

    generatePeriodAnalysis(tests) {
        const periods = {
            'Matin (6h-12h)': { tests: [], hours: [6, 12] },
            'Après-midi (12h-18h)': { tests: [], hours: [12, 18] },
            'Soir (18h-22h)': { tests: [], hours: [18, 22] }
        };

        tests.forEach(test => {
            const hour = new Date(test.timestamp).getHours();
            Object.entries(periods).forEach(([name, period]) => {
                if (hour >= period.hours[0] && hour < period.hours[1]) {
                    period.tests.push(test);
                }
            });
        });

        let html = '';
        Object.entries(periods).forEach(([name, period]) => {
            if (period.tests.length > 0) {
                const rates = period.tests.map(t => t.results.blinkRatePerMin);
                const avgRate = rates.reduce((a, b) => a + b) / rates.length;
                const states = period.tests.map(t => 
                    this.estimateState(t.results.blinkRatePerMin, t.medicationInfo.minutesSinceDose)
                );
                const predominantState = this.getMostFrequent(states);

                html += `
                    <tr>
                        <td>${name}</td>
                        <td>${period.tests.length}</td>
                        <td>${avgRate.toFixed(1)} /min</td>
                        <td>${predominantState.toUpperCase()}</td>
                    </tr>
                `;
            }
        });

        return html;
    }

    generateRecentTestsTable(tests) {
        return tests.map(test => {
            const date = new Date(test.timestamp);
            const state = this.estimateState(
                test.results.blinkRatePerMin,
                test.medicationInfo.minutesSinceDose
            );

            return `
                <tr>
                    <td>${date.toLocaleDateString('fr-FR')}</td>
                    <td>${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>${test.medicationInfo.minutesSinceDose} min</td>
                    <td>${test.results.blinkRatePerMin.toFixed(1)} /min</td>
                    <td>${state.toUpperCase()}</td>
                    <td>${Math.round(test.results.qualityScore * 100)}%</td>
                </tr>
            `;
        }).join('');
    }

    generateRecommendations(analysis) {
        const recommendations = [];

        if (analysis.trend === 'declining') {
            recommendations.push({
                type: 'warning',
                text: 'Une tendance à la baisse du taux de clignement a été observée. Consultez votre neurologue pour évaluer l\'efficacité du traitement actuel.'
            });
        }

        if (analysis.meanBlinkRate < 12) {
            recommendations.push({
                type: 'warning',
                text: 'Le taux de clignement moyen est inférieur aux valeurs attendues. Cela peut indiquer des périodes OFF prolongées.'
            });
        }

        if (analysis.optimalOnPeriod < 120) {
            recommendations.push({
                type: 'info',
                text: `La période ON optimale semble être autour de ${analysis.optimalOnPeriod} minutes après la prise. Surveillez l'apparition de dyskinésies.`
            });
        }

        if (recommendations.length === 0) {
            recommendations.push({
                type: 'success',
                text: 'Les paramètres de clignement sont dans les limites attendues. Continuez le suivi régulier.'
            });
        }

        return recommendations.map(rec => `
            <div class="recommendation">
                <strong>${rec.type === 'warning' ? '⚠️ Attention' : rec.type === 'info' ? 'ℹ️ Information' : '✅ Bon'} :</strong>
                ${rec.text}
            </div>
        `).join('');
    }

    // Méthodes utilitaires
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        
        URL.revokeObjectURL(url);
    }

    getDateString() {
        const now = new Date();
        return now.toISOString().slice(0, 10).replace(/-/g, '');
    }

    getDayName(dayIndex) {
        const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
        return days[dayIndex];
    }

    getPeriodString(tests) {
        if (tests.length === 0) return 'Aucune donnée';
        
        const dates = tests.map(t => new Date(t.timestamp));
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));
        
        return `${minDate.toLocaleDateString('fr-FR')} - ${maxDate.toLocaleDateString('fr-FR')}`;
    }

    getTrendDescription(trend) {
        const descriptions = {
            'improving': 'Amélioration',
            'declining': 'Dégradation',
            'stable': 'Stable'
        };
        return descriptions[trend] || 'Indéterminé';
    }

    estimateState(blinkRate, minutesSinceDose) {
        if (minutesSinceDose < 240 && blinkRate >= 15) return 'on';
        if (minutesSinceDose >= 240 || blinkRate < 12) return 'off';
        return 'transition';
    }

    getMostFrequent(arr) {
        const counts = {};
        arr.forEach(item => {
            counts[item] = (counts[item] || 0) + 1;
        });
        
        let maxCount = 0;
        let mostFrequent = arr[0];
        
        Object.entries(counts).forEach(([item, count]) => {
            if (count > maxCount) {
                maxCount = count;
                mostFrequent = item;
            }
        });
        
        return mostFrequent;
    }

    // Export pour backup complet
    async exportBackup() {
        const data = await this.storage.exportAllData();
        const json = JSON.stringify(data, null, 2);
        const filename = `BlinkTracker_Backup_${this.getDateString()}.json`;
        
        this.downloadFile(json, filename, 'application/json');
    }

    // Import de backup
    async importBackup(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    await this.storage.importData(data);
                    resolve();
                } catch (error) {
                    reject(new Error('Format de fichier invalide'));
                }
            };
            
            reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
            reader.readAsText(file);
        });
    }
}
