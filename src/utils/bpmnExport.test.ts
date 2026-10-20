import { describe, expect, it } from 'vitest';
import { BpmnModdle } from 'bpmn-moddle';
import { workflowToBpmnXml } from './bpmnExport';

// Parsea el XML con el mismo modelo que usa bpmn-js: si hay referencias rotas
// o elementos fuera del esquema, aparecen como warnings.
async function parse(workflow: any) {
  const xml = workflowToBpmnXml(workflow);
  const { rootElement, warnings } = await new BpmnModdle().fromXML(xml);
  const process = rootElement.rootElements.find((e: any) => e.$type === 'bpmn:Process');
  const plane = rootElement.diagrams[0].plane;
  const nodes = process.flowElements.filter((e: any) => e.$type !== 'bpmn:SequenceFlow');
  const flows = process.flowElements.filter((e: any) => e.$type === 'bpmn:SequenceFlow');
  const byType = (type: string) => nodes.filter((n: any) => n.$type === `bpmn:${type[0].toUpperCase()}${type.slice(1)}`);
  const flowsFrom = (id: string) => flows.filter((f: any) => f.sourceRef.id === id);
  const laneOf = (id: string) =>
    process.laneSets[0].lanes.find((l: any) => (l.flowNodeRef || []).some((n: any) => n.id === id));
  return { xml, warnings, process, plane, nodes, flows, byType, flowsFrom, laneOf };
}

const step = (step_id: string, operator_class: string, next_steps: string[] = [], extra: any = {}) => ({
  step_id,
  name: step_id,
  operator_class,
  next_steps,
  ...extra,
});

const linear = {
  workflow_id: 'licencia_funcionamiento',
  name: 'Licencia de funcionamiento',
  steps: [
    step('captura', 'UserInputOperator', ['validar_rfc']),
    step('validar_rfc', 'RfcValidationOperator', ['emitir']),
    step('emitir', 'DocumentGenerationOperator'),
  ],
};

