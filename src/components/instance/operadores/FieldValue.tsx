import { Box, Chip, Link, Tooltip, Typography } from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageIcon from '@mui/icons-material/Image';
import PlaceIcon from '@mui/icons-material/Place';
import DrawIcon from '@mui/icons-material/Draw';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import { detectFieldType, FieldType } from '@/utils/entityFieldDetector';
import { isBlobDescriptor, isRedacted, isTruncated } from '@/types/instanceDetail';
import ArchivoDeCampo from './ArchivoDeCampo';
import { esReferenciaS3 } from './recursos';

interface Props {
  name: string;
  value: unknown;
}

/**
 * Un valor del expediente, presentado según lo que es.
 *
 * Es el respaldo cuando no hay visualizador propio del operador: aprovecha el
 * detector de tipos que ya existía —y que llevaba tiempo sin que nadie lo
 * usara— para que una fecha se lea como fecha, un importe como importe y un
 * archivo como archivo, en vez de todo como texto o, peor, como JSON.
 */
export default function FieldValue({ name, value }: Props) {
  const { t } = useTranslation();

  if (isRedacted(value)) {
    return <Chip size="small" color="warning" variant="outlined" label={t('instDetail.contextRedacted')} />;
  }
  if (isBlobDescriptor(value) || isTruncated(value)) {
    const size = (value as { size?: number }).size;
    return (
      <Chip size="small" variant="outlined"
        label={t('instDetail.contextTruncated', { size: size ? Math.round(size / 1024) : '?' })} />
    );
  }
  if (value === null || value === undefined || value === '') {
    return <Typography variant="body2" color="text.disabled">—</Typography>;
  }

  // Antes del detector de tipos, que solo mira el nombre del campo y el aspecto
  // del valor: aqui no hay que deducir nada, un valor con clave de almacenamiento
  // es un archivo y punto.
  if (esReferenciaS3(value)) {
    return <ArchivoDeCampo valor={value} />;
  }
  if (Array.isArray(value) && value.length > 0 && value.every(esReferenciaS3)) {
    return (
      <Box sx={{ display: 'grid', gap: 1 }}>
        {value.map((v, i) => <ArchivoDeCampo key={i} valor={v} />)}
      </Box>
    );
  }

  // `detectado.value` y no `value`: el detector normaliza (entre otras cosas,
  // parsea el JSON que `FormData` serializó a texto), y las ramas compuestas
  // necesitan el objeto, no la cadena.
  const detectado = detectFieldType(value, name);

  switch (detectado.type) {
    case FieldType.BOOLEAN:
      return value ? <CheckIcon fontSize="small" color="success" /> : <CloseIcon fontSize="small" color="disabled" />;

    case FieldType.DATE:
    case FieldType.DATETIME: {
      const d = new Date(String(value));
      if (Number.isNaN(d.getTime())) break;
      return (
        <Tooltip title={String(value)}>
          <Typography variant="body2">
            {detectado.type === FieldType.DATE ? d.toLocaleDateString('es-MX') : d.toLocaleString('es-MX')}
          </Typography>
        </Tooltip>
      );
    }

    case FieldType.CURRENCY:
      return (
        <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(value))}
        </Typography>
      );

    case FieldType.NUMBER:
      return (
        <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {Number(value).toLocaleString('es-MX')}
        </Typography>
      );

    case FieldType.EMAIL:
      return <Link href={`mailto:${value}`} variant="body2">{String(value)}</Link>;

    case FieldType.URL:
      return <Link href={String(value)} target="_blank" rel="noopener" variant="body2">{String(value)}</Link>;

    case FieldType.PDF:
      return <Etiqueta icono={<PictureAsPdfIcon fontSize="small" />} texto={nombreDeArchivo(value)} />;

    case FieldType.IMAGE:
      return <Etiqueta icono={<ImageIcon fontSize="small" />} texto={nombreDeArchivo(value)} />;

    case FieldType.ADDRESS:
      return <Etiqueta icono={<PlaceIcon fontSize="small" />} texto={textoDireccion(detectado.value)} />;

    case FieldType.GEO: {
      const geo = resumenGeo(detectado.value);
      if (!geo) break;
      // La liga a OSM es lo que convierte unas coordenadas en algo verificable
      // desde el escritorio del revisor, sin salir a buscar otra herramienta.
      const mapa = `https://www.openstreetmap.org/?mlat=${geo.lat}&mlon=${geo.lng}#map=15/${geo.lat}/${geo.lng}`;
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
          <Box sx={{ color: 'text.secondary', display: 'flex' }}><PlaceIcon fontSize="small" /></Box>
          <Link href={mapa} target="_blank" rel="noopener" variant="body2" noWrap title={geo.texto}>
            {geo.texto}
          </Link>
        </Box>
      );
    }

    case FieldType.ITEM_LIST: {
      const items = (detectado.value as unknown[]).map(textoDeItem).filter(Boolean);
      if (!items.length) break;
      return (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {items.map((texto, i) => (
            <Chip key={i} size="small" variant="outlined" label={texto} />
          ))}
        </Box>
      );
    }

    case FieldType.SIGNATURE:
      return <Etiqueta icono={<DrawIcon fontSize="small" />} texto={t('operador.firmado')} />;

    case FieldType.QR_DATA:
      return <Etiqueta icono={<QrCode2Icon fontSize="small" />} texto={String(value).slice(0, 40)} />;

    default:
      break;
  }

  if (typeof value === 'object') {
    // Último recurso, y aun así legible: una lista de pares, no un volcado.
    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(90px, 30%) minmax(0, 1fr)', gap: 0.5 }}>
        {Object.entries(value as Record<string, unknown>).slice(0, 12).map(([k, v]) => (
          <Box key={k} sx={{ display: 'contents' }}>
            <Typography variant="caption" color="text.secondary">{k}</Typography>
            <FieldValue name={k} value={v} />
          </Box>
        ))}
      </Box>
    );
  }

  return <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>{String(value)}</Typography>;
}

