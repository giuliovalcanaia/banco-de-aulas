// Aplica o tema antes do primeiro paint para evitar flash claro/escuro.
;(function () {
  try {
    var stored = localStorage.getItem('banco-de-aulas:theme')
    var dark = stored
      ? stored === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches
    var root = document.documentElement
    root.classList.toggle('dark', dark)
    root.style.colorScheme = dark ? 'dark' : 'light'
    var meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', dark ? '#18181b' : '#ffffff')
  } catch {
    // Sem localStorage: segue o tema do sistema.
  }
})()
