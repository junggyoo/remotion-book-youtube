import React from 'react'
import { Composition } from 'remotion'
import { LongformComposition } from '@/compositions/LongformComposition'
import { buildCompositionProps } from '@/pipeline/buildProps'
import type { CompositionProps } from '@/pipeline/buildProps'
import testBook from '../content/books/test-book.json'
import type { BookContent } from '@/types'
import { loadProjectFonts } from '@/design/fonts/loadFonts'

loadProjectFonts()

const book = testBook as unknown as BookContent

// Build default props for preview (no TTS in preview mode)
const longformProps: CompositionProps = buildCompositionProps(book, 'longform')
const shortsProps: CompositionProps = buildCompositionProps(book, 'shorts')

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="LongformComposition"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={LongformComposition as any}
        durationInFrames={longformProps.totalDurationFrames}
        fps={longformProps.fps}
        width={longformProps.width}
        height={longformProps.height}
        defaultProps={longformProps as any}
      />
      <Composition
        id="ShortsPreview"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={LongformComposition as any}
        durationInFrames={shortsProps.totalDurationFrames}
        fps={shortsProps.fps}
        width={shortsProps.width}
        height={shortsProps.height}
        defaultProps={shortsProps as any}
      />
    </>
  )
}
