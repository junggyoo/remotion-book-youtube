import React from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import type { BaseSceneProps, FrameworkContent } from '@/types'
import { useFormat } from '@/design/themes/useFormat'
import { sp } from '@/design/tokens/spacing'
import { SafeArea } from '@/components/layout/SafeArea'
import { ArchitecturalReveal } from '@/components/motion/ArchitecturalReveal'
import { ScaleReveal } from '@/components/motion/ScaleReveal'
import { TextBlock } from '@/components/primitives/TextBlock'
import { NumberBadge } from '@/components/primitives/NumberBadge'
import { ConnectorLine } from '@/components/primitives/ConnectorLine'
import { SubtitleLayer } from '@/components/hud/SubtitleLayer'

// zIndex layers from scene-catalog.json → framework
const LAYERS = {
  background: 0,
  texture: 5,
  frameworkLabel: 20,
  connectors: 25,
  items: 30,
  emphasis: 40,
  hud: 70,
} as const

interface FrameworkSceneProps extends BaseSceneProps {
  content: FrameworkContent
}

export const FrameworkScene: React.FC<FrameworkSceneProps> = ({
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
  const showDescriptions = !isShorts && content.showDescriptions !== false
  const showConnectors = content.showConnectors === true

  const columns = isShorts ? 1 : 2

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
      <div style={{ position: 'absolute', inset: 0, zIndex: LAYERS.frameworkLabel }}>
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
            {/* Framework label */}
            <div style={{ zIndex: LAYERS.frameworkLabel }}>
              <ArchitecturalReveal
                format={format}
                theme={theme}
                preset="smooth"
                delay={0}
              >
                <TextBlock
                  format={format}
                  theme={theme}
                  text={content.frameworkLabel}
                  variant="headlineS"
                  color={theme.signal}
                />
              </ArchitecturalReveal>
            </div>

            {/* Items grid */}
            <div
              style={{
                zIndex: LAYERS.items,
                display: 'grid',
                gridTemplateColumns: `repeat(${columns}, 1fr)`,
                gap: sp(5),
              }}
            >
              {content.items.map((item, index) => (
                <React.Fragment key={item.number}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: sp(3) }}>
                    <ScaleReveal
                      format={format}
                      theme={theme}
                      preset="smooth"
                      delay={index * 6}
                      scaleFrom={0.95}
                    >
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'flex-start',
                          gap: sp(4),
                        }}
                      >
                        {/* Number badge */}
                        <div style={{ flexShrink: 0, paddingTop: 2 }}>
                          <NumberBadge
                            format={format}
                            theme={theme}
                            number={item.number}
                            variant="accent"
                          />
                        </div>

                        {/* Title + description */}
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: sp(2),
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

                          {showDescriptions && item.description && (
                            <TextBlock
                              format={format}
                              theme={theme}
                              text={item.description}
                              variant="bodyS"
                              color={theme.textMuted}
                              maxLines={3}
                            />
                          )}
                        </div>
                      </div>
                    </ScaleReveal>
                  </div>

                  {/* Horizontal connector between items (same row, not last in row) */}
                  {showConnectors &&
                    !isShorts &&
                    columns === 2 &&
                    index % 2 === 0 &&
                    index + 1 < content.items.length && (
                      <div
                        style={{
                          position: 'absolute',
                          zIndex: LAYERS.connectors,
                          display: 'none',
                        }}
                      />
                    )}
                </React.Fragment>
              ))}
            </div>

            {/* Horizontal dotted connectors between grid rows */}
            {showConnectors && (
              <div
                style={{
                  zIndex: LAYERS.connectors,
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: sp(4),
                }}
              >
                {Array.from({ length: Math.max(0, content.items.length - 1) }).map((_, i) => (
                  <ConnectorLine
                    key={i}
                    format={format}
                    theme={theme}
                    orientation="horizontal"
                    length={sp(6)}
                    dotted
                  />
                ))}
              </div>
            )}
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

export default FrameworkScene
