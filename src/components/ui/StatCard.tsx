import { Box, Card, CardContent, Skeleton, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { ESTADO } from '@/theme/tokens';
import type { Tono } from './statusMap';

interface Props {
  label: string;
  value: number | string;
  icon?: ReactNode;
  /** El color dice qué clase de cifra es, no la adorna. */
  tone?: Tono;
  sublabel?: string;
  loading?: boolean;
}

/**
 * Una cifra con su etiqueta.
 *
 * Había cuatro versiones de esto copiadas por el proyecto, y no coincidían: unas
 * pintaban la cifra en un tamaño y otras en otro, la etiqueta iba en tres
 * tipografías distintas, y solo una sabía mostrarse mientras cargaba.
 *
 * `tone` sustituye al color libre que admitían las anteriores, que es de donde
 * salía buena parte de los colores sueltos del proyecto.
 */
export default function StatCard({ label, value, icon, tone, sublabel, loading }: Props) {
  const color = tone ? ESTADO[tone].main : 'text.primary';

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        {loading ? (
          // Una cifra que va a aparecer se anuncia con su silueta, no con un
          // indicador de actividad: así el bloque no cambia de tamaño al llegar.
          <>
            <Skeleton variant="text" width="60%" height={40} />
            <Skeleton variant="text" width="40%" />
          </>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="h4"
                component="p"
                sx={{ color, fontVariantNumeric: 'tabular-nums' }}
              >
                {typeof value === 'number' ? value.toLocaleString('es-MX') : value}
              </Typography>
              <Typography variant="overline" color="text.secondary" component="div">
                {label}
              </Typography>
              {sublabel && (
                <Typography variant="caption" color="text.secondary">
                  {sublabel}
                </Typography>
              )}
            </Box>
            {icon && <Box sx={{ color: 'text.disabled', flexShrink: 0 }}>{icon}</Box>}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
