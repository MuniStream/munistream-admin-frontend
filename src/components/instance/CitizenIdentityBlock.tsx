import { Box, Chip, Tooltip, Typography } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useTranslation } from 'react-i18next';
import type { DossierCitizen } from '@/types/instanceDetail';

interface Props {
  citizen: DossierCitizen;
  compact: boolean;
}

/**
 * Identidad del ciudadano dueño del trámite.
 *
 * Cuando el nombre no sale de su registro sino del contexto o del trámite
 * padre, se marca: un revisor debe saber si está leyendo el dato oficial o uno
 * inferido antes de apoyar una resolución en él.
 */
export default function CitizenIdentityBlock({ citizen, compact }: Props) {
  const { t } = useTranslation();

  const inferido = citizen.source !== 'customer';
  const nombre = citizen.full_name || t('instDetail.citizenUnknown');

  const secundarios = [citizen.email, citizen.curp, citizen.rfc].filter(Boolean);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
      <PersonIcon color="action" fontSize={compact ? 'small' : 'medium'} />

      <Box sx={{ minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            variant={compact ? 'subtitle1' : 'h6'}
            noWrap
            sx={{ fontWeight: 600 }}
            title={nombre}
          >
            {nombre}
          </Typography>

          {inferido && (
            <Tooltip title={t('instDetail.citizenInferredHelp')}>
              <Chip
                size="small"
                variant="outlined"
                color="warning"
                icon={<HelpOutlineIcon />}
                label={t('instDetail.citizenInferred')}
              />
            </Tooltip>
          )}
        </Box>

        {!compact && secundarios.length > 0 && (
          <Typography variant="body2" color="text.secondary" noWrap>
            {secundarios.join(' · ')}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
