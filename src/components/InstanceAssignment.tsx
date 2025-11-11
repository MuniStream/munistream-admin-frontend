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
    PersonAdd as AssignUserIcon,
    GroupAdd as AssignTeamIcon,
    MoreVert as MoreIcon,
    Refresh as RefreshIcon,
    PersonRemove as UnassignIcon,
    Add as AddIcon,
    Visibility as ViewIcon,
} from '@mui/icons-material';

import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import AssignmentService from '../services/assignmentService';

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
    const { user } = useAuth();

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
    const [viewDetailsDialog, setViewDetailsDialog] = useState(false);
    const [instanceDetails, setInstanceDetails] = useState<any>(null);
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [selectedTeamId, setSelectedTeamId] = useState<string>('');
    const [assignmentNotes, setAssignmentNotes] = useState('');

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
            let response;

            if (tabValue === 0) {
                // Pending tab: Get unassigned instances
                response = await AssignmentService.listAssignments({
                    skip: page * rowsPerPage,
                    limit: rowsPerPage,
                    status: statusFilter || undefined,
                    // Don't set user_id or team_id to get unassigned instances
                });
            } else {
                // Assigned to me tab: Get instances assigned to current user
                response = await AssignmentService.listAssignments({
                    skip: page * rowsPerPage,
                    limit: rowsPerPage,
                    status: statusFilter || undefined,
                    user_id: user?.sub, // Filter by current user
                });
            }

            // Convert to expected format
            setInstances(response.assignments.map((assignment: any) => ({
                instance_id: assignment.instance_id,
                workflow_id: assignment.workflow_id,
                user_id: assignment.citizen_email || 'unknown',
                status: assignment.status,
                current_step: assignment.current_step,
                assigned_user_id: assignment.assigned_to_user,
                assigned_team_id: assignment.assigned_to_team,
                assignment_status: assignment.status,
                assignment_type: 'MANUAL',
                assigned_at: assignment.assigned_at,
                assigned_by: assignment.assigned_by,
                assignment_notes: '',
                created_at: assignment.created_at,
                updated_at: assignment.updated_at,
                completed_at: null
            })));
            console.log('🔍 MAPPED INSTANCES LENGTH:', response.assignments.length);
            console.log('🔍 FIRST MAPPED INSTANCE:', response.assignments.length > 0 ? response.assignments.map(a => ({id: a.instance_id, status: a.status, team: a.assigned_to_team}))[0] : 'NONE');
            setTotalCount(response.total);

            setError(null);
        } catch (err: any) {
            console.error('Failed to fetch assignments:', err);
            setError(err.response?.data?.detail || err.message || 'Failed to fetch assignments');
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const users = await AssignmentService.listAssignableUsers();
            const formattedUsers = users.map(user => ({
                id: user.user_id,
                full_name: user.user_name,
                email: user.user_email,
                role: user.role
            }));
            setUsers(formattedUsers);
        } catch (err) {
            console.error('Failed to fetch users:', err);
        }
    };

    const fetchTeams = async () => {
        try {
            const teams = await AssignmentService.listAvailableTeams();
            const formattedTeams = teams.map(team => ({
                team_id: team.team_id,
                name: team.team_name,
                members: Array(team.member_count).fill(null)
            }));
            setTeams(formattedTeams);
        } catch (err) {
            console.error('Failed to fetch teams:', err);
        }
    };

    const fetchInstanceDetails = async (instanceId: string) => {
        try {
            const response = await api.get(`/instances/${instanceId}`);
            setInstanceDetails(response.data);
            setViewDetailsDialog(true);
        } catch (err: any) {
            setError(err.response?.data?.detail || err.message || 'Failed to fetch instance details');
        }
    };

    const handleStartWorkflow = async (instance: WorkflowInstance) => {
        try {
            await AssignmentService.startWorkflow(instance.instance_id, {
                notes: 'Started from assignment interface'
            });
            await fetchData();
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.detail || err.message || 'Failed to start workflow');
        }
    };

    const handleQuickStart = async (instance: WorkflowInstance) => {
        try {
            await AssignmentService.quickStartAssignment(instance.instance_id, 'Quick assignment and start');
            await fetchData();
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.detail || err.message || 'Failed to quick start workflow');
        }
    };

    const handleAssignToUser = async () => {
        if (!selectedInstance || !selectedUserId) return;

        try {
            await AssignmentService.assignToUser(
                selectedInstance.instance_id,
                selectedUserId,
                assignmentNotes
            );
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
            await AssignmentService.assignToTeam(
                selectedInstance.instance_id,
                selectedTeamId,
                assignmentNotes
            );
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
            case 'waiting_for_start': return 'info';
            case 'pending_assignment': return 'warning';
            // Assignment status colors
            case 'pending_review': return 'info';
            case 'under_review': return 'warning';
            case 'approved_by_reviewer': return 'primary';
            case 'rejected': return 'error';
            case 'modification_requested': return 'secondary';
            case 'pending_signature': return 'warning';
            case 'escalated': return 'error';
            default: return 'default';
        }
    };

    const getCombinedStatus = (instance: any) => {
        // If instance has assignment status, it's more relevant to show that
        if (instance.assignment_status && instance.assignment_status !== 'unassigned') {
            return instance.assignment_status;
        }
        // Otherwise show the instance status
        return instance.status;
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString();
    };

    // Filter instances for the two-tab system
    console.log('🔍 INSTANCES AT RENDER:', instances.length);
    const pendingInstances = instances; // Show all instances since backend filters to ADMIN only
    console.log('🔍 PENDING INSTANCES:', pendingInstances.length);

    const assignedToMeInstances = instances.filter(i => {
        const isAssignedToMe = i.assigned_user_id === user?.sub;
        const isAssignedToMyTeam = i.assigned_team_id && user?.teams?.includes(i.assigned_team_id);
        return isAssignedToMe || isAssignedToMyTeam;
    }).sort((a, b) => {
        const statusOrder: Record<string, number> = {
            'waiting_for_start': 0,
            'pending_start': 1,
            'waiting': 2,
            'running': 3,
            'in_progress': 4,
            'under_review': 5,
            'pending_review': 6,
            'completed': 7,
            'failed': 8,
            'cancelled': 9
        };
        return (statusOrder[a.status] || 10) - (statusOrder[b.status] || 10);
    });

    const getCurrentInstances = () => {
        const result = (() => {
            switch (tabValue) {
                case 0: return pendingInstances;
                case 1: return assignedToMeInstances;
                default: return pendingInstances;
            }
        })();
        console.log('🔍 getCurrentInstances() TAB:', tabValue, 'RETURNING:', result.length, 'ITEMS');
        return result;
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
                <Grid item xs={12} sm={6}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Pending Workflows
                            </Typography>
                            <Typography variant="h5">
                                <Badge badgeContent={pendingInstances.length} color="warning">
                                    <StartIcon />
                                </Badge>
                                <span style={{ marginLeft: 16 }}>{pendingInstances.length}</span>
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                                Unassigned or unstarted workflows
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Assigned to Me
                            </Typography>
                            <Typography variant="h5">
                                <Badge badgeContent={assignedToMeInstances.length} color="primary">
                                    <AssignmentIcon />
                                </Badge>
                                <span style={{ marginLeft: 16 }}>{assignedToMeInstances.length}</span>
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                                Workflows assigned to me or my team
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
                            <Badge badgeContent={pendingInstances.length} color="warning">
                                Pending
                            </Badge>
                        }
                    />
                    <Tab
                        label={
                            <Badge badgeContent={assignedToMeInstances.length} color="primary">
                                Assigned to Me
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
                                        label={getCombinedStatus(instance)}
                                        color={getInstanceStatusColor(getCombinedStatus(instance))}
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
                                        {(
                                            // Current conditions
                                            (instance.status === 'waiting_for_start' || instance.assignment_status === 'waiting_for_start') ||
                                            // Additional admin workflow conditions
                                            (instance.status === 'pending_assignment' && instance.assigned_user_id) ||
                                            (instance.assignment_status === 'assigned' && instance.status !== 'running') ||
                                            // Show for admin workflows that are ready to start
                                            (instance.assignment_status === 'pending_review' && instance.status !== 'running')
                                        ) && (
                                            <Tooltip title="Start Assigned Workflow">
                                                <IconButton
                                                    size="small"
                                                    color="success"
                                                    onClick={() => handleStartWorkflow(instance)}
                                                >
                                                    <StartIcon />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                        {!instance.assigned_user_id && !instance.assigned_team_id && (
                                            <Tooltip title="Quick Start (Assign to Me & Start)">
                                                <IconButton
                                                    size="small"
                                                    color="warning"
                                                    onClick={() => handleQuickStart(instance)}
                                                >
                                                    <AddIcon />
                                                </IconButton>
                                            </Tooltip>
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