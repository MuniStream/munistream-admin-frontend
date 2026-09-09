import React from 'react';
import { Box, Container } from '@mui/material';
import { CatalogManager } from '@/components/Catalogs/CatalogManager';
import PageContainer from '@/components/ui/PageContainer';

const CatalogsPage: React.FC = () => {
  return (
    <PageContainer title="Catálogos" fullWidth>
      <CatalogManager />
    </PageContainer>
  );
};

export default CatalogsPage;