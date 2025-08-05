import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
  Tooltip,
  Grid,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Visibility as ViewIcon,
  ExpandMore as ExpandMoreIcon,
  Person as PersonIcon,
  Assignment as AssignmentIcon,
  Upload as UploadIcon,
  Timer as TimerIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import workflowService from '@/services/workflowService';
import { formatDistanceToNow } from 'date-fns';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`validation-tabpanel-${index}`}
      aria-labelledby={`validation-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const CitizenValidation: React.FC = () => {
  // Mock snackbar for now
  const enqueueSnackbar = (message: string, options?: any) => {
    console.log('Snackbar:', message, options);
  };
  const queryClient = useQueryClient();
  const [tabValue, setTabValue] = useState(0);
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
  const [validationDialog, setValidationDialog] = useState<{
    open: boolean;
    instanceId: string | null;
    decision: 'approve' | 'reject' | null;
  }>({ open: false, instanceId: null, decision: null });
  const [validationComments, setValidationComments] = useState('');

  // Fetch citizen validations
  const { data: validations, isLoading } = useQuery({
    queryKey: ['citizen-validations'],
    queryFn: () => workflowService.getCitizenValidations(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch detailed citizen data for selected instance
  const { data: citizenData, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['citizen-data', selectedInstance],
    queryFn: () => selectedInstance ? workflowService.getCitizenData(selectedInstance) : null,
    enabled: !!selectedInstance,
  });

  // Validation mutation
  const validationMutation = useMutation({
    mutationFn: ({ instanceId, decision, comments }: {
      instanceId: string;
      decision: 'approve' | 'reject';
      comments: string;
    }) => workflowService.validateCitizenData(instanceId, decision, comments),
    onSuccess: (data) => {
      enqueueSnackbar(
        `Citizen data ${data.decision}d successfully`,
        { variant: 'success' }
      );
      queryClient.invalidateQueries({ queryKey: ['citizen-validations'] });
      queryClient.invalidateQueries({ queryKey: ['citizen-data'] });
      setValidationDialog({ open: false, instanceId: null, decision: null });
      setValidationComments('');
      setSelectedInstance(null);
    },
    onError: (error: any) => {
      enqueueSnackbar(
        error.response?.data?.detail || 'Failed to validate citizen data',
        { variant: 'error' }
      );
    },
  });

  const handleValidate = (instanceId: string, decision: 'approve' | 'reject') => {
    setValidationDialog({ open: true, instanceId, decision });
  };

  const confirmValidation = () => {
    if (validationDialog.instanceId && validationDialog.decision) {
      validationMutation.mutate({
        instanceId: validationDialog.instanceId,
        decision: validationDialog.decision,
        comments: validationComments,
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'awaiting_input':
        return 'warning';
      case 'pending_validation':
        return 'info';
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const renderCitizenDataValue = (value: any): React.ReactNode => {
    if (value === null || value === undefined) {
      return <Typography variant="body2" color="text.secondary">Not provided</Typography>;
    }
    if (typeof value === 'object') {
      return (
        <Typography variant="body2" component="pre" sx={{ 
          backgroundColor: 'grey.100', 
          p: 1, 
          borderRadius: 1,
          whiteSpace: 'pre-wrap',
          fontFamily: 'monospace',
          fontSize: '0.875rem'
        }}>
          {JSON.stringify(value, null, 2)}
        </Typography>
      );
    }
    return <Typography variant="body2">{String(value)}</Typography>;
  };

  return (
    <>
      {/* Inline Page Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Citizen Data Validation
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Review and validate citizen submitted data
        </Typography>
      </Box>

      {isLoading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Summary Stats */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Awaiting Validation
                  </Typography>
                  <Typography variant="h4">
                    {validations?.filter(v => v.status === 'awaiting_input').length || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Pending
                  </Typography>
                  <Typography variant="h4">
                    {validations?.length || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Paper>
            <Tabs
              value={tabValue}
              onChange={(_, newValue) => setTabValue(newValue)}
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab label={`Pending Validations (${validations?.length || 0})`} />
              <Tab 
                label="Instance Details" 
                disabled={!selectedInstance}
              />
            </Tabs>

            <TabPanel value={tabValue} index={0}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Workflow</TableCell>
                      <TableCell>Citizen ID</TableCell>
                      <TableCell>Current Step</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Submitted</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {validations && validations.length > 0 ? (
                      validations.map((validation) => (
                        <TableRow key={validation.instance_id}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {validation.workflow_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {validation.instance_id.slice(0, 8)}...
                            </Typography>
                          </TableCell>
                          <TableCell>{validation.citizen_id}</TableCell>
                          <TableCell>
                            {validation.current_step ? (
                              <>
                                <Typography variant="body2">
                                  {validation.current_step.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {validation.current_step.description}
                                </Typography>
                              </>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={validation.status}
                              color={getStatusColor(validation.status) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {formatDistanceToNow(new Date(validation.created_at), { 
                              addSuffix: true 
                            })}
                          </TableCell>
                          <TableCell>
                            <Tooltip title="View Details">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setSelectedInstance(validation.instance_id);
                                  setTabValue(1);
                                }}
                              >
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Approve">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => handleValidate(validation.instance_id, 'approve')}
                                disabled={Object.keys(validation.citizen_data).length === 0}
                              >
                                <ApproveIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Reject">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleValidate(validation.instance_id, 'reject')}
                              >
                                <RejectIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                            No citizen submissions awaiting validation
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              {selectedInstance && (
                <>
                  {isLoadingDetail ? (
                    <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
                      <CircularProgress />
                    </Box>
                  ) : citizenData ? (
                    <Box>
                      {/* Instance Overview */}
                      <Card sx={{ mb: 3 }}>
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            <AssignmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                            Instance Overview
                          </Typography>
                          <Divider sx={{ my: 2 }} />
                          <Grid container spacing={2}>
                            <Grid xs={12} sm={6}>
                              <Typography variant="body2" color="text.secondary">
                                Workflow
                              </Typography>
                              <Typography variant="body1" fontWeight="medium">
                                {citizenData.workflow_name}
                              </Typography>
                            </Grid>
                            <Grid xs={12} sm={6}>
                              <Typography variant="body2" color="text.secondary">
                                Citizen ID
                              </Typography>
                              <Typography variant="body1" fontWeight="medium">
                                {citizenData.citizen_id}
                              </Typography>
                            </Grid>
                            <Grid xs={12} sm={6}>
                              <Typography variant="body2" color="text.secondary">
                                Status
                              </Typography>
                              <Chip
                                label={citizenData.status}
                                color={getStatusColor(citizenData.status) as any}
                                size="small"
                              />
                            </Grid>
                            <Grid xs={12} sm={6}>
                              <Typography variant="body2" color="text.secondary">
                                Created
                              </Typography>
                              <Typography variant="body1">
                                {new Date(citizenData.created_at).toLocaleString()}
                              </Typography>
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>

                      {/* Citizen Data */}
                      <Card sx={{ mb: 3 }}>
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            <PersonIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                            Citizen Submitted Data
                          </Typography>
                          <Divider sx={{ my: 2 }} />
                          {Object.keys(citizenData.citizen_data).length > 0 ? (
                            Object.entries(citizenData.citizen_data).map(([stepId, data]) => (
                              <Accordion key={stepId} defaultExpanded>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                  <Typography variant="subtitle1">
                                    Step: {stepId}
                                  </Typography>
                                </AccordionSummary>
                                <AccordionDetails>
                                  <List>
                                    {Object.entries(data).map(([field, value]) => (
                                      <ListItem key={field} divider>
                                        <ListItemText
                                          primary={field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                          secondary={renderCitizenDataValue(value)}
                                        />
                                      </ListItem>
                                    ))}
                                  </List>
                                </AccordionDetails>
                              </Accordion>
                            ))
                          ) : (
                            <Alert severity="warning">
                              No citizen data has been submitted yet
                            </Alert>
                          )}
                        </CardContent>
                      </Card>

                      {/* Uploaded Files */}
                      {Object.keys(citizenData.uploaded_files).length > 0 && (
                        <Card sx={{ mb: 3 }}>
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              <UploadIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                              Uploaded Files
                            </Typography>
                            <Divider sx={{ my: 2 }} />
                            <List>
                              {Object.entries(citizenData.uploaded_files).map(([stepId, files]) => (
                                Object.entries(files).map(([fieldName, fileData]: [string, any]) => (
                                  <ListItem key={`${stepId}-${fieldName}`} divider>
                                    <ListItemText
                                      primary={fileData.filename || fieldName}
                                      secondary={`Type: ${fileData.content_type || 'Unknown'} | Size: ${fileData.size ? `${(fileData.size / 1024).toFixed(2)} KB` : 'Unknown'}`}
                                    />
                                  </ListItem>
                                ))
                              ))}
                            </List>
                          </CardContent>
                        </Card>
                      )}

                      {/* Validation History */}
                      {citizenData.validation_history.length > 0 && (
                        <Card sx={{ mb: 3 }}>
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              <TimerIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                              Validation History
                            </Typography>
                            <Divider sx={{ my: 2 }} />
                            <List>
                              {citizenData.validation_history.map((validation, index) => (
                                <ListItem key={index} divider>
                                  <ListItemText
                                    primary={
                                      <Chip
                                        label={validation.decision}
                                        color={validation.decision === 'approve' ? 'success' : 'error'}
                                        size="small"
                                      />
                                    }
                                    secondary={
                                      <>
                                        <Typography variant="body2">
                                          By: {validation.validated_by} on {new Date(validation.timestamp).toLocaleString()}
                                        </Typography>
                                        {validation.comments && (
                                          <Typography variant="body2" color="text.secondary">
                                            Comments: {validation.comments}
                                          </Typography>
                                        )}
                                      </>
                                    }
                                  />
                                </ListItem>
                              ))}
                            </List>
                          </CardContent>
                        </Card>
                      )}

                      {/* Action Buttons */}
                      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                        <Button
                          variant="contained"
                          color="success"
                          startIcon={<ApproveIcon />}
                          onClick={() => handleValidate(selectedInstance, 'approve')}
                          disabled={Object.keys(citizenData.citizen_data).length === 0}
                        >
                          Approve Data
                        </Button>
                        <Button
                          variant="contained"
                          color="error"
                          startIcon={<RejectIcon />}
                          onClick={() => handleValidate(selectedInstance, 'reject')}
                        >
                          Reject Data
                        </Button>
                      </Box>
                    </Box>
                  ) : (
                    <Alert severity="error">Failed to load citizen data</Alert>
                  )}
                </>
              )}
            </TabPanel>
          </Paper>
        </>
      )}

      {/* Validation Dialog */}
      <Dialog
        open={validationDialog.open}
        onClose={() => setValidationDialog({ open: false, instanceId: null, decision: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {validationDialog.decision === 'approve' ? 'Approve' : 'Reject'} Citizen Data
        </DialogTitle>
        <DialogContent>
          <Alert 
            severity={validationDialog.decision === 'approve' ? 'success' : 'error'} 
            sx={{ mb: 2 }}
          >
            You are about to {validationDialog.decision} this citizen submission.
            {validationDialog.decision === 'approve' 
              ? ' The workflow will continue to the next step.'
              : ' The workflow will be marked as failed.'}
          </Alert>
          <TextField
            autoFocus
            margin="dense"
            label="Comments (Optional)"
            fullWidth
            multiline
            rows={4}
            value={validationComments}
            onChange={(e) => setValidationComments(e.target.value)}
            placeholder={`Reason for ${validationDialog.decision === 'approve' ? 'approval' : 'rejection'}...`}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setValidationDialog({ open: false, instanceId: null, decision: null })}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmValidation}
            color={validationDialog.decision === 'approve' ? 'success' : 'error'}
            variant="contained"
            disabled={validationMutation.isPending}
          >
            {validationMutation.isPending ? (
              <CircularProgress size={24} />
            ) : (
              `Confirm ${validationDialog.decision === 'approve' ? 'Approval' : 'Rejection'}`
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CitizenValidation;