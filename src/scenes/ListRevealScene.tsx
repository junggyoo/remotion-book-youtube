import React from 'react'
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion'
import type { BaseSceneProps, ListRevealContent } from '@/types'
import { useFormat } from '@/design/themes/useFormat'
import { sp } from '@/design/tokens/spacing'
import { SafeArea } from '@/components/layout/SafeArea'
import { ArchitecturalReveal } from '@/components/motion/ArchitecturalReveal'
import { TextBlock } from '@/components/primitives/TextBlock'
import { LabelChip } from '@/components/primitives/LabelChip'
import { NumberBadge } from '@/components/primitives/NumberBadge'
import { SubtitleLayer } from '@/components/hud/SubtitleLayer'

// zIndex layers
const LAYERS = {
  background: 0,
  texture: 5,
  listLabel: 20,
  items: 30,
  emphasis: 40,
  hud: 70,
} as const

const MAX_ITEMS_LONGFORM = 7
const MAX_ITEMS_SHORTS = 5

interface ListRevealSceneProps extends BaseSceneProps {
  content: ListRevealContent
}

export const ListRevealScene: React.FC<ListRevealSceneProps> = ({
  format,
  theme,
  from,
  durationFrames,
  tts,
  subtitles,
  content,
}) => {
  const frame = useCurrentFrame()
  const isShorts = format === 'shorts'
  const revealStyle = content.revealStyle ?? 'stagger'
  const showNumbers = content.showNumbers ?? false

  const maxItems = isShorts ? MAX_ITEMS_SHORTS : MAX_ITEMS_LONGFORM
  const visibleItems = content.items.slice(0, maxItems)

  // Stagger delay per item
  const staggerDelay = revealStyle === 'cascade' ? 4 : 6

  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg }}>
      {/* Background layer */}
      <AbsoluteFill
        style={{
          zIndex: LAYERS.background,
          backgroundColor: theme.bg,
        }}
      />

      {/* Texture layer */}
      <AbsoluteFill
        style={{
          zIndex: LAYERS.texture,
          backgroundColor: theme.surfaceMuted,
          opacity: 0.04,
        }}
      />

      {/* Main content */}
      <div style={{ position: 'absolute', inset: 0, zIndex: LAYERS.listLabel }}>
        <SafeArea format={format} theme={theme}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              height: '100%',
              gap: sp(5),
            }}
          >
            {/* List label */}
            <div style={{ zIndex: LAYERS.listLabel }}>
              <ArchitecturalReveal
                format={format}
                theme={theme}
                preset="smooth"
                delay={0}
              >
                <LabelChip
                  format={format}
                  theme={theme}
                  label={content.listLabel}
                  variant="signal"
                />
              </ArchitecturalReveal>
            </div>

            {/* Items list */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: sp(4),
                zIndex: LAYERS.items,
              }}
            >
              {visibleItems.map((item, index) => {
                const itemDelay = index * staggerDelay

                // Cascade: items before current focus get reduced opacity
                const itemOpacity = (() => {
                  if (revealStyle !== 'cascade') return 1
                  // Current "focus" index based on frame progression
                  const focusProgress = interpolate(
                    frame,
                    [0, durationFrames],
                    [0, visibleItems.length - 1],
                    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
                  )
                  const distanceFromFocus = index - focusProgress
                  if (distanceFromFocus < -0.5) return 0.5
                  return 1
                })()

                return (
                  <div
                    key={item.title + index}
                    style={{ opacity: itemOpacity }}
                  >
                    <ArchitecturalReveal
                      format={format}
                      theme={theme}
                      preset="smooth"
                      delay={itemDelay}
                      translateY={revealStyle === 'cascade' ? 24 : undefined}
                    >
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: sp(3),
                        }}
                      >
                        {/* Number badge */}
                        {showNumbers && (
                          <NumberBadge
                            format={format}
                            theme={theme}
                            number={index + 1}
                            variant="signal"
                          />
                        )}

                        {/* Title + subtitle column */}
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: sp(1),
                            flex: 1,
                          }}
                        >
                          <TextBlock
                            format={format}
                            theme={theme}
                            text={item.title}
                            variant="bodyL"
                            weight="bold"
                          />

                          {/* Subtitle — longform only */}
                          {!isShorts && item.subtitle && (
                            <TextBlock
                              format={format}
                              theme={theme}
                              text={item.subtitle}
                              variant="bodyS"
                              color={theme.textMuted}
                            />
                          )}
                        </div>
                      </div>
                    </ArchitecturalReveal>
                  </div>
                )
              })}
            </div>
          </div>
        </SafeArea>
      </div>

      {/* HUD: Subtitles */}
      {subtitles && subtitles.length > 0 && (
        <div style={{ position: 'absolute', inset: 0, zIndex: LAYERS.hud }}>
          <SubtitleLayer
            format={format}
            theme={theme}
            subtitles={subtitles}
            currentFrame={frame}
          />
        </div>
      )}
    </AbsoluteFill>
  )
}

export default ListRevealScene
