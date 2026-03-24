import React from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import type { BaseSceneProps, CompareContrastContent } from '@/types'
import { useFormat } from '@/design/themes/useFormat'
import { sp } from '@/design/tokens/spacing'
import { typography } from '@/design/tokens/typography'
import { SafeArea } from '@/components/layout/SafeArea'
import { SlideReveal } from '@/components/motion/SlideReveal'
import { TextBlock } from '@/components/primitives/TextBlock'
import { LabelChip } from '@/components/primitives/LabelChip'
import { DividerLine } from '@/components/primitives/DividerLine'
import { SubtitleLayer } from '@/components/hud/SubtitleLayer'

// zIndex layers from scene-catalog.json → compareContrast
const LAYERS = {
  background: 0,
  texture: 5,
  leftPanel: 20,
  rightPanel: 20,
  divider: 30,
  labels: 35,
  emphasis: 40,
  hud: 70,
} as const

interface CompareContrastSceneProps extends BaseSceneProps {
  content: CompareContrastContent
}

export const CompareContrastScene: React.FC<CompareContrastSceneProps> = ({
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

  // Determine reveal delays based on revealOrder
  const revealOrder = content.revealOrder ?? 'simultaneous'
  const leftDelay = revealOrder === 'right-first' ? 12 : 0
  const rightDelay = revealOrder === 'left-first' ? 12 : 0

  // Tag label variant mapping
  const leftTagVariant = ((): 'default' | 'accent' | 'signal' => {
    if (!content.leftTag) return 'default'
    if (content.leftTag === 'wrong' || content.leftTag === 'myth' || content.leftTag === 'before') return 'accent'
    return 'default'
  })()

  const rightTagVariant = ((): 'default' | 'accent' | 'signal' => {
    if (!content.rightTag) return 'signal'
    if (content.rightTag === 'fact' || content.rightTag === 'right' || content.rightTag === 'after') return 'signal'
    return 'default'
  })()

  const leftPanel = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: sp(4),
        flex: 1,
        paddingRight: isShorts ? 0 : sp(5),
        paddingBottom: isShorts ? sp(4) : 0,
      }}
    >
      {/* Tag above label — optional */}
      {content.leftTag && (
        <div style={{ zIndex: LAYERS.labels }}>
          <LabelChip
            format={format}
            theme={theme}
            label={content.leftTag}
            variant={leftTagVariant}
          />
        </div>
      )}

      {/* Panel label */}
      <div style={{ zIndex: LAYERS.labels }}>
        <LabelChip
          format={format}
          theme={theme}
          label={content.leftLabel}
          variant="accent"
        />
      </div>

      {/* Panel content */}
      <TextBlock
        format={format}
        theme={theme}
        text={content.leftContent}
        variant="bodyL"
        maxLines={6}
      />
    </div>
  )

  const rightPanel = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: sp(4),
        flex: 1,
        paddingLeft: isShorts ? 0 : sp(5),
        paddingTop: isShorts ? sp(4) : 0,
      }}
    >
      {/* Tag above label — optional */}
      {content.rightTag && (
        <div style={{ zIndex: LAYERS.labels }}>
          <LabelChip
            format={format}
            theme={theme}
            label={content.rightTag}
            variant={rightTagVariant}
          />
        </div>
      )}

      {/* Panel label */}
      <div style={{ zIndex: LAYERS.labels }}>
        <LabelChip
          format={format}
          theme={theme}
          label={content.rightLabel}
          variant="signal"
        />
      </div>

      {/* Panel content */}
      <TextBlock
        format={format}
        theme={theme}
        text={content.rightContent}
        variant="bodyL"
        maxLines={6}
      />
    </div>
  )

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
      <div style={{ position: 'absolute', inset: 0, zIndex: LAYERS.leftPanel }}>
        <SafeArea format={format} theme={theme}>
          <div
            style={{
              display: 'flex',
              flexDirection: isShorts ? 'column' : 'row',
              alignItems: isShorts ? 'stretch' : 'center',
              justifyContent: 'center',
              height: '100%',
              position: 'relative',
            }}
          >
            {/* Left panel */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              <SlideReveal
                format={format}
                theme={theme}
                preset="smooth"
                delay={leftDelay}
                direction="left"
              >
                {leftPanel}
              </SlideReveal>
            </div>

            {/* Center divider */}
            <div
              style={{
                zIndex: LAYERS.divider,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                gap: sp(3),
              }}
            >
              <DividerLine
                format={format}
                theme={theme}
                orientation={isShorts ? 'horizontal' : 'vertical'}
              />
              {content.showConnector && !isShorts && (
                <div
                  style={{
                    position: 'absolute',
                    fontFamily: typography.fontFamily.sans,
                    fontSize: 14,
                    fontWeight: typography.fontWeight.bold,
                    color: theme.textMuted,
                    letterSpacing: typography.tracking.wide,
                    backgroundColor: theme.bg,
                    padding: `${sp(2)}px ${sp(3)}px`,
                  }}
                >
                  VS
                </div>
              )}
            </div>

            {/* Right panel */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              <SlideReveal
                format={format}
                theme={theme}
                preset="smooth"
                delay={rightDelay}
                direction="right"
              >
                {rightPanel}
              </SlideReveal>
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

export default CompareContrastScene