function Etiqueta({ icono, texto }: { icono: React.ReactNode; texto: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
      <Box sx={{ color: 'text.secondary', display: 'flex' }}>{icono}</Box>
      <Typography variant="body2" noWrap title={texto}>{texto}</Typography>
    </Box>
  );
}

function nombreDeArchivo(v: unknown): string {
  if (typeof v === 'string') return v.split('/').pop() || v;
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return String(o.filename || o.name || o.s3_key || '').split('/').pop() || 'archivo';
  }
  return 'archivo';
}

/**
 * Domicilio mexicano en una línea.
 *
 * Buscaba `numero`, pero el domicilio que emite el portal (`AddressField`) trae
 * `no_ext` y `no_int`: aunque la detección hubiera funcionado, el número no salía.
 * El orden es el del uso: calle y número, interior, colonia, municipio, estado y
 * código postal.
 */
function textoDireccion(v: unknown): string {
  if (typeof v === 'string') return v;
  if (!v || typeof v !== 'object') return String(v);

  const o = v as Record<string, unknown>;
  const calleYNumero = [o.calle, o.no_ext ?? o.numero_exterior ?? o.numero]
    .filter(Boolean).join(' ');
  const interior = o.no_int ?? o.numero_interior;
  const partes = [
    calleYNumero,
    interior ? `int. ${interior}` : null,
    o.colonia,
    o.municipio ?? o.delegacion,
    o.estado,
    o.cp ?? o.codigo_postal,
  ].filter(Boolean);

  // Sin ninguna clave reconocible es mejor no inventar: que se vea el objeto.
  return partes.length ? partes.join(', ') : JSON.stringify(v).slice(0, 60);
}

/** Etiqueta legible de un ítem de lista: `{nombre_comun}` antes que la clave cruda. */
function textoDeItem(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v !== 'object') return String(v);

  const o = v as Record<string, unknown>;
  // Un ítem de una sola clave es su valor: `{especie: "Camarón"}` se lee "Camarón".
  const claves = Object.keys(o);
  if (claves.length === 1) return String(o[claves[0]] ?? '');

  const principal = o.nombre_comun ?? o.nombre ?? o.label ?? o.especie ?? o.descripcion ?? o.title;
  if (principal) {
    const secundario = o.nombre_cientifico ?? o.clave ?? o.codigo;
    return secundario ? `${principal} (${secundario})` : String(principal);
  }
  return claves.map((k) => `${k}: ${String(o[k])}`).join(' · ');
}

/**
 * Geometría en algo que un revisor pueda usar.
 *
 * Un polígono llega como `{type:'Polygon', coordinates:[[[lng,lat],…]]}` y se
 * pintaba como un árbol de índices numéricos cortado a 12: las coordenadas
 * estaban ahí pero eran inservibles. Esto no dibuja el mapa —eso es trabajo
 * aparte— pero sí dice qué es, cuánto mide y dónde está.
 */
function resumenGeo(v: unknown): { texto: string; lat?: number; lng?: number } | null {
  if (!v || typeof v !== 'object') return null;
  const g = v as { type?: string; coordinates?: any };

  if (g.type === 'Point' && Array.isArray(g.coordinates)) {
    const [lng, lat] = g.coordinates;
    if (typeof lat !== 'number' || typeof lng !== 'number') return null;
    return { texto: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng };
  }

  // Un anillo cerrado repite el primer vértice al final; no se cuenta dos veces.
  const anillos: number[][][] =
    g.type === 'Polygon' ? [g.coordinates?.[0] || []]
    : g.type === 'MultiPolygon' ? (g.coordinates || []).map((p: any) => p?.[0] || [])
    : [];
  const vertices = anillos.reduce((n, anillo) => {
    if (anillo.length < 2) return n + anillo.length;
    const cerrado =
      anillo[0]?.[0] === anillo[anillo.length - 1]?.[0] &&
      anillo[0]?.[1] === anillo[anillo.length - 1]?.[1];
    return n + (cerrado ? anillo.length - 1 : anillo.length);
  }, 0);
  if (!vertices) return null;

  const puntos = anillos.flat().filter((c) => Array.isArray(c) && c.length >= 2);
  const lng = puntos.reduce((a, c) => a + c[0], 0) / puntos.length;
  const lat = puntos.reduce((a, c) => a + c[1], 0) / puntos.length;
  const cuantos = anillos.length > 1 ? `${anillos.length} polígonos, ` : '';
  return {
    texto: `${cuantos}${vertices} vértices · centro ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    lat,
    lng,
  };
}
