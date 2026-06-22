/**
 * Cache-busting version token for runtime plugin assets (`/main/*`).
 *
 * Production: `applicationSettings.digestVersion` from the session payload —
 * an MD5 digest the backend's `PluginsClassLoader` computes over the installed
 * plugin archives at boot, so it rotates whenever any plugin is installed,
 * upgraded or removed (plugin changes require an API restart, which recomputes
 * it; safe-mode even randomizes it per boot). URLs carrying `?v=<digest>` are
 * served with a 1-year immutable cache by `Application#pluginCacheFilter`,
 * so plugin bundles are fetched once per version instead of revalidated on
 * every page load — the digest rotation does the busting.
 *
 * Dev: bundles are rebuilt at will without any version change, so each page
 * load busts with a timestamp instead.
 *
 * Returns '' when the session isn't available yet — the URL then stays
 * unversioned and the server answers it with `no-cache` (always fresh).
 */
import { useAuthStore } from '@/stores/auth.js'

export function pluginAssetVersion() {
  if (import.meta.env.DEV) return String(Date.now())
  try {
    const digest = useAuthStore().appSettings?.digestVersion
    // The digest is base64 ('+', '/', '=' are reserved in query values).
    return digest ? encodeURIComponent(digest) : ''
  } catch {
    // Pinia not active yet (very early boot) — serve unversioned.
    return ''
  }
}
