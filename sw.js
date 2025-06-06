// sw.js - Service Worker pour BlinkTracker

const CACHE_NAME = 'blinktracker-v1.0.0';
const urlsToCache = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/storage.js',
    '/ui.js',
    '/camera.js',
    '/analysis.js',
    '/export.js',
    '/manifest.json',
    'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js',
    'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js'
];

// Installation du Service Worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache ouvert');
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.error('Erreur lors de la mise en cache:', error);
            })
    );
});

// Activation du Service Worker
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Suppression du cache obsolète:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Interception des requêtes
self.addEventListener('fetch', event => {
    // Stratégie : Cache First pour les ressources statiques
    if (event.request.method === 'GET') {
        event.respondWith(
            caches.match(event.request)
                .then(response => {
                    // Retourner la réponse en cache si disponible
                    if (response) {
                        return response;
                    }

                    // Sinon, faire la requête réseau
                    return fetch(event.request).then(response => {
                        // Vérifier si la réponse est valide
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Cloner la réponse pour la mettre en cache
                        const responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {
                                // Ne pas mettre en cache les URLs de données ou blob
                                if (!event.request.url.startsWith('blob:') && 
                                    !event.request.url.startsWith('data:')) {
                                    cache.put(event.request, responseToCache);
                                }
                            });

                        return response;
                    });
                })
                .catch(error => {
                    console.error('Erreur de fetch:', error);
                    
                    // Page de fallback hors ligne
                    if (event.request.destination === 'document') {
                        return caches.match('/offline.html');
                    }
                })
        );
    }
});

// Gestion des messages du client
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_NAME });
    }
});

// Synchronisation en arrière-plan (si supportée)
self.addEventListener('sync', event => {
    if (event.tag === 'sync-tests') {
        event.waitUntil(syncTests());
    }
});

async function syncTests() {
    // Logique de synchronisation des tests non sauvegardés
    // Cette fonctionnalité nécessiterait un backend
    console.log('Synchronisation des tests en arrière-plan');
}

// Notifications push (si configurées)
self.addEventListener('push', event => {
    if (event.data) {
        const options = {
            body: event.data.text(),
            icon: '/icons/icon-192.png',
            badge: '/icons/badge-72.png',
            vibrate: [200, 100, 200],
            data: {
                dateOfArrival: Date.now(),
                primaryKey: 1
            },
            actions: [
                {
                    action: 'test',
                    title: 'Faire un test',
                    icon: '/icons/test-action.png'
                },
                {
                    action: 'close',
                    title: 'Fermer',
                    icon: '/icons/close-action.png'
                }
            ]
        };

        event.waitUntil(
            self.registration.showNotification('BlinkTracker', options)
        );
    }
});

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', event => {
    event.notification.close();

    if (event.action === 'test') {
        // Ouvrir l'app et démarrer un test
        event.waitUntil(
            clients.openWindow('/?action=test')
        );
    } else {
        // Ouvrir l'app normalement
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Mise à jour périodique du cache
self.addEventListener('periodicsync', event => {
    if (event.tag === 'update-cache') {
        event.waitUntil(updateCache());
    }
});

async function updateCache() {
    const cache = await caches.open(CACHE_NAME);
    
    // Mettre à jour les ressources critiques
    const requests = urlsToCache.map(url => {
        return fetch(url).then(response => {
            if (response.ok) {
                return cache.put(url, response);
            }
        }).catch(error => {
            console.error(`Erreur de mise à jour du cache pour ${url}:`, error);
        });
    });

    await Promise.all(requests);
}

// Page hors ligne de base
const offlineHTML = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BlinkTracker - Hors ligne</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: #f5f5f5;
        }
        .offline-message {
            text-align: center;
            padding: 20px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
            color: #2196F3;
        }
        button {
            margin-top: 20px;
            padding: 10px 20px;
            background: #2196F3;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <div class="offline-message">
        <h1>Mode hors ligne</h1>
        <p>L'application fonctionne en mode hors ligne.</p>
        <p>Certaines fonctionnalités peuvent être limitées.</p>
        <button onclick="window.location.reload()">Réessayer</button>
    </div>
</body>
</html>
`;

// Créer la page hors ligne au premier chargement
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            const response = new Response(offlineHTML, {
                headers: { 'Content-Type': 'text/html' }
            });
            return cache.put('/offline.html', response);
        })
    );
});
