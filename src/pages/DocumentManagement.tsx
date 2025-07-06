import React, { useState } from 'react';
import EnhancedVerificationDialog from '../components/EnhancedVerificationDialog';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Alert,
  LinearProgress,
  IconButton,
  Tooltip,
  Badge,
  Stack
} from '@mui/material';
import {
  Description as DocumentIcon,
  Person as PersonIcon,
  Verified as VerifiedIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Schedule as PendingIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  History as HistoryIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  ExpandMore as ExpandMoreIcon,
  Assignment as AssignmentIcon,
  FileUpload as UploadIcon,
  Security as SecurityIcon,
  Fingerprint as BiometricIcon,
  CameraAlt as PhotoIcon,
  Analytics as AnalyticsIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

import documentService from '@/services/documentService';
import adminService from '@/services/adminService';
import type { Document, DocumentMetadata, VerificationMethod } from '@/types/document';

interface DocumentRecord extends Document {
  title: string;
  citizen_name: string;
  verified_at?: string;
  verified_by?: string;
  verification_method?: VerificationMethod;
  confidence_score?: number;
  verification_notes?: string;
  category: string;
  metadata: {
    original_filename: string;
    extracted_text?: string;
    ocr_confidence?: number;
    biometric_data?: any;
    security_features?: string[];
  } & DocumentMetadata;
}

interface DocumentVerificationDetail {
  document_id: string;
  verification_history: Array<{
    timestamp: string;
    action: string;
    admin_id: string;
    admin_name: string;
    result: string;
    confidence: number;
    notes: string;
  }>;
  extracted_data: Record<string, any>;
  security_analysis: {
    authenticity_score: number;
    tamper_detection: boolean;
    watermark_detected: boolean;
    security_features: string[];
    fraud_indicators: string[];
  };
  ai_analysis: {
    document_type_confidence: number;
    text_extraction_confidence: number;
    image_quality_score: number;
    anomalies_detected: string[];
  };
}

function DocumentManagement() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [filters, setFilters] = useState({
    status: '',
    document_type: '',
    citizen_name: '',
    date_from: '',
    date_to: '',
    verification_priority: ''
  });
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [verificationDialog, setVerificationDialog] = useState(false);
  const [verificationDetail, setVerificationDetail] = useState<DocumentVerificationDetail | null>(null);
  const [bulkActions, setBulkActions] = useState<string[]>([]);
  const [bulkActionType, setBulkActionType] = useState('');

  const queryClient = useQueryClient();

  // Fetch documents with filters
  const { data: documentsData, isLoading } = useQuery({
    queryKey: ['admin-pending-documents', page, rowsPerPage, filters],
    queryFn: () => documentService.getDocuments(undefined, {
      ...filters,
      limit: rowsPerPage,
      offset: page * rowsPerPage
    }),
    refetchInterval: 30000,
  });

  const documents = documentsData?.documents || [];
  const totalDocuments = documentsData?.total || 0;

  // Fetch document statistics
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: adminService.getAdminStats,
    refetchInterval: 60000,
  });

  // Verification mutation
  const verificationMutation = useMutation({
    mutationFn: adminService.processDocumentVerification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setVerificationDialog(false);
      setSelectedDocument(null);
    },
  });

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(0); // Reset to first page when filtering
  };

  const handleDocumentSelect = async (document: Document) => {
    setSelectedDocument(document);
    setVerificationDialog(true);
    
    // Fetch detailed verification info
    try {
      // Mock detailed verification data
      const detail: DocumentVerificationDetail = {
        document_id: document.document_id,
        verification_history: [
          {
            timestamp: '2024-12-20T10:30:00Z',
            action: 'automated_analysis',
            admin_id: 'system',
            admin_name: 'AI Verification System',
            result: 'pending_manual_review',
            confidence: 0.85,
            notes: 'Document passed automated checks, requires manual verification'
          }
        ],
        extracted_data: {
          full_name: document.citizen_id, // Using citizen_id as fallback
          id_number: '12345678',
          birth_date: '1985-05-15',
          address: '123 Main Street, City',
          issue_date: '2020-01-15',
          expiry_date: '2030-01-15'
        },
        security_analysis: {
          authenticity_score: 0.92,
          tamper_detection: false,
          watermark_detected: true,
          security_features: ['hologram', 'microprint', 'uv_ink'],
          fraud_indicators: []
        },
        ai_analysis: {
          document_type_confidence: 0.95,
          text_extraction_confidence: 0.88,
          image_quality_score: 0.91,
          anomalies_detected: []
        }
      };
      setVerificationDetail(detail);
    } catch (error) {
      console.error('Failed to fetch verification detail:', error);
    }
  };

  const handleVerificationSubmit = (decision: 'approve' | 'reject', comments: string) => {
    if (selectedDocument) {
      verificationMutation.mutate({
        document_id: selectedDocument.document_id,
        decision,
        comments
      });
    }
  };

  const handleBulkAction = (action: string) => {
    setBulkActionType(action);
    // Process bulk actions
    console.log(`Bulk ${action} for documents:`, bulkActions);
    setBulkActions([]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'success';
      case 'rejected': return 'error';
      case 'pending_verification': return 'warning';
      case 'expired': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified': return <VerifiedIcon />;
      case 'rejected': return <ErrorIcon />;
      case 'pending_verification': return <PendingIcon />;
      case 'expired': return <WarningIcon />;
      default: return <DocumentIcon />;
    }
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Document Management
      </Typography>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="warning.main">
                    {stats?.pending_documents || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pending Verification
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'warning.main' }}>
                  <PendingIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="success.main">
                    {totalDocuments}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Documents
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <DocumentIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="primary.main">
                    89%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Verification Rate
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <AnalyticsIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="info.main">
                    2.5h
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Avg. Processing Time
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'info.main' }}>
                  <HistoryIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Filters
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="pending_verification">Pending</MenuItem>
                <MenuItem value="verified">Verified</MenuItem>
                <MenuItem value="rejected">Rejected</MenuItem>
                <MenuItem value="expired">Expired</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Document Type</InputLabel>
              <Select
                value={filters.document_type}
                onChange={(e) => handleFilterChange('document_type', e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="national_id">National ID</MenuItem>
                <MenuItem value="passport">Passport</MenuItem>
                <MenuItem value="proof_of_address">Proof of Address</MenuItem>
                <MenuItem value="bank_statement">Bank Statement</MenuItem>
                <MenuItem value="permit">Permit</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <TextField
              fullWidth
              size="small"
              label="Citizen Name"
              value={filters.citizen_name}
              onChange={(e) => handleFilterChange('citizen_name', e.target.value)}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="From Date"
              value={filters.date_from}
              onChange={(e) => handleFilterChange('date_from', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="To Date"
              value={filters.date_to}
              onChange={(e) => handleFilterChange('date_to', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Priority</InputLabel>
              <Select
                value={filters.verification_priority}
                onChange={(e) => handleFilterChange('verification_priority', e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="urgent">Urgent</MenuItem>
                <MenuItem value="normal">Normal</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Bulk Actions */}
        {bulkActions.length > 0 && (
          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            <Typography variant="body2" sx={{ alignSelf: 'center' }}>
              {bulkActions.length} selected
            </Typography>
            <Button size="small" onClick={() => handleBulkAction('approve')}>
              Bulk Approve
            </Button>
            <Button size="small" onClick={() => handleBulkAction('reject')}>
              Bulk Reject
            </Button>
            <Button size="small" onClick={() => handleBulkAction('assign')}>
              Bulk Assign
            </Button>
            <Button size="small" onClick={() => setBulkActions([])}>
              Clear Selection
            </Button>
          </Box>
        )}
      </Paper>

      {/* Documents Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  {/* Checkbox for select all */}
                </TableCell>
                <TableCell>Document</TableCell>
                <TableCell>Citizen</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Uploaded</TableCell>
                <TableCell>Size</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {documents.map((doc: Document) => (
                <TableRow key={doc.document_id}>
                  <TableCell padding="checkbox">
                    {/* Checkbox for individual selection */}
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Avatar sx={{ bgcolor: 'grey.100' }}>
                        <DocumentIcon />
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2">
                          {doc.filename || 'Untitled Document'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {doc.filename}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2">
                        {doc.citizen_id}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ID: {doc.citizen_id}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={(doc.document_type || 'unknown').replace('_', ' ')}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={getStatusIcon(doc.status || 'pending_verification')}
                      label={(doc.status || 'pending_verification').replace('_', ' ')}
                      color={getStatusColor(doc.status || 'pending_verification') as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {format(new Date(doc.uploaded_at), 'MMM d, yyyy')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {format(new Date(doc.uploaded_at), 'HH:mm')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {(doc.file_size / 1024).toFixed(1)} KB
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Tooltip title="View Details">
                        <IconButton 
                          size="small"
                          onClick={() => handleDocumentSelect(doc)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Download">
                        <IconButton 
                          size="small"
                          onClick={() => documentService.downloadDocument(doc.document_id)}
                        >
                          <DownloadIcon />
                        </IconButton>
                      </Tooltip>
                      {doc.status === 'pending_verification' && (
                        <>
                          <Tooltip title="Approve">
                            <IconButton 
                              size="small"
                              color="success"
                              onClick={() => handleVerificationSubmit('approve', 'Quick approval')}
                            >
                              <ApproveIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Reject">
                            <IconButton 
                              size="small"
                              color="error"
                              onClick={() => handleVerificationSubmit('reject', 'Quick rejection')}
                            >
                              <RejectIcon />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          component="div"
          count={totalDocuments}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
        />
      </Paper>

      {/* Enhanced Document Verification Dialog */}
      <EnhancedVerificationDialog
        open={verificationDialog}
        document={selectedDocument}
        onClose={() => setVerificationDialog(false)}
        onVerificationComplete={(document, approved) => {
          console.log(`Document ${document.document_id} ${approved ? 'approved' : 'rejected'}`);
          setVerificationDialog(false);
          // Refresh the documents list or update the document status
        }}
      />
    </Box>
  );
}

export default DocumentManagement;
