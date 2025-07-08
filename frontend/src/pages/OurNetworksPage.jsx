import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Alert,
  Collapse,
  Switch,
  FormControlLabel,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import api from '../services/api';
import { useSelector } from 'react-redux';
import { selectUser } from '../store/slices/authSlice';

const ourNetworkSchema = yup.object({
  name: yup.string().required('Name is required').max(100, 'Name must be less than 100 characters'),
  description: yup.string().max(500, 'Description must be less than 500 characters'),
  assignedAffiliateManagers: yup.array().of(yup.string()),
});

const OurNetworksPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const user = useSelector(selectUser);
  
  const [ourNetworks, setOurNetworks] = useState([]);
  const [affiliateManagers, setAffiliateManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingNetwork, setEditingNetwork] = useState(null);
  const [viewingNetwork, setViewingNetwork] = useState(null);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [notification, setNotification] = useState({ message: '', severity: 'info' });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(ourNetworkSchema),
    defaultValues: {
      name: '',
      description: '',
      assignedAffiliateManagers: [],
    },
  });

  const fetchOurNetworks = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page + 1,
        limit: rowsPerPage,
        ...(searchTerm && { search: searchTerm }),
        ...(showActiveOnly && { isActive: 'true' }),
      });

      const response = await api.get(`/our-networks?${params}`);
      setOurNetworks(response.data.data);
      setTotalCount(response.data.pagination.total);
    } catch (error) {
      setNotification({
        message: error.response?.data?.message || 'Failed to fetch our networks',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, searchTerm, showActiveOnly]);

  const fetchAffiliateManagers = useCallback(async () => {
    try {
      const response = await api.get('/users?role=affiliate_manager');
      setAffiliateManagers(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch affiliate managers:', error);
    }
  }, []);

  useEffect(() => {
    fetchOurNetworks();
  }, [fetchOurNetworks]);

  useEffect(() => {
    fetchAffiliateManagers();
  }, [fetchAffiliateManagers]);

  const handleOpenDialog = (network = null) => {
    setEditingNetwork(network);
    if (network) {
      reset({
        name: network.name,
        description: network.description || '',
        assignedAffiliateManagers: network.assignedAffiliateManagers?.map(manager => manager._id) || [],
      });
    } else {
      reset({
        name: '',
        description: '',
        assignedAffiliateManagers: [],
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingNetwork(null);
    reset();
  };

  const handleViewNetwork = (network) => {
    setViewingNetwork(network);
    setOpenViewDialog(true);
  };

  const onSubmit = async (data) => {
    try {
      if (editingNetwork) {
        await api.put(`/our-networks/${editingNetwork._id}`, data);
        setNotification({ message: 'Our network updated successfully!', severity: 'success' });
      } else {
        await api.post('/our-networks', data);
        setNotification({ message: 'Our network created successfully!', severity: 'success' });
      }
      handleCloseDialog();
      fetchOurNetworks();
    } catch (error) {
      setNotification({
        message: error.response?.data?.message || 'Failed to save our network',
        severity: 'error',
      });
    }
  };

  const handleDelete = async (networkId) => {
    if (!window.confirm('Are you sure you want to delete this our network?')) {
      return;
    }

    try {
      await api.delete(`/our-networks/${networkId}`);
      setNotification({ message: 'Our network deleted successfully!', severity: 'success' });
      fetchOurNetworks();
    } catch (error) {
      setNotification({
        message: error.response?.data?.message || 'Failed to delete our network',
        severity: 'error',
      });
    }
  };

  const handleToggleActive = async (network) => {
    try {
      await api.put(`/our-networks/${network._id}`, {
        isActive: !network.isActive,
      });
      setNotification({
        message: `Our network ${!network.isActive ? 'activated' : 'deactivated'} successfully!`,
        severity: 'success',
      });
      fetchOurNetworks();
    } catch (error) {
      setNotification({
        message: error.response?.data?.message || 'Failed to update our network status',
        severity: 'error',
      });
    }
  };

  if (user?.role !== 'admin') {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Access denied. Only admins can manage our networks.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Our Networks
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ minWidth: isMobile ? 'auto' : '200px' }}
        >
          {isMobile ? 'Add' : 'Add Our Network'}
        </Button>
      </Box>

      <Collapse in={!!notification.message}>
        <Alert
          severity={notification.severity}
          onClose={() => setNotification({ message: '', severity: 'info' })}
          sx={{ mb: 2 }}
        >
          {notification.message}
        </Alert>
      </Collapse>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            label="Search our networks"
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ minWidth: isMobile ? '100%' : '300px' }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={showActiveOnly}
                onChange={(e) => setShowActiveOnly(e.target.checked)}
              />
            }
            label="Show active only"
          />
          <Button
            variant="outlined"
            onClick={fetchOurNetworks}
            disabled={loading}
          >
            Search
          </Button>
        </Box>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Assigned Managers</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : ourNetworks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No our networks found
                </TableCell>
              </TableRow>
            ) : (
              ourNetworks.map((network) => (
                <TableRow key={network._id} hover>
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight="medium">
                      {network.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {network.description || 'No description'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {network.assignedAffiliateManagers?.length > 0 ? (
                        network.assignedAffiliateManagers.map((manager) => (
                          <Chip
                            key={manager._id}
                            label={manager.fullName}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        ))
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          No managers assigned
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={network.isActive ? 'Active' : 'Inactive'}
                      color={network.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(network.createdAt).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => handleViewNetwork(network)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(network)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={network.isActive ? 'Deactivate' : 'Activate'}>
                        <IconButton
                          size="small"
                          onClick={() => handleToggleActive(network)}
                        >
                          <Switch
                            checked={network.isActive}
                            size="small"
                          />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(network._id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={totalCount}
        page={page}
        onPageChange={(event, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(parseInt(event.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[5, 10, 25, 50]}
      />

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingNetwork ? 'Edit Our Network' : 'Add Our Network'}
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Name"
                    fullWidth
                    error={!!errors.name}
                    helperText={errors.name?.message}
                  />
                )}
              />
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Description"
                    fullWidth
                    multiline
                    rows={3}
                    error={!!errors.description}
                    helperText={errors.description?.message}
                  />
                )}
              />
              <Controller
                name="assignedAffiliateManagers"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Assigned Affiliate Managers</InputLabel>
                    <Select
                      {...field}
                      multiple
                      input={<OutlinedInput label="Assigned Affiliate Managers" />}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => {
                            const manager = affiliateManagers.find(m => m._id === value);
                            return (
                              <Chip
                                key={value}
                                label={manager?.fullName || value}
                                size="small"
                              />
                            );
                          })}
                        </Box>
                      )}
                    >
                      {affiliateManagers.map((manager) => (
                        <MenuItem key={manager._id} value={manager._id}>
                          <Box>
                            <Typography variant="body2">
                              {manager.fullName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {manager.email}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button 
              type="submit" 
              variant="contained" 
              disabled={isSubmitting}
            >
              {editingNetwork ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={openViewDialog} onClose={() => setOpenViewDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Our Network Details</DialogTitle>
        <DialogContent>
          {viewingNetwork && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Name</Typography>
                <Typography variant="body1">{viewingNetwork.name}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Description</Typography>
                <Typography variant="body1">{viewingNetwork.description || 'No description'}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                <Chip
                  label={viewingNetwork.isActive ? 'Active' : 'Inactive'}
                  color={viewingNetwork.isActive ? 'success' : 'default'}
                  size="small"
                />
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Assigned Affiliate Managers</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                  {viewingNetwork.assignedAffiliateManagers?.length > 0 ? (
                    viewingNetwork.assignedAffiliateManagers.map((manager) => (
                      <Chip
                        key={manager._id}
                        label={manager.fullName}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No managers assigned
                    </Typography>
                  )}
                </Box>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Created By</Typography>
                <Typography variant="body1">{viewingNetwork.createdBy?.fullName}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Created At</Typography>
                <Typography variant="body1">
                  {new Date(viewingNetwork.createdAt).toLocaleString()}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenViewDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OurNetworksPage; 