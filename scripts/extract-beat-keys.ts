/**
 * Extract BeatElement keys from src/scenes/*.tsx by grepping getBeatState() calls.
 * Outputs .claude/skills/content-composer/BEAT_KEYS.md
 *
 * Usage: npx ts-node scripts/extract-beat-keys.ts
 */

import { readdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

const SCENES_DIR = path.resolve(__dirname, "../src/scenes");
const OUTPUT_PATH = path.resolve(
  __dirname,
  "../.claude/skills/content-composer/BEAT_KEYS.md",
);

interface SceneKeys {
  filename: string;
  sceneName: string;
  staticKeys: string[];
  dynamicPatterns: string[];
}

function extractKeys(): SceneKeys[] {
  const files = readdirSync(SCENES_DIR).filter(
    (f) => f.endsWith("Scene.tsx") || f.endsWith("Scene.ts"),
  );
  const results: SceneKeys[] = [];

  for (const file of files) {
    const content = readFileSync(path.join(SCENES_DIR, file), "utf-8");
    const sceneName = file.replace(/\.tsx?$/, "");

    const staticKeys: Set<string> = new Set();
    const dynamicPatterns: Set<string> = new Set();

    // Match getBeatState("staticKey")
    const staticRegex = /getBeatState\("([^"]+)"/g;
    let match;
    while ((match = staticRegex.exec(content)) !== null) {
      staticKeys.add(match[1]);
    }

    // Match getBeatState(`template-${var}`)
    const dynamicRegex = /getBeatState\(`([^`]+)`/g;
    while ((match = dynamicRegex.exec(content)) !== null) {
      dynamicPatterns.add(match[1]);
    }

    if (staticKeys.size > 0 || dynamicPatterns.size > 0) {
      results.push({
        filename: file,
        sceneName,
        staticKeys: [...staticKeys].sort(),
        dynamicPatterns: [...dynamicPatterns].sort(),
      });
    }
  }

  return results.sort((a, b) => a.sceneName.localeCompare(b.sceneName));
}

function generateMarkdown(scenes: SceneKeys[]): string {
  const lines: string[] = [
    "# BeatElement Keys by Scene Type",
    "",
    "beat.activates에 사용하는 키 목록. src/scenes/*.tsx의 getBeatState() 호출에서 추출.",
    "",
    "> 이 문서는 `scripts/extract-beat-keys.ts`로 자동 생성.",
    `> 마지막 생성: ${new Date().toISOString().split("T")[0]}`,
    "",
    "---",
    "",
  ];

  for (const scene of scenes) {
    lines.push(`## ${scene.sceneName} (${scene.filename})`);

    for (const key of scene.staticKeys) {
      lines.push(`- \`${key}\``);
    }

    for (const pattern of scene.dynamicPatterns) {
      lines.push(`- \`${pattern}\` (동적 패턴)`);
    }

    lines.push("");
  }

  // Dynamic patterns summary table
  const dynamicScenes = scenes.filter((s) => s.dynamicPatterns.length > 0);
  if (dynamicScenes.length > 0) {
    lines.push("---", "", "## 동적 키 패턴 요약", "");
    lines.push("| 씬 | 패턴 | 예시 |");
    lines.push("|-----|------|------|");
    for (const scene of dynamicScenes) {
      for (const p of scene.dynamicPatterns) {
        const example = p.replace(/\$\{[^}]+\}/, "0");
        lines.push(`| ${scene.sceneName} | \`${p}\` | ${example} |`);
      }
    }
    lines.push("");
  }

  lines.push("## 와일드카드", "");
  lines.push(
    "- `*` — 모든 요소 자동 stagger (content-authoring-rules.md 참조)",
  );
  lines.push("");

  return lines.join("\n");
}

const scenes = extractKeys();
const md = generateMarkdown(scenes);
writeFileSync(OUTPUT_PATH, md, "utf-8");

console.log(`Extracted beat keys from ${scenes.length} scene files.`);
console.log(`Output: ${OUTPUT_PATH}`);

for (const scene of scenes) {
  const total = scene.staticKeys.length + scene.dynamicPatterns.length;
  console.log(`  ${scene.sceneName}: ${total} keys`);
}
