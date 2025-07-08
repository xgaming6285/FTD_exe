import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Chip,
  InputAdornment,
  Tooltip,
  Grid,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Collapse,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  AttachMoney as MoneyIcon,
  People as PeopleIcon,
  Warning as WarningIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Gavel as GavelIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import {
  getAllAgentBonusConfigs,
  updateAgentBonusConfig,
} from '../services/payroll/calculations';
import {
  getAllAgentFines,
  getAgentFines,
  createAgentFine,
  resolveAgentFine,
  deleteAgentFine,
} from '../services/agentFines';

const AdminBonusManagement = () => {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);

  // Bonuses state
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingAgent, setEditingAgent] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [saving, setSaving] = useState(false);

  // Fines state
  const [fines, setFines] = useState([]);
  const [finesLoading, setFinesLoading] = useState(true);
  const [selectedAgentFines, setSelectedAgentFines] = useState([]);
  const [viewingFinesFor, setViewingFinesFor] = useState(null);
  const [showFineForm, setShowFineForm] = useState(false);
  const [fineFormData, setFineFormData] = useState({
    agentId: '',
    amount: '',
    reason: '',
    description: '',
    notes: ''
  });
  const [processingFine, setProcessingFine] = useState(false);

  // General state
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'info' });

  useEffect(() => {
    loadAgents();
    loadFines();
  }, []);

  const showAlert = (message, severity = 'info') => {
    setAlert({ show: true, message, severity });
    setTimeout(() => setAlert({ show: false, message: '', severity: 'info' }), 5000);
  };

  const loadAgents = async () => {
    try {
      setLoading(true);
      const configs = await getAllAgentBonusConfigs();
      setAgents(configs);
    } catch (error) {
      console.error('Failed to load agents:', error);
      showAlert('Failed to load agents data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadFines = async () => {
    try {
      setFinesLoading(true);
      const finesData = await getAllAgentFines();
      setFines(finesData);
    } catch (error) {
      console.error('Failed to load fines:', error);
      showAlert('Failed to load fines data', 'error');
    } finally {
      setFinesLoading(false);
    }
  };

  const handleRefresh = async () => {
    await Promise.all([loadAgents(), loadFines()]);
    showAlert('Data refreshed successfully', 'success');
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Bonus management functions
  const handleEditAgent = (agent) => {
    setEditingAgent(agent.agent._id);
    setEditValues({
      firstCall: agent.bonusRates.firstCall,
      secondCall: agent.bonusRates.secondCall,
      thirdCall: agent.bonusRates.thirdCall,
      fourthCall: agent.bonusRates.fourthCall,
      fifthCall: agent.bonusRates.fifthCall,
      verifiedAcc: agent.bonusRates.verifiedAcc,
    });
  };

  const handleCancelEdit = () => {
    setEditingAgent(null);
    setEditValues({});
  };

  const handleSaveAgent = async (agent) => {
    try {
      setSaving(true);
      await updateAgentBonusConfig(agent.agent._id, editValues, '');
      await loadAgents();
      setEditingAgent(null);
      setEditValues({});
      showAlert(`Bonuses updated successfully for ${agent.agent.fullName}`, 'success');
    } catch (error) {
      console.error('Failed to save bonuses:', error);
      showAlert('Failed to save bonuses', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleValueChange = (field, value) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) return;
    setEditValues(prev => ({
      ...prev,
      [field]: numValue
    }));
  };

  // Fines management functions
  const handleViewAgentFines = async (agent) => {
    try {
      setViewingFinesFor(agent);
      const agentFines = await getAgentFines(agent.agent._id, true);
      setSelectedAgentFines(agentFines);
    } catch (error) {
      console.error('Failed to load agent fines:', error);
      showAlert('Failed to load agent fines', 'error');
    }
  };

  const handleCloseFinesView = () => {
    setViewingFinesFor(null);
    setSelectedAgentFines([]);
  };

  const handleOpenFineForm = (agent = null) => {
    setFineFormData({
      agentId: agent ? agent.agent._id : '',
      amount: '',
      reason: '',
      description: '',
      notes: ''
    });
    setShowFineForm(true);
  };

  const handleCloseFineForm = () => {
    setShowFineForm(false);
    setFineFormData({
      agentId: '',
      amount: '',
      reason: '',
      description: '',
      notes: ''
    });
  };

  const handleCreateFine = async () => {
    try {
      setProcessingFine(true);

      if (!fineFormData.agentId || !fineFormData.amount || !fineFormData.reason) {
        showAlert('Please fill in all required fields', 'error');
        return;
      }

      await createAgentFine(fineFormData.agentId, {
        amount: parseFloat(fineFormData.amount),
        reason: fineFormData.reason,
        description: fineFormData.description,
        notes: fineFormData.notes
      });

      await loadFines();
      handleCloseFineForm();
      showAlert('Fine created successfully', 'success');
    } catch (error) {
      console.error('Failed to create fine:', error);
      showAlert('Failed to create fine', 'error');
    } finally {
      setProcessingFine(false);
    }
  };

  const handleResolveFine = async (fineId, status) => {
    try {
      setProcessingFine(true);
      await resolveAgentFine(fineId, status, '');
      await loadFines();
      showAlert(`Fine marked as ${status}`, 'success');
    } catch (error) {
      console.error('Failed to resolve fine:', error);
      showAlert('Failed to resolve fine', 'error');
    } finally {
      setProcessingFine(false);
    }
  };

  const handleDeleteFine = async (fineId) => {
    if (!window.confirm('Are you sure you want to delete this fine?')) return;

    try {
      setProcessingFine(true);
      await deleteAgentFine(fineId);
      await loadFines();
      showAlert('Fine deleted successfully', 'success');
    } catch (error) {
      console.error('Failed to delete fine:', error);
      showAlert('Failed to delete fine', 'error');
    } finally {
      setProcessingFine(false);
    }
  };

  // Utility functions
  const formatCurrency = (value) => `$${Number(value).toFixed(2)}`;
  const calculateTotal = (bonusRates) => {
    return Object.values(bonusRates).reduce((sum, rate) => sum + rate, 0);
  };

  const getAgentTotalFines = (agentId) => {
    return fines
      .filter(fine => fine.agent._id === agentId && fine.status === 'active')
      .reduce((sum, fine) => sum + fine.amount, 0);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'error';
      case 'paid': return 'success';
      case 'waived': return 'info';
      case 'disputed': return 'warning';
      default: return 'default';
    }
  };

  if (loading || finesLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {alert.show && (
        <Alert severity={alert.severity} sx={{ mb: 2 }}>
          {alert.message}
        </Alert>
      )}

      {/* Header */}
      <Card sx={{ mb: 3 }}>
        <CardHeader
          title={
            <Box display="flex" alignItems="center" gap={1}>
              <PeopleIcon />
              <Typography variant="h5" fontWeight="bold">
                Agent Management
              </Typography>
            </Box>
          }
          action={
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
              disabled={loading || finesLoading}
            >
              Refresh
            </Button>
          }
        />
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            Manage agent bonuses and fines. Use the tabs below to switch between bonuses and fines management.
          </Typography>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Bonuses" icon={<MoneyIcon />} />
          <Tab label="Fines" icon={<WarningIcon />} />
        </Tabs>
      </Paper>

      {/* Bonuses Tab */}
      {tabValue === 0 && (
        <Card>
          <CardHeader
            title={
              <Box display="flex" alignItems="center" gap={1}>
                <MoneyIcon />
                <Typography variant="h6">Agent Bonuses</Typography>
                <Chip
                  label={`${agents.length} Agents`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </Box>
            }
          />
          <CardContent>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight="bold">
                        Agent
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="subtitle2" fontWeight="bold">
                        1st Call
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="subtitle2" fontWeight="bold">
                        2nd Call
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="subtitle2" fontWeight="bold">
                        3rd Call
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="subtitle2" fontWeight="bold">
                        4th Call
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="subtitle2" fontWeight="bold">
                        5th Call
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="subtitle2" fontWeight="bold">
                        Verified Acc
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="subtitle2" fontWeight="bold">
                        Total
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="subtitle2" fontWeight="bold">
                        Actions
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {agents.map((agent) => {
                    const isEditing = editingAgent === agent.agent._id;
                    const displayValues = isEditing ? editValues : agent.bonusRates;

                    return (
                      <TableRow
                        key={agent.agent._id}
                        sx={{
                          '&:nth-of-type(odd)': {
                            backgroundColor: theme.palette.action.hover,
                          },
                          '&:hover': {
                            backgroundColor: theme.palette.action.selected,
                          },
                        }}
                      >
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {agent.agent.fullName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {agent.agent.email}
                            </Typography>
                          </Box>
                        </TableCell>

                        {/* Bonus fields */}
                        {['firstCall', 'secondCall', 'thirdCall', 'fourthCall', 'fifthCall', 'verifiedAcc'].map((field) => (
                          <TableCell key={field} align="center">
                            {isEditing ? (
                              <TextField
                                size="small"
                                type="number"
                                value={displayValues[field]}
                                onChange={(e) => handleValueChange(field, e.target.value)}
                                InputProps={{
                                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                                }}
                                inputProps={{ min: 0, step: 0.01 }}
                                sx={{ width: 100 }}
                              />
                            ) : (
                              <Typography variant="body2" fontWeight="bold" color="primary.main">
                                {formatCurrency(displayValues[field])}
                              </Typography>
                            )}
                          </TableCell>
                        ))}

                        {/* Total */}
                        <TableCell align="center">
                          <Typography variant="body2" fontWeight="bold" color="success.main">
                            {formatCurrency(calculateTotal(displayValues))}
                          </Typography>
                        </TableCell>

                        {/* Actions */}
                        <TableCell align="center">
                          <Box display="flex" gap={1} justifyContent="center">
                            {isEditing ? (
                              <>
                                <Tooltip title="Save Changes">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleSaveAgent(agent)}
                                    color="success"
                                    disabled={saving}
                                  >
                                    <SaveIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Cancel">
                                  <IconButton
                                    size="small"
                                    onClick={handleCancelEdit}
                                    color="error"
                                    disabled={saving}
                                  >
                                    <CancelIcon />
                                  </IconButton>
                                </Tooltip>
                              </>
                            ) : (
                              <Tooltip title="Edit Bonuses">
                                <IconButton
                                  size="small"
                                  onClick={() => handleEditAgent(agent)}
                                  color="primary"
                                >
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Fines Tab */}
      {tabValue === 1 && (
        <Card>
          <CardHeader
            title={
              <Box display="flex" alignItems="center" gap={1}>
                <WarningIcon />
                <Typography variant="h6">Agent Fines</Typography>
                <Chip
                  label={`${fines.length} Total Fines`}
                  size="small"
                  color="error"
                  variant="outlined"
                />
              </Box>
            }
            action={
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenFineForm()}
                color="error"
              >
                Add Fine
              </Button>
            }
          />
          <CardContent>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight="bold">
                        Agent
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="subtitle2" fontWeight="bold">
                        Active Fines
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="subtitle2" fontWeight="bold">
                        Total Fines
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="subtitle2" fontWeight="bold">
                        Actions
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {agents.map((agent) => {
                    const activeFines = getAgentTotalFines(agent.agent._id);
                    const totalFines = fines
                      .filter(fine => fine.agent._id === agent.agent._id)
                      .reduce((sum, fine) => sum + fine.amount, 0);
                    const fineCount = fines.filter(fine => fine.agent._id === agent.agent._id).length;

                    return (
                      <TableRow
                        key={agent.agent._id}
                        sx={{
                          '&:nth-of-type(odd)': {
                            backgroundColor: theme.palette.action.hover,
                          },
                          '&:hover': {
                            backgroundColor: theme.palette.action.selected,
                          },
                        }}
                      >
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {agent.agent.fullName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {agent.agent.email}
                            </Typography>
                          </Box>
                        </TableCell>

                        <TableCell align="center">
                          <Typography
                            variant="body2"
                            fontWeight="bold"
                            color={activeFines > 0 ? 'error.main' : 'success.main'}
                          >
                            {formatCurrency(activeFines)}
                          </Typography>
                        </TableCell>

                        <TableCell align="center">
                          <Typography variant="body2" fontWeight="bold">
                            {formatCurrency(totalFines)}
                          </Typography>
                        </TableCell>

                        <TableCell align="center">
                          <Box display="flex" gap={1} justifyContent="center">
                            <Tooltip title="View Fines">
                              <IconButton
                                size="small"
                                onClick={() => handleViewAgentFines(agent)}
                                color="primary"
                              >
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Add Fine">
                              <IconButton
                                size="small"
                                onClick={() => handleOpenFineForm(agent)}
                                color="error"
                              >
                                <AddIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Create Fine Dialog */}
      <Dialog open={showFineForm} onClose={handleCloseFineForm} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <GavelIcon />
            <Typography>Create New Fine</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Agent</InputLabel>
                <Select
                  value={fineFormData.agentId}
                  onChange={(e) => setFineFormData(prev => ({ ...prev, agentId: e.target.value }))}
                  label="Agent"
                >
                  {agents.map((agent) => (
                    <MenuItem key={agent.agent._id} value={agent.agent._id}>
                      {agent.agent.fullName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Fine Amount"
                type="number"
                value={fineFormData.amount}
                onChange={(e) => setFineFormData(prev => ({ ...prev, amount: e.target.value }))}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
                inputProps={{ min: 0, step: 0.01 }}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Reason"
                value={fineFormData.reason}
                onChange={(e) => setFineFormData(prev => ({ ...prev, reason: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={fineFormData.description}
                onChange={(e) => setFineFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={2}
                value={fineFormData.notes}
                onChange={(e) => setFineFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseFineForm} startIcon={<CancelIcon />}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateFine}
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={processingFine}
            color="error"
          >
            {processingFine ? 'Creating...' : 'Create Fine'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Agent Fines Dialog */}
      <Dialog
        open={!!viewingFinesFor}
        onClose={handleCloseFinesView}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <WarningIcon />
            <Typography>
              Fines for {viewingFinesFor?.agent.fullName}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedAgentFines.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 2 }}>
              No fines found for this agent.
            </Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Amount</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedAgentFines.map((fine) => (
                    <TableRow key={fine._id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {formatCurrency(fine.amount)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {fine.reason}
                        </Typography>
                        {fine.description && (
                          <Typography variant="caption" color="text.secondary">
                            {fine.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={fine.status}
                          color={getStatusColor(fine.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {new Date(fine.imposedDate).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={1}>
                          {fine.status === 'active' && (
                            <>
                              <Tooltip title="Mark as Paid">
                                <IconButton
                                  size="small"
                                  onClick={() => handleResolveFine(fine._id, 'paid')}
                                  color="success"
                                  disabled={processingFine}
                                >
                                  <CheckIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Waive Fine">
                                <IconButton
                                  size="small"
                                  onClick={() => handleResolveFine(fine._id, 'waived')}
                                  color="info"
                                  disabled={processingFine}
                                >
                                  <CloseIcon />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                          <Tooltip title="Delete Fine">
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteFine(fine._id)}
                              color="error"
                              disabled={processingFine}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseFinesView}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminBonusManagement;