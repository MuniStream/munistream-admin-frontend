import { useEffect, type ReactNode } from 'react';
import { Box, Card } from '@mui/material';
import { usePageChrome } from '@/layouts/PageChromeContext';
import { CHROME } from '@/theme/tokens';

interface Props {
  /** Título de la sección. Lo pinta la barra superior, no la página. */
  title: string;
  subtitle?: ReactNode;
  /** Acciones propias de la página; van a la derecha de la barra. */
  actions?: ReactNode;
  /** Las pantallas de tabla ancha pueden renunciar al ancho máximo. */
  fullWidth?: boolean;
  /** Para pantallas que gestionan su propio encabezado pegajoso. */
  disableGutters?: boolean;
  /**
   * El contenido va dentro de una tarjeta, que es lo que da a cada pantalla su
   * marco y la separa del fondo. Se desactiva en las que ya traen el suyo.
   */
  surface?: boolean;
  children: ReactNode;
}

/**
 * Envoltorio de página.
 *
 * Resuelve dos cosas de una vez. La primera, el título: se declara aquí y lo
 * muestra la barra, así que desaparecen los encabezados duplicados y las tres
 * tipografías distintas que se usaban para el mismo papel.
 *
 * La segunda, el margen. El `<main>` no tenía ninguno y cada página decidía por
 * su cuenta: seis ponían margen, cinco no ponían nada —y eran justo cinco de las
 * seis pantallas de uso diario, que quedaban pegadas al borde— y otras dos
 * hacían cosas distintas. Ahora se aplica una sola vez, aquí.
 */
export default function PageContainer({
  title,
  subtitle,
  actions,
  fullWidth = false,
  disableGutters = false,
  surface = true,
  children,
}: Props) {
  const { setChrome } = usePageChrome();

  useEffect(() => {
    setChrome({ title, subtitle, actions });
  }, [title, subtitle, actions, setChrome]);

  return (
    <Box
      sx={{
        px: disableGutters ? 0 : { xs: 2, sm: 3 },
        py: disableGutters ? 0 : 3,
        maxWidth: fullWidth ? '100%' : CHROME.contentMaxWidth,
        mx: 'auto',
        width: '100%',
      }}
    >
      {/* La tabla ancha se desplaza dentro del marco; sin esto empuja la
          página entera y recorta la última columna. */}
      {surface && !disableGutters ? (
        <Card sx={{ overflowX: 'auto' }}>{children}</Card>
      ) : (
        children
      )}
    </Box>
  );
}
