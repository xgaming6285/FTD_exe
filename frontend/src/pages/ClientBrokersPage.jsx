import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  useMediaQuery,
  useTheme,
  Switch,
  FormControlLabel,
  Tooltip,
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  Language as DomainIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import api from '../services/api';
import { selectUser } from '../store/slices/authSlice';

const clientBrokerSchema = yup.object({
  name: yup.string().required('Broker name is required').max(100, 'Name must be less than 100 characters').trim(),
  domain: yup.string().max(200, 'Domain must be less than 200 characters').trim(),
  description: yup.string().max(500, 'Description must be less than 500 characters').trim(),
  isActive: yup.boolean().default(true),
});

const ClientBrokersPage = () => {
  const user = useSelector(selectUser);
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  // State management
  const [brokers, setBrokers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ message: '', severity: 'info' });
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBroker, setSelectedBroker] = useState(null);
  
  // Pagination and filters
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalBrokers, setTotalBrokers] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    totalLeadsAssigned: 0,
  });

  // Form management
  const {
    control: createControl,
    handleSubmit: handleCreateSubmit,
    reset: resetCreate,
    formState: { errors: createErrors, isSubmitting: isCreating },
  } = useForm({
    resolver: yupResolver(clientBrokerSchema),
    defaultValues: {
      name: '',
      domain: '',
      description: '',
      isActive: true,
    },
  });

  const {
    control: editControl,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    setValue: setEditValue,
    formState: { errors: editErrors, isSubmitting: isUpdating },
  } = useForm({
    resolver: yupResolver(clientBrokerSchema),
  });

  // Fetch brokers
  const fetchBrokers = useCallback(async () => {
    setLoading(true);
    setNotification({ message: '', severity: 'info' });
    
    try {
      const params = new URLSearchParams({
        page: page + 1,
        limit: rowsPerPage,
      });
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      if (activeFilter !== 'all') {
        params.append('isActive', activeFilter === 'active');
      }

      const response = await api.get(`/client-brokers?${params}`);
      setBrokers(response.data.data || []);
      setTotalBrokers(response.data.pagination?.total || 0);
    } catch (error) {
      console.error('Error fetching brokers:', error);
      setNotification({
        message: 'Failed to load client brokers',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, searchTerm, activeFilter]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/client-brokers/stats');
      const statsData = response.data.data || [];
      
      let total = 0, active = 0, inactive = 0, totalLeadsAssigned = 0;
      
      statsData.forEach(stat => {
        total += stat.count;
        totalLeadsAssigned += stat.totalLeadsAssigned;
        
        if (stat._id.isActive) {
          active += stat.count;
        } else {
          inactive += stat.count;
        }
      });
      
      setStats({ total, active, inactive, totalLeadsAssigned });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchBrokers();
      fetchStats();
    }
  }, [user, fetchBrokers, fetchStats]);

  // Handlers
  const handleCreateBroker = async (data) => {
    try {
      await api.post('/client-brokers', data);
      setNotification({
        message: 'Client broker created successfully!',
        severity: 'success'
      });
      setCreateDialogOpen(false);
      resetCreate();
      fetchBrokers();
      fetchStats();
    } catch (error) {
      setNotification({
        message: error.response?.data?.message || 'Failed to create client broker',
        severity: 'error'
      });
    }
  };

  const handleEditBroker = async (data) => {
    try {
      await api.put(`/client-brokers/${selectedBroker._id}`, data);
      setNotification({
        message: 'Client broker updated successfully!',
        severity: 'success'
      });
      setEditDialogOpen(false);
      resetEdit();
      setSelectedBroker(null);
      fetchBrokers();
      fetchStats();
    } catch (error) {
      setNotification({
        message: error.response?.data?.message || 'Failed to update client broker',
        severity: 'error'
      });
    }
  };

  const handleDeleteBroker = async () => {
    try {
      await api.delete(`/client-brokers/${selectedBroker._id}`);
      setNotification({
        message: 'Client broker deleted successfully!',
        severity: 'success'
      });
      setDeleteDialogOpen(false);
      setSelectedBroker(null);
      fetchBrokers();
      fetchStats();
    } catch (error) {
      setNotification({
        message: error.response?.data?.message || 'Failed to delete client broker',
        severity: 'error'
      });
    }
  };

  const openEditDialog = (broker) => {
    setSelectedBroker(broker);
    setEditValue('name', broker.name);
    setEditValue('domain', broker.domain || '');
    setEditValue('description', broker.description || '');
    setEditValue('isActive', broker.isActive);
    setEditDialogOpen(true);
  };

  const openViewDialog = async (broker) => {
    try {
      const response = await api.get(`/client-brokers/${broker._id}`);
      setSelectedBroker(response.data.data);
      setViewDialogOpen(true);
    } catch (error) {
      setNotification({
        message: 'Failed to load broker details',
        severity: 'error'
      });
    }
  };

  const openDeleteDialog = (broker) => {
    setSelectedBroker(broker);
    setDeleteDialogOpen(true);
  };

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  const handleFilterChange = (event) => {
    setActiveFilter(event.target.value);
    setPage(0);
  };

  // Check if user is admin
  if (user?.role !== 'admin') {
    return (
      <Box p={3}>
        <Alert severity="error">
          Access denied. Only administrators can manage client brokers.
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          Client Brokers Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
          size={isSmallScreen ? 'small' : 'medium'}
        >
          Add Client Broker
        </Button>
      </Box>

      {/* Notification */}
      {notification.message && (
        <Alert 
          severity={notification.severity} 
          sx={{ mb: 2 }}
          onClose={() => setNotification({ message: '', severity: 'info' })}
        >
          {notification.message}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <BusinessIcon color="primary" />
                <Box>
                  <Typography variant="h4" color="primary">
                    {stats.total}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Brokers
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <ActiveIcon color="success" />
                <Box>
                  <Typography variant="h4" color="success.main">
                    {stats.active}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <InactiveIcon color="error" />
                <Box>
                  <Typography variant="h4" color="error.main">
                    {stats.inactive}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Inactive
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <PersonIcon color="info" />
                <Box>
                  <Typography variant="h4" color="info.main">
                    {stats.totalLeadsAssigned}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Leads Assigned
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Filters */}
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search brokers..."
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Status Filter</InputLabel>
              <Select
                value={activeFilter}
                onChange={handleFilterChange}
                label="Status Filter"
              >
                <MenuItem value="all">All Brokers</MenuItem>
                <MenuItem value="active">Active Only</MenuItem>
                <MenuItem value="inactive">Inactive Only</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Typography variant="body2" color="text.secondary">
              Showing {brokers.length} of {totalBrokers} brokers
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Brokers Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Domain</TableCell>
              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Description</TableCell>
              <TableCell>Status</TableCell>
              <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Leads</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : brokers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    No client brokers found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              brokers.map((broker) => (
                <TableRow key={broker._id} hover>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <BusinessIcon fontSize="small" color="action" />
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {broker.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ID: {broker._id.slice(-8)}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    {broker.domain ? (
                      <Box display="flex" alignItems="center" gap={1}>
                        <DomainIcon fontSize="small" color="action" />
                        <Typography variant="body2">{broker.domain}</Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No domain
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                      {broker.description || 'No description'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={broker.isActive ? 'Active' : 'Inactive'}
                      color={broker.isActive ? 'success' : 'error'}
                      size="small"
                      icon={broker.isActive ? <ActiveIcon /> : <InactiveIcon />}
                    />
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    <Typography variant="body2">
                      {broker.activeLeadsCount || 0} leads
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => openViewDialog(broker)}
                          color="primary"
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => openEditDialog(broker)}
                          color="primary"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          onClick={() => openDeleteDialog(broker)}
                          color="error"
                          disabled={broker.activeLeadsCount > 0}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={totalBrokers}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
      />

      {/* Create Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => setCreateDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <AddIcon color="primary" />
            <Typography variant="h6">Create New Client Broker</Typography>
          </Box>
        </DialogTitle>
        <form onSubmit={handleCreateSubmit(handleCreateBroker)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Controller
                  name="name"
                  control={createControl}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Broker Name *"
                      placeholder="Enter broker name"
                      error={!!createErrors.name}
                      helperText={createErrors.name?.message}
                      disabled={isCreating}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="domain"
                  control={createControl}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Domain (Optional)"
                      placeholder="e.g., broker.example.com"
                      error={!!createErrors.domain}
                      helperText={createErrors.domain?.message}
                      disabled={isCreating}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="description"
                  control={createControl}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Description (Optional)"
                      placeholder="Enter broker description"
                      multiline
                      rows={3}
                      error={!!createErrors.description}
                      helperText={createErrors.description?.message}
                      disabled={isCreating}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="isActive"
                  control={createControl}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={field.onChange}
                          disabled={isCreating}
                        />
                      }
                      label="Active (available for assignment)"
                    />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)} disabled={isCreating}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isCreating}
              startIcon={isCreating ? <CircularProgress size={20} /> : <AddIcon />}
            >
              {isCreating ? 'Creating...' : 'Create Broker'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <EditIcon color="primary" />
            <Typography variant="h6">Edit Client Broker</Typography>
          </Box>
        </DialogTitle>
        <form onSubmit={handleEditSubmit(handleEditBroker)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Controller
                  name="name"
                  control={editControl}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Broker Name *"
                      placeholder="Enter broker name"
                      error={!!editErrors.name}
                      helperText={editErrors.name?.message}
                      disabled={isUpdating}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="domain"
                  control={editControl}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Domain (Optional)"
                      placeholder="e.g., broker.example.com"
                      error={!!editErrors.domain}
                      helperText={editErrors.domain?.message}
                      disabled={isUpdating}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="description"
                  control={editControl}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Description (Optional)"
                      placeholder="Enter broker description"
                      multiline
                      rows={3}
                      error={!!editErrors.description}
                      helperText={editErrors.description?.message}
                      disabled={isUpdating}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="isActive"
                  control={editControl}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={field.onChange}
                          disabled={isUpdating}
                        />
                      }
                      label="Active (available for assignment)"
                    />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)} disabled={isUpdating}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isUpdating}
              startIcon={isUpdating ? <CircularProgress size={20} /> : <EditIcon />}
            >
              {isUpdating ? 'Updating...' : 'Update Broker'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* View Dialog */}
      <Dialog 
        open={viewDialogOpen} 
        onClose={() => setViewDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <ViewIcon color="primary" />
            <Typography variant="h6">Client Broker Details</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedBroker && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Broker Name
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedBroker.name}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Status
                </Typography>
                <Chip
                  label={selectedBroker.isActive ? 'Active' : 'Inactive'}
                  color={selectedBroker.isActive ? 'success' : 'error'}
                  size="small"
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Domain
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedBroker.domain || 'No domain specified'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Currently Assigned Leads
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedBroker.activeLeadsCount || 0} leads
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Description
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedBroker.description || 'No description provided'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Total Leads Assigned (All Time)
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedBroker.totalLeadsAssigned || 0} leads
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Last Assignment Date
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedBroker.lastAssignedAt 
                    ? new Date(selectedBroker.lastAssignedAt).toLocaleString()
                    : 'No assignments yet'
                  }
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Created By
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedBroker.createdBy?.fullName || 'Unknown'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Created Date
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {new Date(selectedBroker.createdAt).toLocaleString()}
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteDialogOpen} 
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <DeleteIcon color="error" />
            <Typography variant="h6">Delete Client Broker</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone. Are you sure you want to delete this client broker?
          </Alert>
          {selectedBroker && (
            <Box>
              <Typography variant="body1" gutterBottom>
                <strong>Broker:</strong> {selectedBroker.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Domain:</strong> {selectedBroker.domain || 'No domain'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Current Leads:</strong> {selectedBroker.activeLeadsCount || 0} leads
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDeleteBroker}
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
          >
            Delete Broker
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ClientBrokersPage; 