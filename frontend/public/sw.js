const CACHE_NAME = 'ai-platform-v1';
const STATIC_CACHE = 'ai-platform-static-v1';
const DYNAMIC_CACHE = 'ai-platform-dynamic-v1';

// 需要缓存的静态资源
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  // 添加其他需要缓存的静态资源
];

// 安装事件 - 缓存静态资源
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Static assets cached successfully');
        return self.skipWaiting(); // 立即激活新的service worker
      })
      .catch(error => {
        console.error('Failed to cache static assets:', error);
      })
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            // 删除旧版本的缓存
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Old caches cleaned up');
        return self.clients.claim(); // 立即控制所有客户端
      })
  );
});

// 拦截网络请求
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // 跳过非HTTP(S)请求
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // 跳过Chrome扩展请求
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        // 如果有缓存且不是GET请求，直接返回缓存
        if (cachedResponse && request.method === 'GET') {
          // 检查缓存是否过期（可选）
          return cachedResponse;
        }

        // 对于API请求，使用网络优先策略
        if (url.pathname.startsWith('/api/')) {
          return fetch(request)
            .then(response => {
              // 缓存成功的API响应
              if (response.ok) {
                const responseClone = response.clone();
                caches.open(DYNAMIC_CACHE)
                  .then(cache => cache.put(request, responseClone))
                  .catch(console.error);
              }
              return response;
            })
            .catch(() => {
              // 网络失败时尝试返回缓存
              return caches.match(request);
            });
        }

        // 对于静态资源，使用缓存优先策略
        if (url.pathname.startsWith('/assets/') || 
            url.pathname.startsWith('/images/') ||
            url.pathname.endsWith('.css') ||
            url.pathname.endsWith('.js') ||
            url.pathname.endsWith('.woff') ||
            url.pathname.endsWith('.woff2')) {
          
          return caches.match(request)
            .then(cachedResponse => {
              if (cachedResponse) {
                // 在后台检查更新
                fetch(request)
                  .then(response => {
                    if (response.ok) {
                      const responseClone = response.clone();
                      caches.open(STATIC_CACHE)
                        .then(cache => cache.put(request, responseClone))
                        .catch(console.error);
                    }
                  })
                  .catch(console.error);
                
                return cachedResponse;
              }

              // 没有缓存时从网络获取
              return fetch(request)
                .then(response => {
                  if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                  }

                  const responseClone = response.clone();
                  caches.open(STATIC_CACHE)
                    .then(cache => cache.put(request, responseClone))
                    .catch(console.error);

                  return response;
                })
                .catch(error => {
                  console.error('Failed to fetch static resource:', error);
                  throw error;
                });
            });
        }

        // 对于HTML文档，使用网络优先策略
        if (request.mode === 'navigate' || 
            (request.method === 'GET' && request.headers.get('accept').includes('text/html'))) {
          
          return fetch(request)
            .then(response => {
              // 缓存HTML响应
              const responseClone = response.clone();
              caches.open(DYNAMIC_CACHE)
                .then(cache => cache.put(request, responseClone))
                .catch(console.error);

              return response;
            })
            .catch(() => {
              // 网络失败时返回缓存的首页
              return caches.match('/');
            });
        }

        // 其他请求直接通过网络获取
        return fetch(request);
      })
      .catch(error => {
        console.error('Service Worker fetch error:', error);
        
        // 如果是导航请求且网络失败，返回离线页面
        if (request.mode === 'navigate') {
          return caches.match('/offline.html') || 
                 new Response('离线页面', { 
                   status: 200, 
                   headers: { 'Content-Type': 'text/html' }
                 });
        }

        throw error;
      })
  );
});

// 处理消息
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('Skip waiting message received');
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ 
      version: CACHE_NAME,
      timestamp: Date.now()
    });
  }
});

// 后台同步事件
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    console.log('Background sync triggered');
    
    event.waitUntil(
      // 执行后台同步任务
      performBackgroundSync()
    );
  }
});

// 推送事件
self.addEventListener('push', event => {
  console.log('Push message received');
  
  const options = {
    body: event.data ? event.data.text() : '您有新的更新',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: '查看详情',
        icon: '/images/checkmark.png'
      },
      {
        action: 'close',
        title: '关闭',
        icon: '/images/xmark.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('AI智能体平台', options)
  );
});

// 通知点击事件
self.addEventListener('notificationclick', event => {
  console.log('Notification click received');

  event.notification.close();

  if (event.action === 'explore') {
    // 打开应用
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.action === 'close') {
    // 关闭通知，不做其他操作
    return;
  } else {
    // 默认行为：打开应用
    event.waitUntil(
      clients.matchAll().then(clientList => {
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});

// 后台同步任务
async function performBackgroundSync() {
  try {
    // 检查应用更新
    const response = await fetch('https://api.github.com/repos/your-username/ai-platform/releases/latest');
    const release = await response.json();
    
    // 检查是否有新版本
    const currentVersion = CACHE_NAME.split('-v')[1];
    const latestVersion = release.tag_name.replace('v', '');
    
    if (isNewerVersion(latestVersion, currentVersion)) {
      // 通知客户端有更新
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'UPDATE_AVAILABLE',
          version: latestVersion,
          releaseNotes: release.body
        });
      });
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// 版本比较函数
function isNewerVersion(remote, current) {
  const remoteParts = remote.split('.').map(Number);
  const currentParts = current.split('.').map(Number);
  
  for (let i = 0; i < Math.max(remoteParts.length, currentParts.length); i++) {
    const remotePart = remoteParts[i] || 0;
    const currentPart = currentParts[i] || 0;
    
    if (remotePart > currentPart) return true;
    if (remotePart < currentPart) return false;
  }
  
  return false;
}

// 缓存清理函数
async function cleanupOldCaches() {
  const cacheNames = await caches.keys();
  const oldCaches = cacheNames.filter(name => 
    name !== STATIC_CACHE && name !== DYNAMIC_CACHE
  );
  
  await Promise.all(oldCaches.map(name => caches.delete(name)));
}

// 定期缓存清理
setInterval(cleanupOldCaches, 24 * 60 * 60 * 1000); // 每天清理一次

console.log('Service Worker loaded successfully');