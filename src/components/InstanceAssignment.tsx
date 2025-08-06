import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    Chip,
    IconButton,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Alert,
    Tabs,
    Tab,
    Grid,
    Card,
    CardContent,
    Badge,
    Tooltip,
    Menu,
    ListItemIcon,
    ListItemText
} from '@mui/material';
import {
    Assignment as AssignmentIcon,
    PlayArrow as StartIcon,
    CheckCircle as CompleteIcon,
    Cancel as RejectIcon,
    Edit as ModificationIcon,
    PersonAdd as AssignUserIcon,
    GroupAdd as AssignTeamIcon,
    MoreVert as MoreIcon,
    Refresh as RefreshIcon,
    FilterList as FilterIcon,
    PersonRemove as UnassignIcon,
    Add as AddIcon,
    Remove as RemoveIcon,
    Visibility as ViewIcon,
    FactCheck as ValidateIcon,
    ThumbUp as ApproveFieldIcon,
    ThumbDown as RejectFieldIcon,
    Pending as PendingIcon
} from '@mui/icons-material';

import { useI18n } from '../contexts/I18nContext';
import api from '../services/api';

// Types
interface WorkflowInstance {
    instance_id: string;
    workflow_id: string;
    user_id: string;
    status: string;
    current_step: string | null;
    assigned_user_id: string | null;
    assigned_team_id: string | null;
    assignment_status: string | null;
    assignment_type: string | null;
    assigned_at: string | null;
    assigned_by: string | null;
    assignment_notes: string | null;
    created_at: string;
    updated_at: string;
    completed_at: string | null;
}

interface User {
    id: string;
    full_name: string;
    email: string;
    role: string;
}

interface Team {
    team_id: string;
    name: string;
    members: any[];
}

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
    return (
        <div role="tabpanel" hidden={value !== index}>
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
}

