import {
  Accordion, AccordionDetails, AccordionSummary, Box, Chip, Link, Paper, Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FolderIcon from '@mui/icons-material/Folder';
import DescriptionIcon from '@mui/icons-material/Description';
import VerifiedIcon from '@mui/icons-material/Verified';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ListAltIcon from '@mui/icons-material/ListAlt';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { useTranslation } from 'react-i18next';
import AttachmentCard from '../AttachmentCard';
import EntityDocumentView from '../EntityDocumentView';
import FieldValue from './FieldValue';
import { formatApiDateTime } from '@/utils/dates';
import { useRecursos } from './recursos';

/**
 * Cómo se presenta la salida de cada operador.
 *
 * El expediente llega agrupado por paso y con la procedencia de cada grupo: el
 * executor deja constancia de qué operador escribió qué claves. Aquí se decide
 * qué hacer con eso, porque cada operador produce una clase de cosa distinta —un
 * formulario, unos archivos, una entidad elegida, una firma— y merece leerse
 * como esa cosa y no como JSON.
 *
 * Quien no tenga entrada en el registro cae en la presentación por campo, que
 * distingue fechas, importes, direcciones y archivos por el valor. El volcado de
 * JSON no es una opción en ninguna rama.
 *
 * Los nombres de clave de cada operador son los que escribe su `get_output()`;
 * están comprobados contra el backend, no supuestos.
 */

export interface DatosDePaso {
  /** Las claves que ese paso escribió, tal como llegan del expediente. */
  campos: Record<string, unknown>;
  /** Id del paso, para poder recortar el prefijo de sus propias claves. */
  task: string;
}

export interface Visualizador {
  /** Etiqueta estable; el panel la publica como `data-visualizador`. */
  nombre: string;
  Componente: (p: DatosDePaso) => JSX.Element | null;
}

/** El valor que el paso guardó bajo `{task}_{sufijo}`. */
function bajo(campos: Record<string, unknown>, task: string, sufijo: string): unknown {
  return campos[`${task}_${sufijo}`];
}

/** Claves de fontanería: dicen cómo fue el paso, no qué aportó el ciudadano. */
const FONTANERIA = new Set([
  'submitted_at',
  'validated',
  'waiting_for',
  'form_config',
  // El catalogo que el selector de entidades le ofrecio al ciudadano. Es lo mismo
  // que `form_config`: lo que se le puso delante, no lo que eligio. El
  // visualizador de entidades si lo lee, pero para ponerle nombre a lo elegido,
  // no para ensenarlo.
  'discovery_cache',
  'required_fields',
  'validation_errors',
  'previous_input',
  'selection_timestamp',
  'message',
]);

/** El operador de subtrámite guarda su propio estado en el context; no es un dato del trámite. */
const ESTADO_INTERNO = /^workflow_start_.+_state$/;

/**
 * Deja los campos listos para mostrarse.
 *
 * Dos cosas: los sobres —`{task}_input`, `{task}_data`, `{task}_result`— se abren
 * para que se vean los campos de dentro y no la caja; y a lo que queda suelto se
 * le quita el prefijo del paso, que ya está en el encabezado y repetido en cada
 * fila solo estorba.
 */
function valoresDe(campos: Record<string, unknown>, task: string): Record<string, unknown> {
  const salida: Record<string, unknown> = {};
  for (const [clave, valor] of Object.entries(campos)) {
    const corto = clave.startsWith(`${task}_`) ? clave.slice(task.length + 1) : clave;

    // El descarte va antes de abrir el sobre, no despues: `form_config` es un
    // objeto, y abrirlo primero derramaba en el expediente el titulo, la
    // descripcion y los campos del formulario que se le pinta al ciudadano.
    if (FONTANERIA.has(corto) || ESTADO_INTERNO.test(corto)) continue;

    if (valor && typeof valor === 'object' && !Array.isArray(valor)) {
      Object.assign(salida, valor as Record<string, unknown>);
      continue;
    }
    salida[corto] = valor;
  }
  return salida;
}

function Vacio() {
  const { t } = useTranslation();
  return (
    <Typography data-presentacion="vacio" variant="body2" color="text.secondary">
      {t('operador.sinDatos')}
    </Typography>
  );
}

function Campos({ campos, task, presentacion = 'campos' }: DatosDePaso & { presentacion?: string }) {
  const entradas = Object.entries(valoresDe(campos, task));

  if (entradas.length === 0) {
    // Pasa cuando el paso solo ha escrito andamiaje: esta en espera y todavia no
    // ha recogido nada. Decirlo conserva la forma del tramite; esconder el paso
    // dejaria un expediente con huecos que nadie puede explicar.
    return <Vacio />;
  }

  return (
    <Box
      data-presentacion={presentacion}
      sx={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 30%) minmax(0, 1fr)', gap: 1 }}
    >
      {entradas.map(([clave, valor]) => (
        <Box key={clave} sx={{ display: 'contents' }}>
          <Typography variant="caption" color="text.secondary" sx={{ pt: 0.25, wordBreak: 'break-word' }}>
            {clave}
          </Typography>
          <FieldValue name={clave} value={valor} />
        </Box>
      ))}
    </Box>
  );
}

/** Lo que el ciudadano rellenó. */
function Formulario(p: DatosDePaso) {
  return <Campos {...p} presentacion="formulario" />;
}

/**
 * Archivos que el ciudadano subió en este paso.
 *
 * El paso guarda claves de S3, no archivos. El backend ya las normaliza en la
 * lista de adjuntos del expediente —con su tipo, su tamaño y de qué paso salió—,
 * así que aquí basta con quedarse con los de este paso y usar la misma tarjeta
 * que la pestaña de adjuntos: se ven y se descargan sin salir del expediente.
 *
 * Lo que no tenga adjunto correspondiente se enseña igualmente, con su nombre y
 * sin acciones: es un archivo de un trámite viejo que nunca llegó a copiarse a
 * S3, y esconderlo daría a entender que ese paso no subió nada.
 */
function Archivos({ campos, task }: DatosDePaso) {
  const { t } = useTranslation();
  const recursos = useRecursos();
  const sobre = bajo(campos, task, 'result') as Record<string, unknown> | undefined;
  const lista = (sobre?.uploaded_files ?? valoresDe(campos, task).uploaded_files) as unknown[];

  if (!Array.isArray(lista) || lista.length === 0) return <Campos campos={campos} task={task} />;

  const adjuntos = (recursos?.attachments ?? []).filter((a) => a.task_id === task);
  const porClave = new Map(adjuntos.filter((a) => a.s3_key).map((a) => [a.s3_key as string, a]));

  return (
    <Box data-presentacion="archivos" sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
      {lista.map((f: any, i) => {
        const adjunto = porClave.get(f?.s3_key) ?? adjuntos[i];
        if (adjunto && recursos) {
          return (
            <AttachmentCard
              key={adjunto.attachment_id}
              instanceId={recursos.instanceId}
              attachment={adjunto}
              onPreview={recursos.previsualizar}
            />
          );
        }
        return (
          <Paper key={i} variant="outlined" sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <DescriptionIcon color="action" />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" noWrap title={f?.filename || f?.s3_key}>
                {f?.filename || f?.s3_key?.split('/').pop() || t('operador.archivo')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {f?.size ? `${Math.round(f.size / 1024)} KB` : '—'}
              </Typography>
            </Box>
          </Paper>
        );
      })}
    </Box>
  );
}

/**
 * Entidades de la cartera que el ciudadano eligió como requisito.
 *
 * Hay que cruzar dos claves y no basta con una: `{task}_discovery_cache` guarda
 * lo que el paso **ofreció** —la cartera entera del ciudadano, con los datos de
 * cada entidad— y `{task}_input.{task}_selections` guarda lo que **eligió**, que
 * son solo identificadores. Enseñar el cache sin cruzarlo daba una lista de ocho
 * embarcaciones en un trámite donde no se eligió ninguna.
 *
 * Las selecciones llegan a veces como texto: el formulario del portal manda los
 * campos estructurados serializados.
 *
 * De cada elegida se enseña su documento, no su nombre: una embarcación
 * registrada o un permiso son documentos con sello, vigencia y firma, y eso es lo
 * que hay que mirar para dar por bueno el requisito. Con una sola se abre de
 * entrada; con varias se dejan plegadas, porque cada documento es un iframe y
 * traerlos todos para que nadie los mire cuesta lo mismo que mirarlos.
 */
interface EntidadElegida {
  entity_id: string;
  name?: string | null;
  entity_type?: string | null;
}

/** `{"pescador_rnpa_ids": ["pescador_rnpa_e7158..."]}` -> una entrada por id, con su tipo. */
function idsPorTipo(mapa: Record<string, unknown>): EntidadElegida[] {
  return Object.entries(mapa)
    .filter(([k, v]) => k.endsWith('_ids') && Array.isArray(v))
    .flatMap(([k, v]) =>
      (v as unknown[])
        .filter((id) => typeof id === 'string' && id)
        .map((id) => ({ entity_id: String(id), entity_type: k.slice(0, -'_ids'.length) })),
    );
}

/**
 * Lo que el ciudadano eligió en este paso.
 *
 * El operador ha guardado la elección de tres maneras distintas segun la version
 * y el trámite, asi que se miran las tres antes de rendirse:
 *
 * 1. `selected_entities`, un mapa de tipo a lista de identificadores. Es la forma
 *    clara y la que se usa hoy.
 * 2. `{task}_input.{task}_selections`, la misma idea pero serializada a texto: el
 *    formulario del portal manda asi los campos estructurados.
 * 3. `{task}_discovery_cache`, que **no** es la eleccion sino el catalogo que se
 *    le ofrecio —su cartera entera—; solo sirve para ponerle nombre a lo elegido.
 *    Enseñarlo como si fuera la eleccion daba ocho embarcaciones en un tramite
 *    donde no se eligio ninguna.
 *
 * Devuelve `null` cuando el paso todavia no ha recibido nada, para distinguirlo
 * de haber elegido cero.
 */
function elegidasDe(campos: Record<string, unknown>, task: string): EntidadElegida[] | null {
  let elegidas: EntidadElegida[] | null = null;

  const directas = campos.selected_entities;
  if (directas && typeof directas === 'object' && !Array.isArray(directas)) {
    elegidas = idsPorTipo(directas as Record<string, unknown>);
  }

  if (elegidas === null) {
    const entrada = bajo(campos, task, 'input') as Record<string, unknown> | undefined;
    const crudo = entrada?.[`${task}_selections`];
    if (typeof crudo === 'string') {
      try {
        elegidas = idsPorTipo(JSON.parse(crudo));
      } catch {
        elegidas = null;
      }
    } else if (crudo && typeof crudo === 'object') {
      elegidas = idsPorTipo(crudo as Record<string, unknown>);
    }
  }

  if (elegidas === null) return null;

  // El catalogo que se ofrecio lleva las entidades enteras: de ahi sale el nombre.
  const cache = (bajo(campos, task, 'discovery_cache') || {}) as Record<string, unknown>;
  const porId = new Map<string, any>();
  for (const [clave, lista] of Object.entries(cache)) {
    if (!clave.endsWith('_ids') || !Array.isArray(lista)) continue;
    for (const e of lista as any[]) {
      if (e?.entity_id) porId.set(String(e.entity_id), e);
      if (e?.id) porId.set(String(e.id), e);
    }
  }

  return elegidas.map((e) => {
    const conocida = porId.get(e.entity_id);
    return {
      entity_id: conocida?.entity_id || e.entity_id,
      name: conocida?.name ?? null,
      entity_type: conocida?.entity_type ?? e.entity_type,
    };
  });
}

function Entidades({ campos, task }: DatosDePaso) {
  const { t } = useTranslation();
  const recursos = useRecursos();
  const elegidas = elegidasDe(campos, task);

  // Sin envio todavia: el paso esta esperando a que el ciudadano elija.
  if (elegidas === null) return <Campos campos={campos} task={task} />;

  if (elegidas.length === 0) {
    return (
      <Typography data-presentacion="entidades" variant="body2" color="text.secondary">
        {t('operador.sinEntidadesElegidas')}
      </Typography>
    );
  }

  return (
    <Box data-presentacion="entidades" sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {elegidas.map((e) => {
        const etiqueta = e.name || e.entity_id;

        if (!recursos) {
          return <Chip key={e.entity_id} icon={<FolderIcon />} variant="outlined" label={etiqueta} />;
        }

        return (
          <Accordion
            key={e.entity_id}
            disableGutters
            variant="outlined"
            defaultExpanded={elegidas.length === 1}
            // Sin esto el documento se pide aunque el paso este plegado: MUI
            // deja montado el contenido de un acordeon cerrado, y un expediente
            // con varias entidades se traia todos los documentos de golpe para
            // no ensenar ninguno.
            TransitionProps={{ unmountOnExit: true }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                <FolderIcon fontSize="small" color="action" />
                <Typography variant="body2" noWrap>{etiqueta}</Typography>
                {e.entity_type && (
                  <Chip size="small" variant="outlined" sx={{ height: 20 }} label={e.entity_type} />
                )}
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <EntityDocumentView
                instanceId={recursos.instanceId}
                entityId={e.entity_id}
                entityName={etiqueta}
                height={420}
              />
            </AccordionDetails>
          </Accordion>
        );
      })}
      <Typography variant="caption" color="text.secondary">
        {t('operador.entidadesElegidas', { count: elegidas.length })}
      </Typography>
    </Box>
  );
}

/**
 * Elementos elegidos de un catálogo.
 *
 * El operador no prefija con el paso: guarda bajo el nombre que declare
 * `store_as`, más `{store_as}_count` y `{store_as}_catalog_id`. Saber qué claves
 * son suyas es justo lo que aporta el registro de pasos.
 */
function Catalogo({ campos, task }: DatosDePaso) {
  const seleccion = Object.entries(campos).find(
    ([k, v]) => !k.endsWith('_count') && !k.endsWith('_catalog_id') && !FONTANERIA.has(k) && (Array.isArray(v) || (v && typeof v === 'object')),
  );
  const items = seleccion ? (Array.isArray(seleccion[1]) ? seleccion[1] : [seleccion[1]]) : [];

  if (items.length === 0) return <Campos campos={campos} task={task} />;

  return (
    <Box data-presentacion="catalogo" sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      {items.map((it: any, i) => (
        <Chip
          key={i}
          icon={<ListAltIcon />}
          variant="outlined"
          label={typeof it === 'string' ? it : it?.nombre_comun || it?.nombre || it?.name || it?.label || it?.id}
        />
      ))}
    </Box>
  );
}

/**
 * Quién firmó, con qué certificado y cuándo.
 *
 * El nombre va primero porque es lo que se revisa: una firma sin firmante no
 * acredita nada. El backend ya lo resuelve por tres vías —el nombre declarado en
 * la firma, el usuario autenticado que completó el paso, y el CN del certificado
 * PEM— y lo deja en `{task}_signer`.
 *
 * El asunto del certificado se enseña aparte y solo cuando difiere del nombre:
 * son dos cosas distintas y conviene no confundirlas. «Firmado por Ana Ruiz con
 * un certificado a nombre de otra persona» es exactamente lo que un revisor tiene
 * que poder ver.
 *
 * La lista `firmas` es la fuente buena cuando está —lleva una entrada por paso,
 * con su `task_id`— pero un trámite con varios firmantes la comparte entre pasos
 * y entonces no se atribuye a ninguno; por eso también se leen las claves planas,
 * que siempre llevan el prefijo del paso.
 */
interface DatosDeFirma {
  firmante?: string | null;
  certificado?: string | null;
  fecha?: string | null;
  algoritmo?: string | null;
  valida?: boolean | null;
}

function firmaDe(campos: Record<string, unknown>, task: string): DatosDeFirma | null {
  const lista = campos.firmas;
  const propia = (Array.isArray(lista) ? lista.find((f: any) => f?.task_id === task) : null) as any;

  // Se mezclan las dos fuentes en vez de preferir una: hoy la entrada de `firmas`
  // llega con `signer` en nulo mientras la clave plana sí trae el nombre, así que
  // quedarse con la lista habría enseñado «sin firmante» teniéndolo delante.
  const primero = (...valores: unknown[]) =>
    valores.find((v) => v !== null && v !== undefined && v !== '') ?? null;

  const firma: DatosDeFirma = {
    firmante: primero(propia?.signer, bajo(campos, task, 'signer')) as string | null,
    certificado: primero(
      propia?.cert_subject,
      propia?.certificate_info?.subject_common_name,
      propia?.certificate_info?.subject,
      bajo(campos, task, 'cert_subject'),
    ) as string | null,
    fecha: primero(propia?.signed_at, propia?.timestamp, bajo(campos, task, 'signed_at')) as string | null,
    algoritmo: primero(propia?.algorithm, bajo(campos, task, 'algorithm')) as string | null,
    valida: primero(propia?.signature_valid, bajo(campos, task, 'signature_valid')) as boolean | null,
  };

  const hayAlgo = firma.firmante || firma.certificado || firma.fecha || firma.valida !== null;
  return hayAlgo ? firma : null;
}

function Firma({ campos, task }: DatosDePaso) {
  const { t } = useTranslation();
  const firma = firmaDe(campos, task);

  if (!firma) return <Campos campos={campos} task={task} />;

  const { firmante, certificado, fecha, algoritmo } = firma;
  // Solo se enseña el certificado cuando aporta algo: si coincide con el nombre,
  // repetirlo no dice nada.
  const certificadoDistinto = certificado && certificado !== firmante ? certificado : null;

  return (
    <Paper data-presentacion="firma" variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'flex-start', gap: 2 }}>
      <VerifiedIcon color={firma.valida === false ? 'error' : 'success'} sx={{ mt: 0.25 }} />
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle2">
          {firmante
            ? t('operador.firmadoPor', { nombre: String(firmante) })
            : t('operador.firmanteSinNombre')}
        </Typography>
        {certificadoDistinto && (
          <Typography variant="body2" color="text.secondary">
            {t('operador.certificadoA', { nombre: String(certificadoDistinto) })}
          </Typography>
        )}
        {(fecha || algoritmo) && (
          <Typography variant="caption" color="text.secondary" display="block">
            {[
              fecha ? formatApiDateTime(String(fecha)) : null,
              algoritmo ? String(algoritmo) : null,
            ].filter(Boolean).join(' · ')}
          </Typography>
        )}
      </Box>
    </Paper>
  );
}

/**
 * Comprobaciones automáticas y lo que el revisor decidió sobre cada una.
 *
 * Vienen en `{task}_assertions_result.assertions`, donde `system_result` es lo
 * que dictaminó la máquina y `final_result` lo que quedó tras la revisión. Se
 * muestra el final, y se señala cuándo difieren: una comprobación que el sistema
 * dio por mala y un humano dejó pasar es exactamente lo que hay que poder ver.
 */
function Comprobaciones({ campos, task }: DatosDePaso) {
  const { t } = useTranslation();
  const sobre = bajo(campos, task, 'assertions_result') as Record<string, unknown> | undefined;
  const lista = (sobre?.assertions as unknown[]) || [];

  if (!Array.isArray(lista) || lista.length === 0) return <Campos campos={campos} task={task} />;

  return (
    <Box data-presentacion="comprobaciones" sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      {lista.map((a: any, i) => {
        const ok = a?.final_result ?? a?.system_result ?? a?.passed;
        const anulada = a?.system_result === false && a?.final_result === true;
        return (
          <Box key={a?.id || i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {ok ? <CheckCircleIcon fontSize="small" color="success" /> : <CancelIcon fontSize="small" color="error" />}
            <Typography variant="body2">{a?.label || a?.description || a?.id || `#${i + 1}`}</Typography>
            {anulada && (
              <Chip size="small" variant="outlined" color="warning" sx={{ height: 20 }} label={t('operador.anulada')} />
            )}
          </Box>
        );
      })}
    </Box>
  );
}

/**
 * Un tramite hijo lanzado desde este paso.
 *
 * Es el caso donde el registro de pasos se nota mas: este operador escribe
 * `child_instance_id`, `child_status`, `assigned_to` y `message` sin prefijo
 * alguno, asi que sin saber quien las escribio eran claves sueltas al fondo del
 * expediente. Con procedencia se pueden presentar como lo que son —la validacion
 * que este tramite esta esperando— y dejar el enlace para ir a verla.
 */
function SubTramite({ campos, task }: DatosDePaso) {
  const { t } = useTranslation();
  const hijo = campos.child_instance_id as string | undefined;

  if (!hijo) return <Campos campos={campos} task={task} />;

  const estado = campos.child_status as string | undefined;
  const equipo = campos.assigned_to as string | undefined;

  return (
    <Paper data-presentacion="subtramite" variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
      <AccountTreeIcon color="action" />
      <Box sx={{ minWidth: 0 }}>
        <Link href={`/instances/${hijo}`} variant="body2" underline="hover">
          {t('operador.verSubtramite')}
        </Link>
        <Typography variant="caption" color="text.secondary" display="block">
          {[estado, equipo].filter(Boolean).join(' · ')}
        </Typography>
      </Box>
    </Paper>
  );
}

/**
 * Una bifurcación del flujo.
 *
 * El operador guarda un `result` booleano que decide si la rama siguiente se
 * ejecuta o se salta. Presentado como par clave/valor —«result: true»— no dice
 * nada; lo que importa es si el trámite tomó ese camino, que es lo que explica
 * por qué faltan pasos más abajo en el expediente.
 */
function Decision({ campos, task }: DatosDePaso) {
  const { t } = useTranslation();
  const valor = valoresDe(campos, task).result;

  if (typeof valor !== 'boolean') return <Campos campos={campos} task={task} />;

  return (
    <Box data-presentacion="decision" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {valor ? <CheckCircleIcon fontSize="small" color="success" /> : <CancelIcon fontSize="small" color="disabled" />}
      <Typography variant="body2">
        {valor ? t('operador.ramaTomada') : t('operador.ramaOmitida')}
      </Typography>
    </Box>
  );
}

/**
 * El dictamen de una revisión.
 *
 * No son comprobaciones automáticas —ahí me equivoqué al principio— sino la
 * decisión que alguien tomó sobre el trámite: `validation_decision`, quién la
 * tomó y cuándo, más el comentario si lo dejó. Presentado como pares
 * clave/valor, lo importante —aprobado o rechazado— quedaba al mismo nivel que
 * una marca de tiempo.
 *
 * Sus claves no llevan prefijo de paso, así que sin el registro del executor
 * habrían acabado sueltas al fondo del expediente.
 */
const DECISIONES_BUENAS = new Set(['approved', 'aprobado', 'accepted', 'valid']);
const DECISIONES_MALAS = new Set(['rejected', 'rechazado', 'denied', 'invalid']);

function Validacion({ campos, task }: DatosDePaso) {
  const { t } = useTranslation();
  const valores = valoresDe(campos, task);
  const decision = valores.validation_decision ?? valores.decision;

  if (typeof decision !== 'string' || !decision) return <Campos campos={campos} task={task} />;

  const normalizada = decision.toLowerCase();
  const aprobada = DECISIONES_BUENAS.has(normalizada);
  const rechazada = DECISIONES_MALAS.has(normalizada);
  const quien = valores.validated_by ?? valores.reviewed_by;
  const cuando = valores.validated_at ?? valores.reviewed_at;
  const comentario = valores.validation_comments ?? valores.comments;

  return (
    <Paper data-presentacion="validacion" variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'flex-start', gap: 2 }}>
      {aprobada ? (
        <CheckCircleIcon color="success" sx={{ mt: 0.25 }} />
      ) : rechazada ? (
        <CancelIcon color="error" sx={{ mt: 0.25 }} />
      ) : (
        <ListAltIcon color="action" sx={{ mt: 0.25 }} />
      )}
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle2">
          {aprobada
            ? t('operador.validacionAprobada')
            : rechazada
              ? t('operador.validacionRechazada')
              : t('operador.validacionDecision', { decision })}
        </Typography>
        {(quien || cuando) && (
          <Typography variant="caption" color="text.secondary" display="block">
            {[
              quien ? t('operador.validacionPor', { nombre: String(quien) }) : null,
              cuando ? formatApiDateTime(String(cuando)) : null,
            ].filter(Boolean).join(' · ')}
          </Typography>
        )}
        {comentario ? (
          <Typography variant="body2" sx={{ mt: 0.5 }}>{String(comentario)}</Typography>
        ) : null}
      </Box>
    </Paper>
  );
}

