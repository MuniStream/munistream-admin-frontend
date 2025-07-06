import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Badge,
  Card,
  CardContent,
  Button,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Grid,
  Stack
} from '@mui/material';
import {
  Task as ApprovalIcon,
  Description as DocumentIcon,
  Draw as SignatureIcon,
  RateReview as ReviewIcon,
  Person as PersonIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Assignment as TaskIcon,
  AccessTime as TimeIcon,
  PriorityHigh as HighPriorityIcon,
  Warning as MediumPriorityIcon,
  Info as LowPriorityIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

// Services - we'll create these next
import adminService from '@/services/adminService';
import documentService from '@/services/documentService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`inbox-tabpanel-${index}`}
      aria-labelledby={`inbox-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface PendingApproval {
  instance_id: string;
  workflow_name: string;
  citizen_name: string;
  citizen_id: string;
  step_name: string;
  submitted_at: string;
  priority: 'high' | 'medium' | 'low';
  approval_type: 'age_verification' | 'manual_review' | 'document_approval' | 'permit_approval';
  context: Record<string, any>;
  assigned_to?: string;
}

interface PendingDocument {
  document_id: string;
  title: string;
  document_type: string;
  citizen_name: string;
  citizen_id: string;
  uploaded_at: string;
  file_size: number;
  mime_type: string;
  verification_priority: 'urgent' | 'normal' | 'low';
  previous_attempts?: number;
}

interface PendingSignature {
  document_id: string;
  title: string;
  document_type: string;
  citizen_name: string;
  citizen_id: string;
  workflow_name: string;
  signature_type: 'permit' | 'certificate' | 'approval' | 'rejection';
  requires_signature_at: string;
  deadline?: string;
}

interface ManualReview {
  review_id: string;
  type: 'duplicate_detection' | 'anomaly_detection' | 'data_validation' | 'fraud_check';
  citizen_name: string;
  citizen_id: string;
  workflow_name: string;
  issue_description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  created_at: string;
  context: Record<string, any>;
}

function AdminInbox() {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    type: 'approve' | 'reject' | 'sign' | 'review';
    item?: any;
  }>({ open: false, type: 'approve' });
  const [actionForm, setActionForm] = useState({
    decision: '',
    comments: '',
    signature_method: 'digital',
    priority: 'normal'
  });

  const queryClient = useQueryClient();

  // Fetch pending data
  const { data: pendingApprovals = [] } = useQuery({
    queryKey: ['pending-approvals'],
    queryFn: adminService.getPendingApprovals,
    refetchInterval: 30000,
  });

  const { data: pendingDocuments = [] } = useQuery({
    queryKey: ['pending-documents'],
    queryFn: adminService.getPendingDocuments,
    refetchInterval: 30000,
  });

  const { data: pendingSignatures = [] } = useQuery({
    queryKey: ['pending-signatures'],
    queryFn: adminService.getPendingSignatures,
    refetchInterval: 30000,
  });

  const { data: manualReviews = [] } = useQuery({
    queryKey: ['manual-reviews'],
    queryFn: adminService.getManualReviews,
    refetchInterval: 30000,
  });

  // Mutations for actions
  const approvalMutation = useMutation({
    mutationFn: adminService.processApproval,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      setActionDialog({ open: false, type: 'approve' });
    },
  });

  const documentMutation = useMutation({
    mutationFn: adminService.processDocumentVerification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-documents'] });
      setActionDialog({ open: false, type: 'approve' });
    },
  });

  const signatureMutation = useMutation({
    mutationFn: adminService.processSignature,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-signatures'] });
      setActionDialog({ open: false, type: 'sign' });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: adminService.processManualReview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manual-reviews'] });
      setActionDialog({ open: false, type: 'review' });
    },
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleAction = (type: 'approve' | 'reject' | 'sign' | 'review', item: any) => {
    setSelectedItem(item);
    setActionDialog({ open: true, type, item });
    setActionForm({
      decision: type === 'approve' ? 'approve' : type === 'reject' ? 'reject' : '',
      comments: '',
      signature_method: 'digital',
      priority: 'normal'
    });
  };

  const handleSubmitAction = async () => {
    const { type, item } = actionDialog;
    
    try {
      switch (type) {
        case 'approve':
        case 'reject':
          if (activeTab === 0) {
            // Workflow approval
            await approvalMutation.mutateAsync({
              instance_id: item.instance_id,
              decision: actionForm.decision,
              comments: actionForm.comments,
            });
          } else if (activeTab === 1) {
            // Document verification
            await documentMutation.mutateAsync({
              document_id: item.document_id,
              decision: actionForm.decision,
              comments: actionForm.comments,
            });
          }
          break;
        case 'sign':
          await signatureMutation.mutateAsync({
            document_id: item.document_id,
            signature_method: actionForm.signature_method,
            comments: actionForm.comments,
          });
          break;
        case 'review':
          await reviewMutation.mutateAsync({
            review_id: item.review_id,
            resolution: actionForm.decision,
            comments: actionForm.comments,
            priority: actionForm.priority,
          });
          break;
      }
    } catch (error) {
      console.error('Action failed:', error);
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
      case 'urgent':
      case 'critical':
        return <HighPriorityIcon color="error" />;
      case 'medium':
      case 'normal':
        return <MediumPriorityIcon color="warning" />;
      default:
        return <LowPriorityIcon color="info" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
      case 'urgent':
      case 'critical':
        return 'error';
      case 'medium':
      case 'normal':
        return 'warning';
      default:
        return 'info';
    }
  };

  const renderPendingApprovals = () => (
    <List>
      {pendingApprovals.map((approval: PendingApproval) => (
        <Card key={approval.instance_id} sx={{ mb: 2 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 'grow' }}>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <PersonIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {approval.citizen_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {approval.workflow_name} • {approval.step_name}
                    </Typography>
                  </Box>
                  {getPriorityIcon(approval.priority)}
                </Box>
                
                <Box display="flex" gap={1} mb={2}>
                  <Chip 
                    label={approval.approval_type.replace('_', ' ')} 
                    size="small" 
                    variant="outlined" 
                  />
                  <Chip 
                    label={format(new Date(approval.submitted_at), 'MMM d, yyyy')}
                    size="small"
                    icon={<TimeIcon />}
                  />
                </Box>

                {approval.context.age && (
                  <Alert severity="info" sx={{ mb: 1 }}>
                    <strong>Age Verification Required:</strong> Citizen claims age {approval.context.age}
                  </Alert>
                )}
              </Grid>
              
              <Grid size="auto">
                <Stack direction="row" spacing={1}>
                  <Button
                    startIcon={<ViewIcon />}
                    onClick={() => setSelectedItem(approval)}
                    size="small"
                  >
                    View
                  </Button>
                  <Button
                    startIcon={<ApproveIcon />}
                    variant="contained"
                    color="success"
                    onClick={() => handleAction('approve', approval)}
                    size="small"
                  >
                    Approve
                  </Button>
                  <Button
                    startIcon={<RejectIcon />}
                    variant="outlined"
                    color="error"
                    onClick={() => handleAction('reject', approval)}
                    size="small"
                  >
                    Reject
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      ))}
      {pendingApprovals.length === 0 && (
        <Typography variant="body1" color="text.secondary" textAlign="center" py={4}>
          No pending approvals
        </Typography>
      )}
    </List>
  );

  const renderPendingDocuments = () => (
    <List>
      {pendingDocuments.map((doc: PendingDocument) => (
        <Card key={doc.document_id} sx={{ mb: 2 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 'grow' }}>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Avatar sx={{ bgcolor: 'secondary.main' }}>
                    <DocumentIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {doc.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {doc.citizen_name} • {doc.document_type}
                    </Typography>
                  </Box>
                  {getPriorityIcon(doc.verification_priority)}
                </Box>
                
                <Box display="flex" gap={1} mb={2}>
                  <Chip 
                    label={`${(doc.file_size / 1024).toFixed(1)} KB`}
                    size="small" 
                    variant="outlined" 
                  />
                  <Chip 
                    label={format(new Date(doc.uploaded_at), 'MMM d, yyyy')}
                    size="small"
                    icon={<TimeIcon />}
                  />
                  {doc.previous_attempts && doc.previous_attempts > 0 && (
                    <Chip 
                      label={`${doc.previous_attempts} previous attempts`}
                      size="small"
                      color="warning"
                    />
                  )}
                </Box>
              </Grid>
              
              <Grid size="auto">
                <Stack direction="row" spacing={1}>
                  <Button
                    startIcon={<DownloadIcon />}
                    onClick={() => documentService.downloadDocument(doc.document_id)}
                    size="small"
                  >
                    Download
                  </Button>
                  <Button
                    startIcon={<ApproveIcon />}
                    variant="contained"
                    color="success"
                    onClick={() => handleAction('approve', doc)}
                    size="small"
                  >
                    Verify
                  </Button>
                  <Button
                    startIcon={<RejectIcon />}
                    variant="outlined"
                    color="error"
                    onClick={() => handleAction('reject', doc)}
                    size="small"
                  >
                    Reject
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      ))}
      {pendingDocuments.length === 0 && (
        <Typography variant="body1" color="text.secondary" textAlign="center" py={4}>
          No documents pending verification
        </Typography>
      )}
    </List>
  );

  const renderPendingSignatures = () => (
    <List>
      {pendingSignatures.map((sig: PendingSignature) => (
        <Card key={sig.document_id} sx={{ mb: 2 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 'grow' }}>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Avatar sx={{ bgcolor: 'info.main' }}>
                    <SignatureIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {sig.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {sig.citizen_name} • {sig.workflow_name}
                    </Typography>
                  </Box>
                </Box>
                
                <Box display="flex" gap={1} mb={2}>
                  <Chip 
                    label={sig.signature_type}
                    size="small" 
                    variant="outlined" 
                  />
                  <Chip 
                    label={format(new Date(sig.requires_signature_at), 'MMM d, yyyy')}
                    size="small"
                    icon={<TimeIcon />}
                  />
                  {sig.deadline && (
                    <Chip 
                      label={`Due: ${format(new Date(sig.deadline), 'MMM d')}`}
                      size="small"
                      color="error"
                    />
                  )}
                </Box>
              </Grid>
              
              <Grid size="auto">
                <Stack direction="row" spacing={1}>
                  <Button
                    startIcon={<ViewIcon />}
                    onClick={() => setSelectedItem(sig)}
                    size="small"
                  >
                    Preview
                  </Button>
                  <Button
                    startIcon={<SignatureIcon />}
                    variant="contained"
                    color="primary"
                    onClick={() => handleAction('sign', sig)}
                    size="small"
                  >
                    Sign
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      ))}
      {pendingSignatures.length === 0 && (
        <Typography variant="body1" color="text.secondary" textAlign="center" py={4}>
          No documents pending signature
        </Typography>
      )}
    </List>
  );

  const renderManualReviews = () => (
    <List>
      {manualReviews.map((review: ManualReview) => (
        <Card key={review.review_id} sx={{ mb: 2 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 'grow' }}>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Avatar sx={{ bgcolor: 'warning.main' }}>
                    <ReviewIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {review.type.replace('_', ' ').toUpperCase()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {review.citizen_name} • {review.workflow_name}
                    </Typography>
                  </Box>
                  {getPriorityIcon(review.severity)}
                </Box>
                
                <Alert severity={getPriorityColor(review.severity) as any} sx={{ mb: 2 }}>
                  {review.issue_description}
                </Alert>
                
                <Box display="flex" gap={1}>
                  <Chip 
                    label={review.severity}
                    size="small" 
                    color={getPriorityColor(review.severity) as any}
                  />
                  <Chip 
                    label={format(new Date(review.created_at), 'MMM d, yyyy')}
                    size="small"
                    icon={<TimeIcon />}
                  />
                </Box>
              </Grid>
              
              <Grid size="auto">
                <Stack direction="row" spacing={1}>
                  <Button
                    startIcon={<ViewIcon />}
                    onClick={() => setSelectedItem(review)}
                    size="small"
                  >
                    Details
                  </Button>
                  <Button
                    startIcon={<TaskIcon />}
                    variant="contained"
                    onClick={() => handleAction('review', review)}
                    size="small"
                  >
                    Resolve
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      ))}
      {manualReviews.length === 0 && (
        <Typography variant="body1" color="text.secondary" textAlign="center" py={4}>
          No items requiring manual review
        </Typography>
      )}
    </List>
  );

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Administrator Inbox
      </Typography>
      
      <Paper sx={{ width: '100%' }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="admin inbox tabs">
          <Tab 
            icon={<Badge badgeContent={pendingApprovals.length} color="error"><ApprovalIcon /></Badge>}
            label="Pending Approvals" 
          />
          <Tab 
            icon={<Badge badgeContent={pendingDocuments.length} color="error"><DocumentIcon /></Badge>}
            label="Document Verification" 
          />
          <Tab 
            icon={<Badge badgeContent={pendingSignatures.length} color="error"><SignatureIcon /></Badge>}
            label="Digital Signatures" 
          />
          <Tab 
            icon={<Badge badgeContent={manualReviews.length} color="error"><ReviewIcon /></Badge>}
            label="Manual Reviews" 
          />
        </Tabs>

        <TabPanel value={activeTab} index={0}>
          {renderPendingApprovals()}
        </TabPanel>
        
        <TabPanel value={activeTab} index={1}>
          {renderPendingDocuments()}
        </TabPanel>
        
        <TabPanel value={activeTab} index={2}>
          {renderPendingSignatures()}
        </TabPanel>
        
        <TabPanel value={activeTab} index={3}>
          {renderManualReviews()}
        </TabPanel>
      </Paper>

      {/* Action Dialog */}
      <Dialog open={actionDialog.open} onClose={() => setActionDialog({ open: false, type: 'approve' })} maxWidth="sm" fullWidth>
        <DialogTitle>
          {actionDialog.type === 'approve' && 'Approve Request'}
          {actionDialog.type === 'reject' && 'Reject Request'}
          {actionDialog.type === 'sign' && 'Digital Signature'}
          {actionDialog.type === 'review' && 'Resolve Review'}
        </DialogTitle>
        
        <DialogContent>
          {(actionDialog.type === 'approve' || actionDialog.type === 'reject') && (
            <Box>
              <FormControl fullWidth margin="normal">
                <InputLabel>Decision</InputLabel>
                <Select
                  value={actionForm.decision}
                  onChange={(e) => setActionForm(prev => ({ ...prev, decision: e.target.value }))}
                >
                  <MenuItem value="approve">Approve</MenuItem>
                  <MenuItem value="reject">Reject</MenuItem>
                  <MenuItem value="request_more_info">Request More Information</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
          
          {actionDialog.type === 'sign' && (
            <FormControl fullWidth margin="normal">
              <InputLabel>Signature Method</InputLabel>
              <Select
                value={actionForm.signature_method}
                onChange={(e) => setActionForm(prev => ({ ...prev, signature_method: e.target.value }))}
              >
                <MenuItem value="digital">Digital Signature</MenuItem>
                <MenuItem value="electronic">Electronic Signature</MenuItem>
                <MenuItem value="manual">Manual Review Required</MenuItem>
              </Select>
            </FormControl>
          )}
          
          {actionDialog.type === 'review' && (
            <Box>
              <FormControl fullWidth margin="normal">
                <InputLabel>Resolution</InputLabel>
                <Select
                  value={actionForm.decision}
                  onChange={(e) => setActionForm(prev => ({ ...prev, decision: e.target.value }))}
                >
                  <MenuItem value="resolved">Mark as Resolved</MenuItem>
                  <MenuItem value="escalate">Escalate to Senior Admin</MenuItem>
                  <MenuItem value="require_citizen_action">Require Citizen Action</MenuItem>
                  <MenuItem value="false_positive">False Positive</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl fullWidth margin="normal">
                <InputLabel>Priority</InputLabel>
                <Select
                  value={actionForm.priority}
                  onChange={(e) => setActionForm(prev => ({ ...prev, priority: e.target.value }))}
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="normal">Normal</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="urgent">Urgent</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
          
          <TextField
            fullWidth
            label="Comments"
            multiline
            rows={4}
            value={actionForm.comments}
            onChange={(e) => setActionForm(prev => ({ ...prev, comments: e.target.value }))}
            margin="normal"
            placeholder="Add any additional comments or instructions..."
          />
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setActionDialog({ open: false, type: 'approve' })}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmitAction} 
            variant="contained"
            disabled={approvalMutation.isPending || documentMutation.isPending || signatureMutation.isPending || reviewMutation.isPending}
          >
            {actionDialog.type === 'sign' ? 'Sign Document' : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default AdminInbox;