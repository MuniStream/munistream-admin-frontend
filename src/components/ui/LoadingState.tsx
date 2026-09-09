import { Box, CircularProgress, Skeleton } from '@mui/material';

interface Props {
  /**
   * `skeleton` para contenido que va a aparecer; `spinner` para una acción en
   * curso. La distinción importa: una silueta reserva el sitio y no descoloca la
   * página al llegar los datos.
   */
  variant?: 'page' | 'inline' | 'skeleton';
  rows?: number;
}

/**
 * Cargando.
 *
 * Sustituye a cinco formas distintas de decirlo —indicador circular, barra de
 * progreso, texto suelto en español incrustado, silueta, y una propiedad
 * `loading` en una tarjeta— y a siete tamaños distintos de indicador.
 */
export default function LoadingState({ variant = 'page', rows = 4 }: Props) {
  if (variant === 'skeleton') {
    return (
      <Box sx={{ p: 2 }}>
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} variant="text" height={36} />
        ))}
      </Box>
    );
  }

  if (variant === 'inline') {
    return <CircularProgress size={20} />;
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
      <CircularProgress />
    </Box>
  );
}
