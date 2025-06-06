// ui.js - Gestion de l'interface utilisateur

export class UI {
    constructor() {
        this.currentScreen = null;
        this.chartInstance = null;
        this.initChart();
    }

    showScreen(screenId) {
        // Cacher tous les écrans
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        // Afficher l'écran demandé
        const screen = document.getElementById(screenId);
        if (screen) {
            screen.classList.add('active');
            this.currentScreen = screenId;
        }
    }

    showLoading(message = 'Chargement...') {
        const modal = document.getElementById('loading-modal');
        const messageElement = document.getElementById('loading-message');
        
        messageElement.textContent = message;
        modal.classList.add('active');
    }

    hideLoading() {
        const modal = document.getElementById('loading-modal');
        modal.classList.remove('active');
    }

    showError(message) {
        const modal = document.getElementById('error-modal');
        const messageElement = document.getElementById('error-message');
        
        messageElement.textContent = message;
        modal.classList.add('active');
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    }

    initChart() {
        // Créer un canvas pour Chart.js si nécessaire
        const canvas = document.getElementById('blink-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        // Configuration de base du graphique
        this.chartConfig = {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Taux de clignement',
                    data: [],
                    backgroundColor: 'rgba(33, 150, 243, 0.5)',
                    borderColor: 'rgba(33, 150, 243, 1)',
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        title: {
                            display: true,
                            text: 'Minutes depuis dernière dose'
                        },
                        min: 0,
                        max: 300
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Clignements/minute'
                        },
                        min: 0,
                        max: 40
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.parsed.y.toFixed(1)} clignements/min à ${context.parsed.x} min`;
                            }
                        }
                    },
                    legend: {
                        display: false
                    }
                }
            }
        };
    }

    updateChart(tests) {
        const canvas = document.getElementById('blink-chart');
        if (!canvas) return;

        // Préparer les données
        const data = tests.map(test => ({
            x: test.medicationInfo.minutesSinceDose,
            y: test.results.blinkRatePerMin
        }));

        // Si pas de bibliothèque de graphiques, faire un graphique simple avec canvas
        this.drawSimpleChart(canvas, data);
    }

    drawSimpleChart(canvas, data) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // Effacer le canvas
        ctx.clearRect(0, 0, width, height);

        // Marges
        const margin = { top: 20, right: 20, bottom: 40, left: 50 };
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;

        // Échelles
        const xMax = 300; // 5 heures
        const yMax = 40; // 40 clignements/min max
        
        const xScale = (x) => margin.left + (x / xMax) * chartWidth;
        const yScale = (y) => margin.top + chartHeight - (y / yMax) * chartHeight;

        // Dessiner les axes
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;

        // Axe X
        ctx.beginPath();
        ctx.moveTo(margin.left, margin.top + chartHeight);
        ctx.lineTo(margin.left + chartWidth, margin.top + chartHeight);
        ctx.stroke();

        // Axe Y
        ctx.beginPath();
        ctx.moveTo(margin.left, margin.top);
        ctx.lineTo(margin.left, margin.top + chartHeight);
        ctx.stroke();

        // Graduations et labels
        ctx.fillStyle = '#666';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';

        // Graduations X
        for (let i = 0; i <= 5; i++) {
            const x = i * 60; // Toutes les heures
            const xPos = xScale(x);
            
            ctx.beginPath();
            ctx.moveTo(xPos, margin.top + chartHeight);
            ctx.lineTo(xPos, margin.top + chartHeight + 5);
            ctx.stroke();
            
            ctx.fillText(`${i}h`, xPos, margin.top + chartHeight + 20);
        }

        // Graduations Y
        ctx.textAlign = 'right';
        for (let i = 0; i <= 4; i++) {
            const y = i * 10;
            const yPos = yScale(y);
            
            ctx.beginPath();
            ctx.moveTo(margin.left - 5, yPos);
            ctx.lineTo(margin.left, yPos);
            ctx.stroke();
            
            ctx.fillText(y, margin.left - 10, yPos + 5);
        }

        // Labels des axes
        ctx.save();
        ctx.translate(15, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.fillText('Clignements/min', 0, 0);
        ctx.restore();

        ctx.textAlign = 'center';
        ctx.fillText('Temps depuis dernière dose', width / 2, height - 5);

        // Dessiner les zones ON/OFF
        ctx.fillStyle = 'rgba(76, 175, 80, 0.1)';
        ctx.fillRect(xScale(0), margin.top, xScale(240) - xScale(0), chartHeight);
        
        ctx.fillStyle = 'rgba(255, 152, 0, 0.1)';
        ctx.fillRect(xScale(240), margin.top, xScale(300) - xScale(240), chartHeight);

        // Dessiner les points
        data.forEach(point => {
            const x = xScale(point.x);
            const y = yScale(point.y);
            
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, 2 * Math.PI);
            ctx.fillStyle = 'rgba(33, 150, 243, 0.7)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(33, 150, 243, 1)';
            ctx.lineWidth = 2;
            ctx.stroke();
        });

        // Ligne de tendance (simple moyenne mobile)
        if (data.length > 3) {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(33, 150, 243, 0.5)';
            ctx.lineWidth = 2;
            
            // Trier par x
            const sortedData = [...data].sort((a, b) => a.x - b.x);
            
            sortedData.forEach((point, i) => {
                const x = xScale(point.x);
                const y = yScale(point.y);
                
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            
            ctx.stroke();
        }
    }

    // Animations et transitions
    animateValue(elementId, start, end, duration) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const range = end - start;
        const startTime = performance.now();

        const update = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const value = start + (range * this.easeOutQuad(progress));
            element.textContent = Math.round(value);

            if (progress < 1) {
                requestAnimationFrame(update);
            }
        };

        requestAnimationFrame(update);
    }

    easeOutQuad(t) {
        return t * (2 - t);
    }

    // Notifications
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Animation d'entrée
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        // Suppression après 3 secondes
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    // Gestion du thème (clair/sombre)
    toggleTheme() {
        const isDark = document.body.classList.toggle('dark-theme');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        return isDark;
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');
        }
    }

    // Helpers pour les formulaires
    validateForm(formId) {
        const form = document.getElementById(formId);
        if (!form) return false;

        const inputs = form.querySelectorAll('input[required]');
        let isValid = true;

        inputs.forEach(input => {
            if (!input.value.trim()) {
                input.classList.add('error');
                isValid = false;
            } else {
                input.classList.remove('error');
            }
        });

        return isValid;
    }

    clearForm(formId) {
        const form = document.getElementById(formId);
        if (form) {
            form.reset();
            form.querySelectorAll('.error').forEach(el => {
                el.classList.remove('error');
            });
        }
    }

    // Gestion de l'état visuel pendant les tests
    updateTestProgress(current, total) {
        const percent = (current / total) * 100;
        
        // Mettre à jour la barre de progression si elle existe
        const progressBar = document.querySelector('.progress-bar');
        if (progressBar) {
            progressBar.style.width = `${percent}%`;
        }
    }

    // Indicateurs visuels pour la qualité
    showQualityIndicator(quality) {
        const colors = {
            excellent: '#4CAF50',
            good: '#8BC34A',
            fair: '#FFC107',
            poor: '#FF5722'
        };

        let level;
        if (quality > 0.9) level = 'excellent';
        else if (quality > 0.7) level = 'good';
        else if (quality > 0.5) level = 'fair';
        else level = 'poor';

        const indicator = document.querySelector('.quality-indicator');
        if (indicator) {
            indicator.style.backgroundColor = colors[level];
            indicator.textContent = level.toUpperCase();
        }
    }

    // Gestion responsive
    checkOrientation() {
        const isPortrait = window.innerHeight > window.innerWidth;
        
        if (this.currentScreen === 'test-screen' && isPortrait) {
            this.showNotification('Veuillez tourner votre appareil en mode paysage', 'warning');
        }
    }

    // Export de méthodes utilitaires
    formatDate(date) {
        return new Intl.DateTimeFormat('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(date));
    }

    formatDuration(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        
        if (hours > 0) {
            return `${hours}h ${mins}min`;
        } else {
            return `${mins} min`;
        }
    }
}

// Initialiser les écouteurs globaux
window.addEventListener('resize', () => {
    const ui = new UI();
    ui.checkOrientation();
});

// Fonction globale pour fermer les modals
window.hideModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
};

// Fonction globale pour changer d'écran
window.showScreen = (screenId) => {
    const ui = new UI();
    ui.showScreen(screenId);
};