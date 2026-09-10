import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '@/services/api';
import PageContainer from '@/components/ui/PageContainer';
import TramiteList, { type TramiteRow } from '@/components/tramites/TramiteList';

/**
 * Mi bandeja: lo que le toca revisar a quien ha iniciado sesión.
 *
 * Misma tabla y mismas columnas que la pantalla de Trámites; cambia el ámbito.
 */
export default function MyInboxPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['mi-bandeja', page, rowsPerPage],
    queryFn: async () => {
      const { data } = await api.get('/assignments/', {
        params: { skip: page * rowsPerPage, limit: rowsPerPage },
      });
      return { instances: data.assignments as TramiteRow[], total: data.total as number };
    },
  });

  return (
    <PageContainer title={t('nav.myInbox')}>
        <TramiteList
          rows={data?.instances ?? []}
          total={data?.total ?? 0}
          loading={isLoading}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={setPage}
          onRowsPerPageChange={(n) => { setRowsPerPage(n); setPage(0); }}
          onRefresh={refetch}
        />
    </PageContainer>
  );
}
