import type {
  BookFingerprint,
  VideoNarrativePlan,
  ScenePlan,
  PresetMatch,
  SceneGap,
  PlanningPolicy,
} from '@/types'

// ---------------------------------------------------------------------------
// Gap Check Result
// ---------------------------------------------------------------------------

interface GapCheckResult {
  triggered: boolean
  reason: string
  capabilities: string[]
  priority: 'must' | 'nice'
}

// ---------------------------------------------------------------------------
// 5 Gap Detection Questions (DSGS Spec 6-2)
// ---------------------------------------------------------------------------

/** Q1: Can the book's core framework be expressed by grid-expand? */
function checkFrameworkExpressibility(
  match: PresetMatch,
  fp: BookFingerprint,
  threshold: number,
): GapCheckResult {
  if (
    fp.structure === 'framework'
    && fp.coreFramework
    && fp.spatialMetaphors.some((m) => ['순환', '방사', '층위'].includes(m))
    && match.confidence < threshold
  ) {
    const metaphor = fp.spatialMetaphors.find((m) => ['순환', '방사', '층위'].includes(m))!
    const capMap: Record<string, string> = { '순환': 'cyclic-flow', '방사': 'radial-layout', '층위': 'layered-stack' }
    return {
      triggered: true,
      reason: `Q1: ${fp.coreFramework}의 ${metaphor} 구조를 기존 grid-expand로 표현 불가`,
      capabilities: [capMap[metaphor] ?? 'custom-layout'],
      priority: 'must',
    }
  }
  return { triggered: false, reason: '', capabilities: [], priority: 'nice' }
}

/** Q2: Can the book's core metaphor be visualized by existing scenes? */
function checkMetaphorVisualization(
  match: PresetMatch,
  fp: BookFingerprint,
  threshold: number,
): GapCheckResult {
  const unmappableMotifs = fp.visualMotifs.filter((motif) =>
    ['wheel', 'spiral', 'orbit', 'web', 'rhizome'].includes(motif),
  )
  if (unmappableMotifs.length > 0 && match.confidence < threshold) {
    return {
      triggered: true,
      reason: `Q2: 시각적 모티프 [${unmappableMotifs.join(', ')}]를 기존 레이아웃으로 시각화 불가`,
      capabilities: unmappableMotifs.map((m) => `motif-${m}`),
      priority: 'must',
    }
  }
  return { triggered: false, reason: '', capabilities: [], priority: 'nice' }
}

/** Q3: Can the temporal flow/process be expressed by existing scenes? */
function checkTemporalFlow(
  match: PresetMatch,
  fp: BookFingerprint,
  _threshold: number,
): GapCheckResult {
  const temporalKeywords = ['타임라인', '순서', '과정', '흐름', '단계별']
  const temporalElements = fp.uniqueElements.filter((el) =>
    temporalKeywords.some((kw) => el.includes(kw)),
  )

  // Q3 triggers when temporal elements exist and the current slot is in core/resolution
  // (where temporal content is most likely needed) — regardless of confidence,
  // because no existing preset can adequately express timeline/process flows.
  if (
    temporalElements.length > 0
    && (match.segment === 'core' || match.segment === 'resolution')
    && match.sceneType !== 'application'
  ) {
    return {
      triggered: true,
      reason: `Q3: 시간적 흐름 [${temporalElements[0]}]을 기존 씬으로 표현 불가`,
      capabilities: ['timeline-h', 'timeline-v'],
      priority: 'nice',
    }
  }
  return { triggered: false, reason: '', capabilities: [], priority: 'nice' }
}

/** Q4: Can the before/after transformation be shown by split-compare? */
function checkTransformationExpressibility(
  match: PresetMatch,
  fp: BookFingerprint,
  threshold: number,
): GapCheckResult {
  const hasTransformationElements = fp.uniqueElements.some((el) =>
    ['비교', '전후', 'before/after', '전/후'].some((kw) => el.includes(kw)),
  )

  if (
    fp.narrativeArcType === 'transformation'
    && hasTransformationElements
    && match.sceneType !== 'compareContrast'
    && match.confidence < threshold
  ) {
    return {
      triggered: true,
      reason: `Q4: 변화 전/후 비교를 기존 split-compare로 충분히 표현 불가`,
      capabilities: ['before-after-pair', 'split-reveal'],
      priority: 'nice',
    }
  }
  return { triggered: false, reason: '', capabilities: [], priority: 'nice' }
}

/** Q5: Can the emotional climax be adequately held by existing scenes? */
function checkEmotionalClimax(
  match: PresetMatch,
  fp: BookFingerprint,
  _narrativePlan: VideoNarrativePlan,
  threshold: number,
): GapCheckResult {
  const highIntensityTones = ['intense', 'urgent', 'provocative']
  const hasHighIntensity = fp.emotionalTone.some((t) => highIntensityTones.includes(t))

  if (
    match.segment === 'climax'
    && match.confidence < threshold
    && hasHighIntensity
  ) {
    return {
      triggered: true,
      reason: `Q5: 감정적 클라이맥스를 기존 씬이 담기 어려움 (tone: ${fp.emotionalTone.join(', ')})`,
      capabilities: ['emphasis-composition', 'dramatic-choreography'],
      priority: 'nice',
    }
  }
  return { triggered: false, reason: '', capabilities: [], priority: 'nice' }
}

