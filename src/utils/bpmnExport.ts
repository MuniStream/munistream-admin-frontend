// Exporta la definición de un trámite (steps + next_steps) a BPMN 2.0 con
// lanes por actor y su diagrama (BPMNDI) ya calculado, para que cualquier
// herramienta BPMN (bpmn.io, Camunda Modeler, Bizagi) lo abra tal cual.
//
// Los sub-trámites que lanza un WorkflowStartOperator se dibujan expandidos
// (subProcess con sus propios pasos, recursivamente); las entidades que emite
// un EntityCreationOperator, como data stores. Lo que cada operador hace sale
// de `operator_config`, que el backend lee de la definición del trámite.

type LaneKey = 'human' | 'system' | 'admin';
type NodeKind =
  | 'startEvent'
  | 'endEvent'
  | 'userTask'
  | 'serviceTask'
  | 'callActivity'
  | 'subProcess'
  | 'boundaryEvent'
  | 'exclusiveGateway'
  | 'parallelGateway';

interface DataOutput {
  storeId: string;
  assocId: string;
  name: string;
}

interface BpmnNode {
  id: string;
  name: string;
  kind: NodeKind;
  lane: LaneKey;
  calledElement?: string;
  documentation?: string;
  // Fin por desenlace de negocio: 'error' lo atrapa el padre, 'terminate' cierra el trámite.
  eventDef?: 'error' | 'terminate';
  errorCode?: string;
  attachedTo?: string;
  output?: DataOutput;
  inner?: Scope;
}

interface BpmnFlow {
  id: string;
  source: string;
  target: string;
  name?: string;
}

