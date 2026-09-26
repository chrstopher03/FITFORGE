const CACHE='fitforge-v3';
const APP=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(APP)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))))});
self.addEventListener('message',event=>{if(event.data?.type==='FITFORGE_REMINDER'){event.waitUntil(self.registration.showNotification(event.data.title||'FITFORGE',{body:event.data.body||'Recuerda cuidar tu salud y mantenerte activo.',icon:'icon-192.png',badge:'icon-192.png',tag:event.data.tag||('fitforge-'+Date.now()),renotify:true}));}});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{const c=list[0];if(c)return c.focus();return clients.openWindow('./')}));});
