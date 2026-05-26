/**
 * drawingUtils.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Factory functions for creating JointJS elements from the draw-tool palette.
 * Each factory receives the common configuration (start position, colors,
 * dark-mode flag) and returns a fully configured JointJS cell ready to be
 * added to the graph.
 */

import * as joint from 'jointjs';
import { v4 as uuidv4 } from 'uuid';

// Custom element: no refWidth/refHeight defaults that distort the d path
const NS = 'scada';
joint.shapes[NS] = joint.shapes[NS] || {};
if (!joint.shapes[NS].DrawnPath) {
  joint.shapes[NS].DrawnPath = joint.dia.Element.define('scada.DrawnPath', {
    attrs: {
      body: {
        fill: 'none',
        stroke: '#CBD5E1',
        strokeWidth: 2,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
      label: {
        textVerticalAnchor: 'middle',
        textAnchor: 'middle',
        refX: '50%',
        refY: '50%',
        fontSize: 13,
        fill: '#CBD5E1',
        fontFamily: 'Inter, sans-serif',
      },
    },
  }, {
    markup: [
      { tagName: 'path', selector: 'body' },
      { tagName: 'text', selector: 'label' },
    ],
  });
}

// ── Port config shared by all drawable shapes ─────────────────────────────────
const makePortMarkup = () => [
  {
    tagName: 'circle',
    selector: 'portBody',
    attributes: {
      r: 7, fill: '#22D3EE', stroke: '#0e7490', strokeWidth: 2,
      cursor: 'crosshair', magnet: 'true',
    },
  },
];

export const makePortsConfig = () => {
  const markup = makePortMarkup();
  return {
    groups: {
      top:    { position: 'top',    markup, attrs: { portBody: { magnet: true } } },
      bottom: { position: 'bottom', markup, attrs: { portBody: { magnet: true } } },
      left:   { position: 'left',   markup, attrs: { portBody: { magnet: true } } },
      right:  { position: 'right',  markup, attrs: { portBody: { magnet: true } } },
    },
    items: [{ group: 'top' }, { group: 'bottom' }, { group: 'left' }, { group: 'right' }],
  };
};

// ── Default drawn-shape data payload ─────────────────────────────────────────
const defaultShapeData = (overrides = {}) => ({
  category:    'drawn_shape',
  name:        '',
  stroke:      overrides.stroke || '#CBD5E1',
  fill:        'transparent',
  strokeWidth: 2,
  dashPattern: '',    // '' | '8 4' | '2 4' | '8 4 2 4'
  opacity:     1,
  bindings:    [],    // [{ property, tagKey, expression }]
  locked:      false,
  ...overrides,
});

// ── Individual shape factories ────────────────────────────────────────────────

export const createRectangle = ({ x, y, isDarkMode }) => {
  const stroke = isDarkMode ? '#CBD5E1' : '#1e293b';
  return new joint.shapes.standard.Rectangle({
    id: uuidv4(),
    position: { x, y },
    size: { width: 1, height: 1 },
    attrs: {
      body:  { fill: 'transparent', stroke, strokeWidth: 2, rx: 0, ry: 0 },
      label: { text: '', fill: stroke, fontSize: 13, fontFamily: 'Inter, sans-serif' },
    },
    ports: makePortsConfig(),
    data: defaultShapeData({ stroke }),
  });
};

export const createEllipse = ({ x, y, isDarkMode }) => {
  const stroke = isDarkMode ? '#CBD5E1' : '#1e293b';
  return new joint.shapes.standard.Ellipse({
    id: uuidv4(),
    position: { x, y },
    size: { width: 1, height: 1 },
    attrs: {
      body:  { fill: 'transparent', stroke, strokeWidth: 2 },
      label: { text: '', fill: stroke, fontSize: 13, fontFamily: 'Inter, sans-serif' },
    },
    ports: makePortsConfig(),
    data: defaultShapeData({ stroke }),
  });
};

export const createLine = ({ x, y, isDarkMode }) => {
  const stroke = isDarkMode ? '#CBD5E1' : '#1e293b';
  return new joint.shapes.standard.Link({
    id: uuidv4(),
    source: { x, y },
    target: { x: x + 1, y: y + 1 },
    attrs: {
      line: {
        stroke,
        strokeWidth: 2,
        targetMarker: { type: 'none' },
        sourceMarker: { type: 'none' },
      },
    },
    data: defaultShapeData({ stroke }),
  });
};

export const createTextLabel = ({ x, y, isDarkMode }) => {
  const textColor = isDarkMode ? '#CBD5E1' : '#1e293b';
  return new joint.shapes.standard.Rectangle({
    id: uuidv4(),
    position: { x, y },
    size: { width: 160, height: 40 },
    attrs: {
      body:  { fill: 'transparent', stroke: 'none', strokeWidth: 0 },
      label: { text: 'Label', fill: textColor, fontSize: 18, fontFamily: 'Inter, sans-serif', fontWeight: 'bold' },
    },
    ports: makePortsConfig(),
    data: defaultShapeData({ stroke: 'none', category: 'drawn_text', textColor, fontSize: 18, fontFamily: 'Inter, sans-serif', fontWeight: 'bold', textAlign: 'middle' }),
  });
};

// ── Utility: build SVG path string from polygon vertices ─────────────────────
export const buildPolyPath = (vertices, closed = true) => {
  if (!vertices || vertices.length < 2) return 'M 0 0';
  const pts = vertices.map((v, i) => `${i === 0 ? 'M' : 'L'} ${v.x} ${v.y}`).join(' ');
  return closed ? `${pts} Z` : pts;
};

export const createPolygon = ({ vertices, isDarkMode }) => {
  const stroke = isDarkMode ? '#CBD5E1' : '#1e293b';
  // Compute bounding box to set the JointJS element position + size
  const xs = vertices.map(v => v.x);
  const ys = vertices.map(v => v.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = Math.max(1, maxX - minX);
  const h = Math.max(1, maxY - minY);

  // Translate vertices relative to top-left bounding corner (JointJS Path uses refX/refY)
  const relVerts = vertices.map(v => ({ x: v.x - minX, y: v.y - minY }));
  const d = buildPolyPath(relVerts, true);

  return new joint.shapes[NS].DrawnPath({
    id: uuidv4(),
    position: { x: minX, y: minY },
    size: { width: w, height: h },
    attrs: {
      body:  { d, fill: 'rgba(0,0,0,0.001)', stroke, strokeWidth: 2 },
      label: { text: '', fill: stroke, fontSize: 13, fontFamily: 'Inter, sans-serif' },
    },
    ports: makePortsConfig(),
    data: defaultShapeData({ stroke, shapeType: 'polygon', vertices }),
  });
};

// ── Arrow / marker presets ────────────────────────────────────────────────────
export const ARROW_MARKERS = {
  none:   { type: 'none' },
  open:   { type: 'path', d: 'M 10 -5 0 0 10 5', fill: 'none', 'stroke-width': 1.5 },
  filled: { type: 'path', d: 'M 10 -5 0 0 10 5 z' },
  circle: { type: 'circle', r: 5 },
};

// ── Stroke dash presets ───────────────────────────────────────────────────────
export const DASH_PATTERNS = {
  solid:   { label: 'Solid',    value: '' },
  dashed:  { label: 'Dashed',   value: '8 4' },
  dotted:  { label: 'Dotted',   value: '2 4' },
  dashdot: { label: 'Dash-Dot', value: '8 4 2 4' },
};

// ── Image shape from base64 ───────────────────────────────────────────────────
export const createImageShape = ({ x, y, dataUrl, width = 120, height = 120 }) =>
  new joint.shapes.standard.Image({
    id: uuidv4(),
    position: { x, y },
    size: { width, height },
    attrs: {
      image: { 'xlink:href': dataUrl, preserveAspectRatio: 'xMidYMid meet' },
      label: { text: '', fill: '#CBD5E1', refY: '100%', refY2: 15, textAnchor: 'middle' },
    },
    ports: makePortsConfig(),
    data: defaultShapeData({ category: 'drawn_image', stroke: 'none' }),
  });

// ── Z-order: normalize z values to sequential ints, return sorted array ───────
export const normalizeSortedCells = (graph) => {
  const sorted = [...graph.getCells()]
    .sort((a, b) => (a.get('z') ?? 0) - (b.get('z') ?? 0));
  sorted.forEach((c, i) => c.set('z', i));
  return sorted;
};

// ── Ramer-Douglas-Peucker point thinning ─────────────────────────────────────
const rdpReduce = (points, epsilon) => {
  if (points.length < 3) return points;
  let maxDist = 0, maxIdx = 0;
  const start = points[0], end = points[points.length - 1];
  const dx = end.x - start.x, dy = end.y - start.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  for (let i = 1; i < points.length - 1; i++) {
    const dist = Math.abs(dy * points[i].x - dx * points[i].y + end.x * start.y - end.y * start.x) / len;
    if (dist > maxDist) { maxDist = dist; maxIdx = i; }
  }
  if (maxDist > epsilon) {
    return [
      ...rdpReduce(points.slice(0, maxIdx + 1), epsilon),
      ...rdpReduce(points.slice(maxIdx), epsilon).slice(1),
    ];
  }
  return [start, end];
};

// ── Shape recognition helpers ─────────────────────────────────────────────────

// Detect corner vertices in a polyline by measuring direction-change angle
const detectCornerPoints = (pts, minAngleDeg = 52) => {
  const corners = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const prev = pts[(i - 1 + n) % n];
    const curr = pts[i];
    const next = pts[(i + 1) % n];
    const v1x = curr.x - prev.x, v1y = curr.y - prev.y;
    const v2x = next.x - curr.x, v2y = next.y - curr.y;
    const len1 = Math.sqrt(v1x * v1x + v1y * v1y);
    const len2 = Math.sqrt(v2x * v2x + v2y * v2y);
    if (len1 < 3 || len2 < 3) continue;
    const dot = (v1x * v2x + v1y * v2y) / (len1 * len2);
    const angleDeg = Math.acos(Math.max(-1, Math.min(1, dot))) * 180 / Math.PI;
    if (angleDeg > minAngleDeg) corners.push({ x: curr.x, y: curr.y });
  }
  return corners;
};

/**
 * Analyse raw freehand points and return a recognised shape descriptor, or null.
 * Returns: { type: 'ellipse'|'rectangle'|'triangle'|'line', ...geometry }
 */
export const recognizeFreedrawShape = (points) => {
  if (!points || points.length < 8) return null;

  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const bboxW = maxX - minX, bboxH = maxY - minY;
  const bboxDiag = Math.sqrt(bboxW * bboxW + bboxH * bboxH);
  if (bboxDiag < 15) return null;

  const first = points[0], last = points[points.length - 1];
  const gap = Math.sqrt((last.x - first.x) ** 2 + (last.y - first.y) ** 2);
  const isClosed = gap < bboxDiag * 0.32;

  // ── Line ──────────────────────────────────────────────────────────────────
  if (!isClosed) {
    let pathLen = 0;
    for (let i = 1; i < points.length; i++) {
      pathLen += Math.sqrt((points[i].x - points[i-1].x) ** 2 + (points[i].y - points[i-1].y) ** 2);
    }
    const straightDist = Math.sqrt((last.x - first.x) ** 2 + (last.y - first.y) ** 2);
    if (pathLen > 0 && straightDist / pathLen > 0.87)
      return { type: 'line', x1: first.x, y1: first.y, x2: last.x, y2: last.y };
    return null;
  }

  // ── Circle / Ellipse ──────────────────────────────────────────────────────
  const cx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const cy = ys.reduce((a, b) => a + b, 0) / ys.length;
  const dists = points.map(p => Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2));
  const meanDist = dists.reduce((a, b) => a + b, 0) / dists.length;
  const stdDist = Math.sqrt(dists.reduce((a, b) => a + (b - meanDist) ** 2, 0) / dists.length);
  if (meanDist > 0 && stdDist / meanDist < 0.22)
    return { type: 'ellipse', x: minX, y: minY, w: bboxW, h: bboxH };

  // ── Polygon corners (triangle / rectangle) ────────────────────────────────
  const epsilon = Math.max(4, bboxDiag * 0.06);
  const reduced = rdpReduce(points, epsilon);
  const corners = detectCornerPoints(reduced, 50);

  if (corners.length === 3)
    return { type: 'triangle', vertices: corners };

  if (corners.length === 4)
    return { type: 'rectangle', x: minX, y: minY, w: bboxW, h: bboxH };

  // ── Fallback: rectangle via edge proximity ────────────────────────────────
  const edgeTol = bboxDiag * 0.15;
  const nearEdge = points.filter(p =>
    Math.abs(p.x - minX) < edgeTol || Math.abs(p.x - maxX) < edgeTol ||
    Math.abs(p.y - minY) < edgeTol || Math.abs(p.y - maxY) < edgeTol
  );
  if (nearEdge.length / points.length > 0.65)
    return { type: 'rectangle', x: minX, y: minY, w: bboxW, h: bboxH };

  return null;
};

// ── Freehand path from collected mouse points ─────────────────────────────────
export const createFreedrawPath = ({ points, isDarkMode }) => {
  if (!points || points.length < 2) return null;
  const reduced = rdpReduce(points, 1.5);
  const stroke  = isDarkMode ? '#CBD5E1' : '#1e293b';
  const xs = reduced.map(p => p.x);
  const ys = reduced.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = Math.max(4, maxX - minX);
  const h = Math.max(4, maxY - minY);
  const d = reduced
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${(p.x - minX).toFixed(1)} ${(p.y - minY).toFixed(1)}`)
    .join(' ');
  return new joint.shapes[NS].DrawnPath({
    id: uuidv4(),
    position: { x: minX, y: minY },
    size: { width: w, height: h },
    attrs: {
      body: { d, fill: 'none', stroke, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
      label: { text: '' },
    },
    ports: makePortsConfig(),
    data: defaultShapeData({ stroke, shapeType: 'freedraw', points }),
  });
};
