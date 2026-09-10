import { Box, Button, Card, CardContent, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '@/services/api';
import TramiteList, { type TramiteRow } from '@/components/tramites/TramiteList';

const RESUMEN = 5;

/**
 * Lo pendiente, en el panel.
 *
 * Usa la misma tabla que «Mi bandeja» y «Trámites»: es un resumen, no una
 * tercera implementación. Antes el panel y el seguimiento ciudadano pintaban
 * tablas distintas de los mismos trámites, con columnas y comportamientos que no
 * coincidían.
 */
export default function DashboardInbox() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['mi-bandeja-resumen'],
    queryFn: async () => {
      const { data } = await api.get('/assignments/', { params: { skip: 0, limit: RESUMEN } });
      return { rows: data.assignments as TramiteRow[], total: data.total as number };
    },
  });

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent sx={{ pb: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" component="h2">
            {t('nav.myInbox')}
          </Typography>
          <Button size="small" onClick={() => navigate('/my-inbox')}>
            {t('dash.seeAll', { total: data?.total ?? 0 })}
          </Button>
        </Box>
      </CardContent>

      <TramiteList
        rows={data?.rows ?? []}
        total={data?.total ?? 0}
        loading={isLoading}
        page={0}
        rowsPerPage={RESUMEN}
        onPageChange={() => {}}
        onRowsPerPageChange={() => {}}
        compact
        onRefresh={refetch}
      />
    </Card>
  );
}
