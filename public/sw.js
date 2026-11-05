/*
 * Service worker do Banco de Aulas.
 *
 * - Navegação: network-first com fallback para o shell em cache (abre offline).
 * - Assets estáticos same-origin: cache-first (os nomes têm hash e são imutáveis).
 * - Requisições ao Firestore/Auth são de outra origem e não passam pelo cache.
 */
const VERSION = 'v3'
const SHELL_CACHE = `banco-de-aulas-shell-${VERSION}`
const ASSET_CACHE = `banco-de-aulas-assets-${VERSION}`

self.addEventListener('install', (event) => {
  event.waitUntil(precacheShell().then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((key) => key !== SHELL_CACHE && key !== ASSET_CACHE)
          .map((key) => caches.delete(key)),
      )
      await self.clients.claim()
    })(),
  )
})

/**
 * Baixa o index.html e os assets com hash que ele referencia. Sem isso, a
 * primeira visita instalaria o service worker depois de os assets já terem
 * sido baixados, e o app não abriria offline até a segunda visita.
 */
async function precacheShell() {
  const cache = await caches.open(SHELL_CACHE)

  try {
    const response = await fetch('/index.html', { cache: 'reload' })
    if (!response.ok) return

    const html = await response.clone().text()
    await cache.put('/index.html', response.clone())
    await cache.put('/', response)

    const urls = new Set()
    const pattern = /(?:src|href)="([^"]*\/assets\/[^"]+)"/g
    let match
    while ((match = pattern.exec(html)) !== null) {
      urls.add(match[1])
    }

    await Promise.all(
      ['/theme-init.js', ...urls].map((url) =>
        cache.add(url).catch(() => undefined),
      ),
    )
  } catch {
    // Sem rede no install: as próximas visitas completam o cache.
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Script pequeno e sem hash: network-first para pegar correções de tema.
  if (url.pathname === '/theme-init.js') {
    event.respondWith(networkFirst(request))
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request))
    return
  }

  event.respondWith(cacheFirst(request))
})

async function networkFirst(request) {
  const cache = await caches.open(SHELL_CACHE)
  try {
    const response = await fetch(request)
    if (response.ok) await cache.put(request, response.clone())
    return response
  } catch {
    return (
      (await cache.match(request)) ||
      (await cache.match('/index.html')) ||
      (await cache.match('/')) ||
      Response.error()
    )
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(ASSET_CACHE)
  const cached = await cache.match(request)
  if (cached) return cached

  const response = await fetch(request)
  if (response.ok) await cache.put(request, response.clone())
  return response
}
