import sharp from "sharp";
import designTokens from "../design/tokens/design-tokens-draft.json";

// --- Text layout constants ---

// Derive colors from design tokens to avoid hardcoding
const FILL_COLOR = designTokens.colors.semantic.light.surface; // white
const STROKE_COLOR = designTokens.colors.brand.deepNavy; // dark outline

const TEXT_CONFIG = {
  fontFamily: "Pretendard, Arial, sans-serif",
  fontWeight: "bold",
  fontSize: 96,
  fillColor: FILL_COLOR,
  strokeColor: STROKE_COLOR,
  strokeWidth: 5,
  x: 60,
  y: 120,
  lineHeight: 115,
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
  accentWord?: string,
  accentColor?: string,
): string {
  const {
    fontFamily,
    fontWeight,
    fontSize,
    fillColor,
    strokeColor,
    strokeWidth,
    x,
  } = TEXT_CONFIG;
  const baseAttrs = `font-family="${fontFamily}" font-weight="${fontWeight}" font-size="${fontSize}" stroke="${strokeColor}" stroke-width="${strokeWidth}" paint-order="stroke fill"`;

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
  const { y, lineHeight } = TEXT_CONFIG;
  const lines = wrapText(hookText, TEXT_CONFIG.maxCharsPerLine);

  const textElements = lines
    .map((line, i) =>
      renderLine(line, y + i * lineHeight, accentWord, accentColor),
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

// --- Main composite function ---

export async function compositeText(
  imageBuffer: Buffer,
  hookText: string,
  accentWord?: string,
  accentColor?: string,
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

  return sharp(imageBuffer)
    .composite([
      {
        input: textSvg,
        top: 0,
        left: 0,
      },
    ])
    .png()
    .toBuffer();
}
