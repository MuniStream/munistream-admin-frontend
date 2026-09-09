import { Box, Chip, Tooltip, Typography, ButtonBase } from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';
import FolderIcon from '@mui/icons-material/Folder';
import { useTranslation } from 'react-i18next';
import type { WalletEntity } from '@/types/instanceDetail';

interface Props {
  entity: WalletEntity;
  compact: boolean;
  selected: boolean;
  onOpen: (entityId: string) => void;
  onPrefetch?: (entityId: string) => void;
}

/**
 * Tarjeta de una entidad de la cartera.
 *
 * En modo compacto degrada a un chip: al encogerse el encabezado la cartera
 * sigue presente pero deja de competir por el espacio con el trámite.
 */
export default function EntityWalletCard({
  entity, compact, selected, onOpen, onPrefetch,
}: Props) {
  const { t } = useTranslation();

  const abrir = () => onOpen(entity.entity_id);
  const prefetch = () => onPrefetch?.(entity.entity_id);

  if (compact) {
    return (
      <Tooltip title={`${entity.entity_type_label} · ${entity.name}`}>
        <Chip
          size="small"
          label={entity.name}
          onClick={abrir}
          onMouseEnter={prefetch}
          color={entity.in_use_by_this_instance ? 'primary' : 'default'}
          variant={selected ? 'filled' : 'outlined'}
          sx={{ maxWidth: 180 }}
        />
      </Tooltip>
    );
  }

  return (
    <ButtonBase
      onClick={abrir}
      onMouseEnter={prefetch}
      focusRipple
      aria-label={t('instDetail.viewEntity', { name: entity.name })}
      sx={{
        display: 'block',
        textAlign: 'left',
        borderRadius: 1,
        border: 1,
        borderColor: selected
          ? 'primary.main'
          : entity.in_use_by_this_instance
            ? 'primary.light'
            : 'divider',
        // Las entidades que este trámite usa llevan un realce sutil: el revisor
        // necesita distinguirlas del resto de la cartera de un vistazo.
        bgcolor: entity.in_use_by_this_instance ? 'action.hover' : 'background.paper',
        px: 1.5,
        py: 1,
        minWidth: 190,
        maxWidth: 230,
        flex: '0 0 auto',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
        <FolderIcon
          fontSize="small"
          sx={{ color: entity.entity_type_color || 'text.secondary' }}
        />
        <Typography variant="caption" color="text.secondary" noWrap sx={{ flex: 1 }}>
          {entity.entity_type_label}
        </Typography>
        {entity.verified && (
          <Tooltip title={t('instDetail.entityVerified')}>
            <VerifiedIcon fontSize="small" color="success" />
          </Tooltip>
        )}
      </Box>

      <Typography variant="body2" noWrap sx={{ fontWeight: 500 }} title={entity.name}>
        {entity.name}
      </Typography>

      {entity.in_use_by_this_instance && (
        <Chip
          size="small"
          color="primary"
          variant="outlined"
          label={t('instDetail.walletUsedHere')}
          sx={{ mt: 0.5, height: 20, fontSize: '0.7rem' }}
        />
      )}
    </ButtonBase>
  );
}