describe('workflowToBpmnXml', () => {
  it('genera BPMN 2.0 válido sin warnings', async () => {
    const { warnings, process } = await parse(linear);
    expect(warnings).toEqual([]);
    expect(process.id).toBe('Process_licencia_funcionamiento');
    expect(process.isExecutable).toBe(false);
  });

  it('encadena inicio → pasos → fin en un flujo lineal', async () => {
    const { byType, flowsFrom } = await parse(linear);
    expect(byType('startEvent')).toHaveLength(1);
    expect(byType('endEvent')).toHaveLength(1);
    expect(flowsFrom('StartEvent_1').map((f: any) => f.targetRef.id)).toEqual(['captura']);
    expect(flowsFrom('captura').map((f: any) => f.targetRef.id)).toEqual(['validar_rfc']);
    expect(flowsFrom('emitir')[0].targetRef.$type).toBe('bpmn:EndEvent');
  });

  it('clasifica pasos humanos y de sistema en sus lanes', async () => {
    const { byType, laneOf } = await parse(linear);
    expect(byType('userTask').map((n: any) => n.id)).toEqual(['captura']);
    expect(byType('serviceTask').map((n: any) => n.id)).toEqual(['validar_rfc', 'emitir']);
    expect(laneOf('captura').name).toBe('Solicitante');
    expect(laneOf('emitir').name).toBe('Sistema');
  });

  it('nombra la lane humana "Servidor público" en trámites admin', async () => {
    const { laneOf } = await parse({ ...linear, workflow_id: 'admin_revision' });
    expect(laneOf('captura').name).toBe('Servidor público');
  });

  it('convierte una condición en gateway exclusivo con ramas Sí/No', async () => {
    const { byType, flowsFrom, warnings } = await parse({
      workflow_id: 'cond',
      steps: [
        step('captura', 'UserInputOperator', ['es_exento']),
        step('es_exento', 'ShortCircuitOperator', ['emitir']),
        step('emitir', 'DocumentGenerationOperator'),
      ],
    });
    expect(warnings).toEqual([]);
    expect(byType('exclusiveGateway').map((n: any) => n.id)).toEqual(['es_exento']);
    const out = flowsFrom('es_exento');
    expect(out.map((f: any) => f.name).sort()).toEqual(['No', 'Sí']);
    const no = out.find((f: any) => f.name === 'No');
    expect(no.targetRef.$type).toBe('bpmn:EndEvent');
    expect(no.targetRef.name).toBe('No procede');
  });

  it('abre gateway paralelo con varios next_steps y une con otro paralelo', async () => {
    const { flowsFrom, nodes } = await parse({
      workflow_id: 'paralelo',
      steps: [
        step('captura', 'UserInputOperator', ['a', 'b']),
        step('a', 'ServiceOperator', ['fin']),
        step('b', 'ServiceOperator', ['fin']),
        step('fin', 'DocumentGenerationOperator'),
      ],
    });
    const split = nodes.find((n: any) => n.id === 'Split_captura');
    const join = nodes.find((n: any) => n.id === 'Join_fin');
    expect(split.$type).toBe('bpmn:ParallelGateway');
    expect(join.$type).toBe('bpmn:ParallelGateway');
    expect(flowsFrom('Split_captura').map((f: any) => f.targetRef.id).sort()).toEqual(['a', 'b']);
    expect(flowsFrom('a')[0].targetRef.id).toBe('Join_fin');
    expect(flowsFrom('Join_fin')[0].targetRef.id).toBe('fin');
  });

  it('usa unión exclusiva cuando una rama viene de una condición', async () => {
    const { nodes } = await parse({
      workflow_id: 'union',
      steps: [
        step('captura', 'UserInputOperator', ['cond', 'pago']),
        step('cond', 'ShortCircuitOperator', ['fin']),
        step('pago', 'PaymentOperator', ['fin']),
        step('fin', 'DocumentGenerationOperator'),
      ],
    });
    expect(nodes.find((n: any) => n.id === 'Join_fin').$type).toBe('bpmn:ExclusiveGateway');
  });

  it('abre gateway paralelo desde el inicio si hay varias raíces', async () => {
    const { flowsFrom } = await parse({
      workflow_id: 'raices',
      steps: [step('a', 'UserInputOperator'), step('b', 'UserInputOperator')],
    });
    expect(flowsFrom('StartEvent_1').map((f: any) => f.targetRef.id)).toEqual(['Split_start']);
    expect(flowsFrom('Split_start')).toHaveLength(2);
  });

  it('representa WorkflowStartOperator como callActivity en la lane administrativa', async () => {
    const { byType, laneOf } = await parse({
      workflow_id: 'con_validacion',
      steps: [
        step('captura', 'UserInputOperator', ['validacion']),
        step('validacion', 'WorkflowStartOperator', [], { configuration: { workflow_id: 'admin_validacion' } }),
      ],
    });
    const call = byType('callActivity')[0];
    expect(call.id).toBe('validacion');
    expect(call.calledElement).toBe('admin_validacion');
    expect(laneOf('validacion').name).toBe('Validación administrativa');
  });

  it('escapa nombres y sanea ids que no son NCName', async () => {
    const { warnings, nodes, xml } = await parse({
      workflow_id: '01-trámite',
      name: 'Pesca & "acuacultura" <ribereña>',
      steps: [step('1 captura', 'UserInputOperator', [], { name: 'Datos <del> titular & "socio"' })],
    });
    expect(warnings).toEqual([]);
    expect(xml).toContain('name="Pesca &amp; &quot;acuacultura&quot; &lt;ribereña&gt;"');
    const task = nodes.find((n: any) => n.$type === 'bpmn:UserTask');
    expect(task.id).toBe('_1_captura');
    expect(task.name).toBe('Datos <del> titular & "socio"');
  });

  it('ignora next_steps que apuntan a pasos inexistentes', async () => {
    const { warnings, flowsFrom } = await parse({
      workflow_id: 'huerfano',
      steps: [step('captura', 'UserInputOperator', ['no_existe'])],
    });
    expect(warnings).toEqual([]);
    expect(flowsFrom('captura')[0].targetRef.$type).toBe('bpmn:EndEvent');
  });

  it('dibuja cada nodo y flujo, con cada nodo dentro de su lane', async () => {
    const { plane, nodes, flows, laneOf } = await parse({
      workflow_id: 'di',
      steps: [
        step('captura', 'UserInputOperator', ['a', 'b']),
        step('a', 'ServiceOperator', ['firma']),
        step('b', 'ServiceOperator', ['firma']),
        step('firma', 'FielSignerOperator'),
      ],
    });
    const di = new Map<string, any>(plane.planeElement.map((e: any) => [e.bpmnElement.id, e]));
    flows.forEach((f: any) => expect(di.get(f.id)?.waypoint.length).toBeGreaterThanOrEqual(2));
    nodes.forEach((n: any) => {
      const shape: any = di.get(n.id);
      const lane: any = di.get(laneOf(n.id).id);
      expect(shape, n.id).toBeDefined();
      expect(shape.bounds.y).toBeGreaterThanOrEqual(lane.bounds.y);
      expect(shape.bounds.y + shape.bounds.height).toBeLessThanOrEqual(lane.bounds.y + lane.bounds.height);
    });
  });
});