const InstanceAssignment: React.FC = () => {
    const { t } = useI18n();
    
    // State
    const [instances, setInstances] = useState<WorkflowInstance[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [tabValue, setTabValue] = useState(0);
    const [selectedInstance, setSelectedInstance] = useState<WorkflowInstance | null>(null);
    
    // Filters
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [workflowFilter, setWorkflowFilter] = useState<string>('');
    const [teamFilter, setTeamFilter] = useState<string>('');
    
    // Dialogs
    const [assignUserDialog, setAssignUserDialog] = useState(false);
    const [assignTeamDialog, setAssignTeamDialog] = useState(false);
    const [approveDialog, setApproveDialog] = useState(false);
    const [rejectDialog, setRejectDialog] = useState(false);
    const [modificationDialog, setModificationDialog] = useState(false);
    const [viewDetailsDialog, setViewDetailsDialog] = useState(false);
    const [instanceDetails, setInstanceDetails] = useState<any>(null);
    const [validationDialog, setValidationDialog] = useState(false);
    const [fieldValidations, setFieldValidations] = useState<Record<string, {
        status: 'pending' | 'approved' | 'rejected';
        comments: string;
    }>>({});
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [selectedTeamId, setSelectedTeamId] = useState<string>('');
    const [assignmentNotes, setAssignmentNotes] = useState('');
    const [approvalComments, setApprovalComments] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');
    const [rejectionComments, setRejectionComments] = useState('');
    const [modificationRequests, setModificationRequests] = useState<string[]>(['']);
    const [modificationComments, setModificationComments] = useState('');
    
    // Menu
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [menuInstance, setMenuInstance] = useState<WorkflowInstance | null>(null);

    useEffect(() => {
        fetchData();
        fetchUsers();
        fetchTeams();
    }, [page, rowsPerPage, tabValue, statusFilter, workflowFilter, teamFilter]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: (page + 1).toString(),
                page_size: rowsPerPage.toString(),
            });

            if (statusFilter) params.append('assignment_status', statusFilter);
            if (workflowFilter) params.append('workflow_id', workflowFilter);
            if (teamFilter) params.append('team_id', teamFilter);

            const response = await api.get(`/instances/my-assignments?${params}`);

            setInstances(response.data.instances);
            setTotalCount(response.data.total);
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.detail || err.message || 'Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await api.get('/auth/users-for-assignment');
            setUsers(response.data);
        } catch (err) {
            console.error('Failed to fetch users:', err);
        }
    };

    const fetchTeams = async () => {
        try {
            const response = await api.get('/teams/');
            setTeams(response.data.teams || response.data);
        } catch (err) {
            console.error('Failed to fetch teams:', err);
        }
    };

    const fetchInstanceDetails = async (instanceId: string, openValidation: boolean = false) => {
        try {
            const response = await api.get(`/instances/${instanceId}`);
            setInstanceDetails(response.data);
            
            if (openValidation) {
                // Initialize field validations for all citizen data fields
                const initialValidations: Record<string, {status: 'pending' | 'approved' | 'rejected'; comments: string}> = {};
                
                if (response.data.context) {
                    Object.entries(response.data.context).forEach(([key, value]) => {
                        if (key.includes('citizen_data') && typeof value === 'object') {
                            Object.keys(value as any).forEach(fieldKey => {
                                const validationKey = `${key}.${fieldKey}`;
                                initialValidations[validationKey] = {
                                    status: 'pending',
                                    comments: ''
                                };
                            });
                        }
                    });
                }
                
                setFieldValidations(initialValidations);
                setSelectedInstance(instanceDetails => {
                    // Find the instance in the current instances list
                    const instance = instances.find(i => i.instance_id === instanceId);
                    return instance || null;
                });
                setValidationDialog(true);
            } else {
                setViewDetailsDialog(true);
            }
        } catch (err: any) {
            setError(err.response?.data?.detail || err.message || 'Failed to fetch instance details');
        }
    };

    const handleStartReview = async (instance: WorkflowInstance) => {
        try {
            await api.post(`/instances/${instance.instance_id}/start-review`, {});

            await fetchData();
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.detail || err.message || 'Failed to start review');
        }
    };

    const handleApproveByReviewer = async () => {
        if (!selectedInstance) return;

        try {
            await api.post(`/instances/${selectedInstance.instance_id}/approve-by-reviewer`, {
                comments: approvalComments
            });

            await fetchData();
            setApproveDialog(false);
            resetDialogs();
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.detail || err.message || 'Failed to approve instance');
        }
    };

    const handleRejectByReviewer = async () => {
        if (!selectedInstance || !rejectionReason) return;

        try {
            await api.post(`/instances/${selectedInstance.instance_id}/reject-by-reviewer`, {
                reason: rejectionReason,
                comments: rejectionComments
            });

            await fetchData();
            setRejectDialog(false);
            resetDialogs();
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.detail || err.message || 'Failed to reject instance');
        }
    };

    const handleRequestModifications = async () => {
        if (!selectedInstance) return;

        // Filter out empty modification requests
        const validModifications = modificationRequests.filter(req => req.trim() !== '');
        
        if (validModifications.length === 0) {
            setError('At least one modification request is required');
            return;
        }

        try {
            // Convert string array to modification objects expected by backend
            const modifications = validModifications.map((request, index) => ({
                id: `mod_${index + 1}`,
                description: request,
                field: null, // Can be enhanced later to specify which field needs modification
                priority: 'normal'
            }));

            await api.post(`/instances/${selectedInstance.instance_id}/request-modifications`, {
                modifications: modifications,
                comments: modificationComments
            });

            await fetchData();
            setModificationDialog(false);
            resetDialogs();
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.detail || err.message || 'Failed to request modifications');
        }
    };

    const handleAssignToUser = async () => {
        if (!selectedInstance || !selectedUserId) return;

        try {
            await api.post(`/instances/${selectedInstance.instance_id}/assign-to-user`, {
                user_id: selectedUserId,
                notes: assignmentNotes
            });

            await fetchData();
            setAssignUserDialog(false);
            setSelectedUserId('');
            setAssignmentNotes('');
            setSelectedInstance(null);
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.detail || err.message || 'Failed to assign to user');
        }
    };

    const handleAssignToTeam = async () => {
        if (!selectedInstance || !selectedTeamId) return;

        try {
            await api.post(`/instances/${selectedInstance.instance_id}/assign-to-team`, {
                team_id: selectedTeamId,
                notes: assignmentNotes
            });

            await fetchData();
            setAssignTeamDialog(false);
            setSelectedTeamId('');
            setAssignmentNotes('');
            setSelectedInstance(null);
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.detail || err.message || 'Failed to assign to team');
        }
    };

    const handleUnassign = async (instance: WorkflowInstance) => {
        try {
            await api.post(`/instances/${instance.instance_id}/unassign`, {
                reason: 'manual_unassignment'
            });

            await fetchData();
            handleCloseMenu();
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.detail || err.message || 'Failed to unassign');
        }
    };

    const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, instance: WorkflowInstance) => {
        setAnchorEl(event.currentTarget);
        setMenuInstance(instance);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
        setMenuInstance(null);
    };

    const updateFieldValidation = (fieldKey: string, status: 'pending' | 'approved' | 'rejected', comments: string = '') => {
        setFieldValidations(prev => ({
            ...prev,
            [fieldKey]: { status, comments }
        }));
    };

    const handleSubmitValidation = async () => {
        if (!selectedInstance) return;

        try {
            // Calculate validation summary
            const validations = Object.values(fieldValidations);
            const approvedCount = validations.filter(v => v.status === 'approved').length;
            const rejectedCount = validations.filter(v => v.status === 'rejected').length;
            const pendingCount = validations.filter(v => v.status === 'pending').length;

            // Determine overall validation result
            let overallStatus = 'pending';
            let overallComments = '';

            if (pendingCount === 0) {
                if (rejectedCount > 0) {
                    overallStatus = 'rejected';
                    overallComments = `${rejectedCount} field(s) rejected, ${approvedCount} field(s) approved`;
                } else {
                    overallStatus = 'approved';
                    overallComments = `All ${approvedCount} field(s) approved`;
                }
            }

            // Send validation results to backend
            await api.post(`/instances/${selectedInstance.instance_id}/validate-data`, {
                field_validations: fieldValidations,
                overall_status: overallStatus,
                validation_summary: overallComments
            });

            await fetchData();
            setValidationDialog(false);
            setFieldValidations({});
            setSelectedInstance(null);
            setInstanceDetails(null);
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.detail || err.message || 'Failed to submit validation');
        }
    };

    // Helper functions for modification requests
    const addModificationRequest = () => {
        setModificationRequests([...modificationRequests, '']);
    };

    const updateModificationRequest = (index: number, value: string) => {
        const updated = [...modificationRequests];
        updated[index] = value;
        setModificationRequests(updated);
    };

    const removeModificationRequest = (index: number) => {
        if (modificationRequests.length > 1) {
            const updated = modificationRequests.filter((_, i) => i !== index);
            setModificationRequests(updated);
        }
    };

    // Dialog reset functions
    const resetDialogs = () => {
        setSelectedInstance(null);
        setApprovalComments('');
        setRejectionReason('');
        setRejectionComments('');
        setModificationRequests(['']);
        setModificationComments('');
        setAssignmentNotes('');
        setSelectedUserId('');
        setSelectedTeamId('');
    };

    const getStatusColor = (status: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
        switch (status?.toLowerCase()) {
            case 'unassigned': return 'default';
            case 'pending_review': return 'info';
            case 'under_review': return 'warning';
            case 'approved_by_reviewer': return 'primary';
            case 'rejected': return 'error';
            case 'modification_requested': return 'secondary';
            case 'pending_signature': return 'warning';
            case 'completed': return 'success';
            case 'escalated': return 'error';
            case 'on_hold': return 'secondary';
            default: return 'default';
        }
    };

    const getInstanceStatusColor = (status: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
        switch (status?.toLowerCase()) {
            case 'running': return 'info';
            case 'completed': return 'success';
            case 'failed': return 'error';
            case 'paused': return 'warning';
            case 'cancelled': return 'default';
            case 'awaiting_input': return 'warning';
            case 'pending_validation': return 'secondary';
            default: return 'default';
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString();
    };

    // Filter instances by assignment status for tabs
    const myAssignedInstances = instances.filter(i => 
        (i.assignment_status === 'pending_review' || i.assignment_status === 'under_review') &&
        i.assigned_user_id
    );
    
    const teamAssignedInstances = instances.filter(i => 
        (i.assignment_status === 'pending_review' || i.assignment_status === 'under_review') &&
        i.assigned_team_id && !i.assigned_user_id
    );
    
    const completedInstances = instances.filter(i => 
        i.assignment_status === 'completed'
    );

    const getCurrentInstances = () => {
        switch (tabValue) {
            case 0: return myAssignedInstances;
            case 1: return teamAssignedInstances;
            case 2: return completedInstances;
            default: return instances;
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" sx={{ mb: 3 }}>
                {t('instance_assignments')}
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Summary Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                {t('my_assignments')}
                            </Typography>
                            <Typography variant="h5">
                                <Badge badgeContent={myAssignedInstances.length} color="primary">
                                    <AssignmentIcon />
                                </Badge>
                                <span style={{ marginLeft: 16 }}>{myAssignedInstances.length}</span>
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                {t('team_assignments')}
                            </Typography>
                            <Typography variant="h5">
                                <Badge badgeContent={teamAssignedInstances.length} color="secondary">
                                    <AssignTeamIcon />
                                </Badge>
                                <span style={{ marginLeft: 16 }}>{teamAssignedInstances.length}</span>
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                {t('in_progress')}
                            </Typography>
                            <Typography variant="h5">
                                {instances.filter(i => i.assignment_status === 'under_review').length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                {t('completed')}
                            </Typography>
                            <Typography variant="h5">
                                {completedInstances.length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={6} md={3}>
                        <FormControl fullWidth size="small">
                            <InputLabel>{t('assignment_status')}</InputLabel>
                            <Select
                                value={statusFilter}
                                label={t('assignment_status')}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <MenuItem value="">{t('all')}</MenuItem>
                                <MenuItem value="unassigned">{t('unassigned')}</MenuItem>
                                <MenuItem value="pending_review">Pending Review</MenuItem>
                                <MenuItem value="under_review">Under Review</MenuItem>
                                <MenuItem value="approved_by_reviewer">Approved by Reviewer</MenuItem>
                                <MenuItem value="rejected">Rejected</MenuItem>
                                <MenuItem value="modification_requested">Modifications Requested</MenuItem>
                                <MenuItem value="pending_signature">Pending Signature</MenuItem>
                                <MenuItem value="completed">{t('completed')}</MenuItem>
                                <MenuItem value="escalated">{t('escalated')}</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <TextField
                            fullWidth
                            size="small"
                            label={t('workflow_id')}
                            value={workflowFilter}
                            onChange={(e) => setWorkflowFilter(e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <FormControl fullWidth size="small">
                            <InputLabel>{t('team')}</InputLabel>
                            <Select
                                value={teamFilter}
                                label={t('team')}
                                onChange={(e) => setTeamFilter(e.target.value)}
                            >
                                <MenuItem value="">{t('all')}</MenuItem>
                                {teams.map(team => (
                                    <MenuItem key={team.team_id} value={team.team_id}>
                                        {team.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Button
                            variant="outlined"
                            startIcon={<RefreshIcon />}
                            onClick={fetchData}
                            disabled={loading}
                        >
                            {t('refresh')}
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            {/* Tabs */}
            <Paper sx={{ mb: 2 }}>
                <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
                    <Tab 
                        label={
                            <Badge badgeContent={myAssignedInstances.length} color="primary">
                                {t('my_assignments')}
                            </Badge>
                        } 
                    />
                    <Tab 
                        label={
                            <Badge badgeContent={teamAssignedInstances.length} color="secondary">
                                {t('team_assignments')}
                            </Badge>
                        } 
                    />
                    <Tab 
                        label={
                            <Badge badgeContent={completedInstances.length} color="success">
                                {t('completed')}
                            </Badge>
                        } 
                    />
                </Tabs>
            </Paper>

            {/* Instance Table */}
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>{t('instance_id')}</TableCell>
                            <TableCell>{t('workflow')}</TableCell>
                            <TableCell>{t('citizen')}</TableCell>
                            <TableCell>{t('status')}</TableCell>
                            <TableCell>{t('assignment_status')}</TableCell>
                            <TableCell>{t('assigned_to')}</TableCell>
                            <TableCell>{t('assigned_at')}</TableCell>
                            <TableCell>{t('actions')}</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {getCurrentInstances().map((instance) => (
                            <TableRow key={instance.instance_id}>
                                <TableCell>
                                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                        {instance.instance_id.substring(0, 8)}...
                                    </Typography>
                                </TableCell>
                                <TableCell>{instance.workflow_id}</TableCell>
                                <TableCell>{instance.user_id}</TableCell>
                                <TableCell>
                                    <Chip 
                                        label={instance.status} 
                                        color={getInstanceStatusColor(instance.status)}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Chip 
                                        label={instance.assignment_status || 'unassigned'} 
                                        color={getStatusColor(instance.assignment_status || 'unassigned')}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell>
                                    {instance.assigned_user_id ? (
                                        <Chip icon={<AssignUserIcon />} label={`User: ${instance.assigned_user_id}`} size="small" />
                                    ) : instance.assigned_team_id ? (
                                        <Chip icon={<AssignTeamIcon />} label={`Team: ${instance.assigned_team_id}`} size="small" />
                                    ) : (
                                        <Typography variant="body2" color="textSecondary">-</Typography>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2">
                                        {formatDate(instance.assigned_at)}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <Tooltip title="View Instance Details">
                                            <IconButton
                                                size="small"
                                                color="info"
                                                onClick={() => fetchInstanceDetails(instance.instance_id)}
                                            >
                                                <ViewIcon />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Validate Data Fields">
                                            <IconButton
                                                size="small"
                                                color="secondary"
                                                onClick={() => fetchInstanceDetails(instance.instance_id, true)}
                                            >
                                                <ValidateIcon />
                                            </IconButton>
                                        </Tooltip>
                                        {instance.assignment_status === 'pending_review' && (
                                            <Tooltip title="Start Review">
                                                <IconButton
                                                    size="small"
                                                    color="primary"
                                                    onClick={() => handleStartReview(instance)}
                                                >
                                                    <StartIcon />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                        {instance.assignment_status === 'under_review' && (
                                            <>
                                                <Tooltip title="Approve by Reviewer">
                                                    <IconButton
                                                        size="small"
                                                        color="success"
                                                        onClick={() => {
                                                            setSelectedInstance(instance);
                                                            setApproveDialog(true);
                                                        }}
                                                    >
                                                        <CompleteIcon />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Reject Instance">
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => {
                                                            setSelectedInstance(instance);
                                                            setRejectDialog(true);
                                                        }}
                                                    >
                                                        <RejectIcon />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Request Modifications">
                                                    <IconButton
                                                        size="small"
                                                        color="warning"
                                                        onClick={() => {
                                                            setSelectedInstance(instance);
                                                            setModificationDialog(true);
                                                        }}
                                                    >
                                                        <ModificationIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            </>
                                        )}
                                        <Tooltip title={t('more_actions')}>
                                            <IconButton
                                                size="small"
                                                onClick={(e) => handleOpenMenu(e, instance)}
                                            >
                                                <MoreIcon />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={totalCount}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={(_, newPage) => setPage(newPage)}
                    onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
                />
            </TableContainer>

            {/* Action Menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleCloseMenu}
            >
                <MenuItem onClick={() => {
                    setSelectedInstance(menuInstance);
                    setAssignUserDialog(true);
                    handleCloseMenu();
                }}>
                    <ListItemIcon><AssignUserIcon /></ListItemIcon>
                    <ListItemText>{t('assign_to_user')}</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => {
                    setSelectedInstance(menuInstance);
                    setAssignTeamDialog(true);
                    handleCloseMenu();
                }}>
                    <ListItemIcon><AssignTeamIcon /></ListItemIcon>
                    <ListItemText>{t('assign_to_team')}</ListItemText>
                </MenuItem>
                {menuInstance && (menuInstance.assigned_user_id || menuInstance.assigned_team_id) && (
                    <MenuItem onClick={() => menuInstance && handleUnassign(menuInstance)}>
                        <ListItemIcon><UnassignIcon /></ListItemIcon>
                        <ListItemText>{t('unassign')}</ListItemText>
                    </MenuItem>
                )}
            </Menu>

            {/* Assign to User Dialog */}
            <Dialog open={assignUserDialog} onClose={() => setAssignUserDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>{t('assign_to_user')}</DialogTitle>
                <DialogContent>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>{t('select_user')}</InputLabel>
                        <Select
                            value={selectedUserId}
                            label={t('select_user')}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                        >
                            {users.map(user => (
                                <MenuItem key={user.id} value={user.id}>
                                    {user.full_name} ({user.email})
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        margin="normal"
                        label={t('assignment_notes')}
                        multiline
                        rows={3}
                        value={assignmentNotes}
                        onChange={(e) => setAssignmentNotes(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAssignUserDialog(false)}>{t('cancel')}</Button>
                    <Button onClick={handleAssignToUser} variant="contained" disabled={!selectedUserId}>
                        {t('assign')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Assign to Team Dialog */}
            <Dialog open={assignTeamDialog} onClose={() => setAssignTeamDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>{t('assign_to_team')}</DialogTitle>
                <DialogContent>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>{t('select_team')}</InputLabel>
                        <Select
                            value={selectedTeamId}
                            label={t('select_team')}
                            onChange={(e) => setSelectedTeamId(e.target.value)}
                        >
                            {teams.map(team => (
                                <MenuItem key={team.team_id} value={team.team_id}>
                                    {team.name} ({team.members.length} {t('members')})
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        margin="normal"
                        label={t('assignment_notes')}
                        multiline
                        rows={3}
                        value={assignmentNotes}
                        onChange={(e) => setAssignmentNotes(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAssignTeamDialog(false)}>{t('cancel')}</Button>
                    <Button onClick={handleAssignToTeam} variant="contained" disabled={!selectedTeamId}>
                        {t('assign')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Approve Instance Dialog */}
            <Dialog open={approveDialog} onClose={() => { setApproveDialog(false); resetDialogs(); }} maxWidth="md" fullWidth>
                <DialogTitle>Approve Instance</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Review Comments"
                        multiline
                        rows={4}
                        value={approvalComments}
                        onChange={(e) => setApprovalComments(e.target.value)}
                        helperText="Add any comments about your approval decision"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setApproveDialog(false); resetDialogs(); }}>Cancel</Button>
                    <Button onClick={handleApproveByReviewer} variant="contained" color="success">
                        Approve & Forward for Signature
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Reject Instance Dialog */}
            <Dialog open={rejectDialog} onClose={() => { setRejectDialog(false); resetDialogs(); }} maxWidth="md" fullWidth>
                <DialogTitle>Reject Instance</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Rejection Reason *"
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        helperText="Please provide a clear reason for rejection"
                        required
                    />
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Additional Comments"
                        multiline
                        rows={3}
                        value={rejectionComments}
                        onChange={(e) => setRejectionComments(e.target.value)}
                        helperText="Optional: Add detailed explanation for the citizen"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setRejectDialog(false); resetDialogs(); }}>Cancel</Button>
                    <Button 
                        onClick={handleRejectByReviewer} 
                        variant="contained" 
                        color="error"
                        disabled={!rejectionReason.trim()}
                    >
                        Reject Instance
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Request Modifications Dialog */}
            <Dialog open={modificationDialog} onClose={() => { setModificationDialog(false); resetDialogs(); }} maxWidth="md" fullWidth>
                <DialogTitle>Request Modifications from Citizen</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                        Specify what changes the citizen needs to make to their submission:
                    </Typography>
                    
                    {modificationRequests.map((request, index) => (
                        <Box key={index} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 2 }}>
                            <TextField
                                fullWidth
                                label={`Modification Request ${index + 1}`}
                                multiline
                                rows={2}
                                value={request}
                                onChange={(e) => updateModificationRequest(index, e.target.value)}
                                placeholder="Describe what needs to be changed..."
                            />
                            {modificationRequests.length > 1 && (
                                <IconButton 
                                    color="error" 
                                    onClick={() => removeModificationRequest(index)}
                                    sx={{ mt: 1 }}
                                >
                                    <RemoveIcon />
                                </IconButton>
                            )}
                        </Box>
                    ))}
                    
                    <Button
                        startIcon={<AddIcon />}
                        onClick={addModificationRequest}
                        sx={{ mb: 2 }}
                    >
                        Add Another Request
                    </Button>
                    
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Additional Comments for Citizen"
                        multiline
                        rows={3}
                        value={modificationComments}
                        onChange={(e) => setModificationComments(e.target.value)}
                        helperText="Optional: Provide general guidance or context"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setModificationDialog(false); resetDialogs(); }}>Cancel</Button>
                    <Button 
                        onClick={handleRequestModifications} 
                        variant="contained" 
                        color="warning"
                        disabled={modificationRequests.every(req => !req.trim())}
                    >
                        Send Modification Requests
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Field Validation Dialog */}
            <Dialog 
                open={validationDialog} 
                onClose={() => { 
                    setValidationDialog(false); 
                    setFieldValidations({});
                    setSelectedInstance(null);
                    setInstanceDetails(null);
                }} 
                maxWidth="lg" 
                fullWidth
            >
                <DialogTitle>
                    Validate Data Fields: {instanceDetails?.instance_id?.substring(0, 8)}...
                </DialogTitle>
                <DialogContent>
                    {instanceDetails && (
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
                                Please review each field submitted by the citizen and mark it as approved or rejected. 
                                Add comments to explain your decision, especially for rejections.
                            </Typography>

                            {/* Progress Summary */}
                            <Card sx={{ mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>Validation Progress</Typography>
                                    <Box sx={{ display: 'flex', gap: 3 }}>
                                        <Box sx={{ textAlign: 'center' }}>
                                            <Typography variant="h4">
                                                {Object.values(fieldValidations).filter(v => v.status === 'approved').length}
                                            </Typography>
                                            <Typography variant="body2">Approved</Typography>
                                        </Box>
                                        <Box sx={{ textAlign: 'center' }}>
                                            <Typography variant="h4">
                                                {Object.values(fieldValidations).filter(v => v.status === 'rejected').length}
                                            </Typography>
                                            <Typography variant="body2">Rejected</Typography>
                                        </Box>
                                        <Box sx={{ textAlign: 'center' }}>
                                            <Typography variant="h4">
                                                {Object.values(fieldValidations).filter(v => v.status === 'pending').length}
                                            </Typography>
                                            <Typography variant="body2">Pending</Typography>
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>

                            {/* Field Validation Cards */}
                            {instanceDetails.context && Object.entries(instanceDetails.context).map(([contextKey, contextValue]) => {
                                if (contextKey.includes('citizen_data') && typeof contextValue === 'object') {
                                    return (
                                        <Card key={contextKey} sx={{ mb: 3 }}>
                                            <CardContent>
                                                <Typography variant="h6" color="primary" gutterBottom>
                                                    {contextKey.replace('_citizen_data', '').replace('_', ' ').toUpperCase()}
                                                </Typography>
                                                
                                                {Object.entries(contextValue as any).map(([fieldKey, fieldValue]) => {
                                                    const validationKey = `${contextKey}.${fieldKey}`;
                                                    const validation = fieldValidations[validationKey] || { status: 'pending', comments: '' };
                                                    
                                                    return (
                                                        <Paper 
                                                            key={fieldKey} 
                                                            sx={{ 
                                                                p: 2, 
                                                                mb: 2, 
                                                                border: validation.status === 'approved' ? '2px solid #4caf50' :
                                                                        validation.status === 'rejected' ? '2px solid #f44336' :
                                                                        '2px solid #e0e0e0'
                                                            }}
                                                        >
                                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                                                <Box sx={{ flex: 1 }}>
                                                                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                                                                        {fieldKey.replace('_', ' ').toUpperCase()}
                                                                    </Typography>
                                                                    <Typography 
                                                                        variant="body1" 
                                                                        sx={{ 
                                                                            p: 1, 
                                                                            bgcolor: 'grey.100', 
                                                                            borderRadius: 1,
                                                                            fontFamily: 'monospace'
                                                                        }}
                                                                    >
                                                                        {String(fieldValue)}
                                                                    </Typography>
                                                                </Box>
                                                                
                                                                <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
                                                                    <Tooltip title="Approve Field">
                                                                        <IconButton
                                                                            color={validation.status === 'approved' ? 'success' : 'default'}
                                                                            onClick={() => updateFieldValidation(validationKey, 'approved')}
                                                                        >
                                                                            <ApproveFieldIcon />
                                                                        </IconButton>
                                                                    </Tooltip>
                                                                    <Tooltip title="Reject Field">
                                                                        <IconButton
                                                                            color={validation.status === 'rejected' ? 'error' : 'default'}
                                                                            onClick={() => updateFieldValidation(validationKey, 'rejected')}
                                                                        >
                                                                            <RejectFieldIcon />
                                                                        </IconButton>
                                                                    </Tooltip>
                                                                    <Tooltip title="Mark as Pending">
                                                                        <IconButton
                                                                            color={validation.status === 'pending' ? 'warning' : 'default'}
                                                                            onClick={() => updateFieldValidation(validationKey, 'pending')}
                                                                        >
                                                                            <PendingIcon />
                                                                        </IconButton>
                                                                    </Tooltip>
                                                                </Box>
                                                            </Box>
                                                            
                                                            {/* Status Indicator */}
                                                            <Box sx={{ mb: 2 }}>
                                                                <Chip 
                                                                    label={validation.status.toUpperCase()}
                                                                    color={
                                                                        validation.status === 'approved' ? 'success' :
                                                                        validation.status === 'rejected' ? 'error' : 'warning'
                                                                    }
                                                                    size="small"
                                                                    icon={
                                                                        validation.status === 'approved' ? <ApproveFieldIcon /> :
                                                                        validation.status === 'rejected' ? <RejectFieldIcon /> : <PendingIcon />
                                                                    }
                                                                />
                                                            </Box>
                                                            
                                                            {/* Comments Field */}
                                                            <TextField
                                                                fullWidth
                                                                label="Validation Comments"
                                                                multiline
                                                                rows={2}
                                                                value={validation.comments}
                                                                onChange={(e) => updateFieldValidation(validationKey, validation.status, e.target.value)}
                                                                placeholder={
                                                                    validation.status === 'rejected' ? 'Required: Explain why this field is rejected' :
                                                                    validation.status === 'approved' ? 'Optional: Add approval notes' :
                                                                    'Add validation comments...'
                                                                }
                                                                error={validation.status === 'rejected' && !validation.comments.trim()}
                                                                helperText={
                                                                    validation.status === 'rejected' && !validation.comments.trim() ? 
                                                                    'Comments are required for rejected fields' : ''
                                                                }
                                                                variant="outlined"
                                                                size="small"
                                                            />
                                                        </Paper>
                                                    );
                                                })}
                                            </CardContent>
                                        </Card>
                                    );
                                }
                                return null;
                            })}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { 
                        setValidationDialog(false); 
                        setFieldValidations({});
                        setSelectedInstance(null);
                        setInstanceDetails(null);
                    }}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleSubmitValidation}
                        variant="contained"
                        color="primary"
                        disabled={
                            Object.values(fieldValidations).some(v => v.status === 'rejected' && !v.comments.trim()) ||
                            Object.values(fieldValidations).every(v => v.status === 'pending')
                        }
                    >
                        Submit Validation
                    </Button>
                </DialogActions>
            </Dialog>

            {/* View Instance Details Dialog */}
            <Dialog 
                open={viewDetailsDialog} 
                onClose={() => { 
                    setViewDetailsDialog(false); 
                    setInstanceDetails(null); 
                }} 
                maxWidth="lg" 
                fullWidth
            >
                <DialogTitle>
                    Instance Details: {instanceDetails?.instance_id?.substring(0, 8)}...
                </DialogTitle>
                <DialogContent>
                    {instanceDetails && (
                        <Box sx={{ mt: 2 }}>
                            {/* Basic Instance Info */}
                            <Card sx={{ mb: 3 }}>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>Basic Information</Typography>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={6}>
                                            <Typography variant="body2" color="textSecondary">Instance ID:</Typography>
                                            <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                                                {instanceDetails.instance_id}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <Typography variant="body2" color="textSecondary">Workflow:</Typography>
                                            <Typography variant="body1">{instanceDetails.workflow_id}</Typography>
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <Typography variant="body2" color="textSecondary">Status:</Typography>
                                            <Chip 
                                                label={instanceDetails.status} 
                                                color={getInstanceStatusColor(instanceDetails.status)}
                                                size="small"
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <Typography variant="body2" color="textSecondary">Created:</Typography>
                                            <Typography variant="body1">
                                                {new Date(instanceDetails.created_at).toLocaleString()}
                                            </Typography>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>

                            {/* Assignment Info */}
                            <Card sx={{ mb: 3 }}>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>Assignment Information</Typography>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={6}>
                                            <Typography variant="body2" color="textSecondary">Assignment Status:</Typography>
                                            <Chip 
                                                label={instanceDetails.assignment_status || 'unassigned'} 
                                                color={getStatusColor(instanceDetails.assignment_status || 'unassigned')}
                                                size="small"
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <Typography variant="body2" color="textSecondary">Assigned To:</Typography>
                                            <Typography variant="body1">
                                                {instanceDetails.assigned_user_id || instanceDetails.assigned_team_id || 'Not assigned'}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <Typography variant="body2" color="textSecondary">Assigned At:</Typography>
                                            <Typography variant="body1">
                                                {formatDate(instanceDetails.assigned_at)}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <Typography variant="body2" color="textSecondary">Assignment Notes:</Typography>
                                            <Typography variant="body1">
                                                {instanceDetails.assignment_notes || 'No notes'}
                                            </Typography>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>

                            {/* Submitted Data */}
                            {instanceDetails.context && (
                                <Card sx={{ mb: 3 }}>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>Submitted Data</Typography>
                                        {Object.entries(instanceDetails.context).map(([key, value]) => {
                                            // Filter out system/internal fields and show only citizen data
                                            if (key.includes('citizen_data') && typeof value === 'object') {
                                                return (
                                                    <Box key={key} sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                                                        <Typography variant="subtitle2" color="primary" gutterBottom>
                                                            {key.replace('_citizen_data', '').replace('_', ' ').toUpperCase()}
                                                        </Typography>
                                                        <Grid container spacing={2}>
                                                            {Object.entries(value as any).map(([fieldKey, fieldValue]) => (
                                                                <Grid item xs={12} sm={6} key={fieldKey}>
                                                                    <Typography variant="body2" color="textSecondary">
                                                                        {fieldKey.replace('_', ' ')}:
                                                                    </Typography>
                                                                    <Typography variant="body1">
                                                                        {String(fieldValue)}
                                                                    </Typography>
                                                                </Grid>
                                                            ))}
                                                        </Grid>
                                                    </Box>
                                                );
                                            }
                                            return null;
                                        })}
                                        
                                        {/* Show files if any */}
                                        {Object.entries(instanceDetails.context).some(([key]) => key.includes('uploaded_files')) && (
                                            <Box sx={{ mt: 2 }}>
                                                <Typography variant="subtitle2" color="primary" gutterBottom>
                                                    Uploaded Files
                                                </Typography>
                                                {Object.entries(instanceDetails.context).map(([key, value]) => {
                                                    if (key.includes('uploaded_files') && typeof value === 'object') {
                                                        return Object.entries(value as any).map(([fileName, fileInfo]: [string, any]) => (
                                                            <Chip 
                                                                key={fileName}
                                                                label={`${fileInfo.filename || fileName} (${fileInfo.size || 'N/A'} bytes)`}
                                                                variant="outlined"
                                                                sx={{ m: 0.5 }}
                                                            />
                                                        ));
                                                    }
                                                    return null;
                                                })}
                                            </Box>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Raw Context Data (for debugging) */}
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>Raw Context Data</Typography>
                                    <Box sx={{ 
                                        bgcolor: 'grey.100', 
                                        p: 2, 
                                        borderRadius: 1, 
                                        maxHeight: 300, 
                                        overflow: 'auto',
                                        fontFamily: 'monospace',
                                        fontSize: '0.875rem'
                                    }}>
                                        <pre>{JSON.stringify(instanceDetails.context, null, 2)}</pre>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { 
                        setViewDetailsDialog(false); 
                        setInstanceDetails(null); 
                    }}>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default InstanceAssignment;