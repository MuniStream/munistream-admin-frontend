// Platform barrel — símbolos disponibles para los overrides TSX del tenant en el
// admin. Importa desde aquí en tu componente de override:
//   import { React, registerCustomFieldRenderer, Box, Typography } from './platform';

// React (para componentes de tenant que no lo importan directamente).
export { default as React } from 'react';

// i18n
export { useTranslation } from 'react-i18next';

// MUI components
export {
  Box,
  Container,
  Typography,
  Button,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  Stack,
  Alert,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
export { useTheme } from '@mui/material';

// Extensión de campos propios del tenant: registrar un renderer para un tipo de
// campo que el admin base no conoce (lo consulta AdminDataCollectionForm). Un
// operador custom del tenant despliega así su propia UI de administración.
export { registerCustomFieldRenderer, getCustomFieldRenderer } from '../components/customFieldRegistry';
export type { AdminCustomFieldRenderer, AdminCustomFieldRenderArgs } from '../components/customFieldRegistry';
