import React from 'react';
import { Box, Container } from '@mui/material';
import { CatalogManager } from '@/components/Catalogs/CatalogManager';

const CatalogsPage: React.FC = () => {
  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        <CatalogManager />
      </Box>
    </Container>
  );
};

export default CatalogsPage;