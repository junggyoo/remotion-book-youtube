import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { AbsoluteFill, useCurrentFrame, useVideoConfig, staticFile, useDelayRender } from 'remotion'
import { createTikTokStyleCaptions } from '@remotion/captions'
import type { Caption } from '@remotion/captions'
import type { FormatKey, Theme } from '@/types'
import { typography } from '@/design/tokens/typography'
import { sp } from '@/design/tokens/spacing'
import { useFormat } from '@/design/themes/useFormat'

const SWITCH_CAPTIONS_EVERY_MS = 2400

interface CaptionLayerProps {
  format: FormatKey
  theme: Theme
  captionsFile: string
  sceneStartFrame: number
}

export const CaptionLayer: React.FC<CaptionLayerProps> = ({
  format,
  theme,
  captionsFile,
  sceneStartFrame,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const { typeScale } = useFormat(format)
  const isShorts = format === 'shorts'

  const [captions, setCaptions] = useState<Caption[] | null>(null)
  const { delayRender, continueRender, cancelRender } = useDelayRender()
  const [handle] = useState(() => delayRender())

  const fetchCaptions = useCallback(async () => {
    try {
      const response = await fetch(staticFile(captionsFile))
      const data = await response.json()
      setCaptions(data)
      continueRender(handle)
    } catch (e) {
      // Fallback: no captions, don't block render
      console.warn(`[CaptionLayer] Failed to load ${captionsFile}`)
      setCaptions([])
      continueRender(handle)
    }
  }, [captionsFile, continueRender, handle])

  useEffect(() => {
    fetchCaptions()
  }, [fetchCaptions])

  const { pages } = useMemo(() => {
    if (!captions || captions.length === 0) {
      return { pages: [] }
    }
    return createTikTokStyleCaptions({
      captions,
      combineTokensWithinMilliseconds: SWITCH_CAPTIONS_EVERY_MS,
    })
  }, [captions])

  if (!captions || pages.length === 0) {
    return null
  }

  // Current time in ms (local frame within this scene)
  const currentTimeMs = (frame / fps) * 1000

  // Find active page
  const activePage = pages.find((page, i) => {
    const nextPage = pages[i + 1]
    const pageEnd = nextPage ? nextPage.startMs : page.startMs + SWITCH_CAPTIONS_EVERY_MS
    return currentTimeMs >= page.startMs && currentTimeMs < pageEnd
  })

  if (!activePage) return null

  const absoluteTimeMs = activePage.startMs + (currentTimeMs - activePage.startMs)

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: isShorts ? sp(10) : sp(8),
      }}
    >
      <div
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          borderRadius: sp(2),
          paddingLeft: sp(4),
          paddingRight: sp(4),
          paddingTop: sp(2),
          paddingBottom: sp(2),
          maxWidth: isShorts ? '85%' : '70%',
          textAlign: 'center',
        }}
      >
        <span
          style={{
            fontFamily: typography.fontFamily.sans,
            fontSize: isShorts ? typeScale.bodyM : typeScale.bodyL,
            fontWeight: typography.fontWeight.medium,
            lineHeight: typography.lineHeight.normal,
            letterSpacing: typography.tracking.normal,
            whiteSpace: 'pre',
          }}
        >
          {activePage.tokens.map((token, ti) => {
            const isActive =
              token.fromMs <= absoluteTimeMs && token.toMs > absoluteTimeMs

            return (
              <span
                key={`${token.fromMs}-${ti}`}
                style={{
                  color: isActive ? theme.signal : theme.textStrong,
                  fontWeight: isActive
                    ? typography.fontWeight.bold
                    : typography.fontWeight.medium,
                  transition: 'none',
                }}
              >
                {token.text}
              </span>
            )
          })}
        </span>
      </div>
    </AbsoluteFill>
  )
}

export default CaptionLayer
