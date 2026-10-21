import { describe, expect, it } from 'vitest';
import { BpmnModdle } from 'bpmn-moddle';
import { resolveSubworkflows, workflowToBpmnXml } from './bpmnExport';

// Parsea el XML con el mismo modelo que usa bpmn-js: si hay referencias rotas
// o elementos fuera del esquema, aparecen como warnings.
async function parse(workflow: any, subworkflows: Record<string, any> = {}) {
  const xml = workflowToBpmnXml(workflow, (id) => subworkflows[id]);
  const { rootElement, warnings } = await new BpmnModdle().fromXML(xml);
  const process = rootElement.rootElements.find((e: any) => e.$type === 'bpmn:Process');
  const plane = rootElement.diagrams[0].plane;
  const nodes = process.flowElements.filter((e: any) => e.$type !== 'bpmn:SequenceFlow');
  const flows = process.flowElements.filter((e: any) => e.$type === 'bpmn:SequenceFlow');
  const byType = (type: string) => nodes.filter((n: any) => n.$type === `bpmn:${type[0].toUpperCase()}${type.slice(1)}`);
  const flowsFrom = (id: string) => flows.filter((f: any) => f.sourceRef.id === id);
  const laneOf = (id: string) =>
    process.laneSets[0].lanes.find((l: any) => (l.flowNodeRef || []).some((n: any) => n.id === id));
  // Todos los elementos, también los que viven dentro de sub-procesos.
  const all: any[] = [];
  const walk = (els: any[] = []) =>
    els.forEach((e) => {
      all.push(e);
      walk(e.flowElements);
    });
  walk(process.flowElements);
  const byId = (id: string) => all.find((e) => e.id === id);
  const di = new Map<string, any>(plane.planeElement.map((e: any) => [e.bpmnElement.id, e]));
  return { xml, warnings, process, plane, nodes, flows, byType, flowsFrom, laneOf, all, byId, di };
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

  describe('sub-trámites (WorkflowStartOperator)', () => {
    const start = (id: string, child: string, extra: any = {}, next: string[] = []) =>
      step(id, 'WorkflowStartOperator', next, {
        operator_config: {
          child_workflow_id: child,
          child_workflow_type: 'admin',
          wait_for_completion: true,
          required_status: 'completed',
          propagate_terminal: ['rejected'],
          timeout_minutes: 7200,
          ...extra,
        },
      });

    const validacion = {
      workflow_id: 'admin_validacion',
      name: 'Validación administrativa',
      steps: [
        step('revision', 'UserInputOperator', ['es_rechazo']),
        step('es_rechazo', 'ShortCircuitOperator', ['emitir_oficio']),
        step('emitir_oficio', 'EntityCreationOperator', ['desenlace'], {
          operator_config: { emits_entity: { entity_type: 'oficio_rechazo' } },
        }),
        step('desenlace', 'TerminateIfOperator', [], { operator_config: { terminal_status: 'rejected' } }),
      ],
    };

    const tramite = {
      workflow_id: 'tramite_sustitucion',
      name: 'Sustitución de titular',
      steps: [
        step('captura', 'UserInputOperator', ['validacion']),
        start('validacion', 'admin_validacion', {}, ['emitir_titulo']),
        step('emitir_titulo', 'EntityCreationOperator', [], {
          operator_config: { emits_entity: { entity_type: 'titulo_concesion' } },
        }),
      ],
    };

    it('expande el hijo como subProcess con sus pasos dentro', async () => {
      const { warnings, byId, byType, di } = await parse(tramite, { admin_validacion: validacion });
      expect(warnings).toEqual([]);
      expect(byType('callActivity')).toHaveLength(0);
      const sub = byId('validacion');
      expect(sub.$type).toBe('bpmn:SubProcess');
      const inner = sub.flowElements.map((e: any) => e.id);
      expect(inner).toEqual(expect.arrayContaining(['validacion__revision', 'validacion__emitir_oficio', 'validacion__StartEvent_1']));
      expect(di.get('validacion').isExpanded).toBe(true);
      expect(sub.documentation[0].text).toContain('admin_validacion');
      expect(sub.documentation[0].text).toContain('7200 min');
    });

    it('dibuja cada paso del hijo dentro de los límites del subProcess', async () => {
      const { byId, di } = await parse(tramite, { admin_validacion: validacion });
      const box = di.get('validacion').bounds;
      byId('validacion').flowElements
        .filter((e: any) => e.$type !== 'bpmn:SequenceFlow')
        .forEach((e: any) => {
          const b = di.get(e.id).bounds;
          expect(b.x, e.id).toBeGreaterThanOrEqual(box.x);
          expect(b.y, e.id).toBeGreaterThanOrEqual(box.y);
          expect(b.x + b.width, e.id).toBeLessThanOrEqual(box.x + box.width);
          expect(b.y + b.height, e.id).toBeLessThanOrEqual(box.y + box.height);
        });
    });

    it('un rechazo del hijo se lanza como error y el padre lo atrapa y concluye', async () => {
      const { byId, all, flowsFrom } = await parse(tramite, { admin_validacion: validacion });
      const errorEnd = all.find(
        (e: any) => e.$type === 'bpmn:EndEvent' && e.id.startsWith('validacion__') && e.eventDefinitions?.length,
      );
      expect(errorEnd.eventDefinitions[0].$type).toBe('bpmn:ErrorEventDefinition');
      expect(errorEnd.eventDefinitions[0].errorRef.errorCode).toBe('rejected');
      expect(byId('validacion__desenlace').$type).toBe('bpmn:ExclusiveGateway');

      const boundary = all.find((e: any) => e.$type === 'bpmn:BoundaryEvent');
      expect(boundary.attachedToRef.id).toBe('validacion');
      expect(boundary.eventDefinitions[0].errorRef.errorCode).toBe('rejected');
      const fin = flowsFrom(boundary.id)[0].targetRef;
      expect(fin.name).toBe('Rechazado');
      expect(fin.eventDefinitions[0].$type).toBe('bpmn:TerminateEventDefinition');
      // Si se aprueba, el trámite sigue normalmente.
      expect(flowsFrom('validacion').map((f: any) => f.targetRef.id)).toEqual(['emitir_titulo']);
    });

    it('sin propagate_terminal el rechazo del hijo no lanza error al padre', async () => {
      const sinPropagar = { ...tramite, steps: [tramite.steps[0], start('validacion', 'admin_validacion', { propagate_terminal: [] })] };
      const { all, warnings } = await parse(sinPropagar, { admin_validacion: validacion });
      expect(warnings).toEqual([]);
      expect(all.some((e: any) => e.$type === 'bpmn:BoundaryEvent')).toBe(false);
      const fin = all.find((e: any) => e.id.startsWith('validacion__') && e.name === 'Rechazado');
      expect(fin.eventDefinitions[0].$type).toBe('bpmn:TerminateEventDefinition');
    });

    it('expande recursivamente y propaga el rechazo nivel por nivel', async () => {
      const opinion = {
        workflow_id: 'opinion_imipas',
        steps: [
          step('dictamen', 'UserInputOperator', ['desenlace']),
          step('desenlace', 'TerminateIfOperator', [], { operator_config: { terminal_status: 'rejected' } }),
        ],
      };
      const validacionConOpinion = {
        ...validacion,
        steps: [start('opinion', 'opinion_imipas', {}, ['revision']), ...validacion.steps],
      };
      const { warnings, byId, all } = await parse(tramite, {
        admin_validacion: validacionConOpinion,
        opinion_imipas: opinion,
      });
      expect(warnings).toEqual([]);
      const nieto = byId('validacion__opinion');
      expect(nieto.$type).toBe('bpmn:SubProcess');
      expect(nieto.flowElements.map((e: any) => e.id)).toContain('validacion__opinion__dictamen');

      // El rechazo del nieto lo atrapa la validación, que a su vez lo relanza al trámite.
      const fronteraMedia = all.find((e: any) => e.$type === 'bpmn:BoundaryEvent' && e.attachedToRef.id === 'validacion__opinion');
      const relanzado = fronteraMedia.outgoing[0].targetRef;
      expect(relanzado.eventDefinitions[0].$type).toBe('bpmn:ErrorEventDefinition');
      expect(all.some((e: any) => e.$type === 'bpmn:BoundaryEvent' && e.attachedToRef.id === 'validacion')).toBe(true);
    });

    it('corta los ciclos dejando una callActivity que nombra el trámite', async () => {
      const a = { workflow_id: 'a', steps: [step('captura', 'UserInputOperator', ['lanza_b']), start('lanza_b', 'b')] };
      const b = { workflow_id: 'b', steps: [start('lanza_a', 'a')] };
      const { warnings, byId } = await parse(a, { a, b });
      expect(warnings).toEqual([]);
      expect(byId('lanza_b').$type).toBe('bpmn:SubProcess');
      const ciclo = byId('lanza_b__lanza_a');
      expect(ciclo.$type).toBe('bpmn:CallActivity');
      expect(ciclo.calledElement).toBe('a');
    });

    it('sin la definición del hijo queda como callActivity', async () => {
      const { byId } = await parse(tramite);
      expect(byId('validacion').$type).toBe('bpmn:CallActivity');
      expect(byId('validacion').calledElement).toBe('admin_validacion');
    });

    it('un hijo que no se espera no se expande', async () => {
      const sinEspera = { ...tramite, steps: [tramite.steps[0], start('validacion', 'admin_validacion', { wait_for_completion: false })] };
      const { byId } = await parse(sinEspera, { admin_validacion: validacion });
      expect(byId('validacion').$type).toBe('bpmn:CallActivity');
      expect(byId('validacion').documentation[0].text).toContain('No espera');
    });

    it('resolveSubworkflows trae cada hijo una vez, recursivamente y sin ciclos', async () => {
      const opinion = { workflow_id: 'opinion_imipas', steps: [start('vuelta', 'tramite_sustitucion')] };
      const defs: Record<string, any> = {
        admin_validacion: { ...validacion, steps: [start('opinion', 'opinion_imipas'), ...validacion.steps] },
        opinion_imipas: opinion,
        tramite_sustitucion: tramite,
      };
      const pedidos: string[] = [];
      const found = await resolveSubworkflows(tramite, async (id) => {
        pedidos.push(id);
        return defs[id];
      });
      expect(Object.keys(found).sort()).toEqual(['admin_validacion', 'opinion_imipas']);
      expect(pedidos.sort()).toEqual(['admin_validacion', 'opinion_imipas']);
    });

    it('un hijo que falla al cargar no rompe la resolución', async () => {
      const found = await resolveSubworkflows(tramite, async () => {
        throw new Error('404');
      });
      expect(found).toEqual({});
    });
  });

  describe('emisión de entidades', () => {
    it('cada EntityCreationOperator escribe en un data store con el tipo de entidad', async () => {
      const { warnings, byId, di } = await parse({
        workflow_id: 'emite',
        steps: [
          step('captura', 'UserInputOperator', ['emitir']),
          step('emitir', 'EntityCreationOperator', [], {
            operator_config: { emits_entity: { entity_type: 'permiso_pesca_comercial' } },
          }),
        ],
      });
      expect(warnings).toEqual([]);
      const task = byId('emitir');
      expect(task.dataOutputAssociations).toHaveLength(1);
      const store = task.dataOutputAssociations[0].targetRef;
      expect(store.$type).toBe('bpmn:DataStoreReference');
      expect(store.name).toBe('Entidad: Permiso pesca comercial');
      expect(di.get(store.id)).toBeDefined();
      expect(di.get(task.dataOutputAssociations[0].id).waypoint).toHaveLength(2);
    });

    it('EntityUpdateOperator escribe en la entidad que actualiza', async () => {
      const { byId } = await parse({
        workflow_id: 'actualiza',
        steps: [step('actualizar', 'EntityUpdateOperator', [], { operator_config: { updates_entity: { entity_id_source: 'x' } } })],
      });
      expect(byId('actualizar').dataOutputAssociations[0].targetRef.name).toBe('Entidad (actualización)');
    });

    it('los pasos sin entidad no llevan data store', async () => {
      const { all } = await parse(linear);
      expect(all.some((e: any) => e.$type === 'bpmn:DataStoreReference')).toBe(false);
    });
  });
});
