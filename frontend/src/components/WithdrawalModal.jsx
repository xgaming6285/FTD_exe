import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Divider,
  Alert,
  CircularProgress,
  InputAdornment,
  Chip,
  Stack,
} from '@mui/material';
import {
  AccountBalanceWallet as WalletIcon,
  AttachMoney as MoneyIcon,
  EmojiEvents as BonusIcon,
  TrendingUp as EarningsIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { calculateAgentBonuses } from '../services/payroll/calculations';
import { getAgentFines } from '../services/agentFines';

const WithdrawalModal = ({
  open,
  onClose,
  agentData,
  bonusConfig,
  onWithdrawalRequest,
  user
}) => {
  const theme = useTheme();
  const [walletAddress, setWalletAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [agentFines, setAgentFines] = useState([]);
  const [finesLoading, setFinesLoading] = useState(false);

  // Fetch agent fines when modal opens
  useEffect(() => {
    if (open && user?.id) {
      fetchAgentFines();
    }
  }, [open, user?.id]);

  const fetchAgentFines = async () => {
    try {
      setFinesLoading(true);
      console.log('Fetching fines for agent:', user.id);
      const finesData = await getAgentFines(user.id);
      console.log('Agent fines data:', finesData);

      // Filter only active fines (not paid, waived, or disputed)
      const activeFines = finesData.filter(fine => fine.status === 'active');
      setAgentFines(activeFines);
    } catch (error) {
      console.error('Error fetching agent fines:', error);
      setAgentFines([]);
    } finally {
      setFinesLoading(false);
    }
  };

  // Calculate total earnings - updated to use fetched fines
  const calculateTotalEarnings = () => {
    if (!agentData?.stats || !bonusConfig) {
      return 0;
    }

    const basePay = agentData.stats.totalTalkPay || 0;
    const bonuses = bonusConfig.totalPotentialBonus || 0;
    const totalActiveFines = agentFines.reduce((sum, fine) => sum + (fine.amount || 0), 0);

    return basePay + bonuses - totalActiveFines;
  };

  const getBonusAmount = () => {
    return bonusConfig?.totalPotentialBonus || 0;
  };

  const getTotalFines = () => {
    return agentFines.reduce((sum, fine) => sum + (fine.amount || 0), 0);
  };

  const totalEarnings = calculateTotalEarnings();
  const basePay = agentData?.stats?.totalTalkPay || 0;
  const bonuses = getBonusAmount();
  const fines = getTotalFines();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!walletAddress.trim()) {
      setError('Please enter your wallet address');
      return;
    }

    if (totalEarnings <= 0) {
      setError('No earnings available for withdrawal');
      return;
    }

    setLoading(true);

    try {
      await onWithdrawalRequest({
        walletAddress: walletAddress.trim(),
        amount: totalEarnings,
        breakdown: {
          basePay,
          bonuses,
          fines
        }
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        setWalletAddress('');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to submit withdrawal request');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setWalletAddress('');
      setError('');
      setSuccess(false);
    }
  };

  if (success) {
    return (
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogContent sx={{ textAlign: 'center', py: 4 }}>
          <SuccessIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Withdrawal Request Submitted
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Your withdrawal request has been submitted successfully and will be processed by the admin.
          </Typography>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <WalletIcon color="primary" />
          <Typography variant="h6">Withdraw Earnings</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Earnings Summary */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Total Available for Withdrawal
          </Typography>
          <Card sx={{
            bgcolor: theme.palette.success.light,
            border: `2px solid ${theme.palette.success.main}`,
            mb: 2
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="success.main" fontWeight="bold">
                ${totalEarnings.toFixed(2)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Earnings Available
              </Typography>
            </CardContent>
          </Card>

          {/* Breakdown */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={4}>
              <Card sx={{ textAlign: 'center' }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
                    <EarningsIcon color="primary" fontSize="small" />
                    <Typography variant="body2" color="text.secondary">
                      Base Pay
                    </Typography>
                  </Stack>
                  <Typography variant="h6" color="primary.main">
                    ${basePay.toFixed(2)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Card sx={{ textAlign: 'center' }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
                    <BonusIcon color="success" fontSize="small" />
                    <Typography variant="body2" color="text.secondary">
                      Bonuses
                    </Typography>
                  </Stack>
                  <Typography variant="h6" color="success.main">
                    ${bonuses.toFixed(2)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Card sx={{ textAlign: 'center' }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
                    <WarningIcon color="error" fontSize="small" />
                    <Typography variant="body2" color="text.secondary">
                      Active Fines
                    </Typography>
                    {finesLoading && <CircularProgress size={12} />}
                  </Stack>
                  <Typography variant="h6" color="error.main">
                    -${fines.toFixed(2)}
                  </Typography>
                  {agentFines.length > 0 && (
                    <Typography variant="caption" color="text.secondary">
                      {agentFines.length} active fine{agentFines.length > 1 ? 's' : ''}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Active Fines Details */}
          {agentFines.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="error.main" gutterBottom>
                Active Fines Being Deducted:
              </Typography>
              <Box sx={{ maxHeight: 150, overflowY: 'auto' }}>
                {agentFines.map((fine, index) => (
                  <Box
                    key={fine._id || index}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      p: 1,
                      mb: 1,
                      backgroundColor: 'error.light',
                      borderRadius: 1,
                      border: `1px solid ${theme.palette.error.main}`,
                    }}
                  >
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {fine.reason}
                      </Typography>
                      {fine.description && (
                        <Typography variant="caption" color="text.secondary">
                          {fine.description}
                        </Typography>
                      )}
                    </Box>
                    <Typography variant="body2" color="error.main" fontWeight="bold">
                      -${fine.amount.toFixed(2)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Wallet Address Input */}
        <Box component="form" onSubmit={handleSubmit}>
          <Typography variant="h6" gutterBottom>
            Enter Your Wallet Address
          </Typography>
          <TextField
            fullWidth
            label="USD Wallet Address"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder="Enter your USD wallet address"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <WalletIcon color="action" />
                </InputAdornment>
              ),
            }}
            multiline
            rows={2}
            sx={{ mb: 2 }}
            disabled={loading}
          />

          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              • Make sure your wallet address is correct - transactions cannot be reversed
              • Withdrawal requests are processed by admin and may take 1-3 business days
              • You will receive a notification once your withdrawal is processed
            </Typography>
          </Alert>

          {totalEarnings <= 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              You currently have no earnings available for withdrawal.
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button
          onClick={handleClose}
          disabled={loading}
          variant="outlined"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading || !walletAddress.trim() || totalEarnings <= 0}
          variant="contained"
          startIcon={loading ? <CircularProgress size={20} /> : <MoneyIcon />}
        >
          {loading ? 'Processing...' : `Withdraw $${totalEarnings.toFixed(2)}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WithdrawalModal;