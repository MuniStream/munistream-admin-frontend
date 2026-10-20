// Exporta la definición de un trámite (steps + next_steps) a BPMN 2.0 con
// lanes por actor y su diagrama (BPMNDI) ya calculado, para que cualquier
// herramienta BPMN (bpmn.io, Camunda Modeler, Bizagi) lo abra tal cual.

type LaneKey = 'human' | 'system' | 'admin';
type NodeKind =
  | 'startEvent'
  | 'endEvent'
  | 'userTask'
  | 'serviceTask'
  | 'callActivity'
  | 'exclusiveGateway'
  | 'parallelGateway';

interface BpmnNode {
  id: string;
  name: string;
  kind: NodeKind;
  lane: LaneKey;
  calledElement?: string;
}

interface BpmnFlow {
  id: string;
  source: string;
  target: string;
  name?: string;
}

const SIZE: Record<NodeKind, { w: number; h: number }> = {
  startEvent: { w: 36, h: 36 },
  endEvent: { w: 36, h: 36 },
  userTask: { w: 120, h: 80 },
  serviceTask: { w: 120, h: 80 },
  callActivity: { w: 120, h: 80 },
  exclusiveGateway: { w: 50, h: 50 },
  parallelGateway: { w: 50, h: 50 },
};

const COL_W = 170;
const ROW_H = 120;
const POOL_LABEL_W = 30;
const LANE_LABEL_W = 30;
const PAD_X = 40;

// Operadores que requieren a una persona (formularios, selección, carga,
// firma); el resto lo ejecuta la plataforma.
const HUMAN_OPERATOR = /Input|Picker|Selector|Confirmation|Selfie|Capture|Upload|Signer|Fiel|Approval|Validator|Explorer/i;
const CONDITION_OPERATOR = /ShortCircuit|Conditional|Branch/i;

const xmlEscape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const toXmlId = (raw: string) => {
  const id = raw.replace(/[^A-Za-z0-9_]/g, '_');
  return /^[A-Za-z_]/.test(id) ? id : `_${id}`;
};

function classifyStep(step: any): { kind: NodeKind | 'condition'; lane: LaneKey } {
  const op: string = step.operator_class || '';
  const type: string = (step.step_type || '').toLowerCase();

  if (op === 'WorkflowStartOperator') return { kind: 'callActivity', lane: 'admin' };
  if (CONDITION_OPERATOR.test(op) || type.includes('conditional')) return { kind: 'condition', lane: 'system' };
  if (op) return HUMAN_OPERATOR.test(op) ? { kind: 'userTask', lane: 'human' } : { kind: 'serviceTask', lane: 'system' };
  if (type.includes('terminal')) return { kind: 'endEvent', lane: 'system' };
  if (type.includes('integration')) return { kind: 'serviceTask', lane: 'system' };
  return { kind: 'userTask', lane: 'human' };
}

function isAdminWorkflow(workflow: any): boolean {
  const wfType = String(workflow.metadata?.workflow_type || '').toLowerCase();
  return wfType === 'admin' || String(workflow.workflow_id || '').startsWith('admin_');
}

function buildGraph(workflow: any) {
  const nodes = new Map<string, BpmnNode>();
  const flows: BpmnFlow[] = [];
  let flowSeq = 0;
  const addFlow = (source: string, target: string, name?: string) =>
    flows.push({ id: `Flow_${++flowSeq}`, source, target, name });

  const steps: any[] = (workflow.steps || []).filter((s: any) => s?.step_id);
  const known = new Set(steps.map((s) => s.step_id));
  const conditions = new Set<string>();

  steps.forEach((step) => {
    const { kind, lane } = classifyStep(step);
    const id = toXmlId(step.step_id);
    if (kind === 'condition') conditions.add(step.step_id);
    nodes.set(id, {
      id,
      name: step.name || step.step_id,
      kind: kind === 'condition' ? 'exclusiveGateway' : kind,
      lane,
    });
  });

  // Predecesores por paso, para decidir dónde hacen falta gateways de unión.
  const preds = new Map<string, string[]>();
  steps.forEach((step) =>
    (step.next_steps || []).filter((n: string) => known.has(n)).forEach((n: string) => {
      preds.set(n, [...(preds.get(n) || []), step.step_id]);
    }),
  );

  // La entrada efectiva de un paso: él mismo, o su gateway de unión si tiene
  // varios predecesores. Si alguno viene de una condición, la unión es
  // exclusiva (solo una rama llega); si no, paralela (esperan todas).
  const entryOf = new Map<string, string>();
  steps.forEach((step) => {
    const id = toXmlId(step.step_id);
    const p = preds.get(step.step_id) || [];
    if (p.length > 1) {
      const joinId = `Join_${id}`;
      nodes.set(joinId, {
        id: joinId,
        name: '',
        kind: p.some((x) => conditions.has(x)) ? 'exclusiveGateway' : 'parallelGateway',
        lane: nodes.get(id)!.lane,
      });
      addFlow(joinId, id);
      entryOf.set(step.step_id, joinId);
    } else {
      entryOf.set(step.step_id, id);
    }
  });

  const firstLane = steps.length ? nodes.get(toXmlId(steps[0].step_id))!.lane : 'human';
  nodes.set('StartEvent_1', { id: 'StartEvent_1', name: 'Inicio', kind: 'startEvent', lane: firstLane });

  let endSeq = 0;
  const addEnd = (lane: LaneKey, name: string) => {
    const endId = `EndEvent_${++endSeq}`;
    nodes.set(endId, { id: endId, name, kind: 'endEvent', lane });
    return endId;
  };

  const roots = steps.filter((s) => !(preds.get(s.step_id) || []).length);
  if (roots.length > 1) {
    nodes.set('Split_start', { id: 'Split_start', name: '', kind: 'parallelGateway', lane: firstLane });
    addFlow('StartEvent_1', 'Split_start');
    roots.forEach((r) => addFlow('Split_start', entryOf.get(r.step_id)!));
  } else if (roots.length === 1) {
    addFlow('StartEvent_1', entryOf.get(roots[0].step_id)!);
  }

  let mainEnd: string | null = null;
  steps.forEach((step) => {
    const id = toXmlId(step.step_id);
    const node = nodes.get(id)!;
    const next: string[] = (step.next_steps || []).filter((n: string) => known.has(n));

    if (node.kind === 'endEvent') return;

    if (conditions.has(step.step_id)) {
      // ShortCircuit: si se cumple sigue el flujo; si no, el resto se omite.
      next.forEach((n) => addFlow(id, entryOf.get(n)!, 'Sí'));
      addFlow(id, addEnd(node.lane, 'No procede'), 'No');
      return;
    }

    if (next.length === 0) {
      mainEnd ??= addEnd(node.lane, 'Fin');
      addFlow(id, mainEnd);
    } else if (next.length === 1) {
      addFlow(id, entryOf.get(next[0])!);
    } else {
      const splitId = `Split_${id}`;
      nodes.set(splitId, { id: splitId, name: '', kind: 'parallelGateway', lane: node.lane });
      addFlow(id, splitId);
      next.forEach((n) => addFlow(splitId, entryOf.get(n)!));
    }
  });

  steps.forEach((step) => {
    if (step.operator_class !== 'WorkflowStartOperator') return;
    const node = nodes.get(toXmlId(step.step_id))!;
    const target = step.configuration?.workflow_id;
    if (target) node.calledElement = String(target);
  });

  return { nodes, flows };
}

interface Layout {
  pos: Map<string, { x: number; y: number; w: number; h: number }>;
  lanes: { key: LaneKey; y: number; h: number }[];
  width: number;
  height: number;
}

function layout(nodes: Map<string, BpmnNode>, flows: BpmnFlow[], laneOrder: LaneKey[]): Layout {
  // Columna = camino más largo desde el inicio (el grafo es un DAG).
  const out = new Map<string, string[]>();
  const indeg = new Map<string, number>();
  nodes.forEach((_, id) => indeg.set(id, 0));
  flows.forEach((f) => {
    out.set(f.source, [...(out.get(f.source) || []), f.target]);
    indeg.set(f.target, (indeg.get(f.target) || 0) + 1);
  });
  const col = new Map<string, number>();
  const queue = [...nodes.keys()].filter((id) => !indeg.get(id));
  queue.forEach((id) => col.set(id, 0));
  while (queue.length) {
    const id = queue.shift()!;
    (out.get(id) || []).forEach((t) => {
      col.set(t, Math.max(col.get(t) || 0, (col.get(id) || 0) + 1));
      indeg.set(t, indeg.get(t)! - 1);
      if (!indeg.get(t)) queue.push(t);
    });
  }

  // Fila dentro de cada lane: los nodos que comparten columna se apilan.
  const row = new Map<string, number>();
  const used = new Map<string, number>();
  const rowsPerLane = new Map<LaneKey, number>();
  [...nodes.values()]
    .sort((a, b) => (col.get(a.id) || 0) - (col.get(b.id) || 0))
    .forEach((n) => {
      const key = `${n.lane}:${col.get(n.id) || 0}`;
      const r = used.get(key) || 0;
      used.set(key, r + 1);
      row.set(n.id, r);
      rowsPerLane.set(n.lane, Math.max(rowsPerLane.get(n.lane) || 0, r + 1));
    });

  const lanes: Layout['lanes'] = [];
  let y = 0;
  laneOrder.forEach((key) => {
    const h = Math.max(1, rowsPerLane.get(key) || 1) * ROW_H + 40;
    lanes.push({ key, y, h });
    y += h;
  });

  const originX = POOL_LABEL_W + LANE_LABEL_W + PAD_X;
  const pos: Layout['pos'] = new Map();
  let maxCol = 0;
  nodes.forEach((n) => {
    const c = col.get(n.id) || 0;
    maxCol = Math.max(maxCol, c);
    const lane = lanes.find((l) => l.key === n.lane)!;
    const { w, h } = SIZE[n.kind];
    const cx = originX + c * COL_W + SIZE.userTask.w / 2;
    const cy = lane.y + 20 + (row.get(n.id) || 0) * ROW_H + ROW_H / 2;
    pos.set(n.id, { x: cx - w / 2, y: cy - h / 2, w, h });
  });

  return { pos, lanes, width: originX + (maxCol + 1) * COL_W + PAD_X, height: y };
}

function waypoints(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  const sx = a.x + a.w;
  const sy = a.y + a.h / 2;
  const tx = b.x;
  const ty = b.y + b.h / 2;
  if (Math.abs(sy - ty) < 1) return [[sx, sy], [tx, ty]];
  const mx = tx - 25;
  return [[sx, sy], [mx, sy], [mx, ty], [tx, ty]];
}

export function workflowToBpmnXml(workflow: any): string {
  const { nodes, flows } = buildGraph(workflow);
  const admin = isAdminWorkflow(workflow);
  const laneNames: Record<LaneKey, string> = {
    human: admin ? 'Servidor público' : 'Solicitante',
    system: 'Sistema',
    admin: 'Validación administrativa',
  };
  const laneOrder = (['human', 'system', 'admin'] as LaneKey[]).filter((k) =>
    [...nodes.values()].some((n) => n.lane === k),
  );
  const { pos, lanes, width, height } = layout(nodes, flows, laneOrder);

  const processId = `Process_${toXmlId(workflow.workflow_id || 'tramite')}`;
  const name = xmlEscape(workflow.name || workflow.workflow_id || 'Trámite');
  const r = Math.round;

  const laneXml = lanes
    .map(
      (l) =>
        `      <bpmn:lane id="Lane_${l.key}" name="${xmlEscape(laneNames[l.key])}">\n` +
        [...nodes.values()]
          .filter((n) => n.lane === l.key)
          .map((n) => `        <bpmn:flowNodeRef>${n.id}</bpmn:flowNodeRef>`)
          .join('\n') +
        `\n      </bpmn:lane>`,
    )
    .join('\n');

  const nodeXml = [...nodes.values()]
    .map((n) => {
      const attrs = [`id="${n.id}"`];
      if (n.name) attrs.push(`name="${xmlEscape(n.name)}"`);
      if (n.calledElement) attrs.push(`calledElement="${xmlEscape(n.calledElement)}"`);
      const inc = flows.filter((f) => f.target === n.id).map((f) => `      <bpmn:incoming>${f.id}</bpmn:incoming>`);
      const outg = flows.filter((f) => f.source === n.id).map((f) => `      <bpmn:outgoing>${f.id}</bpmn:outgoing>`);
      return `    <bpmn:${n.kind} ${attrs.join(' ')}>\n${[...inc, ...outg].join('\n')}\n    </bpmn:${n.kind}>`;
    })
    .join('\n');

  const flowXml = flows
    .map(
      (f) =>
        `    <bpmn:sequenceFlow id="${f.id}" sourceRef="${f.source}" targetRef="${f.target}"${
          f.name ? ` name="${xmlEscape(f.name)}"` : ''
        } />`,
    )
    .join('\n');

  const laneX = POOL_LABEL_W;
  const shapes = [
    `      <bpmndi:BPMNShape id="Participant_1_di" bpmnElement="Participant_1" isHorizontal="true">\n        <dc:Bounds x="0" y="0" width="${r(width)}" height="${r(height)}" />\n      </bpmndi:BPMNShape>`,
    ...lanes.map(
      (l) =>
        `      <bpmndi:BPMNShape id="Lane_${l.key}_di" bpmnElement="Lane_${l.key}" isHorizontal="true">\n        <dc:Bounds x="${laneX}" y="${r(l.y)}" width="${r(width - laneX)}" height="${r(l.h)}" />\n      </bpmndi:BPMNShape>`,
    ),
    ...[...nodes.values()].map((n) => {
      const p = pos.get(n.id)!;
      const isGw = n.kind.endsWith('Gateway');
      const label =
        n.kind.endsWith('Event') || (isGw && n.name)
          ? `\n        <bpmndi:BPMNLabel>\n          <dc:Bounds x="${r(p.x - 30)}" y="${r(p.y + p.h + 4)}" width="${r(p.w + 60)}" height="28" />\n        </bpmndi:BPMNLabel>`
          : '';
      return `      <bpmndi:BPMNShape id="${n.id}_di" bpmnElement="${n.id}"${isGw ? ' isMarkerVisible="true"' : ''}>\n        <dc:Bounds x="${r(p.x)}" y="${r(p.y)}" width="${p.w}" height="${p.h}" />${label}\n      </bpmndi:BPMNShape>`;
    }),
  ].join('\n');

  const edges = flows
    .map((f) => {
      const wps = waypoints(pos.get(f.source)!, pos.get(f.target)!)
        .map(([x, y]) => `        <di:waypoint x="${r(x)}" y="${r(y)}" />`)
        .join('\n');
      return `      <bpmndi:BPMNEdge id="${f.id}_di" bpmnElement="${f.id}">\n${wps}\n      </bpmndi:BPMNEdge>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_${toXmlId(workflow.workflow_id || 'tramite')}" targetNamespace="https://munistream.com/bpmn" exporter="MuniStream" exporterVersion="1.0">
  <bpmn:collaboration id="Collaboration_1">
    <bpmn:participant id="Participant_1" name="${name}" processRef="${processId}" />
  </bpmn:collaboration>
  <bpmn:process id="${processId}" name="${name}" isExecutable="false">
    <bpmn:laneSet id="LaneSet_1">
${laneXml}
    </bpmn:laneSet>
${nodeXml}
${flowXml}
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Collaboration_1">
${shapes}
${edges}
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>
`;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

// Rasteriza el SVG que entrega bpmn-js (saveSVG) a PNG con fondo blanco.
export function svgToPngBlob(svg: string, scale = 2): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    const root = doc.documentElement;
    const width = parseFloat(root.getAttribute('width') || '0');
    const height = parseFloat(root.getAttribute('height') || '0');
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(width * scale);
      canvas.height = Math.ceil(height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas no disponible'));
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo generar el PNG'))), 'image/png');
    };
    img.onerror = () => reject(new Error('No se pudo cargar el SVG'));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}
