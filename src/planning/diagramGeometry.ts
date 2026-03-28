/**
 * DiagramGeometry — P2-1a: 좌표/path 자동 계산 빌더.
 *
 * DiagramSpec → DiagramGeometry 변환.
 * Layout Quality Rules 5개를 빌더 레벨에서 강제 적용.
 *
 * 1차 구현: cycle, flow, split, timeline, pyramid.
 * 나머지 타입: throw Error("Not implemented: {type}").
 */

import type { DiagramSpec, DiagramType } from "@/types";

// ============================================================
// DiagramGeometry Interface
// ============================================================

export interface DiagramNode {
  id: string;
  cx: number;
  cy: number;
  label: string;
  labelBounds: { width: number; height: number };
}

export interface DiagramConnection {
  fromNodeId: string;
  toNodeId: string;
  pathData: string;
  curvature: number;
}

export interface DiagramGeometry {
  nodes: DiagramNode[];
  connections: DiagramConnection[];
}

// ============================================================
// Layout Quality Rules Constants
// ============================================================

/** Rule 1: 최소 노드 거리 = 캔버스 대각선의 12% */
const MIN_DISTANCE_RATIO = 0.12;

/** Rule 5: 같은 다이어그램 내 curvature 편차 최대 */
const MAX_CURVATURE_DEVIATION = 0.2;

/** 기본 라벨 크기 비율 (캔버스 너비 기준) */
const LABEL_WIDTH_RATIO = 0.12;
const LABEL_HEIGHT_RATIO = 0.06;

// ============================================================
// Utility Functions
// ============================================================

function canvasDiagonal(w: number, h: number): number {
  return Math.sqrt(w * w + h * h);
}

/** Rule 1: 두 노드 간 거리가 최소 거리 이상인지 확인 */
function enforceMinDistance(
  nodes: DiagramNode[],
  minDist: number,
): DiagramNode[] {
  if (nodes.length <= 1) return nodes;

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[j].cx - nodes[i].cx;
      const dy = nodes[j].cy - nodes[i].cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist && dist > 0) {
        const scale = minDist / dist;
        const midX = (nodes[i].cx + nodes[j].cx) / 2;
        const midY = (nodes[i].cy + nodes[j].cy) / 2;
        nodes[i] = {
          ...nodes[i],
          cx: midX - (dx / 2) * scale,
          cy: midY - (dy / 2) * scale,
        };
        nodes[j] = {
          ...nodes[j],
          cx: midX + (dx / 2) * scale,
          cy: midY + (dy / 2) * scale,
        };
      }
    }
  }
  return nodes;
}

/** Rule 5: curvature 편차를 MAX_CURVATURE_DEVIATION 이하로 보정 */
function normalizeCurvatures(
  connections: DiagramConnection[],
): DiagramConnection[] {
  if (connections.length <= 1) return connections;

  const curvatures = connections.map((c) => c.curvature);
  const avg = curvatures.reduce((a, b) => a + b, 0) / curvatures.length;

  return connections.map((c) => {
    const deviation = c.curvature - avg;
    if (Math.abs(deviation) > MAX_CURVATURE_DEVIATION) {
      const clamped = avg + Math.sign(deviation) * MAX_CURVATURE_DEVIATION;
      return {
        ...c,
        curvature: clamped,
        pathData: rebuildPathWithCurvature(c, clamped),
      };
    }
    return c;
  });
}

/** Rule 3: flow/timeline에서 connection 교차 검출 + 1회 재정렬 시도 */
function minimizeCrossings(
  nodes: DiagramNode[],
  connections: DiagramConnection[],
): { nodes: DiagramNode[]; connections: DiagramConnection[] } {
  // 간단한 교차 검출: 연결 순서가 노드 순서와 불일치하면 재정렬
  let hasCrossing = false;
  for (let i = 0; i < connections.length; i++) {
    for (let j = i + 1; j < connections.length; j++) {
      const fromI = nodes.findIndex((n) => n.id === connections[i].fromNodeId);
      const toI = nodes.findIndex((n) => n.id === connections[i].toNodeId);
      const fromJ = nodes.findIndex((n) => n.id === connections[j].fromNodeId);
      const toJ = nodes.findIndex((n) => n.id === connections[j].toNodeId);
      // 교차 조건: from 순서와 to 순서가 역전
      if ((fromI < fromJ && toI > toJ) || (fromI > fromJ && toI < toJ)) {
        hasCrossing = true;
        break;
      }
    }
    if (hasCrossing) break;
  }

  if (!hasCrossing) return { nodes, connections };

  // 1회 재정렬: 노드를 connection 순서대로 재배치
  const visited = new Set<string>();
  const ordered: DiagramNode[] = [];
  for (const conn of connections) {
    if (!visited.has(conn.fromNodeId)) {
      const node = nodes.find((n) => n.id === conn.fromNodeId);
      if (node) {
        ordered.push(node);
        visited.add(conn.fromNodeId);
      }
    }
    if (!visited.has(conn.toNodeId)) {
      const node = nodes.find((n) => n.id === conn.toNodeId);
      if (node) {
        ordered.push(node);
        visited.add(conn.toNodeId);
      }
    }
  }
  // 미방문 노드 추가
  for (const node of nodes) {
    if (!visited.has(node.id)) ordered.push(node);
  }

  // 좌표를 원래 순서의 위치에 재매핑
  const reordered = ordered.map((node, i) => ({
    ...node,
    cx: nodes[i].cx,
    cy: nodes[i].cy,
  }));

  return { nodes: reordered, connections };
}

function rebuildPathWithCurvature(
  conn: DiagramConnection,
  curvature: number,
): string {
  // pathData에서 시작/끝점을 추출하여 새 curvature로 재생성
  const match = conn.pathData.match(
    /M\s*([\d.]+)\s+([\d.]+).*?([\d.]+)\s+([\d.]+)\s*$/,
  );
  if (!match) return conn.pathData;
  const [, x1, y1, x2, y2] = match.map(Number);
  return buildCurvedPath(x1, y1, x2, y2, curvature);
}

function buildCurvedPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  curvature: number,
): string {
  if (curvature === 0) {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  // 법선 방향으로 curvature 만큼 제어점 오프셋
  const offsetX = midX - dy * curvature * 0.5;
  const offsetY = midY + dx * curvature * 0.5;
  return `M ${x1} ${y1} Q ${offsetX} ${offsetY} ${x2} ${y2}`;
}

function defaultLabelBounds(
  canvasWidth: number,
  canvasHeight: number,
): { width: number; height: number } {
  return {
    width: Math.round(canvasWidth * LABEL_WIDTH_RATIO),
    height: Math.round(canvasHeight * LABEL_HEIGHT_RATIO),
  };
}

function makeNodeId(index: number): string {
  return `node-${index}`;
}

// ============================================================
// Layout Builders (per diagram type)
// ============================================================

function buildCycleGeometry(
  spec: DiagramSpec,
  w: number,
  h: number,
): DiagramGeometry {
  const count = spec.nodeCount ?? 4;
  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.min(w, h) * 0.35;
  const labelB = defaultLabelBounds(w, h);
  const baseCurvature = 0.3;

  // Rule 4: Cycle 시작점 = 12시 방향 (angle = -π/2)
  const startAngle = -Math.PI / 2;

  const nodes: DiagramNode[] = [];
  for (let i = 0; i < count; i++) {
    const angle = startAngle + (i / count) * 2 * Math.PI;
    nodes.push({
      id: makeNodeId(i),
      cx: cx + radius * Math.cos(angle),
      cy: cy + radius * Math.sin(angle),
      label: spec.nodeLabels?.[i] ?? `Node ${i + 1}`,
      labelBounds: labelB,
    });
  }

  const connections: DiagramConnection[] = [];
  for (let i = 0; i < count; i++) {
    const from = nodes[i];
    const to = nodes[(i + 1) % count];
    connections.push({
      fromNodeId: from.id,
      toNodeId: to.id,
      pathData: buildCurvedPath(from.cx, from.cy, to.cx, to.cy, baseCurvature),
      curvature: baseCurvature,
    });
  }

  return { nodes, connections: normalizeCurvatures(connections) };
}

function buildFlowGeometry(
  spec: DiagramSpec,
  w: number,
  h: number,
): DiagramGeometry {
  const count = spec.nodeCount ?? 4;
  const labelB = defaultLabelBounds(w, h);
  const margin = w * 0.1;
  const spacing = (w - margin * 2) / Math.max(count - 1, 1);
  const centerY = h / 2;
  const baseCurvature = 0.15;

  let nodes: DiagramNode[] = [];
  for (let i = 0; i < count; i++) {
    nodes.push({
      id: makeNodeId(i),
      cx: margin + i * spacing,
      cy: centerY,
      label: spec.nodeLabels?.[i] ?? `Step ${i + 1}`,
      labelBounds: labelB,
    });
  }

  let connections: DiagramConnection[] = [];
  for (let i = 0; i < count - 1; i++) {
    connections.push({
      fromNodeId: nodes[i].id,
      toNodeId: nodes[i + 1].id,
      pathData: buildCurvedPath(
        nodes[i].cx,
        nodes[i].cy,
        nodes[i + 1].cx,
        nodes[i + 1].cy,
        baseCurvature,
      ),
      curvature: baseCurvature,
    });
  }

  // Rule 3: 교차 최소화
  ({ nodes, connections } = minimizeCrossings(nodes, connections));

  return { nodes, connections: normalizeCurvatures(connections) };
}

function buildSplitGeometry(
  spec: DiagramSpec,
  w: number,
  h: number,
): DiagramGeometry {
  const count = spec.nodeCount ?? 2;
  const labelB = defaultLabelBounds(w, h);
  const isHorizontal =
    spec.layoutHint === "horizontal-split" || !spec.layoutHint;

  const nodes: DiagramNode[] = [];
  if (isHorizontal) {
    const spacing = w / (count + 1);
    for (let i = 0; i < count; i++) {
      nodes.push({
        id: makeNodeId(i),
        cx: spacing * (i + 1),
        cy: h / 2,
        label: spec.nodeLabels?.[i] ?? `Part ${i + 1}`,
        labelBounds: labelB,
      });
    }
  } else {
    const spacing = h / (count + 1);
    for (let i = 0; i < count; i++) {
      nodes.push({
        id: makeNodeId(i),
        cx: w / 2,
        cy: spacing * (i + 1),
        label: spec.nodeLabels?.[i] ?? `Layer ${i + 1}`,
        labelBounds: labelB,
      });
    }
  }

  // Split은 보통 비교 → connection 없거나 중앙 divider만
  const connections: DiagramConnection[] = [];
  if (count === 2) {
    connections.push({
      fromNodeId: nodes[0].id,
      toNodeId: nodes[1].id,
      pathData: buildCurvedPath(
        nodes[0].cx,
        nodes[0].cy,
        nodes[1].cx,
        nodes[1].cy,
        0,
      ),
      curvature: 0,
    });
  }

  return { nodes, connections };
}

function buildTimelineGeometry(
  spec: DiagramSpec,
  w: number,
  h: number,
): DiagramGeometry {
  const count = spec.nodeCount ?? 5;
  const labelB = defaultLabelBounds(w, h);
  const margin = w * 0.08;
  const spacing = (w - margin * 2) / Math.max(count - 1, 1);
  const centerY = h / 2;
  const baseCurvature = 0;

  let nodes: DiagramNode[] = [];
  for (let i = 0; i < count; i++) {
    nodes.push({
      id: makeNodeId(i),
      cx: margin + i * spacing,
      cy: centerY,
      label: spec.nodeLabels?.[i] ?? `Event ${i + 1}`,
      labelBounds: labelB,
    });
  }

  let connections: DiagramConnection[] = [];
  for (let i = 0; i < count - 1; i++) {
    connections.push({
      fromNodeId: nodes[i].id,
      toNodeId: nodes[i + 1].id,
      pathData: buildCurvedPath(
        nodes[i].cx,
        nodes[i].cy,
        nodes[i + 1].cx,
        nodes[i + 1].cy,
        baseCurvature,
      ),
      curvature: baseCurvature,
    });
  }

  // Rule 3: 교차 최소화
  ({ nodes, connections } = minimizeCrossings(nodes, connections));

  return { nodes, connections: normalizeCurvatures(connections) };
}

function buildPyramidGeometry(
  spec: DiagramSpec,
  w: number,
  h: number,
): DiagramGeometry {
  const count = spec.nodeCount ?? 4;
  const labelB = defaultLabelBounds(w, h);
  const topMargin = h * 0.1;
  const bottomMargin = h * 0.1;
  const usableH = h - topMargin - bottomMargin;
  const layerHeight = usableH / count;
  const baseCurvature = 0;

  const nodes: DiagramNode[] = [];
  for (let i = 0; i < count; i++) {
    // 상단(i=0)이 가장 좁고, 하단이 가장 넓음
    const widthRatio = 0.3 + (i / Math.max(count - 1, 1)) * 0.5;
    nodes.push({
      id: makeNodeId(i),
      cx: w / 2,
      cy: topMargin + i * layerHeight + layerHeight / 2,
      label: spec.nodeLabels?.[i] ?? `Level ${i + 1}`,
      labelBounds: {
        width: Math.round(w * widthRatio * LABEL_WIDTH_RATIO * 2),
        height: labelB.height,
      },
    });
  }

  // 연결: 위→아래
  const connections: DiagramConnection[] = [];
  for (let i = 0; i < count - 1; i++) {
    connections.push({
      fromNodeId: nodes[i].id,
      toNodeId: nodes[i + 1].id,
      pathData: buildCurvedPath(
        nodes[i].cx,
        nodes[i].cy,
        nodes[i + 1].cx,
        nodes[i + 1].cy,
        baseCurvature,
      ),
      curvature: baseCurvature,
    });
  }

  return { nodes, connections };
}

// ============================================================
// Main Builder
// ============================================================

const LAYOUT_BUILDERS: Partial<
  Record<
    DiagramType,
    (spec: DiagramSpec, w: number, h: number) => DiagramGeometry
  >
> = {
  cycle: buildCycleGeometry,
  flow: buildFlowGeometry,
  split: buildSplitGeometry,
  timeline: buildTimelineGeometry,
  pyramid: buildPyramidGeometry,
};

/**
 * Converts a DiagramSpec into positioned geometry with SVG path data.
 * Applies Layout Quality Rules automatically.
 *
 * @throws Error for unimplemented diagram types (hierarchy, network, ladder, hub-spoke, matrix2x2, funnel)
 */
export function buildDiagramGeometry(
  spec: DiagramSpec,
  canvasWidth: number,
  canvasHeight: number,
): DiagramGeometry {
  const builder = LAYOUT_BUILDERS[spec.diagramType];
  if (!builder) {
    throw new Error(`Not implemented: ${spec.diagramType}`);
  }

  const geometry = builder(spec, canvasWidth, canvasHeight);

  // Rule 1: 최소 노드 거리 적용
  const diagonal = canvasDiagonal(canvasWidth, canvasHeight);
  const minDist = diagonal * MIN_DISTANCE_RATIO;
  const adjustedNodes = enforceMinDistance([...geometry.nodes], minDist);

  return {
    nodes: adjustedNodes,
    connections: geometry.connections,
  };
}
