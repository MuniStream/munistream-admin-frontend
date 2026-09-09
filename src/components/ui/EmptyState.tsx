import { Box, Button, Typography } from '@mui/material';
import InboxIcon from '@mui/icons-material/Inbox';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  title?: string;
  description?: string;
  /**
   * `filtered` cuando no hay resultados por los filtros aplicados, `empty`
   * cuando todavía no hay datos. Distinguirlo importa: en el primer caso la
   * salida es limpiar el filtro, y en el segundo no hay nada que hacer.
   */
  variant?: 'empty' | 'filtered';
  onClearFilters?: () => void;
  action?: ReactNode;
}

/**
 * Sin datos.
 *
 * Sustituye a trece mensajes improvisados, ninguno de los cuales ofrecía una
 * salida y solo uno de los cuales distinguía «no hay nada» de «tus filtros no
 * encuentran nada».
 */
export default function EmptyState({
  title, description, variant = 'empty', onClearFilters, action,
}: Props) {
  const { t } = useTranslation();
  const filtrado = variant === 'filtered';
  const Icono = filtrado ? SearchOffIcon : InboxIcon;

  return (
    <Box sx={{ py: 8, px: 3, textAlign: 'center' }}>
      <Icono sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
      <Typography variant="h6" component="p" gutterBottom>
        {title || t(filtrado ? 'empty.filteredTitle' : 'empty.title')}
      </Typography>
      {(description || filtrado) && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {description || t('empty.filteredHelp')}
        </Typography>
      )}
      {filtrado && onClearFilters && (
        <Button size="small" onClick={onClearFilters}>{t('empty.clearFilters')}</Button>
      )}
      {action}
    </Box>
  );
}
