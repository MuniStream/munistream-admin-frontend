import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Refresh as RefreshIcon,
  ArrowBack as BackIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  PlayCircle as RunningIcon,
  Pause as PauseIcon
} from '@mui/icons-material';
import { workflowService } from '@/services/workflowService';
import { AdminDataCollectionForm } from '@/components/AdminDataCollectionForm';
import { AdminCatalogSelector } from '@/components/AdminCatalogSelector';
import { DigitalSignatureForm } from '@/components/DigitalSignatureForm';
import { ContextValidationDisplay } from '@/components/ContextValidationDisplay';

export interface AdminWorkflowProgress {
  instance_id: string;
  workflow_id: string;
  workflow_name: string;
  status: string;
  progress_percentage: number;
  total_steps: number;
  completed_steps: number;
  current_step: string | null;
  created_at: string;
  updated_at: string;
  requires_input: boolean;
  input_form?: {
    title?: string;
    description?: string;
    sections?: any[];
    fields?: any[];
    waiting_for?: string;
    current_step_id?: string;
  };
  step_progress: Array<{
    step_id: string;
    name: string;
    description: string;
    status: string;
    started_at?: string;
    completed_at?: string;
  }>;
}

export const AdminWorkflowExecution: React.FC = () => {
  const { instanceId } = useParams<{ instanceId: string }>();
  const navigate = useNavigate();

  const [progress, setProgress] = useState<AdminWorkflowProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isSubmittingData, setIsSubmittingData] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<string | null>(null);

  // Check the type of input required - now comes from top level
  const waitingFor = progress?.waiting_for;
  const isEntitySelection = waitingFor === 'entity_selection';
  const isCatalogSelection = waitingFor === 'catalog_selection';
  const isDigitalSignature = waitingFor === 'signature';
  const isContextValidation = waitingFor === 'context_validation';

  const fetchProgress = async () => {
    if (!instanceId) return;

    try {
      setError(null);
      // Use the admin-specific tracking endpoint
      const response = await fetch(`${import.meta.env.VITE_API_URL}${import.meta.env.VITE_API_BASE_URL}/instances/${instanceId}/track`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('kc_token')}`
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch admin workflow progress');
      }

      const progressData = await response.json();
      setProgress(progressData);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch progress');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchProgress, 30000);
    return () => clearInterval(interval);
  }, [instanceId]);

  const handleRefresh = () => {
    setIsLoading(true);
    fetchProgress();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'running': case 'in_progress': return 'primary';
      case 'waiting': case 'paused': case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const getStepStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckIcon color="success" />;
      case 'in_progress': case 'running': return <RunningIcon color="primary" />;
      case 'failed': return <ErrorIcon color="error" />;
      case 'waiting': case 'pending': return <ScheduleIcon color="warning" />;
      case 'paused': return <PauseIcon color="warning" />;
      default: return <ScheduleIcon color="disabled" />;
    }
  };

  console.log('🔍 AdminWorkflowExecution: progress object:', progress);
  console.log('🔍 AdminWorkflowExecution: waitingFor value:', waitingFor);
  console.log('🔍 AdminWorkflowExecution: input_form:', progress?.input_form);
  console.log('🔍 AdminWorkflowExecution: isDigitalSignature:', isDigitalSignature);
  console.log('🔍 AdminWorkflowExecution: isEntitySelection:', isEntitySelection);

  const handleSignatureSubmission = async (signatureData: any) => {
    if (!instanceId) return;

    console.log('🔐 AdminWorkflowExecution: Handling signature submission');
    console.log('🔐 Signature data received:', signatureData);

    setIsSubmittingData(true);
    setError(null);

    try {
      // Send only the signature data (no files, no passwords)
      const response = await fetch(`${import.meta.env.VITE_API_URL}${import.meta.env.VITE_API_BASE_URL}/instances/${instanceId}/submit-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('kc_token')}`
        },
        body: JSON.stringify(signatureData),
      });

      if (!response.ok) {
        throw new Error(`Failed to submit signature: ${response.statusText}`);
      }

      const responseData = await response.json();
      console.log('✅ Backend response to signature:', responseData);

      setSubmissionSuccess('Digital signature submitted successfully. Workflow continuing...');

      // Refresh progress to see updated status
      setTimeout(fetchProgress, 2000);

      // Clear success message after 5 seconds
      setTimeout(() => {
        setSubmissionSuccess(null);
      }, 5000);

    } catch (err) {
      console.error('❌ Signature submission error:', err);
      setError(err instanceof Error ? err.message : 'Signature submission failed');
    } finally {
      setIsSubmittingData(false);
    }
  };

  const handleDataSubmission = async (data: Record<string, any>) => {
    if (!instanceId) return;

    setIsSubmittingData(true);
    setError(null);

    try {

      if (isEntitySelection) {
        // Handle entity selection submission
        const taskId = progress?.input_form?.current_step_id || 'admin_workflow_step';
        const selectionData = {
          [`${taskId}_selections`]: data
        };

        const response = await fetch(`${import.meta.env.VITE_API_URL}${import.meta.env.VITE_API_BASE_URL}/instances/${instanceId}/submit-data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionStorage.getItem('kc_token')}`
          },
          body: JSON.stringify(selectionData),
        });

        if (!response.ok) {
          throw new Error('Failed to submit entity selections');
        }

        const result = await response.json();
        if (result.success) {
          setSubmissionSuccess(result.message || 'Entity selections submitted successfully');
          // Refresh progress to get updated state
          setTimeout(() => {
            fetchProgress();
            setSubmissionSuccess(null);
          }, 2000);
        }
      } else if (isCatalogSelection) {
        // Handle catalog selection submission
        const taskId = progress?.input_form?.current_step_id || 'catalog_selector';
        const selectionData = {
          [`${taskId}_input`]: data
        };

        const response = await fetch(`${import.meta.env.VITE_API_URL}${import.meta.env.VITE_API_BASE_URL}/instances/${instanceId}/submit-data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionStorage.getItem('kc_token')}`
          },
          body: JSON.stringify(selectionData),
        });

        if (!response.ok) {
          throw new Error('Failed to submit catalog selections');
        }

        const result = await response.json();
        if (result.success) {
          setSubmissionSuccess(result.message || 'Catalog selections submitted successfully');
          // Refresh progress to get updated state
          setTimeout(() => {
            fetchProgress();
            setSubmissionSuccess(null);
          }, 2000);
        }
      } else {
        // Handle regular form submission with files
        const formData = new FormData();

        // Add regular form fields
        Object.entries(data).forEach(([key, value]) => {
          if (key !== '_files' && value !== undefined && value !== null) {
            formData.append(key, value.toString());
          }
        });

        // Add files
        if (data._files) {
          Object.entries(data._files).forEach(([key, file]) => {
            if (file instanceof File) {
              formData.append(key, file);
            }
          });
        }

        const response = await fetch(`${import.meta.env.VITE_API_URL}${import.meta.env.VITE_API_BASE_URL}/instances/${instanceId}/submit-data`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionStorage.getItem('kc_token')}`
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Failed to submit workflow data');
        }

        const result = await response.json();
        if (result.success) {
          setSubmissionSuccess(result.message || 'Data submitted successfully');
          // Refresh progress to get updated state
          setTimeout(() => {
            fetchProgress();
            setSubmissionSuccess(null);
          }, 2000);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit data');
    } finally {
      setIsSubmittingData(false);
    }
  };

  const handleStartWorkflow = async () => {
    if (!instanceId) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}${import.meta.env.VITE_API_BASE_URL}/instances/${instanceId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('kc_token')}`
        },
      });

      if (!response.ok) {
        throw new Error('Failed to start workflow');
      }

      const result = await response.json();
      setSubmissionSuccess('Admin workflow started successfully');
      setTimeout(() => {
        fetchProgress();
        setSubmissionSuccess(null);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start workflow');
    }
  };

  if (!instanceId) {
    return (
      <Box p={3}>
        <Alert severity="error">
          <Typography variant="h6">Invalid Instance ID</Typography>
          <Typography>The workflow instance ID provided is not valid.</Typography>
          <Button onClick={() => navigate('/instance-assignments')} sx={{ mt: 2 }}>
            Back to Assignments
          </Button>
        </Alert>
      </Box>
    );
  }

  if (isLoading && !progress) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
        <Typography ml={2}>Loading admin workflow...</Typography>
      </Box>
    );
  }

  if (error && !progress) {
    return (
      <Box p={3}>
        <Alert severity="error">
          <Typography variant="h6">Loading Error</Typography>
          <Typography>{error}</Typography>
          <Button onClick={handleRefresh} sx={{ mt: 2 }}>
            Retry
          </Button>
        </Alert>
      </Box>
    );
  }

  if (!progress) {
    return (
      <Box p={3}>
        <Alert severity="warning">
          <Typography variant="h6">Workflow Instance Not Found</Typography>
          <Typography>No admin workflow found with this instance ID.</Typography>
          <Button onClick={() => navigate('/instance-assignments')} sx={{ mt: 2 }}>
            Back to Assignments
          </Button>
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="between" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Tooltip title="Back to Assignments">
            <IconButton onClick={() => navigate('/instance-assignments')}>
              <BackIcon />
            </IconButton>
          </Tooltip>
          <Box>
            <Typography variant="h4">Admin Workflow Execution</Typography>
            <Typography variant="subtitle1" color="text.secondary">
              {progress.workflow_name} - {instanceId.slice(0, 8)}...
            </Typography>
          </Box>
        </Box>

        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={isLoading}
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </Button>

          {(progress.status === 'waiting_for_start' || progress.status === 'pending_assignment') && (
            <Button
              variant="contained"
              color="success"
              startIcon={<PlayIcon />}
              onClick={handleStartWorkflow}
            >
              Start Admin Workflow
            </Button>
          )}
        </Box>
      </Box>

      {/* Status Overview */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Typography variant="h6" gutterBottom>
                Workflow Status
              </Typography>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Chip
                  label={progress.status.replace('_', ' ').toUpperCase()}
                  color={getStatusColor(progress.status)}
                  variant="filled"
                />
                <Typography variant="body2" color="text.secondary">
                  Progress: {progress.progress_percentage.toFixed(0)}% complete
                </Typography>
              </Box>

              <LinearProgress
                variant="determinate"
                value={progress.progress_percentage}
                sx={{ mb: 2, height: 8, borderRadius: 4 }}
              />

              <Typography variant="body2" color="text.secondary">
                {progress.completed_steps} of {progress.total_steps} steps completed
              </Typography>
            </Grid>

            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" gutterBottom>
                Instance Details
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Started"
                    secondary={new Date(progress.created_at).toLocaleString()}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Last Updated"
                    secondary={lastUpdated.toLocaleTimeString()}
                  />
                </ListItem>
                {progress.current_step && (
                  <ListItem>
                    <ListItemText
                      primary="Current Step"
                      secondary={progress.current_step}
                    />
                  </ListItem>
                )}
              </List>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Data Collection Section */}
      {progress.status === 'paused' && progress.input_form &&
       progress.waiting_for && ['user_input', 'signature', 'context_validation', 'catalog_selection'].includes(progress.waiting_for) && (
        <Card sx={{ mb: 3, border: 2, borderColor: 'warning.main' }}>
          <CardContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="h6">
                Admin Action Required
              </Typography>
              <Typography>
                The workflow is waiting for admin input to continue processing.
              </Typography>
            </Alert>

            {submissionSuccess ? (
              <Alert severity="success">
                <Typography variant="h6">Data Submitted Successfully</Typography>
                <Typography>{submissionSuccess}</Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  The workflow will continue processing automatically.
                </Typography>
              </Alert>
            ) : isDigitalSignature ? (
              <DigitalSignatureForm
                instanceId={instanceId}
                documentToSign={progress.input_form.signable_data || progress.input_form.document_to_sign || progress.input_form}
                operatorConfig={{
                  task_id: progress.input_form.current_step_id || 'signature_step',
                  certificate_field: progress.input_form.certificate_field || 'digital_signature_certificate',
                  private_key_field: progress.input_form.private_key_field || 'digital_signature_private_key',
                  password_field: progress.input_form.password_field || 'digital_signature_password',
                  document_type: progress.input_form.document_type || 'DOCUMENTO_OFICIAL'
                }}
                onSubmitSignature={handleSignatureSubmission}
                loading={isSubmittingData}
                error={error}
              />
            ) : isContextValidation ? (
              <ContextValidationDisplay
                instanceId={instanceId}
                formConfig={progress.input_form}
                onSubmit={handleDataSubmission}
                loading={isSubmittingData}
                error={error}
              />
            ) : isCatalogSelection ? (
              <AdminCatalogSelector
                title={progress.input_form.title || 'Seleccione del Catálogo'}
                description={progress.input_form.description || 'Seleccione los elementos necesarios del catálogo para continuar.'}
                catalog_config={progress.input_form.catalog_config}
                validation={progress.input_form.validation}
                validation_errors={progress.input_form.validation_errors || []}
                previous_input={progress.input_form.previous_input}
                onSubmit={handleDataSubmission}
              />
            ) : (
              <AdminDataCollectionForm
                title={progress.input_form.title || 'Provide Required Information'}
                description={progress.input_form.description || 'Please provide the requested information to continue the workflow.'}
                sections={progress.input_form.sections}
                fields={progress.input_form.fields?.map((field: any) => ({
                  id: field.name,
                  name: field.name,
                  label: field.label || field.name.charAt(0).toUpperCase() + field.name.slice(1),
                  type: field.type,
                  required: field.required,
                  placeholder: field.placeholder,
                  options: field.options,
                  entity_type: field.entity_type,
                  min_count: field.min_count,
                  max_count: field.max_count,
                  description: field.description
                }))}
                onSubmit={handleDataSubmission}
                isSubmitting={isSubmittingData}
                submitButtonText="Submit Admin Data"
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Step Progress */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Step Progress
          </Typography>

          <Stepper orientation="vertical">
            {progress.step_progress.map((step, index) => (
              <Step key={step.step_id} active={true} completed={step.status === 'completed'}>
                <StepLabel
                  error={step.status === 'failed'}
                  icon={getStepStatusIcon(step.status)}
                >
                  <Typography variant="subtitle1">
                    {step.name}
                  </Typography>
                </StepLabel>
                <StepContent>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {step.description}
                  </Typography>

                  <Box display="flex" gap={2} alignItems="center">
                    <Chip
                      label={step.status.replace('_', ' ').toUpperCase()}
                      color={getStatusColor(step.status)}
                      size="small"
                    />

                    {step.started_at && (
                      <Typography variant="caption" color="text.secondary">
                        Started: {new Date(step.started_at).toLocaleString()}
                      </Typography>
                    )}

                    {step.completed_at && (
                      <Typography variant="caption" color="text.secondary">
                        Completed: {new Date(step.completed_at).toLocaleString()}
                      </Typography>
                    )}
                  </Box>
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      {/* Current Status Info */}
      {progress.current_step && !progress.requires_input && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Current Processing
            </Typography>
            <Alert severity="info">
              <Typography variant="subtitle1">
                Now Processing: {progress.current_step}
              </Typography>
              <Typography variant="body2">
                The admin workflow is currently executing this step automatically.
              </Typography>
            </Alert>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};