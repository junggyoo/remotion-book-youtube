import fs from 'fs'
import path from 'path'
import type { ResolvedAsset } from '@/types'
import assetManifest from '@/schema/asset-manifest.json'

interface ManifestAsset {
  id: string
  role: string
  source: {
    type: string
    path: string
  }
  license: {
    status: string
    type: string
    note: string
  }
  fallback: {
    strategy: string
    description: string
  }
}

const assets = assetManifest.assets as ManifestAsset[]
const fallbackRules = assetManifest.fallbackRules as Record<string, string>

/**
 * Resolve a single asset by manifest ID.
 *
 * - Not found → return usedFallback:true with role-based fallback
 * - license pending-check → throw Error (cannot render)
 * - code-generated → return resolvedPath:'code-generated'
 * - File missing + fallback exists → return fallback strategy
 * - File exists → return resolvedPath
 */
export function resolveManifestAsset(id: string): ResolvedAsset {
  const entry = assets.find((a) => a.id === id)

  // Not found in manifest → fallback
  if (!entry) {
    return {
      id,
      usedFallback: true,
      resolvedPath: '',
      fallbackReason: `Asset "${id}" not found in asset-manifest.json`,
    }
  }

  // License pending-check → throw (Spec §10: cannot render)
  if (entry.license.status === 'pending-check') {
    throw new Error(
      `Asset "${id}" has license status "pending-check" — cannot render. Resolve license first.`,
    )
  }

  // Code-generated asset
  if (entry.source.type === 'code-generated') {
    return {
      id,
      usedFallback: false,
      resolvedPath: 'code-generated',
    }
  }

  // Local asset — check if file exists
  const absPath = path.resolve(process.cwd(), 'assets', entry.source.path)

  if (fs.existsSync(absPath)) {
    return {
      id,
      usedFallback: false,
      resolvedPath: path.join('assets', entry.source.path),
    }
  }

  // File missing → apply fallback strategy
  const strategy = entry.fallback?.strategy ?? fallbackRules[entry.role] ?? 'skip'

  return {
    id,
    usedFallback: true,
    resolvedPath: strategy,
    fallbackReason: `File not found at ${absPath}, using fallback strategy "${strategy}"`,
  }
}
