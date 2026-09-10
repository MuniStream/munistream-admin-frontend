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
      return <Etiqueta icono={<PlaceIcon fontSize="small" />} texto={textoDireccion(value)} />;

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

function textoDireccion(v: unknown): string {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return [o.calle, o.numero, o.colonia, o.municipio, o.estado, o.cp]
      .filter(Boolean).join(', ') || JSON.stringify(v).slice(0, 60);
  }
  return String(v);
}
