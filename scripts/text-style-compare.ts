import sharp from "sharp";

const WIDTH = 1280;
const HEIGHT = 720;
const line1 = "1%의 변화가";
const line2 = "인생을 바꾼다";
const accent = "#10B981";

async function createVariant(name: string, svgContent: string) {
  const bg = await sharp({
    create: {
      width: WIDTH,
      height: HEIGHT,
      channels: 4,
      background: { r: 25, g: 30, b: 50, alpha: 255 },
    },
  })
    .png()
    .toBuffer();

  const svg = Buffer.from(
    `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">${svgContent}</svg>`,
  );

  const outPath = `output/text-style-${name}.png`;
  await sharp(bg)
    .composite([{ input: svg, top: 0, left: 0 }])
    .png()
    .toFile(outPath);
  console.log(`Created: ${outPath}`);
}

async function main() {
  // A: Current (thick stroke + shadow layer)
  await createVariant(
    "A-thick-stroke",
    `
    <text x="64" y="134" font-family="Arial, sans-serif" font-weight="900" font-size="96"
      fill="#0D1117" stroke="#0D1117" stroke-width="12" paint-order="stroke fill" opacity="0.5">${line1}</text>
    <text x="64" y="249" font-family="Arial, sans-serif" font-weight="900" font-size="96"
      fill="#0D1117" stroke="#0D1117" stroke-width="12" paint-order="stroke fill" opacity="0.5">${line2}</text>
    <text x="60" y="130" font-family="Arial, sans-serif" font-weight="900" font-size="96"
      fill="${accent}" stroke="#0D1117" stroke-width="10" paint-order="stroke fill">${line1}</text>
    <text x="60" y="245" font-family="Arial, sans-serif" font-weight="900" font-size="96"
      fill="white" stroke="#0D1117" stroke-width="10" paint-order="stroke fill">${line2}</text>
  `,
  );

  // B: Thin stroke + drop shadow
  await createVariant(
    "B-thin-shadow",
    `
    <defs>
      <filter id="sh1" x="-5%" y="-5%" width="110%" height="120%">
        <feDropShadow dx="3" dy="3" stdDeviation="5" flood-color="#000" flood-opacity="0.7"/>
      </filter>
    </defs>
    <text x="60" y="130" font-family="Arial, sans-serif" font-weight="900" font-size="96"
      fill="${accent}" stroke="#0D1117" stroke-width="3" paint-order="stroke fill" filter="url(#sh1)">${line1}</text>
    <text x="60" y="245" font-family="Arial, sans-serif" font-weight="900" font-size="96"
      fill="white" stroke="#0D1117" stroke-width="3" paint-order="stroke fill" filter="url(#sh1)">${line2}</text>
  `,
  );

  // C: No stroke, soft glow shadow only
  await createVariant(
    "C-glow-only",
    `
    <defs>
      <filter id="sh2" x="-10%" y="-10%" width="120%" height="130%">
        <feDropShadow dx="0" dy="0" stdDeviation="8" flood-color="#000" flood-opacity="0.9"/>
      </filter>
    </defs>
    <text x="60" y="130" font-family="Arial, sans-serif" font-weight="900" font-size="96"
      fill="${accent}" filter="url(#sh2)">${line1}</text>
    <text x="60" y="245" font-family="Arial, sans-serif" font-weight="900" font-size="96"
      fill="white" filter="url(#sh2)">${line2}</text>
  `,
  );
}

main().catch(console.error);
