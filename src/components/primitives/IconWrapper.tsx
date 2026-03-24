import React, { useState } from 'react'
import { staticFile } from 'remotion'
import type { FormatKey, Theme } from '@/types'

interface IconWrapperProps {
  format: FormatKey
  theme: Theme
  src: string
  size?: number
  alt?: string
}

export const IconWrapper: React.FC<IconWrapperProps> = ({
  src,
  size = 24,
  alt = '',
}) => {
  const [hasError, setHasError] = useState(false)

  return (
    <img
      src={staticFile(src)}
      alt={alt}
      onError={() => setHasError(true)}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        display: 'block',
        flexShrink: 0,
        visibility: hasError ? 'hidden' : 'visible',
      }}
    />
  )
}

export default IconWrapper
