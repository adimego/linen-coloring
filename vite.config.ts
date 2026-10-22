import { defineConfig, type Plugin } from "vite";

function linenServiceWorker(): Plugin {
  return {
    name: "linen-service-worker",
    apply: "build",
    generateBundle(_options, bundle) {
      const files = new Set([
        "./index.html",
        "./favicon.svg",
        "./manifest.webmanifest",
        "./icons/icon-192.png",
        "./icons/icon-512.png",
      ]);
      for (const name of Object.keys(bundle)) files.add(`./${name}`);
      let hash = 0;
      const list = [...files].sort();
      for (const char of list.join("|")) hash = (Math.imul(hash, 33) + char.charCodeAt(0)) >>> 0;
      const source = `const CACHE="linen-${hash.toString(16)}";
const PRECACHE=${JSON.stringify(list)};
self.addEventListener("install",(event)=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await Promise.all(PRECACHE.map(async(url)=>{ try{ await cache.add(url);}catch(_error){} }));
    await self.skipWaiting();
  })());
});
self.addEventListener("activate",(event)=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter((key)=>key!==CACHE).map((key)=>caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener("fetch",(event)=>{
  const request=event.request;
  if(request.method!=="GET") return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    try{
      const fresh=await fetch(request);
      if(fresh.ok && (fresh.type==="basic"||fresh.type==="default")) await cache.put(request, fresh.clone());
      return fresh;
    }catch(_error){
      const cached=await cache.match(request);
      if(cached) return cached;
      if(request.mode==="navigate"){
        return (await cache.match("./index.html")) || Response.error();
      }
      return Response.error();
    }
  })());
});
`;
      this.emitFile({ type: "asset", fileName: "sw.js", source });
    },
  };
}

export default defineConfig({
  base: "./",
  server: {
    host: "127.0.0.1",
    port: 43123,
    strictPort: true,
  },
  preview: {
    host: "127.0.0.1",
    port: 43123,
    strictPort: true,
  },
  plugins: [linenServiceWorker()],
});