interface Scope {
  nodes: Map<string, BpmnNode>;
  flows: BpmnFlow[];
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Lo que el exportador lee de la definición que entrega GET /workflows/{id}.
export interface OperatorConfig {
  child_workflow_id?: string;
  child_workflow_type?: string;
  wait_for_completion?: boolean;
  required_status?: string;
  propagate_terminal?: string[];
  timeout_minutes?: number;
  emits_entity?: { entity_type?: string };
  updates_entity?: { entity_id_source?: string };
  terminal_status?: string;
}

export interface WorkflowStepDef {
  step_id: string;
  name?: string;
  operator_class?: string;
  step_type?: string;
  next_steps?: string[];
  operator_config?: OperatorConfig;
  configuration?: { workflow_id?: string };
}

export interface WorkflowDef {
  workflow_id?: string;
  name?: string;
  metadata?: { workflow_type?: unknown };
  steps?: WorkflowStepDef[];
}

export type WorkflowResolver = (workflowId: string) => WorkflowDef | undefined;

const SIZE: Record<Exclude<NodeKind, 'subProcess'>, { w: number; h: number }> = {
  startEvent: { w: 36, h: 36 },
  endEvent: { w: 36, h: 36 },
  boundaryEvent: { w: 36, h: 36 },
  userTask: { w: 120, h: 80 },
  serviceTask: { w: 120, h: 80 },
  callActivity: { w: 120, h: 80 },
  exclusiveGateway: { w: 50, h: 50 },
  parallelGateway: { w: 50, h: 50 },
};
const STORE = { w: 50, h: 50, gap: 40, label: 30 };

const GAP_X = 50;
const GAP_Y = 40;
const POOL_LABEL_W = 30;
const LANE_LABEL_W = 30;
const PAD_X = 40;
const LANE_PAD = 20;
const SUB_PAD = { x: 20, top: 30, bottom: 20 };
// Lo que asoma el evento de frontera bajo el borde de su actividad.
const BOUNDARY_OVERHANG = 18;

// Más anidación que esto no cabe legible en un lienzo; lo que sobra queda
// como callActivity que nombra el trámite que lanza.
const MAX_DEPTH = 4;

// Operadores que requieren a una persona (formularios, selección, carga,
// firma); el resto lo ejecuta la plataforma.
const HUMAN_OPERATOR = /Input|Picker|Selector|Confirmation|Selfie|Capture|Upload|Signer|Fiel|Approval|Validator|Explorer/i;
const CONDITION_OPERATOR = /ShortCircuit|Conditional|Branch/i;

const TERMINAL_LABEL: Record<string, string> = { rejected: 'Rechazado' };

const xmlEscape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const toXmlId = (raw: string) => {
  const id = raw.replace(/[^A-Za-z0-9_]/g, '_');
  return /^[A-Za-z_]/.test(id) ? id : `_${id}`;
};

const humanize = (s: string) => s.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
const terminalLabel = (status: string) => TERMINAL_LABEL[status] || humanize(status);

const configOf = (step: WorkflowStepDef): OperatorConfig => step.operator_config || {};
const childIdOf = (step: WorkflowStepDef): string | undefined =>
  configOf(step).child_workflow_id || step.configuration?.workflow_id || undefined;

function classifyStep(step: WorkflowStepDef): { kind: NodeKind | 'condition' | 'terminate'; lane: LaneKey } {
  const op: string = step.operator_class || '';
  const type: string = (step.step_type || '').toLowerCase();

  if (op === 'WorkflowStartOperator') return { kind: 'callActivity', lane: 'admin' };
  if (op === 'TerminateIfOperator') return { kind: 'terminate', lane: 'system' };
  if (CONDITION_OPERATOR.test(op) || type.includes('conditional')) return { kind: 'condition', lane: 'system' };
  if (op) return HUMAN_OPERATOR.test(op) ? { kind: 'userTask', lane: 'human' } : { kind: 'serviceTask', lane: 'system' };
  if (type.includes('terminal')) return { kind: 'endEvent', lane: 'system' };
  if (type.includes('integration')) return { kind: 'serviceTask', lane: 'system' };
  return { kind: 'userTask', lane: 'human' };
}

function isAdminWorkflow(workflow: WorkflowDef): boolean {
  const wfType = String(workflow.metadata?.workflow_type || '').toLowerCase();
  return wfType === 'admin' || String(workflow.workflow_id || '').startsWith('admin_');
}

function startDocumentation(cfg: OperatorConfig, childId: string): string {
  const parts = [`Lanza el trámite ${childId}${cfg.child_workflow_type ? ` (${cfg.child_workflow_type})` : ''}.`];
  if (cfg.wait_for_completion === false) {
    parts.push('No espera a que concluya: el trámite sigue de inmediato.');
  } else {
    if (cfg.timeout_minutes) parts.push(`Espera hasta ${cfg.timeout_minutes} min a que concluya.`);
    if (cfg.required_status) parts.push(`Continúa si concluye con estado "${cfg.required_status}".`);
    const propagated: string[] = cfg.propagate_terminal || [];
    if (propagated.length) parts.push(`Un desenlace ${propagated.map(terminalLabel).join(', ')} del hijo cierra también este trámite.`);
  }
  return parts.join(' ');
}

interface BuildCtx {
  resolve: WorkflowResolver;
  ancestors: string[];
  seq: { flow: number; end: number };
  errors: Set<string>;
}

// Construye el grafo de un trámite. `propagates` son los desenlaces que, si
// este grafo es un sub-trámite, cierran también al padre (se lanzan como error).
function buildScope(workflow: WorkflowDef, prefix: string, ctx: BuildCtx, propagates: string[]): Scope {
  const nodes = new Map<string, BpmnNode>();
  const flows: BpmnFlow[] = [];
  const addFlow = (source: string, target: string, name?: string) =>
    flows.push({ id: `Flow_${++ctx.seq.flow}`, source, target, name });
  const xid = (raw: string) => toXmlId(`${prefix}${raw}`);

  const steps = (workflow.steps || []).filter((s) => s?.step_id);
  const known = new Set(steps.map((s) => s.step_id));
  const conditions = new Set<string>();
  const terminators = new Map<string, string>();

  const addEnd = (lane: LaneKey, name: string, terminal?: string) => {
    const endId = `${prefix}EndEvent_${++ctx.seq.end}`;
    const node: BpmnNode = { id: endId, name, kind: 'endEvent', lane };
    if (terminal) {
      if (propagates.includes(terminal)) {
        node.eventDef = 'error';
        node.errorCode = terminal;
        ctx.errors.add(terminal);
      } else {
        node.eventDef = 'terminate';
      }
    }
    nodes.set(endId, node);
    return endId;
  };

  steps.forEach((step) => {
    const { kind, lane } = classifyStep(step);
    const id = xid(step.step_id);
    const cfg = configOf(step);
    const node: BpmnNode = { id, name: step.name || step.step_id, kind: 'userTask', lane };

    if (kind === 'condition' || kind === 'terminate') {
      node.kind = 'exclusiveGateway';
      if (kind === 'condition') conditions.add(step.step_id);
      else terminators.set(step.step_id, cfg.terminal_status || 'rejected');
    } else if (kind === 'callActivity') {
      const childId = childIdOf(step);
      const child = childId ? ctx.resolve(childId) : undefined;
      if (childId) node.documentation = startDocumentation(cfg, childId);
      const expandable =
        child?.steps?.length &&
        cfg.wait_for_completion !== false &&
        !ctx.ancestors.includes(childId!) &&
        ctx.ancestors.length < MAX_DEPTH;
      if (expandable) {
        node.kind = 'subProcess';
        node.inner = buildScope(
          child,
          `${id}__`,
          { ...ctx, ancestors: [...ctx.ancestors, childId!] },
          cfg.propagate_terminal ?? ['rejected'],
        );
      } else {
        node.kind = 'callActivity';
        if (childId) node.calledElement = childId;
      }
    } else {
      node.kind = kind;
    }

    const emits = cfg.emits_entity;
    const updates = cfg.updates_entity;
    if (emits?.entity_type || updates) {
      node.output = {
        storeId: `${id}_entidad`,
        assocId: `${id}_entidad_assoc`,
        name: emits?.entity_type ? `Entidad: ${humanize(emits.entity_type)}` : 'Entidad (actualización)',
      };
    }
    nodes.set(id, node);
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
    const id = xid(step.step_id);
    const p = preds.get(step.step_id) || [];
    if (p.length > 1) {
      const joinId = xid(`Join_${step.step_id}`);
      nodes.set(joinId, {
        id: joinId,
        name: '',
        kind: p.some((x) => conditions.has(x) || terminators.has(x)) ? 'exclusiveGateway' : 'parallelGateway',
        lane: nodes.get(id)!.lane,
      });
      addFlow(joinId, id);
      entryOf.set(step.step_id, joinId);
    } else {
      entryOf.set(step.step_id, id);
    }
  });

  const startId = `${prefix}StartEvent_1`;
  const firstLane = steps.length ? nodes.get(xid(steps[0].step_id))!.lane : 'human';
  nodes.set(startId, { id: startId, name: 'Inicio', kind: 'startEvent', lane: firstLane });

  const roots = steps.filter((s) => !(preds.get(s.step_id) || []).length);
  if (roots.length > 1) {
    const splitId = `${prefix}Split_start`;
    nodes.set(splitId, { id: splitId, name: '', kind: 'parallelGateway', lane: firstLane });
    addFlow(startId, splitId);
    roots.forEach((r) => addFlow(splitId, entryOf.get(r.step_id)!));
  } else if (roots.length === 1) {
    addFlow(startId, entryOf.get(roots[0].step_id)!);
  }

  let mainEnd: string | null = null;
  const continueTo = (from: string, lane: LaneKey, next: string[], name?: string) => {
    if (next.length === 0) {
      mainEnd ??= addEnd(lane, 'Fin');
      addFlow(from, mainEnd, name);
    } else if (next.length === 1) {
      addFlow(from, entryOf.get(next[0])!, name);
    } else {
      const splitId = `Split_${from}`;
      nodes.set(splitId, { id: splitId, name: '', kind: 'parallelGateway', lane });
      addFlow(from, splitId, name);
      next.forEach((n) => addFlow(splitId, entryOf.get(n)!));
    }
  };

  steps.forEach((step) => {
    const id = xid(step.step_id);
    const node = nodes.get(id)!;
    const next: string[] = (step.next_steps || []).filter((n: string) => known.has(n));

    if (node.kind === 'endEvent') return;

    if (conditions.has(step.step_id)) {
      // ShortCircuit: si se cumple sigue el flujo; si no, el resto se omite.
      next.forEach((n) => addFlow(id, entryOf.get(n)!, 'Sí'));
      addFlow(id, addEnd(node.lane, 'No procede'), 'No');
      return;
    }

    if (terminators.has(step.step_id)) {
      // TerminateIf: si se cumple, el trámite concluye con ese desenlace.
      const terminal = terminators.get(step.step_id)!;
      addFlow(id, addEnd(node.lane, terminalLabel(terminal), terminal), 'Sí');
      continueTo(id, node.lane, next, 'No');
      return;
    }

    // Primero el camino normal, para que quede a la altura de la actividad y
    // el desenlace atrapado en la frontera debajo de él.
    continueTo(id, node.lane, next);

    // Un sub-trámite que puede concluir con un desenlace que se propaga: el
    // evento de frontera lo atrapa y este trámite concluye igual.
    const thrown = node.inner ? errorCodesOf(node.inner) : [];
    thrown.forEach((code) => {
      const boundaryId = `${id}_${toXmlId(code)}`;
      ctx.errors.add(code);
      nodes.set(boundaryId, {
        id: boundaryId,
        name: terminalLabel(code),
        kind: 'boundaryEvent',
        lane: node.lane,
        attachedTo: id,
        eventDef: 'error',
        errorCode: code,
      });
      addFlow(boundaryId, addEnd(node.lane, terminalLabel(code), code));
    });
  });

  return { nodes, flows };
}

function errorCodesOf(scope: Scope): string[] {
  return [
    ...new Set(
      [...scope.nodes.values()]
        .filter((n) => n.kind === 'endEvent' && n.eventDef === 'error' && n.errorCode)
        .map((n) => n.errorCode!),
    ),
  ];
}

interface ScopeLayout {
  pos: Map<string, Box>; // relativo al origen del scope
  inner: Map<string, ScopeLayout>;
  lanes: { key: LaneKey; y: number; h: number }[];
  width: number;
  height: number;
}

function nodeSize(n: BpmnNode, inner: Map<string, ScopeLayout>) {
  if (n.kind === 'subProcess') {
    const l = inner.get(n.id)!;
    return { w: l.width, h: l.height };
  }
  return SIZE[n.kind];
}

// Columnas por camino más largo desde el inicio (el grafo es un DAG) y filas
// apiladas por lane; columnas y filas toman el tamaño de su nodo más grande,
// así que un sub-trámite expandido ensancha su columna en lugar de encimarse.
function layoutScope(scope: Scope, laneOrder: LaneKey[] | null): ScopeLayout {
  const inner = new Map<string, ScopeLayout>();
  scope.nodes.forEach((n) => {
    if (n.inner) {
      const l = layoutScope(n.inner, null);
      l.width += SUB_PAD.x;
      l.height += SUB_PAD.top + SUB_PAD.bottom;
      inner.set(n.id, l);
    }
  });

  const placed = [...scope.nodes.values()].filter((n) => n.kind !== 'boundaryEvent');
  const hostOf = (id: string) => scope.nodes.get(id)?.attachedTo ?? id;
  const hasBoundary = new Set([...scope.nodes.values()].filter((n) => n.attachedTo).map((n) => n.attachedTo!));

  const out = new Map<string, string[]>();
  const indeg = new Map<string, number>();
  placed.forEach((n) => indeg.set(n.id, 0));
  scope.flows.forEach((f) => {
    const s = hostOf(f.source);
    out.set(s, [...(out.get(s) || []), f.target]);
    indeg.set(f.target, (indeg.get(f.target) || 0) + 1);
  });
  const col = new Map<string, number>();
  const queue = placed.map((n) => n.id).filter((id) => !indeg.get(id));
  queue.forEach((id) => col.set(id, 0));
  while (queue.length) {
    const id = queue.shift()!;
    (out.get(id) || []).forEach((t) => {
      col.set(t, Math.max(col.get(t) || 0, (col.get(id) || 0) + 1));
      indeg.set(t, indeg.get(t)! - 1);
      if (!indeg.get(t)) queue.push(t);
    });
  }

  const laneOf = (n: BpmnNode): LaneKey => (laneOrder ? n.lane : 'system');
  const lanesUsed = laneOrder ?? (['system'] as LaneKey[]);

  // Extensión de cada nodo respecto de su centro: arriba, abajo (data store y
  // evento de frontera cuelgan bajo él) y ancho.
  const ext = new Map<string, { up: number; down: number; w: number }>();
  placed.forEach((n) => {
    const { w, h } = nodeSize(n, inner);
    let down = h / 2;
    if (n.output) down += STORE.gap + STORE.h + STORE.label;
    if (hasBoundary.has(n.id)) down = Math.max(down, h / 2 + BOUNDARY_OVERHANG + 4);
    ext.set(n.id, { up: h / 2, down, w: Math.max(w, n.output ? STORE.w : 0) });
  });

  const row = new Map<string, number>();
  const used = new Map<string, number>();
  [...placed]
    .sort((a, b) => (col.get(a.id) || 0) - (col.get(b.id) || 0))
    .forEach((n) => {
      const key = `${laneOf(n)}:${col.get(n.id) || 0}`;
      const r = used.get(key) || 0;
      used.set(key, r + 1);
      row.set(n.id, r);
    });

  const maxCol = Math.max(0, ...placed.map((n) => col.get(n.id) || 0));
  const colW = Array.from({ length: maxCol + 1 }, () => 0);
  placed.forEach((n) => {
    const c = col.get(n.id) || 0;
    colW[c] = Math.max(colW[c], ext.get(n.id)!.w);
  });
  const originX = laneOrder ? POOL_LABEL_W + LANE_LABEL_W + PAD_X : SUB_PAD.x;
  const colX: number[] = [];
  colW.reduce((x, w, c) => {
    colX[c] = x;
    return x + w + GAP_X;
  }, originX);

  // Por lane y fila: cuánto sube y baja respecto de la línea de centros.
  const rowExt = new Map<string, { up: number; down: number }>();
  placed.forEach((n) => {
    const key = `${laneOf(n)}:${row.get(n.id)}`;
    const e = ext.get(n.id)!;
    const cur = rowExt.get(key) || { up: 0, down: 0 };
    rowExt.set(key, { up: Math.max(cur.up, e.up), down: Math.max(cur.down, e.down) });
  });

  const lanes: ScopeLayout['lanes'] = [];
  const rowY = new Map<string, number>();
  let y = laneOrder ? 0 : SUB_PAD.top;
  lanesUsed.forEach((key) => {
    const laneTop = y;
    let ry = laneTop + (laneOrder ? LANE_PAD : 0);
    for (let r = 0; rowExt.has(`${key}:${r}`); r++) {
      const e = rowExt.get(`${key}:${r}`)!;
      rowY.set(`${key}:${r}`, ry + e.up);
      ry += e.up + e.down + GAP_Y;
    }
    const h = laneOrder ? Math.max(ry - laneTop - GAP_Y + LANE_PAD, 80 + 2 * LANE_PAD) : ry - laneTop - GAP_Y;
    lanes.push({ key, y: laneTop, h });
    y += h;
  });

  const pos = new Map<string, Box>();
  placed.forEach((n) => {
    const c = col.get(n.id) || 0;
    const { w, h } = nodeSize(n, inner);
    const cx = colX[c] + colW[c] / 2;
    const cy = rowY.get(`${laneOf(n)}:${row.get(n.id)}`)!;
    pos.set(n.id, { x: cx - w / 2, y: cy - h / 2, w, h });
  });
  scope.nodes.forEach((n) => {
    if (!n.attachedTo) return;
    const host = pos.get(n.attachedTo)!;
    const { w, h } = SIZE.boundaryEvent;
    pos.set(n.id, { x: host.x + host.w - w - 20, y: host.y + host.h - h + BOUNDARY_OVERHANG, w, h });
  });

  const width = colX[maxCol] + colW[maxCol] + (laneOrder ? PAD_X : 0);
  return { pos, inner, lanes, width, height: laneOrder ? y : y - SUB_PAD.top };
}

// Pasa las posiciones de todos los scopes a coordenadas absolutas.
function absolutize(scope: Scope, l: ScopeLayout, dx: number, dy: number, out: Map<string, Box>) {
  scope.nodes.forEach((n) => {
    const p = l.pos.get(n.id)!;
    const abs = { ...p, x: p.x + dx, y: p.y + dy };
    out.set(n.id, abs);
    if (n.output) {
      // Alineado a la derecha de su paso: por la izquierda bajan los flujos
      // hacia la fila de abajo.
      out.set(n.output.storeId, {
        x: abs.x + abs.w - STORE.w,
        y: abs.y + abs.h + STORE.gap,
        w: STORE.w,
        h: STORE.h,
      });
    }
    if (n.inner) absolutize(n.inner, l.inner.get(n.id)!, abs.x, abs.y, out);
  });
}

function waypoints(a: Box, b: Box, fromBoundary: boolean) {
  const tx = b.x;
  const ty = b.y + b.h / 2;
  if (fromBoundary) {
    // Sale por abajo del evento de frontera y entra por la izquierda del destino.
    const sx = a.x + a.w / 2;
    const sy = a.y + a.h;
    if (ty >= sy) return [[sx, sy], [sx, ty], [tx, ty]];
    const my = sy + 15;
    const mx = tx - 25;
    return [[sx, sy], [sx, my], [mx, my], [mx, ty], [tx, ty]];
  }
  const sx = a.x + a.w;
  const sy = a.y + a.h / 2;
  if (Math.abs(sy - ty) < 1) return [[sx, sy], [tx, ty]];
  const mx = tx - 25;
  return [[sx, sy], [mx, sy], [mx, ty], [tx, ty]];
}

function allNodes(scope: Scope): BpmnNode[] {
  return [...scope.nodes.values()].flatMap((n) => [n, ...(n.inner ? allNodes(n.inner) : [])]);
}

function allFlows(scope: Scope): BpmnFlow[] {
  return [...scope.flows, ...[...scope.nodes.values()].flatMap((n) => (n.inner ? allFlows(n.inner) : []))];
}

const errorId = (code: string) => `Error_${toXmlId(code)}`;

function scopeXml(scope: Scope, depth: number): string {
  const pad = '  '.repeat(depth);
  const nodeXml = [...scope.nodes.values()].map((n) => {
    const attrs = [`id="${n.id}"`];
    if (n.name) attrs.push(`name="${xmlEscape(n.name)}"`);
    if (n.calledElement) attrs.push(`calledElement="${xmlEscape(n.calledElement)}"`);
    if (n.attachedTo) attrs.push(`attachedToRef="${n.attachedTo}"`);
    const body: string[] = [];
    if (n.documentation) body.push(`${pad}  <bpmn:documentation>${xmlEscape(n.documentation)}</bpmn:documentation>`);
    scope.flows.filter((f) => f.target === n.id).forEach((f) => body.push(`${pad}  <bpmn:incoming>${f.id}</bpmn:incoming>`));
    scope.flows.filter((f) => f.source === n.id).forEach((f) => body.push(`${pad}  <bpmn:outgoing>${f.id}</bpmn:outgoing>`));
    if (n.output) {
      body.push(
        `${pad}  <bpmn:dataOutputAssociation id="${n.output.assocId}">\n${pad}    <bpmn:targetRef>${n.output.storeId}</bpmn:targetRef>\n${pad}  </bpmn:dataOutputAssociation>`,
      );
    }
    if (n.eventDef === 'error') {
      body.push(`${pad}  <bpmn:errorEventDefinition id="${n.id}_ed" errorRef="${errorId(n.errorCode!)}" />`);
    } else if (n.eventDef === 'terminate') {
      body.push(`${pad}  <bpmn:terminateEventDefinition id="${n.id}_ed" />`);
    }
    if (n.inner) body.push(scopeXml(n.inner, depth + 1));
    return `${pad}<bpmn:${n.kind} ${attrs.join(' ')}>\n${body.join('\n')}\n${pad}</bpmn:${n.kind}>`;
  });

  const storeXml = [...scope.nodes.values()]
    .filter((n) => n.output)
    .map((n) => `${pad}<bpmn:dataStoreReference id="${n.output!.storeId}" name="${xmlEscape(n.output!.name)}" />`);

  const flowXml = scope.flows.map(
    (f) =>
      `${pad}<bpmn:sequenceFlow id="${f.id}" sourceRef="${f.source}" targetRef="${f.target}"${
        f.name ? ` name="${xmlEscape(f.name)}"` : ''
      } />`,
  );

  return [...nodeXml, ...storeXml, ...flowXml].join('\n');
}

export function workflowToBpmnXml(workflow: WorkflowDef, resolve: WorkflowResolver = () => undefined): string {
  const ctx: BuildCtx = {
    resolve,
    ancestors: workflow.workflow_id ? [workflow.workflow_id] : [],
    seq: { flow: 0, end: 0 },
    errors: new Set(),
  };
  const root = buildScope(workflow, '', ctx, []);
  const admin = isAdminWorkflow(workflow);
  const laneNames: Record<LaneKey, string> = {
    human: admin ? 'Servidor público' : 'Solicitante',
    system: 'Sistema',
    admin: 'Validación administrativa',
  };
  const laneOrder = (['human', 'system', 'admin'] as LaneKey[]).filter((k) =>
    [...root.nodes.values()].some((n) => n.lane === k),
  );
  const rootLayout = layoutScope(root, laneOrder);
  const { lanes, width, height } = rootLayout;
  const pos = new Map<string, Box>();
  absolutize(root, rootLayout, 0, 0, pos);

  const processId = `Process_${toXmlId(workflow.workflow_id || 'tramite')}`;
  const name = xmlEscape(workflow.name || workflow.workflow_id || 'Trámite');
  const r = Math.round;

  const laneXml = lanes
    .map(
      (l) =>
        `      <bpmn:lane id="Lane_${l.key}" name="${xmlEscape(laneNames[l.key])}">\n` +
        [...root.nodes.values()]
          .filter((n) => n.lane === l.key)
          .map((n) => `        <bpmn:flowNodeRef>${n.id}</bpmn:flowNodeRef>`)
          .join('\n') +
        `\n      </bpmn:lane>`,
    )
    .join('\n');

  const errorXml = [...ctx.errors]
    .map((code) => `  <bpmn:error id="${errorId(code)}" name="${xmlEscape(terminalLabel(code))}" errorCode="${xmlEscape(code)}" />`)
    .join('\n');

  const nodes = allNodes(root);
  const flows = allFlows(root);
  const label = (p: Box) =>
    `\n        <bpmndi:BPMNLabel>\n          <dc:Bounds x="${r(p.x - 30)}" y="${r(p.y + p.h + 4)}" width="${r(p.w + 60)}" height="28" />\n        </bpmndi:BPMNLabel>`;

  const laneX = POOL_LABEL_W;
  const shapes = [
    `      <bpmndi:BPMNShape id="Participant_1_di" bpmnElement="Participant_1" isHorizontal="true">\n        <dc:Bounds x="0" y="0" width="${r(width)}" height="${r(height)}" />\n      </bpmndi:BPMNShape>`,
    ...lanes.map(
      (l) =>
        `      <bpmndi:BPMNShape id="Lane_${l.key}_di" bpmnElement="Lane_${l.key}" isHorizontal="true">\n        <dc:Bounds x="${laneX}" y="${r(l.y)}" width="${r(width - laneX)}" height="${r(l.h)}" />\n      </bpmndi:BPMNShape>`,
    ),
    ...nodes.map((n) => {
      const p = pos.get(n.id)!;
      const isGw = n.kind.endsWith('Gateway');
      const extra = isGw ? ' isMarkerVisible="true"' : n.kind === 'subProcess' ? ' isExpanded="true"' : '';
      const withLabel = (n.kind.endsWith('Event') && n.kind !== 'boundaryEvent') || (isGw && n.name);
      return `      <bpmndi:BPMNShape id="${n.id}_di" bpmnElement="${n.id}"${extra}>\n        <dc:Bounds x="${r(p.x)}" y="${r(p.y)}" width="${r(p.w)}" height="${r(p.h)}" />${
        withLabel ? label(p) : ''
      }\n      </bpmndi:BPMNShape>`;
    }),
    ...nodes
      .filter((n) => n.output)
      .map((n) => {
        const p = pos.get(n.output!.storeId)!;
        return `      <bpmndi:BPMNShape id="${n.output!.storeId}_di" bpmnElement="${n.output!.storeId}">\n        <dc:Bounds x="${r(p.x)}" y="${r(p.y)}" width="${p.w}" height="${p.h}" />${label(p)}\n      </bpmndi:BPMNShape>`;
      }),
  ].join('\n');

  const boundaries = new Set(nodes.filter((n) => n.kind === 'boundaryEvent').map((n) => n.id));
  const edge = (id: string, wps: number[][]) =>
    `      <bpmndi:BPMNEdge id="${id}_di" bpmnElement="${id}">\n${wps
      .map(([x, y]) => `        <di:waypoint x="${r(x)}" y="${r(y)}" />`)
      .join('\n')}\n      </bpmndi:BPMNEdge>`;
  const edges = [
    ...flows.map((f) => edge(f.id, waypoints(pos.get(f.source)!, pos.get(f.target)!, boundaries.has(f.source)))),
    ...nodes
      .filter((n) => n.output)
      .map((n) => {
        const a = pos.get(n.id)!;
        const s = pos.get(n.output!.storeId)!;
        return edge(n.output!.assocId, [
          [s.x + s.w / 2, a.y + a.h],
          [s.x + s.w / 2, s.y],
        ]);
      }),
  ].join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_${toXmlId(workflow.workflow_id || 'tramite')}" targetNamespace="https://munistream.com/bpmn" exporter="MuniStream" exporterVersion="1.1">
${errorXml ? `${errorXml}\n` : ''}  <bpmn:collaboration id="Collaboration_1">
    <bpmn:participant id="Participant_1" name="${name}" processRef="${processId}" />
  </bpmn:collaboration>
  <bpmn:process id="${processId}" name="${name}" isExecutable="false">
    <bpmn:laneSet id="LaneSet_1">
${laneXml}
    </bpmn:laneSet>
${scopeXml(root, 2)}
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

// Trae, recursivamente, las definiciones de los sub-trámites que lanza un
// trámite. Cada uno se pide una sola vez; uno que no carga queda como
// callActivity en el diagrama en lugar de romperlo.
export async function resolveSubworkflows(
  workflow: WorkflowDef,
  fetchWorkflow: (workflowId: string) => Promise<WorkflowDef | undefined>,
): Promise<Record<string, WorkflowDef>> {
  const found: Record<string, WorkflowDef> = {};
  const seen = new Set<string>(workflow?.workflow_id ? [workflow.workflow_id] : []);
  let frontier = [workflow];
  for (let depth = 0; depth < MAX_DEPTH && frontier.length; depth++) {
    const ids = [
      ...new Set(
        frontier.flatMap((wf) =>
          (wf?.steps || [])
            .filter((s) => s.operator_class === 'WorkflowStartOperator')
            .map(childIdOf)
            .filter((id: string | undefined): id is string => !!id && !seen.has(id)),
        ),
      ),
    ];
    ids.forEach((id) => seen.add(id));
    const loaded = await Promise.all(ids.map((id) => fetchWorkflow(id).catch(() => undefined)));
    frontier = [];
    loaded.forEach((wf, i) => {
      if (wf?.steps?.length) {
        found[ids[i]] = wf;
        frontier.push(wf);
      }
    });
  }
  return found;
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
