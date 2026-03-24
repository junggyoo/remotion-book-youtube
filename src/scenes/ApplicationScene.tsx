import React from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import type { BaseSceneProps, ApplicationContent } from '@/types'
import { sp } from '@/design/tokens/spacing'
import { SafeArea } from '@/components/layout/SafeArea'
import { ArchitecturalReveal } from '@/components/motion/ArchitecturalReveal'
import { TextBlock } from '@/components/primitives/TextBlock'
import { ProgressDot } from '@/components/primitives/ProgressDot'
import { ConnectorLine } from '@/components/primitives/ConnectorLine'
import { SubtitleLayer } from '@/components/hud/SubtitleLayer'

// zIndex layers from scene-catalog.json → application
const LAYERS = {
  background: 0,
  texture: 5,
  anchorStatement: 20,
  paths: 25,
  steps: 30,
  emphasis: 40,
  hud: 70,
} as const

interface ApplicationSceneProps extends BaseSceneProps {
  content: ApplicationContent
}

export const ApplicationScene: React.FC<ApplicationSceneProps> = ({
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
  const showDetail = !isShorts
  const showPaths = content.showPaths === true

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
      <div style={{ position: 'absolute', inset: 0, zIndex: LAYERS.anchorStatement }}>
        <SafeArea format={format} theme={theme}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              height: '100%',
              gap: sp(6),
            }}
          >
            {/* Anchor statement */}
            <div style={{ zIndex: LAYERS.anchorStatement }}>
              <ArchitecturalReveal
                format={format}
                theme={theme}
                preset="smooth"
                delay={0}
              >
                <TextBlock
                  format={format}
                  theme={theme}
                  text={content.anchorStatement}
                  variant="headlineM"
                  weight="bold"
                  maxLines={3}
                />
              </ArchitecturalReveal>
            </div>

            {/* Vertical step flow */}
            <div
              style={{
                zIndex: LAYERS.steps,
                display: 'flex',
                flexDirection: 'column',
                gap: sp(5),
              }}
            >
              {content.steps.map((step, index) => (
                <React.Fragment key={index}>
                  <ArchitecturalReveal
                    format={format}
                    theme={theme}
                    preset="smooth"
                    delay={index * 9}
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        gap: sp(4),
                      }}
                    >
                      {/* ProgressDot + optional path connector column */}
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          flexShrink: 0,
                          gap: 0,
                        }}
                      >
                        <ProgressDot
                          format={format}
                          theme={theme}
                          active
                          size={12}
                        />
                        {showPaths && index < content.steps.length - 1 && (
                          <div
                            style={{
                              zIndex: LAYERS.paths,
                              marginTop: sp(2),
                            }}
                          >
                            <ConnectorLine
                              format={format}
                              theme={theme}
                              orientation="vertical"
                              length={sp(6)}
                            />
                          </div>
                        )}
                      </div>

                      {/* Step text */}
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
                          text={step.title}
                          variant="bodyL"
                          weight="bold"
                        />

                        {showDetail && step.detail && (
                          <TextBlock
                            format={format}
                            theme={theme}
                            text={step.detail}
                            variant="bodyS"
                            color={theme.textMuted}
                            maxLines={3}
                          />
                        )}
                      </div>
                    </div>
                  </ArchitecturalReveal>
                </React.Fragment>
              ))}
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

export default ApplicationScene
