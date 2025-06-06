// camera.js - Gestion de la caméra et détection des clignements

export class Camera {
    constructor() {
        this.video = null;
        this.canvas = null;
        this.ctx = null;
        this.stream = null;
        this.faceMesh = null;
        this.isRunning = false;
        
        // Callbacks
        this.onFaceDetected = null;
        this.onEyesDetected = null;
        this.onLightingOK = null;
        this.onBlinkDetected = null;
        this.onQualityUpdate = null;
        
        // État de détection
        this.eyeState = {
            left: { isOpen: true, lastClosed: 0 },
            right: { isOpen: true, lastClosed: 0 }
        };
        
        this.blinkThreshold = {
            earThreshold: 0.21, // Eye Aspect Ratio threshold
            minDuration: 160,   // ms
            maxDuration: 400    // ms
        };
        
        this.frameCount = 0;
        this.trackingLossCount = 0;
        this.startTime = Date.now();
        this.brightnessHistory = []; // Initialisation de l'historique
    }

    async init(videoId, canvasId) {
        this.video = document.getElementById(videoId);
        this.canvas = document.getElementById(canvasId);

        // Get context with willReadFrequently optimization
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        
        // Initialiser MediaPipe FaceMesh
        if (window.FaceMesh) {
            this.faceMesh = new FaceMesh({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
                }
            });
            
            this.faceMesh.setOptions({
                maxNumFaces: 1,
                refineLandmarks: true,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });
            
            this.faceMesh.onResults(this.onResults.bind(this));
        }
    }

    async start() {
        try {
            // Obtenir le flux vidéo
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    frameRate: { ideal: 30 }
                }
            });
            
            this.video.srcObject = this.stream;
            this.isRunning = true;
            this.startTime = Date.now(); // Reset start time
            
            // Attendre que la vidéo soit prête
            await new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    this.video.play();
                    resolve();
                };
            });
            
            // Ajuster la taille du canvas
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;
            
            // Démarrer la détection
            this.detectFrame();
            
        } catch (error) {
            console.error('Erreur d\'accès à la caméra:', error);
            throw error;
        }
    }

    stop() {
        this.isRunning = false;
        
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        if (this.video) {
            this.video.srcObject = null;
        }
    }

    async detectFrame() {
        if (!this.isRunning) return;
        
        this.frameCount++;
        
        // Si MediaPipe est disponible
        if (this.faceMesh && this.video.readyState === 4) {
            await this.faceMesh.send({ image: this.video });
        } else {
            // Fallback : détection simple basée sur le changement de pixels
            this.simpleBlinkDetection();
        }
        
        // Continuer la détection
        requestAnimationFrame(() => this.detectFrame());
    }

    onResults(results) {
        // Effacer le canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Dessiner la vidéo
        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        
        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            const landmarks = results.multiFaceLandmarks[0];
            
            // Visage détecté
            if (this.onFaceDetected) {
                this.onFaceDetected(true);
            }
            
            // Analyser les yeux
            const leftEye = this.getEyeLandmarks(landmarks, 'left');
            const rightEye = this.getEyeLandmarks(landmarks, 'right');
            
            if (leftEye.length > 0 && rightEye.length > 0) {
                if (this.onEyesDetected) {
                    this.onEyesDetected(true);
                }
                
                // Calculer l'EAR (Eye Aspect Ratio) pour chaque œil
                const leftEAR = this.calculateEAR(leftEye);
                const rightEAR = this.calculateEAR(rightEye);
                
                // Détecter les clignements
                this.detectBlink(leftEAR, rightEAR);
                
                // Dessiner les points des yeux (optionnel)
                this.drawEyePoints(leftEye, rightEye);
            }
            
            // Vérifier l'éclairage
            this.checkLighting();
            
        } else {
            // Pas de visage détecté
            this.trackingLossCount++;
            
            if (this.onFaceDetected) {
                this.onFaceDetected(false);
            }
            if (this.onEyesDetected) {
                this.onEyesDetected(false);
            }
        }
        
        // Mettre à jour la qualité
        if (this.onQualityUpdate && this.frameCount % 30 === 0) {
            this.onQualityUpdate({
                trackingLoss: this.trackingLossCount,
                totalFrames: this.frameCount,
                fps: Math.round(this.frameCount / ((Date.now() - this.startTime) / 1000))
            });
        }
    }

    getEyeLandmarks(landmarks, side) {
        // Indices MediaPipe pour les yeux
        const eyeIndices = {
            left: [33, 160, 158, 133, 153, 144],  // Points autour de l'œil gauche
            right: [362, 385, 387, 263, 373, 380] // Points autour de l'œil droit
        };
        
        return eyeIndices[side].map(idx => ({
            x: landmarks[idx].x * this.canvas.width,
            y: landmarks[idx].y * this.canvas.height
        }));
    }

    calculateEAR(eye) {
        // Eye Aspect Ratio (EAR)
        // Calcul simplifié basé sur 6 points
        const verticalDist1 = this.distance(eye[1], eye[5]);
        const verticalDist2 = this.distance(eye[2], eye[4]);
        const horizontalDist = this.distance(eye[0], eye[3]);
        
        const ear = (verticalDist1 + verticalDist2) / (2.0 * horizontalDist);
        return ear;
    }

    distance(p1, p2) {
        return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    }

    detectBlink(leftEAR, rightEAR) {
        const avgEAR = (leftEAR + rightEAR) / 2;
        const currentTime = Date.now();
        
        // Les yeux sont-ils fermés ?
        const eyesClosed = avgEAR < this.blinkThreshold.earThreshold;
        
        if (eyesClosed && this.eyeState.left.isOpen) {
            // Début du clignement
            this.eyeState.left.isOpen = false;
            this.eyeState.left.lastClosed = currentTime;
            
        } else if (!eyesClosed && !this.eyeState.left.isOpen) {
            // Fin du clignement
            const duration = currentTime - this.eyeState.left.lastClosed;
            
            if (duration >= this.blinkThreshold.minDuration && 
                duration <= this.blinkThreshold.maxDuration) {
                // Clignement valide détecté
                if (this.onBlinkDetected) {
                    this.onBlinkDetected({
                        timestamp: currentTime,
                        duration: duration,
                        ear: avgEAR
                    });
                }
            }
            
            this.eyeState.left.isOpen = true;
        }
    }

    drawEyePoints(leftEye, rightEye) {
        // Dessiner les points des yeux pour le debug
        this.ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
        
        [...leftEye, ...rightEye].forEach(point => {
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
            this.ctx.fill();
        });
    }

    checkLighting() {
        // Only check lighting every 10 frames
        if (this.frameCount % 10 !== 0) return;
        
        try {
            // Analyse de la luminosité avec échantillonnage
            const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            const data = imageData.data;
            const pixelCount = data.length / 4;
            const sampleSize = Math.min(10000, pixelCount);
            const step = Math.floor(pixelCount / sampleSize) * 4;
            
            let brightness = 0;
            for (let i = 0; i < data.length; i += step) {
                // Formule de luminance standard (Rec. 709)
                brightness += 0.2126 * data[i] + 0.7152 * data[i+1] + 0.0722 * data[i+2];
            }
            
            brightness = brightness / sampleSize;
            
            // Seuils de luminosité acceptables
            const isLightingOK = brightness > 50 && brightness < 200;
            
            if (this.onLightingOK) {
                this.onLightingOK(isLightingOK);
            }
        } catch (e) {
            console.warn("Erreur d'analyse de luminosité:", e);
        }
    }

    simpleBlinkDetection() {
        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        
        // Définir une région d'intérêt approximative pour les yeux
        const roiX = this.canvas.width * 0.2;      // Position X
        const roiY = this.canvas.height * 0.3;      // Position Y
        const roiWidth = this.canvas.width * 0.6;   // Largeur
        const roiHeight = this.canvas.height * 0.2; // Hauteur
        
        try {
            const imageData = this.ctx.getImageData(roiX, roiY, roiWidth, roiHeight);
            const data = imageData.data;
            const pixelCount = roiWidth * roiHeight;
            
            // Calculer la luminosité moyenne
            let brightness = 0;
            for (let i = 0; i < data.length; i += 4) {
                // Formule de luminance standard
                brightness += 0.2126 * data[i] + 0.7152 * data[i+1] + 0.0722 * data[i+2];
            }
            brightness = brightness / pixelCount;
            
            // Stocker l'historique de luminosité
            this.brightnessHistory.push(brightness);
            if (this.brightnessHistory.length > 10) {
                this.brightnessHistory.shift();
            }
            
            // Détecter les changements brusques de luminosité
            if (this.brightnessHistory.length >= 5) {
                const recent = this.brightnessHistory.slice(-5);
                const avg = recent.reduce((a, b) => a + b) / recent.length;
                
                // Un clignement provoque généralement une baisse de luminosité
                if (Math.abs(brightness - avg) > avg * 0.15) {
                    if (!this.lastBlinkTime || Date.now() - this.lastBlinkTime > 300) {
                        this.lastBlinkTime = Date.now();
                        
                        if (this.onBlinkDetected) {
                            this.onBlinkDetected({
                                timestamp: Date.now(),
                                duration: 200, // Durée estimée
                                method: 'simple'
                            });
                        }
                    }
                }
            }
            
            // Indicateurs de base
            if (this.onFaceDetected) {
                this.onFaceDetected(brightness > 30);
            }
            if (this.onLightingOK) {
                this.onLightingOK(brightness > 50 && brightness < 200);
            }
            
        } catch (e) {
            console.warn("Erreur de détection simple:", e);
        }
    }

    // Méthodes utilitaires
    takeSnapshot() {
        const canvas = document.createElement('canvas');
        canvas.width = this.video.videoWidth;
        canvas.height = this.video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(this.video, 0, 0);
        return canvas.toDataURL('image/jpeg');
    }

    adjustCameraSettings(settings) {
        if (this.stream && this.stream.getVideoTracks().length > 0) {
            const track = this.stream.getVideoTracks()[0];
            const capabilities = track.getCapabilities();
            
            // Appliquer les réglages supportés
            const constraints = {};
            
            if (settings.brightness && capabilities.brightness) {
                constraints.brightness = settings.brightness;
            }
            if (settings.contrast && capabilities.contrast) {
                constraints.contrast = settings.contrast;
            }
            if (settings.exposure && capabilities.exposureMode) {
                constraints.exposureMode = settings.exposure;
            }
            
            track.applyConstraints(constraints).catch(console.error);
        }
    }

    getVideoStats() {
        if (!this.video) return null;
        
        const elapsed = (Date.now() - this.startTime) / 1000;
        const fps = elapsed > 0 ? Math.round(this.frameCount / elapsed) : 0;
        
        return {
            width: this.video.videoWidth,
            height: this.video.videoHeight,
            fps: fps,
            trackingQuality: this.frameCount > 0 
                ? 1 - (this.trackingLossCount / this.frameCount) 
                : 0
        };
    }
}