/**
 * La entidad que el trámite emitió en este paso.
 *
 * Es su resultado: la guía de pesca, el permiso, la credencial. El operador deja
 * `{task}_entity_id`, su tipo, y si se generó documento. Como pares clave/valor,
 * el resultado del trámite se leía igual que una marca de tiempo; aquí se enseña
 * el documento emitido, que es lo que el ciudadano recibe y lo que el revisor
 * tiene que poder mirar.
 */
function EntidadEmitida({ campos, task }: DatosDePaso) {
  const { t } = useTranslation();
  const recursos = useRecursos();
  const valores = valoresDe(campos, task);

  const entityId = (bajo(campos, task, 'entity_id')
    ?? Object.entries(campos).find(([k]) => k.startsWith('created_entity_'))?.[1]) as string | undefined;

  if (typeof entityId !== 'string' || !entityId) return <Campos campos={campos} task={task} />;

  const tipo = (bajo(campos, task, 'entity_type') ?? valores.entity_type) as string | undefined;

  if (!recursos) {
    return (
      <Box data-presentacion="emitida" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <DescriptionIcon fontSize="small" color="action" />
        <Typography variant="body2">{entityId}</Typography>
        {tipo && <Chip size="small" variant="outlined" sx={{ height: 20 }} label={tipo} />}
      </Box>
    );
  }

  return (
    <Box data-presentacion="emitida" sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
        <Typography variant="subtitle2">{t('operador.emitida')}</Typography>
        {tipo && <Chip size="small" variant="outlined" sx={{ height: 20 }} label={tipo} />}
      </Box>
      <EntityDocumentView
        instanceId={recursos.instanceId}
        entityId={entityId}
        entityName={String(tipo || entityId)}
        height={420}
      />
    </Box>
  );
}

