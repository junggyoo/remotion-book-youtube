---
name: thumbnail
description: YouTube 썸네일 이미지를 생성한다. Gemini AI 비주얼 + Sharp 한글 텍스트 합성.
triggers:
  - 썸네일
  - thumbnail
  - 썸네일 만들어
  - 썸네일 생성
  - 유튜브 썸네일
---

# Thumbnail Skill

YouTube 썸네일을 생성한다. Gemini로 인물+배경 비주얼을 생성하고, Sharp로 한글 텍스트를 합성한다.

## 사용법

사용자가 책 이름이나 bookId를 언급하며 썸네일을 요청하면 실행한다.

**예시:**

- "atomic-habits 썸네일 만들어줘"
- "부자 아빠 가난한 아빠 썸네일 생성해줘"
- `/thumbnail atomic-habits`
- `/thumbnail rich-dad-poor-dad`

## 실행 절차

### 1. bookId 확인

사용자가 제공한 이름에서 bookId를 확인한다.

```bash
ls content/books/
```

bookId를 파일명에서 추출한다 (예: `atomic-habits.json` → `atomic-habits`).

한국어 책 이름이 주어진 경우 content/books/ 디렉토리에서 매칭되는 파일을 찾는다.

### 2. thumbnail 필드 확인

해당 book JSON에 `thumbnail` 필드가 있는지 확인한다.

없으면:

- `src/thumbnail/auto-config.ts`의 `generateThumbnailConfig()` 매핑을 참고하여
  thumbnail 필드를 생성해서 book JSON에 추가한다.
- 또는 사용자에게 hookText, expression, gesture를 물어본다.

### 3. 썸네일 생성 실행

```bash
npm run thumbnail content/books/{bookId}.json
```

### 4. 결과 확인

생성된 이미지를 사용자에게 보여준다:

```bash
ls output/thumbnails/{bookId}/
```

최신 PNG 파일을 Read 도구로 읽어서 보여준다.

### 5. 재생성

마음에 들지 않으면 다시 실행한다. 파일명이 자동으로 -002, -003으로 증가한다.

## 필수 조건

- `GOOGLE_AI_API_KEY`가 `.env`에 설정되어 있어야 한다
- `assets/face/`에 얼굴 참조 사진이 있어야 한다 (3~5장)
- book JSON에 `thumbnail` 필드가 있어야 한다 (없으면 자동 생성)

## Key Files

- `src/thumbnail/generate.ts` — Gemini API 호출 + 합성 파이프라인
- `src/thumbnail/composite.ts` — Sharp SVG 텍스트 + 책표지 합성
- `src/thumbnail/prompt-builder.ts` — Gemini 프롬프트 조립
- `src/thumbnail/auto-config.ts` — BookFingerprint → ThumbnailConfig 자동 매핑
- `src/thumbnail/types.ts` — ThumbnailConfig 타입
- `scripts/generate-thumbnail.ts` — CLI 진입점
