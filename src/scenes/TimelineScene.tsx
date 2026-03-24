import React from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import type { BaseSceneProps, TimelineContent } from '@/types'
import { useFormat } from '@/design/themes/useFormat'
import { sp } from '@/design/tokens/spacing'
import { typography } from '@/design/tokens/typography'
import { SafeArea } from '@/components/layout/SafeArea'
import { ArchitecturalReveal } from '@/components/motion/ArchitecturalReveal'
import { ScaleReveal } from '@/components/motion/ScaleReveal'
import { TextBlock } from '@/components/primitives/TextBlock'
import { ConnectorLine } from '@/components/primitives/ConnectorLine'
import { ProgressDot } from '@/components/primitives/ProgressDot'
import { SubtitleLayer } from '@/components/hud/SubtitleLayer'

// Custom layers for TimelineScene
const LAYERS = {
  background: 0,
  texture: 5,
  timelineLine: 20,
  dots: 25,
  events: 30,
  hud: 70,
} as const

const MAX_EVENTS_SHORTS = 4

interface TimelineSceneProps extends BaseSceneProps {
  content: TimelineContent
}

export const TimelineScene: React.FC<TimelineSceneProps> = ({
  format,
  theme,
  from,
  durationFrames,
  tts,
  subtitles,
  content,
}) => {
  const frame = useCurrentFrame()
  const { typeScale } = useFormat(format)
  const isShorts = format === 'shorts'

  const showConnectors = content.showConnectors !== false
  const events = isShorts
    ? content.events.slice(0, MAX_EVENTS_SHORTS)
    : content.events

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
      <div style={{ position: 'absolute', inset: 0, zIndex: LAYERS.events }}>
        <SafeArea format={format} theme={theme}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              gap: sp(5),
            }}
          >
            {/* Timeline label */}
            <ArchitecturalReveal format={format} theme={theme} preset="smooth" delay={0}>
              <TextBlock
                format={format}
                theme={theme}
                text={content.timelineLabel}
                variant="headlineS"
                weight="semibold"
                color={theme.signal}
                maxLines={2}
              />
            </ArchitecturalReveal>

            {/* Events area */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'row',
                gap: sp(4),
                position: 'relative',
              }}
            >
              {/* Left: vertical connector line + dots */}
              {showConnectors && (
                <div
                  style={{
                    zIndex: LAYERS.timelineLine,
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    paddingTop: sp(1),
                    paddingBottom: sp(1),
                    flexShrink: 0,
                    width: sp(4),
                  }}
                >
                  {/* Vertical line behind dots */}
                  <div
                    style={{
                      position: 'absolute',
                      top: sp(1),
                      bottom: sp(1),
                      left: '50%',
                      transform: 'translateX(-50%)',
                    }}
                  >
                    <ConnectorLine
                      format={format}
                      theme={theme}
                      orientation="vertical"
                      length={1000}
                      color={theme.lineSubtle}
                      thickness={1}
                    />
                  </div>

                  {/* Dots per event — evenly distributed */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-around',
                      alignItems: 'center',
                      zIndex: LAYERS.dots,
                    }}
                  >
                    {events.map((_, i) => (
                      <ScaleReveal
                        key={i}
                        format={format}
                        theme={theme}
                        preset="snappy"
                        delay={Math.max(0, i * 9 - 3)}
                      >
                        <ProgressDot
                          format={format}
                          theme={theme}
                          active={true}
                          size={10}
                          color={theme.signal}
                        />
                      </ScaleReveal>
                    ))}
                  </div>
                </div>
              )}

              {/* Right: event cards */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-around',
                  gap: sp(5),
                }}
              >
                {events.map((event, i) => (
                  <ArchitecturalReveal
                    key={i}
                    format={format}
                    theme={theme}
                    preset="smooth"
                    delay={i * 9}
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: sp(1),
                      }}
                    >
                      {/* Year */}
                      <span
                        style={{
                          fontFamily: typography.fontFamily.mono,
                          fontSize: typeScale.label,
                          fontWeight: typography.fontWeight.semibold,
                          color: theme.signal,
                          lineHeight: typography.lineHeight.tight,
                          letterSpacing: typography.tracking.tight,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {event.year}
                      </span>

                      {/* Title */}
                      <TextBlock
                        format={format}
                        theme={theme}
                        text={event.title}
                        variant="bodyL"
                        weight="bold"
                        maxLines={2}
                      />

                      {/* Description — longform only */}
                      {!isShorts && event.description && (
                        <TextBlock
                          format={format}
                          theme={theme}
                          text={event.description}
                          variant="bodyS"
                          color={theme.textMuted}
                          maxLines={3}
                        />
                      )}
                    </div>
                  </ArchitecturalReveal>
                ))}
              </div>
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

export default TimelineScene
