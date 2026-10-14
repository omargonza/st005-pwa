const CACHE_PREFIX = "st005-";
// Cambiar esta versión cuando se necesite invalidar por completo una edición publicada.
const CACHE_NAME = `${CACHE_PREFIX}v7`;

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
];

const OPTIONAL_ASSETS = [
  "./assets/images/gabinete-aconcawa.jpg",
  "./assets/images/gabinete-interior.jpg",
  "./assets/images/hwinfo-reposo.jpg",
  "./assets/images/hwinfo-stress.jpg",
  "./assets/docs/informe-st005.pdf?v=3847d3528d36",
  "./assets/docs/presupuesto-st005.xlsx?v=fe9a65663d2a",
  "./assets/docs/presentacion-st005.pdf?v=0a687d8a5c06",
];

function respuestaCompatible(ruta, respuesta) {
  if (!respuesta?.ok) return false;
  const contenido = respuesta.headers.get("content-type") || "";
  const pathname = new URL(ruta, self.registration.scope).pathname.toLowerCase();

  if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg") || pathname.endsWith(".png")) {
    return contenido.startsWith("image/");
  }
  if (pathname.endsWith(".pdf")) return contenido.includes("application/pdf");
  if (pathname.endsWith(".xlsx")) {
    return contenido.includes("spreadsheetml") || contenido.includes("application/zip") || contenido.includes("application/octet-stream");
  }
  if (pathname.endsWith(".css")) return contenido.includes("text/css");
  if (pathname.endsWith(".js")) return contenido.includes("javascript");
  if (pathname.endsWith(".webmanifest")) return contenido.includes("json");
  if (pathname.endsWith(".html") || pathname.endsWith("/")) return contenido.includes("text/html");
  return !contenido.includes("text/html");
}

self.addEventListener("install", (evento) => {
  evento.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE_ASSETS);

    await Promise.allSettled(OPTIONAL_ASSETS.map(async (ruta) => {
      const respuesta = await fetch(ruta, { cache: "no-cache" });
      if (respuestaCompatible(ruta, respuesta)) {
        await cache.put(ruta, respuesta);
      }
    }));

    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil((async () => {
    const nombres = await caches.keys();
    await Promise.all(nombres
      .filter((nombre) => nombre.startsWith(CACHE_PREFIX) && nombre !== CACHE_NAME)
      .map((nombre) => caches.delete(nombre)));
    await self.clients.claim();
  })());
});

async function respuestaParcial(request) {
  const cache = await caches.open(CACHE_NAME);
  const respuestaCompleta = await cache.match(request.url);
  if (!respuestaCompleta) return fetch(request, { cache: "no-store" });

  const rango = request.headers.get("range");
  const coincidencia = /bytes=(\d+)-(\d*)/.exec(rango || "");
  if (!coincidencia) return respuestaCompleta;

  const contenido = await respuestaCompleta.arrayBuffer();
  const inicio = Number(coincidencia[1]);
  const fin = coincidencia[2] ? Number(coincidencia[2]) : contenido.byteLength - 1;
  const segmento = contenido.slice(inicio, fin + 1);

  return new Response(segmento, {
    status: 206,
    headers: {
      "Content-Range": `bytes ${inicio}-${fin}/${contenido.byteLength}`,
      "Accept-Ranges": "bytes",
      "Content-Length": String(segmento.byteLength),
      "Content-Type": respuestaCompleta.headers.get("content-type") || "application/octet-stream",
    },
  });
}

async function redPrimero(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const respuesta = await fetch(request, { cache: "no-store" });
    if (respuestaCompatible(request.url, respuesta)) await cache.put(request, respuesta.clone());
    return respuesta;
  } catch {
    const almacenada = await cache.match(request);
    if (almacenada) return almacenada;
    if (request.mode === "navigate") return cache.match("./index.html");
    throw new Error("Recurso no disponible sin conexión");
  }
}

self.addEventListener("fetch", (evento) => {
  const request = evento.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.headers.has("range")) {
    evento.respondWith(respuestaParcial(request));
    return;
  }

  evento.respondWith(redPrimero(request));
});

self.addEventListener("message", (evento) => {
  if (evento.data?.type !== "CACHE_RESOURCE" || !evento.data.url) return;

  evento.waitUntil((async () => {
    const url = new URL(evento.data.url);
    const permitidas = OPTIONAL_ASSETS.map((ruta) => new URL(ruta, self.registration.scope).href);
    if (url.origin !== self.location.origin || !permitidas.includes(url.href)) return;
    try {
      const respuesta = await fetch(url.href, { cache: "no-store" });
      if (!respuestaCompatible(url.href, respuesta)) return;
      const cache = await caches.open(CACHE_NAME);
      await cache.put(url.href, respuesta);
    } catch {
      // El recurso seguirá marcado como pendiente si no pudo guardarse.
    }
  })());
});
