const CACHE='fitforge-v1';
const CORE=['./','./index.html','./manifest.webmanifest'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE))));
self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(x=>{
  const copy=x.clone(); caches.open(CACHE).then(c=>c.put(e.request,copy)); return x;
}).catch(()=>caches.match('./index.html')))));
