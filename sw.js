/* Seven-Day Sprint \u2014 service worker
   Two jobs:
   1) Let app.js show notifications via registration.showNotification(), which produces a
      real, persistent system banner (this is required for it to work at all in Chrome
      on Android \u2014 plain `new Notification()` from a page is not reliable there).
   2) Cache the app shell so the tracker still loads if the connection drops mid-session.
*/
const CACHE='seven-day-sprint-v1';
const ASSETS=[
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install',function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(ASSETS);}).catch(function(){}));
});

self.addEventListener('activate',function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){return k!==CACHE;}).map(function(k){return caches.delete(k);}));
    }).then(function(){return self.clients.claim();})
  );
});

self.addEventListener('fetch',function(e){
  if(e.request.method!=='GET')return;
  e.respondWith(
    caches.match(e.request).then(function(cached){
      const network=fetch(e.request).then(function(res){
        if(res&&res.ok){const copy=res.clone();caches.open(CACHE).then(function(c){c.put(e.request,copy);});}
        return res;
      }).catch(function(){return cached;});
      return cached||network;
    })
  );
});

/* Clicking a notification focuses (or opens) the app instead of just disappearing */
self.addEventListener('notificationclick',function(e){
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({type:'window',includeUncontrolled:true}).then(function(list){
      for(const c of list){if('focus' in c)return c.focus();}
      if(self.clients.openWindow)return self.clients.openWindow('./');
    })
  );
});
