import { loadFont } from '@remotion/fonts'

const PRETENDARD_CDN =
  'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css'

const NOTO_SERIF_KR_CDN =
  'https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;500;700&display=block&subset=korean'

const JETBRAINS_MONO_CDN =
  'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=block'

let fontsLoaded = false

/**
 * Load all project fonts using @remotion/fonts.
 * Call once at the top level (e.g., Root.tsx) before compositions render.
 * Uses CSS @import for variable/subset fonts that require stylesheet loading.
 */
export async function loadProjectFonts(): Promise<void> {
  if (fontsLoaded) return

  // Pretendard Variable — load via CSS stylesheet injection
  // @remotion/fonts loadFont() is for single font files (woff2),
  // but Pretendard uses dynamic subsetting via CSS, so we inject the stylesheet
  await injectFontStylesheet(PRETENDARD_CDN)
  await injectFontStylesheet(NOTO_SERIF_KR_CDN)
  await injectFontStylesheet(JETBRAINS_MONO_CDN)

  // Wait for fonts to be available
  await document.fonts.ready

  fontsLoaded = true
}

function injectFontStylesheet(href: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Skip if already injected
    const existing = document.querySelector(`link[href="${href}"]`)
    if (existing) {
      resolve()
      return
    }

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    link.onload = () => resolve()
    link.onerror = () => {
      // Don't block render on font failure — fallback chain handles it
      console.warn(`Font stylesheet failed to load: ${href}`)
      resolve()
    }
    document.head.appendChild(link)
  })
}
