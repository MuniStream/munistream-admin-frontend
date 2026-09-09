import { Box, Skeleton, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import EntityWalletCard from './EntityWalletCard';
import type { WalletEntity } from '@/types/instanceDetail';

interface Props {
  entities: WalletEntity[];
  total: number;
  loading: boolean;
  compact: boolean;
  selectedEntityId: string | null;
  onOpen: (entityId: string) => void;
  onPrefetch?: (entityId: string) => void;
}

/**
 * Cartera del ciudadano como tira horizontal.
 *
 * El scroll horizontal vive aquí, dentro del encabezado pegajoso. Es seguro
 * porque este contenedor es *hijo* del elemento `sticky`: un `overflow` en un
 * ancestro sí lo desactivaría, en un descendiente no.
 */
export default function EntityWalletStrip({
  entities, total, loading, compact, selectedEntityId, onOpen, onPrefetch,
}: Props) {
  const { t } = useTranslation();

  // Las entidades que este trámite usa van primero: son las que el revisor
  // necesita a mano, el resto es contexto.
  const ordenadas = [...entities].sort((a, b) => {
    if (a.in_use_by_this_instance !== b.in_use_by_this_instance) {
      return a.in_use_by_this_instance ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  if (loading) {
    return (
      <Box sx={{ display: 'flex', gap: 1 }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} variant="rounded" width={compact ? 90 : 200} height={compact ? 24 : 64} />
        ))}
      </Box>
    );
  }

  if (entities.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {t('instDetail.walletEmpty')}
      </Typography>
    );
  }

  return (
    <Box sx={{ minWidth: 0 }}>
      {!compact && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          {t('instDetail.walletCount', { shown: entities.length, total })}
        </Typography>
      )}

      <Box
        role="list"
        aria-label={t('instDetail.wallet')}
        sx={{
          display: 'flex',
          gap: 1,
          overflowX: 'auto',
          pb: 0.5,
          // Barra discreta: la tira comparte espacio con el resto del encabezado.
          '&::-webkit-scrollbar': { height: 6 },
          '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 3 },
        }}
      >
        {ordenadas.map((e) => (
          <Box role="listitem" key={e.entity_id} sx={{ display: 'flex' }}>
            <EntityWalletCard
              entity={e}
              compact={compact}
              selected={selectedEntityId === e.entity_id}
              onOpen={onOpen}
              onPrefetch={onPrefetch}
            />
          </Box>
        ))}
      </Box>
    </Box>
  );
}
