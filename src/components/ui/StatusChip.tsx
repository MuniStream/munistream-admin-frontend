import { Chip, type ChipProps } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import ScheduleIcon from '@mui/icons-material/Schedule';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import RemoveIcon from '@mui/icons-material/Remove';
import { useTranslation } from 'react-i18next';
import { ESTADO } from '@/theme/tokens';
import { claveDe, tonoDe, type Tono } from './statusMap';

interface Props {
  status?: string | null;
  size?: ChipProps['size'];
}

const ICONO: Record<Tono, typeof CheckCircleIcon> = {
  success: CheckCircleIcon,
  error: ErrorIcon,
  warning: ScheduleIcon,
  info: AutorenewIcon,
  neutral: RemoveIcon,
};

/**
 * El estado de un trámite.
 *
 * Deliberadamente **no** admite `variant` ni `color`. El acento del organismo y
 * el rojo de error son colores vecinos, y lo que evita confundirlos no es el
 * matiz sino la forma: el acento siempre va sólido y los estados siempre suaves,
 * con su icono. Dejar que cada sitio eligiera la variante devolvería la
 * ambigüedad, y con ella los doce mapas que este componente sustituye.
 *
 * El icono no es adorno: es lo que hace que el estado no dependa solo del color.
 */
export default function StatusChip({ status, size = 'small' }: Props) {
  const { t } = useTranslation();
  if (!status) return null;

  const tono = tonoDe(status);
  const paleta = ESTADO[tono];
  const Icono = ICONO[tono];

  return (
    <Chip
      size={size}
      icon={<Icono style={{ color: paleta.onSoft }} />}
      label={t(claveDe(status), { defaultValue: status.replace(/_/g, ' ') })}
      sx={{
        backgroundColor: paleta.soft,
        color: paleta.onSoft,
        border: `1px solid ${paleta.main}33`,
        fontWeight: 500,
      }}
    />
  );
}
