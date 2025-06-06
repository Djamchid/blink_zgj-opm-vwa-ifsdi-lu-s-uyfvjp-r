// analysis.js - Analyse des données de clignement

export class Analysis {
    constructor() {
        // Valeurs de référence basées sur la littérature
        this.normalBlinkRate = {
            min: 15,
            max: 25,
            pdOff: 12,  // Parkinson OFF state
            pdOn: 18    // Parkinson ON state
        };
        
        this.normalBlinkDuration = {
            min: 100,
            max: 400,
            mean: 250
        };
    }

    analyzeTest(testData) {
        const { blinks, startTime, endTime, quality } = testData;
        
        // Durée totale du test en minutes
        const testDurationMs = endTime - startTime;
        const testDurationMin = testDurationMs / 60000;
        
        // Taux de clignement
        const blinkRatePerMin = blinks.length / testDurationMin;
        
        // Analyse des durées
        const durations = blinks.map(b => b.duration);
        const meanDuration = this.calculateMean(durations);
        const stdDuration = this.calculateStd(durations, meanDuration);
        
        // Analyse de la distribution temporelle
        const intervalAnalysis = this.analyzeIntervals(blinks);
        
        // Score de qualité global
        const qualityScore = this.calculateQualityScore(quality, blinks.length, testDurationMin);
        
        return {
            blinkRatePerMin: blinkRatePerMin,
            totalBlinks: blinks.length,
            meanBlinkDuration: meanDuration,
            stdBlinkDuration: stdDuration,
            testDurationMin: testDurationMin,
            qualityScore: qualityScore,
            intervalAnalysis: intervalAnalysis,
            distribution: this.analyzeDistribution(blinks, testDurationMs)
        };
    }

    calculateMean(values) {
        if (values.length === 0) return 0;
        return values.reduce((sum, val) => sum + val, 0) / values.length;
    }

    calculateStd(values, mean) {
        if (values.length < 2) return 0;
        
        const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
        const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / (values.length - 1);
        return Math.sqrt(variance);
    }

    analyzeIntervals(blinks) {
        if (blinks.length < 2) {
            return {
                meanInterval: 0,
                stdInterval: 0,
                minInterval: 0,
                maxInterval: 0,
                regularityScore: 0
            };
        }
        
        const intervals = [];
        for (let i = 1; i < blinks.length; i++) {
            intervals.push(blinks[i].timestamp - blinks[i-1].timestamp);
        }
        
        const meanInterval = this.calculateMean(intervals);
        const stdInterval = this.calculateStd(intervals, meanInterval);
        
        // Score de régularité (0-1, 1 = très régulier)
        const cv = stdInterval / meanInterval; // Coefficient de variation
        const regularityScore = Math.max(0, 1 - cv);
        
        return {
            meanInterval: meanInterval,
            stdInterval: stdInterval,
            minInterval: Math.min(...intervals),
            maxInterval: Math.max(...intervals),
            regularityScore: regularityScore
        };
    }

    analyzeDistribution(blinks, testDurationMs) {
        // Diviser le test en segments de 30 secondes
        const segmentDuration = 30000; // 30 secondes
        const numSegments = Math.ceil(testDurationMs / segmentDuration);
        const segments = new Array(numSegments).fill(0);
        
        blinks.forEach(blink => {
            const segmentIndex = Math.floor((blink.timestamp - blinks[0].timestamp) / segmentDuration);
            if (segmentIndex < numSegments) {
                segments[segmentIndex]++;
            }
        });
        
        return {
            segments: segments,
            segmentDurationSec: segmentDuration / 1000
        };
    }

    calculateQualityScore(quality, totalBlinks, durationMin) {
        // Facteurs de qualité
        let score = 1.0;
        
        // Pénalité pour perte de tracking
        const trackingLossRatio = quality.trackingLoss / quality.totalFrames;
        score *= (1 - trackingLossRatio);
        
        // Pénalité si trop peu de clignements
        const expectedBlinks = durationMin * 15; // Minimum attendu
        if (totalBlinks < expectedBlinks * 0.5) {
            score *= 0.8;
        }
        
        // Pénalité si durée trop courte
        if (durationMin < 3) {
            score *= 0.7;
        }
        
        return Math.max(0, Math.min(1, score));
    }

    estimateState(blinkRate, minutesSinceDose, expectedDuration) {
        // Estimation simple basée sur le taux de clignement et le temps
        // Cette méthode peut être améliorée avec plus de données patient
        
        // Phase ON typique : 0-80% de la durée d'action attendue
        const onPhaseDuration = expectedDuration * 0.8;
        
        if (minutesSinceDose < onPhaseDuration) {
            // Probablement en phase ON
            if (blinkRate >= this.normalBlinkRate.pdOn * 0.8) {
                return 'on';
            } else if (blinkRate >= this.normalBlinkRate.pdOff) {
                return 'transition';
            } else {
                return 'off';
            }
        } else {
            // Probablement en phase OFF
            if (blinkRate >= this.normalBlinkRate.pdOn) {
                return 'on'; // Encore efficace
            } else if (blinkRate >= this.normalBlinkRate.pdOff * 1.2) {
                return 'wearing-off';
            } else {
                return 'off';
            }
        }
    }