// ---------------------------------------------------------------------------
// detectGaps — Public API (Stage 5) — immutable
// ---------------------------------------------------------------------------

export function detectGaps(
  scenePlan: ScenePlan,
  fingerprint: BookFingerprint,
  narrativePlan: VideoNarrativePlan,
): ScenePlan {
  const threshold = scenePlan.policy.presetConfidenceThreshold
  const presetMatches: PresetMatch[] = []
  const gaps: SceneGap[] = []

  // Track which global questions have already fired (Q1-Q5 each fire at most once)
  const firedQuestions = new Set<string>()

  for (const match of scenePlan.presetMatches) {
    // Run all 5 gap checks
    const checks = [
      { id: 'Q1', result: checkFrameworkExpressibility(match, fingerprint, threshold) },
      { id: 'Q2', result: checkMetaphorVisualization(match, fingerprint, threshold) },
      { id: 'Q3', result: checkTemporalFlow(match, fingerprint, threshold) },
      { id: 'Q4', result: checkTransformationExpressibility(match, fingerprint, threshold) },
      { id: 'Q5', result: checkEmotionalClimax(match, fingerprint, narrativePlan, threshold) },
    ]

    // Find first triggered check that hasn't already fired globally
    const triggered = checks.find((c) => c.result.triggered && !firedQuestions.has(c.id))

    if (triggered) {
      firedQuestions.add(triggered.id)
      gaps.push({
        segment: match.segment,
        slotIndex: match.slotIndex,
        bestPresetMatch: match,
        gapReason: triggered.result.reason,
        requiredCapabilities: triggered.result.capabilities,
        priority: triggered.result.priority,
        intent: match.scoreBreakdown.explanation,
      })
    } else if (match.confidence < threshold) {
      // Low confidence but no specific gap question triggered — still a gap
      gaps.push({
        segment: match.segment,
        slotIndex: match.slotIndex,
        bestPresetMatch: match,
        gapReason: `confidence ${match.confidence.toFixed(3)} < threshold ${threshold}`,
        requiredCapabilities: ['custom-composition'],
        priority: 'nice',
        intent: match.scoreBreakdown.explanation,
      })
    } else {
      presetMatches.push(match)
    }
  }

  // Policy enforcement
  const enforced = enforcePolicy(presetMatches, gaps, scenePlan.policy)

  return {
    presetMatches: enforced.presetMatches,
    gaps: enforced.gaps,
    policy: scenePlan.policy,
    totalSlots: scenePlan.totalSlots,
  }
}

// ---------------------------------------------------------------------------
// Policy Enforcement
// ---------------------------------------------------------------------------

function enforcePolicy(
  presetMatches: PresetMatch[],
  gaps: SceneGap[],
  policy: PlanningPolicy,
): { presetMatches: PresetMatch[]; gaps: SceneGap[] } {
  const sortedPresets = [...presetMatches].sort((a, b) => a.confidence - b.confidence)
  const resultPresets = [...sortedPresets]
  const resultGaps = [...gaps]

  // 1. minSignatureScenes: force lowest-confidence presets into gaps
  // Opening scenes do NOT count toward minSignatureScenes
  while (resultGaps.length < policy.minSignatureScenes && resultPresets.length > 0) {
    const weakest = resultPresets.shift()!
    resultGaps.push({
      segment: weakest.segment,
      slotIndex: weakest.slotIndex,
      bestPresetMatch: weakest,
      gapReason: `forced: minSignatureScenes=${policy.minSignatureScenes} (confidence ${weakest.confidence.toFixed(3)})`,
      requiredCapabilities: ['signature-composition'],
      priority: 'must',
      intent: weakest.scoreBreakdown.explanation,
    })
  }

  // 2. maxSynthesizedScenes: promote excess gaps back to presets
  if (resultGaps.length > policy.maxSynthesizedScenes) {
    // Keep the lowest-priority gaps (nice → must), then by highest confidence
    const sorted = [...resultGaps].sort((a, b) => {
      if (a.priority === 'must' && b.priority !== 'must') return -1
      if (a.priority !== 'must' && b.priority === 'must') return 1
      return a.bestPresetMatch.confidence - b.bestPresetMatch.confidence
    })

    const kept = sorted.slice(0, policy.maxSynthesizedScenes)
    const promoted = sorted.slice(policy.maxSynthesizedScenes)

    for (const gap of promoted) {
      resultPresets.push(gap.bestPresetMatch)
    }

    return {
      presetMatches: resultPresets.sort((a, b) => a.confidence - b.confidence),
      gaps: kept,
    }
  }

  return { presetMatches: resultPresets, gaps: resultGaps }
}