/**
 * Operador → cómo se presenta su salida.
 *
 * El nombre viaja junto al componente porque el panel lo escribe en el DOM: sin
 * él no habría forma de comprobar —ni a ojo ni desde una prueba— si un paso se
 * está leyendo con su visualizador o cayó a la presentación por campo.
 */
const REGISTRO: Record<string, Visualizador> = {
  UserInputOperator: { nombre: 'formulario', Componente: Formulario },
  ConfirmationOperator: { nombre: 'formulario', Componente: Formulario },
  S3UploadOperator: { nombre: 'archivos', Componente: Archivos },
  EntityPickerOperator: { nombre: 'entidades', Componente: Entidades },
  EntityCreationOperator: { nombre: 'emitida', Componente: EntidadEmitida },
  CatalogSelectorOperator: { nombre: 'catalogo', Componente: Catalogo },
  SignerOperator: { nombre: 'firma', Componente: Firma },
  AssertionOperator: { nombre: 'comprobaciones', Componente: Comprobaciones },
  ContextExplorerValidator: { nombre: 'validacion', Componente: Validacion },
  WorkflowStartOperator: { nombre: 'subtramite', Componente: SubTramite },
  ShortCircuitOperator: { nombre: 'decision', Componente: Decision },
  PythonOperator: generico('generico'),
};

const POR_CAMPO: Visualizador = { nombre: 'campos', Componente: Campos };

/**
 * Operadores que a proposito no tienen presentacion propia.
 *
 * Un operador de codigo arbitrario devuelve lo que devuelva el trámite que lo
 * escribio: no hay forma de saber si es un importe, un dictamen o una lista, asi
 * que la lectura campo a campo —que ya distingue fechas, importes, direcciones y
 * archivos por el valor— es la respuesta correcta y no un hueco.
 *
 * Se declaran igualmente, y con nombre propio, para que la prueba pueda separar
 * «esto se decidio asi» de «aparecio un operador que nadie ha mirado».
 */
function generico(nombre: string): Visualizador {
  return { nombre, Componente: (p: DatosDePaso) => <Campos {...p} presentacion={nombre} /> };
}

export function visualizadorDe(operador?: string | null): Visualizador {
  return (operador && REGISTRO[operador]) || POR_CAMPO;
}

export { Campos };
