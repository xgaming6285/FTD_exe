import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  useTheme,
} from '@mui/material';
import {
  AccountBalanceWallet as WalletIcon,
  Visibility as ViewIcon,
  Edit as ProcessIcon,
  Refresh as RefreshIcon,
  AttachMoney as MoneyIcon,
  Person as PersonIcon,
  Schedule as PendingIcon,
  CheckCircle as ApprovedIcon,
  Cancel as RejectedIcon,
  Paid as CompletedIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { selectUser } from '../store/slices/authSlice';
import {
  getAllWithdrawals,
  getWithdrawalStats,
  getWithdrawalStatusColor,
  getWithdrawalStatusText
} from '../services/withdrawals';
import ProcessWithdrawalModal from '../components/ProcessWithdrawalModal';

const WithdrawalsPage = () => {
  const theme = useTheme();
  const user = useSelector(selectUser);
  const [withdrawals, setWithdrawals] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [processModalOpen, setProcessModalOpen] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'info' });

  useEffect(() => {
    if (user && user.role === 'admin') {
      loadWithdrawals();
      loadStats();
    }
  }, [user, statusFilter]);

  const loadWithdrawals = async () => {
    try {
      setLoading(true);
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const response = await getAllWithdrawals(params);
      setWithdrawals(response.data);
    } catch (error) {
      console.error('Failed to load withdrawals:', error);
      showAlert('Failed to load withdrawal requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await getWithdrawalStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load withdrawal stats:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadWithdrawals(), loadStats()]);
    setRefreshing(false);
    showAlert('Data refreshed successfully', 'success');
  };

  const handleProcessWithdrawal = (withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setProcessModalOpen(true);
  };

  const showAlert = (message, severity = 'info') => {
    setAlert({ show: true, message, severity });
    setTimeout(() => setAlert({ show: false, message: '', severity: 'info' }), 5000);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <PendingIcon color="warning" />;
      case 'approved':
        return <ApprovedIcon color="info" />;
      case 'completed':
        return <CompletedIcon color="success" />;
      case 'rejected':
        return <RejectedIcon color="error" />;
      default:
        return <PendingIcon />;
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <Alert severity="error">
        Access denied. Admin role required to view withdrawal requests.
      </Alert>
    );
  }

  return (
    <Box sx={{ width: '100%', typography: 'body1' }}>
      {/* Alert */}
      {alert.show && (
        <Alert severity={alert.severity} sx={{ mb: 2 }}>
          {alert.message}
        </Alert>
      )}

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Withdrawal Management
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </Box>

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center">
                    <PendingIcon sx={{ mr: 2, color: 'warning.main' }} />
                    <Box>
                      <Typography variant="h4" color="warning.main">
                        {stats.pending}
                      </Typography>
                      <Typography color="textSecondary">
                        Pending
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {formatCurrency(stats.pendingAmount)}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center">
                    <CompletedIcon sx={{ mr: 2, color: 'success.main' }} />
                    <Box>
                      <Typography variant="h4" color="success.main">
                        {stats.completed}
                      </Typography>
                      <Typography color="textSecondary">
                        Completed
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {formatCurrency(stats.completedAmount)}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center">
                    <MoneyIcon sx={{ mr: 2, color: 'primary.main' }} />
                    <Box>
                      <Typography variant="h4" color="primary.main">
                        {formatCurrency(stats.totalAmount)}
                      </Typography>
                      <Typography color="textSecondary">
                        Total Amount
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        All time
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center">
                    <PersonIcon sx={{ mr: 2, color: 'info.main' }} />
                    <Box>
                      <Typography variant="h4" color="info.main">
                        {stats.total}
                      </Typography>
                      <Typography color="textSecondary">
                        Total Requests
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        All statuses
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center">
            <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
              <InputLabel id="status-filter-label">Status Filter</InputLabel>
              <Select
                labelId="status-filter-label"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Status Filter"
              >
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="approved">Approved</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="rejected">Rejected</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </CardContent>
      </Card>

      {/* Withdrawals Table */}
      <Card>
        <CardHeader
          title="Withdrawal Requests"
          subheader={`${withdrawals.length} requests found`}
          action={
            <Chip
              icon={<WalletIcon />}
              label={`Filter: ${statusFilter === 'all' ? 'All' : getWithdrawalStatusText(statusFilter)}`}
              color="primary"
              variant="outlined"
            />
          }
        />
        <CardContent>
          {loading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Agent</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Wallet Address</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Request Date</TableCell>
                    <TableCell>Processed Date</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {withdrawals.map((withdrawal) => (
                    <TableRow
                      key={withdrawal._id}
                      sx={{
                        '&:hover': {
                          backgroundColor: theme.palette.action.hover
                        }
                      }}
                    >
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {withdrawal.agent?.fullName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {withdrawal.agent?.email}
                          </Typography>
                          {withdrawal.agent?.fourDigitCode && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              Code: {withdrawal.agent.fourDigitCode}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {formatCurrency(withdrawal.amount)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Base: {formatCurrency(withdrawal.breakdown?.basePay || 0)} |
                            Bonus: {formatCurrency(withdrawal.breakdown?.bonuses || 0)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            maxWidth: 200,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {withdrawal.walletAddress}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={getStatusIcon(withdrawal.status)}
                          label={getWithdrawalStatusText(withdrawal.status)}
                          color={getWithdrawalStatusColor(withdrawal.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(withdrawal.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {withdrawal.processedAt ? (
                          <Box>
                            <Typography variant="body2">
                              {formatDate(withdrawal.processedAt)}
                            </Typography>
                            {withdrawal.processedBy && (
                              <Typography variant="caption" color="text.secondary">
                                by {withdrawal.processedBy.fullName}
                              </Typography>
                            )}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Not processed
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Tooltip title="Process Withdrawal">
                            <IconButton
                              size="small"
                              onClick={() => handleProcessWithdrawal(withdrawal)}
                              disabled={withdrawal.status !== 'pending'}
                            >
                              <ProcessIcon />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                  {withdrawals.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">
                          No withdrawal requests found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Process Withdrawal Modal */}
      <ProcessWithdrawalModal
        open={processModalOpen}
        onClose={() => setProcessModalOpen(false)}
        withdrawal={selectedWithdrawal}
        onProcessed={handleRefresh}
      />
    </Box>
  );
};

export default WithdrawalsPage; 