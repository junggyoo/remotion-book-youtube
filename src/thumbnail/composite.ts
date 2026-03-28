import sharp from "sharp";
import designTokens from "../design/tokens/design-tokens-draft.json";

// --- Text layout constants ---

// Derive colors from design tokens to avoid hardcoding
const FILL_COLOR = designTokens.colors.semantic.light.surface; // white
const STROKE_COLOR = designTokens.colors.brand.deepNavy; // dark outline

// All sizes are ratios relative to image width (base: 1280px)
const TEXT_RATIOS = {
  fontFamily: "Pretendard, Arial, sans-serif",
  fontWeight: "900",
  fontSize: 0.075, // 96/1280
  fillColor: FILL_COLOR,
  strokeColor: STROKE_COLOR,
  strokeWidth: 0.008, // 10.2/1280 — bolder outline
  x: 0.047, // 60/1280
  yStart: 0.167, // 120/720 (relative to height)
  lineHeight: 0.16, // 115/720 (relative to height)
  maxCharsPerLine: 12,
} as const;

// --- Text wrapping ---

export function wrapText(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) {
    return [text];
  }

  // Find the best split point near the middle
  const mid = Math.ceil(text.length / 2);

  // Look for a space near the middle to split on
  let splitAt = -1;
  for (let i = mid; i >= mid - 5 && i >= 0; i--) {
    if (text[i] === " ") {
      splitAt = i;
      break;
    }
  }
  if (splitAt === -1) {
    for (let i = mid + 1; i <= mid + 5 && i < text.length; i++) {
      if (text[i] === " ") {
        splitAt = i;
        break;
      }
    }
  }

  // If no space found, split at maxChars
  if (splitAt === -1) {
    splitAt = maxChars;
  }

  const line1 = text.slice(0, splitAt).trim();
  const line2 = text.slice(splitAt).trim();

  return [line1, line2];
}

// --- SVG text generation ---

function renderLine(
  line: string,
  ty: number,
  width: number,
  xOffset: number,
  accentWord?: string,
  accentColor?: string,
): string {
  const { fontFamily, fontWeight, fillColor, strokeColor } = TEXT_RATIOS;
  const fontSize = Math.round(width * TEXT_RATIOS.fontSize);
  const strokeW = Math.round(width * TEXT_RATIOS.strokeWidth);
  const x = Math.round(width * TEXT_RATIOS.x);

  if (xOffset > 0) {
    const shadowAttrs = `font-family="${fontFamily}" font-weight="${fontWeight}" font-size="${fontSize}" fill="${strokeColor}" stroke="${strokeColor}" stroke-width="${strokeW + 2}" paint-order="stroke fill" opacity="0.5"`;
    return `<text x="${x}" y="${ty}" ${shadowAttrs}>${escapeXml(line)}</text>`;
  }

  const baseAttrs = `font-family="${fontFamily}" font-weight="${fontWeight}" font-size="${fontSize}" stroke="${strokeColor}" stroke-width="${strokeW}" paint-order="stroke fill"`;

  if (!accentWord || !accentColor || !line.includes(accentWord)) {
    return `<text x="${x}" y="${ty}" ${baseAttrs} fill="${fillColor}">${escapeXml(line)}</text>`;
  }

  // Split line around accent word and use tspan for coloring
  const idx = line.indexOf(accentWord);
  const before = line.slice(0, idx);
  const after = line.slice(idx + accentWord.length);

  return `<text x="${x}" y="${ty}" ${baseAttrs} fill="${fillColor}">${escapeXml(before)}<tspan fill="${accentColor}">${escapeXml(accentWord)}</tspan>${escapeXml(after)}</text>`;
}

function createTextSvg(
  hookText: string,
  width: number,
  height: number,
  accentWord?: string,
  accentColor?: string,
): Buffer {
  const yStart = Math.round(height * TEXT_RATIOS.yStart);
  const lineHeight = Math.round(height * TEXT_RATIOS.lineHeight);
  const lines = wrapText(hookText, TEXT_RATIOS.maxCharsPerLine);
  const shadowOffset = Math.round(width * 0.003);

  const shadowElements = lines
    .map((line, i) =>
      renderLine(
        line,
        yStart + i * lineHeight + shadowOffset,
        width,
        shadowOffset,
      ),
    )
    .join("\n");

  const mainElements = lines
    .map((line, i) =>
      renderLine(
        line,
        yStart + i * lineHeight,
        width,
        0,
        accentWord,
        accentColor,
      ),
    )
    .join("\n");

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      ${shadowElements}
      ${mainElements}
    </svg>
  `;

  return Buffer.from(svg);
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// --- Book cover constants ---

const COVER_RATIOS = {
  heightRatio: 0.6,
  bottomMarginRatio: 0.055,
  leftMarginRatio: 0.047,
} as const;

// --- Main composite function ---

export async function compositeText(
  imageBuffer: Buffer,
  hookText: string,
  accentWord?: string,
  accentColor?: string,
  coverBuffer?: Buffer | null,
): Promise<Buffer> {
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  const width = metadata.width ?? 1280;
  const height = metadata.height ?? 720;

  const textSvg = createTextSvg(
    hookText,
    width,
    height,
    accentWord,
    accentColor,
  );

  const layers: sharp.OverlayOptions[] = [
    {
      input: textSvg,
      top: 0,
      left: 0,
    },
  ];

  // Add book cover if available
  if (coverBuffer) {
    const coverHeight = Math.round(height * COVER_RATIOS.heightRatio);
    const resizedCover = await sharp(coverBuffer)
      .resize({ height: coverHeight })
      .png()
      .toBuffer();
    const bottomMargin = Math.round(height * COVER_RATIOS.bottomMarginRatio);
    const leftMargin = Math.round(width * COVER_RATIOS.leftMarginRatio);
    layers.push({
      input: resizedCover,
      top: height - coverHeight - bottomMargin,
      left: leftMargin,
    });
  }

  return sharp(imageBuffer).composite(layers).png().toBuffer();
}
