/* BlogIt landing page
 *
 * STORE_URL is the Chrome Web Store listing. Every "Add to Chrome" button
 * points to it and the unpacked-build note is hidden. Set it to '' to go back
 * to the scroll-to-install behavior.
 */
const STORE_URL = 'https://chromewebstore.google.com/detail/dpkggdhfpbniijnibnbkmnjjocolkcnk'

const root = document.documentElement
const themeToggle = document.getElementById('theme-toggle')
const themeShot = document.getElementById('theme-shot')
const themeUrl = document.getElementById('theme-url')
const themeChoices = Array.from(document.querySelectorAll('[data-theme-choice]'))
const shots = Array.from(document.querySelectorAll('[data-shot]'))

function storeTheme(theme) {
  try {
    localStorage.setItem('blogit-site-theme', theme)
  } catch {
    /* storage can be unavailable in private modes */
  }
}

function updateShots(theme) {
  for (const image of shots) {
    const next = image.dataset[theme]
    if (next && image.getAttribute('src') !== next) image.setAttribute('src', next)
  }
}

function updateShowcase(theme, { animate = true } = {}) {
  if (!themeShot) return
  themeShot.setAttribute('src', themeShot.dataset[theme] || themeShot.src)
  themeShot.setAttribute(
    'alt',
    theme === 'dark'
      ? 'The BlogIt reader in warm charcoal mode'
      : 'The BlogIt reader in warm paper mode',
  )
  if (themeUrl) {
    themeUrl.textContent = theme === 'dark' ? 'blogit · warm charcoal' : 'blogit · warm paper'
  }
  for (const choice of themeChoices) {
    const active = choice.dataset.themeChoice === theme
    choice.classList.toggle('is-active', active)
    choice.setAttribute('aria-pressed', String(active))
  }
  if (animate) {
    themeShot.classList.remove('shot-swap')
    // force a frame so the class can be re-applied
    void themeShot.offsetWidth
    themeShot.classList.add('shot-swap')
  }
}

function applyTheme(theme, { persist = true, animate = true } = {}) {
  root.dataset.theme = theme
  if (persist) storeTheme(theme)
  if (themeToggle) {
    themeToggle.setAttribute(
      'aria-label',
      theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
    )
  }
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#15130f' : '#f2ede2')
  updateShots(theme)
  updateShowcase(theme, { animate })
}

const current = root.dataset.theme === 'dark' ? 'dark' : 'light'
applyTheme(current, { persist: false, animate: false })

themeToggle?.addEventListener('click', () => {
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark'
  applyTheme(next)
})

for (const choice of themeChoices) {
  choice.addEventListener('click', () => {
    const theme = choice.dataset.themeChoice === 'dark' ? 'dark' : 'light'
    applyTheme(theme)
  })
}

// Follow the OS only while the visitor has not made a choice.
const media = window.matchMedia('(prefers-color-scheme: dark)')
media.addEventListener?.('change', (event) => {
  let stored = null
  try {
    stored = localStorage.getItem('blogit-site-theme')
  } catch {
    /* ignore */
  }
  if (!stored) applyTheme(event.matches ? 'dark' : 'light', { persist: false })
})

// Store links
if (STORE_URL) {
  document.body.classList.add('has-store')
  for (const link of document.querySelectorAll('.install-link')) {
    link.setAttribute('href', STORE_URL)
    link.setAttribute('target', '_blank')
    link.setAttribute('rel', 'noopener noreferrer')
  }
}

// Scroll reveal
const revealables = Array.from(document.querySelectorAll('.reveal'))
if ('IntersectionObserver' in window && revealables.length) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add('is-visible')
        observer.unobserve(entry.target)
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
  )
  for (const element of revealables) observer.observe(element)
} else {
  for (const element of revealables) element.classList.add('is-visible')
}

// Footer year
const year = document.getElementById('year')
if (year) year.textContent = String(new Date().getFullYear())
