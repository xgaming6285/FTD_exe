import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  Typography,
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
  Chip,
  Button,
  IconButton,
  Tooltip,
  Stack,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  useTheme,
  Grid,
} from '@mui/material';
import {
  History as HistoryIcon,
  AttachMoney as MoneyIcon,
  Schedule as PendingIcon,
  CheckCircle as ApprovedIcon,
  Cancel as RejectedIcon,
  Paid as CompletedIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  Link as LinkIcon,
  OpenInNew as OpenInNewIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { selectUser } from '../store/slices/authSlice';
import { getAgentWithdrawals, getWithdrawalStatusColor, getWithdrawalStatusText } from '../services/withdrawals';

const PaymentHistoryPage = () => {
  const theme = useTheme();
  const user = useSelector(selectUser);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'info' });

  useEffect(() => {
    if (user && user.role === 'agent') {
      loadPaymentHistory();
    }
  }, [user]);

  const loadPaymentHistory = async () => {
    try {
      setLoading(true);
      const response = await getAgentWithdrawals();
      setWithdrawals(response.data);
    } catch (error) {
      console.error('Failed to load payment history:', error);
      showAlert('Failed to load payment history', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPaymentHistory();
    setRefreshing(false);
    showAlert('Payment history refreshed successfully', 'success');
  };

  const handleViewDetails = (withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setDetailsModalOpen(true);
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

  const getStatusMessage = (status) => {
    switch (status) {
      case 'pending':
        return 'Your withdrawal request is being reviewed by an admin';
      case 'approved':
        return 'Your withdrawal has been approved and is being processed';
      case 'completed':
        return 'Your withdrawal has been completed and payment has been sent';
      case 'rejected':
        return 'Your withdrawal request was rejected';
      default:
        return 'Status unknown';
    }
  };

  const getTotalEarnings = () => {
    return withdrawals.reduce((total, withdrawal) => {
      return withdrawal.status === 'completed' ? total + withdrawal.amount : total;
    }, 0);
  };

  const getPendingAmount = () => {
    return withdrawals.reduce((total, withdrawal) => {
      return withdrawal.status === 'pending' ? total + withdrawal.amount : total;
    }, 0);
  };

  if (!user || user.role !== 'agent') {
    return (
      <Alert severity="error">
        Access denied. Agent role required to view payment history.
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
          Payment History
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

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <CompletedIcon sx={{ mr: 2, color: 'success.main' }} />
                  <Box>
                    <Typography variant="h4" color="success.main">
                      {formatCurrency(getTotalEarnings())}
                    </Typography>
                    <Typography color="textSecondary">
                      Total Withdrawn
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Successfully completed
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        <Grid item xs={12} md={6}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <PendingIcon sx={{ mr: 2, color: 'warning.main' }} />
                  <Box>
                    <Typography variant="h4" color="warning.main">
                      {formatCurrency(getPendingAmount())}
                    </Typography>
                    <Typography color="textSecondary">
                      Pending Withdrawal
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Being processed
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>

      {/* Withdrawal History Table */}
      <Card>
        <CardHeader
          title="Your Withdrawal Requests"
          subheader={`${withdrawals.length} withdrawal requests found`}
          action={
            <Chip
              icon={<HistoryIcon />}
              label={`${withdrawals.length} Total`}
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
                    <TableCell>Amount</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Request Date</TableCell>
                    <TableCell>Processed Date</TableCell>
                    <TableCell>Payment Link</TableCell>
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
                            {formatCurrency(withdrawal.amount)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Base: {formatCurrency(withdrawal.breakdown?.basePay || 0)} |
                            Bonus: {formatCurrency(withdrawal.breakdown?.bonuses || 0)}
                          </Typography>
                        </Box>
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
                          <Typography variant="body2">
                            {formatDate(withdrawal.processedAt)}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Not processed yet
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {withdrawal.paymentLink ? (
                          <Link
                            href={withdrawal.paymentLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                          >
                            <LinkIcon fontSize="small" />
                            View Payment
                            <OpenInNewIcon fontSize="small" />
                          </Link>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No link available
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => handleViewDetails(withdrawal)}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {withdrawals.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
                          <HistoryIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
                          <Typography color="text.secondary">
                            No withdrawal requests found
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Your withdrawal requests will appear here once you make one
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Details Modal */}
      <Dialog
        open={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <MoneyIcon color="primary" />
            <Box>
              <Typography variant="h6">
                Withdrawal Request Details
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedWithdrawal && formatCurrency(selectedWithdrawal.amount)}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedWithdrawal && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Amount Breakdown
                  </Typography>
                  <Stack spacing={1}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography>Base Pay:</Typography>
                      <Typography fontWeight="medium">
                        {formatCurrency(selectedWithdrawal.breakdown?.basePay || 0)}
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography>Bonuses:</Typography>
                      <Typography fontWeight="medium">
                        {formatCurrency(selectedWithdrawal.breakdown?.bonuses || 0)}
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography>Fines:</Typography>
                      <Typography fontWeight="medium" color="error">
                        -{formatCurrency(selectedWithdrawal.breakdown?.fines || 0)}
                      </Typography>
                    </Box>
                    <Divider />
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="h6">Total:</Typography>
                      <Typography variant="h6" color="primary">
                        {formatCurrency(selectedWithdrawal.amount)}
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Request Information
                  </Typography>
                  <Stack spacing={1}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <CalendarIcon fontSize="small" color="action" />
                      <Typography variant="body2">
                        Requested: {formatDate(selectedWithdrawal.createdAt)}
                      </Typography>
                    </Box>
                    {selectedWithdrawal.processedAt && (
                      <Box display="flex" alignItems="center" gap={1}>
                        <CalendarIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          Processed: {formatDate(selectedWithdrawal.processedAt)}
                        </Typography>
                      </Box>
                    )}
                    {selectedWithdrawal.processedBy && (
                      <Box display="flex" alignItems="center" gap={1}>
                        <PersonIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          Processed by: {selectedWithdrawal.processedBy.fullName}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Wallet Address
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      wordBreak: 'break-all',
                      backgroundColor: 'grey.50',
                      p: 1,
                      borderRadius: 1,
                      fontFamily: 'monospace'
                    }}
                  >
                    {selectedWithdrawal.walletAddress}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Status
                  </Typography>
                  <Box display="flex" alignItems="center" gap={2} mb={1}>
                    <Chip
                      icon={getStatusIcon(selectedWithdrawal.status)}
                      label={getWithdrawalStatusText(selectedWithdrawal.status)}
                      color={getWithdrawalStatusColor(selectedWithdrawal.status)}
                      size="small"
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {getStatusMessage(selectedWithdrawal.status)}
                  </Typography>
                </Grid>

                {selectedWithdrawal.paymentLink && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Payment Link
                    </Typography>
                    <Link
                      href={selectedWithdrawal.paymentLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                    >
                      <LinkIcon fontSize="small" />
                      View Payment Confirmation
                      <OpenInNewIcon fontSize="small" />
                    </Link>
                  </Grid>
                )}

                {selectedWithdrawal.adminNotes && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Admin Notes
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        backgroundColor: 'grey.50',
                        p: 1,
                        borderRadius: 1,
                        fontStyle: 'italic'
                      }}
                    >
                      {selectedWithdrawal.adminNotes}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsModalOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PaymentHistoryPage; 