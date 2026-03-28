import sharp from "sharp";
import fs from "fs";
import path from "path";
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
  strokeWidth: 0.005, // 6.4/1280 — thicker outline
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
  accentWord?: string,
  accentColor?: string,
): string {
  const { fontFamily, fontWeight, fillColor, strokeColor } = TEXT_RATIOS;
  const fontSize = Math.round(width * TEXT_RATIOS.fontSize);
  const strokeW = Math.round(width * TEXT_RATIOS.strokeWidth);
  const x = Math.round(width * TEXT_RATIOS.x);
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

  const textElements = lines
    .map((line, i) =>
      renderLine(line, yStart + i * lineHeight, width, accentWord, accentColor),
    )
    .join("\n");

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      ${textElements}
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
  heightRatio: 0.42, // 300/720 — 더 크게
  bottomMarginRatio: 0.055, // 40/720
  leftMarginRatio: 0.047, // 60/1280
  borderRadius: 6,
  shadowOffset: 4,
} as const;

// --- Main composite function ---

const SHADOW_COLOR = designTokens.colors.brand.deepNavy;
const BORDER_COLOR = "rgba(255,255,255,0.15)";

async function prepareBookCover(
  coverPath: string,
  targetHeight: number,
): Promise<Buffer | null> {
  if (!fs.existsSync(coverPath)) {
    console.warn(`Book cover not found: ${coverPath} — skipping cover overlay`);
    return null;
  }

  const resized = await sharp(coverPath)
    .resize({ height: targetHeight })
    .png()
    .toBuffer();

  const coverMeta = await sharp(resized).metadata();
  const cw = coverMeta.width ?? Math.round(targetHeight * 0.7);
  const ch = coverMeta.height ?? targetHeight;

  const pad = 12;
  const totalW = cw + pad * 2;
  const totalH = ch + pad * 2;

  const shadowSvg = Buffer.from(`
    <svg width="${totalW}" height="${totalH}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="4" dy="4" stdDeviation="6" flood-color="${SHADOW_COLOR}" flood-opacity="0.6"/>
        </filter>
      </defs>
      <rect x="${pad}" y="${pad}" width="${cw}" height="${ch}" rx="4" ry="4"
        fill="none" stroke="${BORDER_COLOR}" stroke-width="1" filter="url(#shadow)"/>
    </svg>
  `);

  return sharp({
    create: {
      width: totalW,
      height: totalH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: shadowSvg, top: 0, left: 0 },
      { input: resized, top: pad, left: pad },
    ])
    .png()
    .toBuffer();
}

export async function compositeText(
  imageBuffer: Buffer,
  hookText: string,
  accentWord?: string,
  accentColor?: string,
  coverImagePath?: string,
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
  if (coverImagePath) {
    const coverHeight = Math.round(height * COVER_RATIOS.heightRatio);
    const coverBuffer = await prepareBookCover(coverImagePath, coverHeight);
    if (coverBuffer) {
      const bottomMargin = Math.round(height * COVER_RATIOS.bottomMarginRatio);
      const leftMargin = Math.round(width * COVER_RATIOS.leftMarginRatio);
      layers.push({
        input: coverBuffer,
        top: height - coverHeight - bottomMargin,
        left: leftMargin,
      });
    }
  }

  return sharp(imageBuffer).composite(layers).png().toBuffer();
}