    // Analyse comparative entre plusieurs tests
    analyzeTrend(tests) {
        if (tests.length < 2) {
            return {
                trend: 'insufficient_data',
                improvement: null,
                consistency: null
            };
        }
        
        // Trier par date
        const sortedTests = [...tests].sort((a, b) => 
            new Date(a.timestamp) - new Date(b.timestamp)
        );
        
        // Calculer les moyennes par période de la journée
        const morningTests = sortedTests.filter(t => {
            const hour = new Date(t.timestamp).getHours();
            return hour >= 6 && hour < 12;
        });
        
        const afternoonTests = sortedTests.filter(t => {
            const hour = new Date(t.timestamp).getHours();
            return hour >= 12 && hour < 18;
        });
        
        // Analyser la tendance générale
        const recentTests = sortedTests.slice(-10); // 10 derniers tests
        const olderTests = sortedTests.slice(0, 10); // 10 premiers tests
        
        const recentAvg = this.calculateMean(recentTests.map(t => t.results.blinkRatePerMin));
        const olderAvg = this.calculateMean(olderTests.map(t => t.results.blinkRatePerMin));
        
        const improvement = ((recentAvg - olderAvg) / olderAvg) * 100;
        
        // Calculer la consistance (inverse du coefficient de variation)
        const allRates = sortedTests.map(t => t.results.blinkRatePerMin);
        const meanRate = this.calculateMean(allRates);
        const stdRate = this.calculateStd(allRates, meanRate);
        const consistency = 1 - (stdRate / meanRate);
        
        return {
            trend: improvement > 5 ? 'improving' : improvement < -5 ? 'declining' : 'stable',
            improvement: improvement,
            consistency: consistency,
            morningAverage: this.calculateMean(morningTests.map(t => t.results.blinkRatePerMin)),
            afternoonAverage: this.calculateMean(afternoonTests.map(t => t.results.blinkRatePerMin)),
            patterns: this.identifyPatterns(sortedTests)
        };
    }

    identifyPatterns(tests) {
        const patterns = {
            bestTimeOfDay: null,
            optimalDoseTiming: null,
            wearingOffTime: null
        };
        
        // Analyser par heure de la journée
        const hourlyData = {};
        tests.forEach(test => {
            const hour = new Date(test.timestamp).getHours();
            if (!hourlyData[hour]) {
                hourlyData[hour] = [];
            }
            hourlyData[hour].push(test.results.blinkRatePerMin);
        });
        
        // Trouver la meilleure heure
        let bestHour = null;
        let bestRate = 0;
        Object.entries(hourlyData).forEach(([hour, rates]) => {
            const avgRate = this.calculateMean(rates);
            if (avgRate > bestRate) {
                bestRate = avgRate;
                bestHour = parseInt(hour);
            }
        });
        patterns.bestTimeOfDay = bestHour;
        
        // Analyser le timing optimal de dose
        const byTimeSinceDose = {};
        tests.forEach(test => {
            const timeSlot = Math.floor(test.medicationInfo.minutesSinceDose / 30) * 30;
            if (!byTimeSinceDose[timeSlot]) {
                byTimeSinceDose[timeSlot] = [];
            }
            byTimeSinceDose[timeSlot].push(test.results.blinkRatePerMin);
        });
        
        // Identifier le wearing-off
        const sortedTimeSlots = Object.keys(byTimeSinceDose).sort((a, b) => a - b);
        for (let i = 1; i < sortedTimeSlots.length; i++) {
            const currentSlot = sortedTimeSlots[i];
            const prevSlot = sortedTimeSlots[i-1];
            
            const currentAvg = this.calculateMean(byTimeSinceDose[currentSlot]);
            const prevAvg = this.calculateMean(byTimeSinceDose[prevSlot]);
            
            if (currentAvg < prevAvg * 0.8) {
                patterns.wearingOffTime = parseInt(currentSlot);
                break;
            }
        }
        
        return patterns;
    }

    // Générer des recommandations basées sur l'analyse
    generateRecommendations(analysis, patientData) {
        const recommendations = [];
        
        // Recommandations basées sur le taux de clignement
        if (analysis.blinkRatePerMin < this.normalBlinkRate.pdOff) {
            recommendations.push({
                type: 'low_blink_rate',
                message: 'Taux de clignement faible détecté. Consultez votre neurologue pour ajuster le traitement.',
                priority: 'high'
            });
        }
        
        // Recommandations basées sur la régularité
        if (analysis.intervalAnalysis.regularityScore < 0.5) {
            recommendations.push({
                type: 'irregular_pattern',
                message: 'Clignements irréguliers détectés. Cela peut indiquer des fluctuations de l\'état moteur.',
                priority: 'medium'
            });
        }
        
        // Recommandations basées sur la qualité
        if (analysis.qualityScore < 0.7) {
            recommendations.push({
                type: 'low_quality',
                message: 'Qualité du test insuffisante. Assurez-vous d\'être dans un environnement bien éclairé et stable.',
                priority: 'low'
            });
        }
        
        return recommendations;
    }

    // Export des résultats pour analyse externe
    exportForML(tests) {
        // Préparer les données pour un modèle de machine learning
        return tests.map(test => ({
            // Features
            blinkRate: test.results.blinkRatePerMin,
            blinkDurationMean: test.results.meanBlinkDuration,
            blinkDurationStd: test.results.stdBlinkDuration,
            minutesSinceDose: test.medicationInfo.minutesSinceDose,
            doseMg: test.medicationInfo.doseMg,
            withEntacapone: test.medicationInfo.withEntacapone ? 1 : 0,
            hourOfDay: new Date(test.timestamp).getHours(),
            dayOfWeek: new Date(test.timestamp).getDay(),
            
            // Target (à définir selon l'objectif)
            // Par exemple : état ON/OFF basé sur l'estimation
            state: this.estimateState(
                test.results.blinkRatePerMin,
                test.medicationInfo.minutesSinceDose,
                300 // Durée par défaut
            )
        }));
    }
}