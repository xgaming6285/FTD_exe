import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Alert,
  CircularProgress,
  Tab,
  Tabs,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Stack,
  Button,
  Divider,
  useTheme,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as TrendingUpIcon,
  AccessTime as AccessTimeIcon,
  Assessment as AssessmentIcon,
  Settings as SettingsIcon,
  AccountBalanceWallet as WithdrawIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import {
  selectUser,
  selectAgentPerformanceData,
  selectAuthLoading,
  fetchAgentPerformance
} from '../store/slices/authSlice';
import AgentPerformanceCard from '../components/AgentPerformanceCard';
import {
  getAgentBonusConfig,
  getAllAgentBonusConfigs
} from '../services/payroll/calculations';
import { fetchAllAgentsMetrics, fetchAgentMetrics } from '../services/agents';
import AdminBonusManagement from '../components/AdminBonusManagement';
import WithdrawalModal from '../components/WithdrawalModal';
import { createWithdrawalRequest } from '../services/withdrawals';

const PayrollPage = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const agentPerformanceData = useSelector(selectAgentPerformanceData);
  const loading = useSelector(selectAuthLoading);
  const [tabValue, setTabValue] = useState(0);
  const [expanded, setExpanded] = useState('performance');
  const [paymentHistory] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [bonusConfig, setBonusConfig] = useState(null);

  const [allAgentBonusConfigs, setAllAgentBonusConfigs] = useState([]);
  const [allAgentsData, setAllAgentsData] = useState([]);

  // Agent metrics data for withdrawal calculation
  const [agentMetricsData, setAgentMetricsData] = useState(null);

  // Withdrawal modal state
  const [withdrawalModalOpen, setWithdrawalModalOpen] = useState(false);
  const [withdrawalLoading, setWithdrawalLoading] = useState(false);
  const [withdrawalAlert, setWithdrawalAlert] = useState({ show: false, message: '', severity: 'info' });


  useEffect(() => {
    if (user && (user.role === 'agent' || user.role === 'admin') && !agentPerformanceData) {
      console.log('PayrollPage: Attempting to fetch agent performance for:', user.fullName, 'Role:', user.role);
      dispatch(fetchAgentPerformance());
    }
  }, [dispatch, user, agentPerformanceData]);

  useEffect(() => {
    if (user && user.role === 'admin') {
      loadAllAgentBonusConfigs();
      loadAllAgentsData();
    }
  }, [user]);

  useEffect(() => {
    if (user && user.role === 'agent') {
      fetchBonusData();
      fetchAgentMetricsData();
    }
  }, [user]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (user?.role === 'agent') {
        await dispatch(fetchAgentPerformance()).unwrap();
        await fetchBonusData();
        await fetchAgentMetricsData();
      } else if (user?.role === 'admin') {
        await loadAllAgentBonusConfigs();
        await loadAllAgentsData();
      }
    } catch (error) {
      console.error('Failed to refresh data:', error);
    } finally {
      setRefreshing(false);
    }
  };



  const loadAllAgentBonusConfigs = async () => {
    try {
      const configs = await getAllAgentBonusConfigs();
      setAllAgentBonusConfigs(configs);
    } catch (error) {
      console.error('Failed to load all agent bonus configurations:', error);
    }
  };

  const loadAllAgentsData = async () => {
    try {
      const agentsData = await fetchAllAgentsMetrics();
      setAllAgentsData(agentsData);
    } catch (error) {
      console.error('Failed to load all agents data:', error);
    }
  };

  const fetchBonusData = async () => {
    if (!user || user.role !== 'agent') return;

    try {
      const agentId = user._id || user.id;
      console.log('🔍 Fetching bonus data for agent:', agentId);

      const bonusConfig = await getAgentBonusConfig(agentId);
      console.log('💰 Bonus data fetched:', bonusConfig);

      setBonusConfig(bonusConfig);
    } catch (error) {
      console.error('Failed to fetch bonus data:', error);
    }
  };

  const fetchAgentMetricsData = async () => {
    if (!user || user.role !== 'agent' || !user.fullName) return;

    try {
      console.log('🔍 Fetching agent metrics for withdrawal calculation:', user.fullName);

      const metricsData = await fetchAgentMetrics(user.fullName);
      console.log('📊 Agent metrics data fetched:', metricsData);

      setAgentMetricsData(metricsData);
    } catch (error) {
      console.error('Failed to fetch agent metrics data:', error);
    }
  };

  const handleWithdrawalRequest = async (withdrawalData) => {
    setWithdrawalLoading(true);
    try {
      const response = await createWithdrawalRequest(withdrawalData);
      console.log('Withdrawal request created:', response);

      setWithdrawalAlert({
        show: true,
        message: 'Withdrawal request submitted successfully! You will be notified when it is processed.',
        severity: 'success'
      });

      // Auto-hide alert after 5 seconds
      setTimeout(() => {
        setWithdrawalAlert({ show: false, message: '', severity: 'info' });
      }, 5000);

      return response;
    } catch (error) {
      console.error('Failed to create withdrawal request:', error);
      const errorMessage = error.message || 'Failed to submit withdrawal request. Please try again.';

      setWithdrawalAlert({
        show: true,
        message: errorMessage,
        severity: 'error'
      });

      // Auto-hide alert after 5 seconds
      setTimeout(() => {
        setWithdrawalAlert({ show: false, message: '', severity: 'info' });
      }, 5000);

      throw error;
    } finally {
      setWithdrawalLoading(false);
    }
  };

  const handleWithdrawalModalClose = () => {
    if (!withdrawalLoading) {
      setWithdrawalModalOpen(false);
    }
  };



  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return (
      <Alert severity="error">
        User not found. Please log in again.
      </Alert>
    );
  }

  return (
    <Box sx={{ width: '100%', typography: 'body1' }}>
      {/* Withdrawal Alert */}
      {withdrawalAlert.show && (
        <Alert severity={withdrawalAlert.severity} sx={{ mb: 2 }}>
          {withdrawalAlert.message}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="payroll tabs">
          <Tab icon={<AssessmentIcon />} label="Performance" />
          <Tab icon={<MoneyIcon />} label="Payment History" />
          {user.role !== 'admin' && (
            <Tab icon={<TrendingUpIcon />} label="Earnings" />
          )}
          {user.role === 'admin' && (
            <Tab icon={<SettingsIcon />} label="Bonus Management" />
          )}
        </Tabs>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          {user.role === 'admin' ? 'All Agents Payroll' : 'Payroll Dashboard'}
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

      {/* Performance Tab */}
      {tabValue === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {user.role === 'admin' ? (
            // Admin view - show all agents
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Card>
                  <CardHeader
                    title="All Agents Performance Overview"
                    subheader={`Total Agents: ${allAgentsData.length}`}
                  />
                  <CardContent>
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Agent Name</TableCell>
                            <TableCell align="right">Total Calls</TableCell>
                            <TableCell align="right">Successful</TableCell>
                            <TableCell align="right">Success Rate</TableCell>
                            <TableCell align="right">Talk Time</TableCell>
                            <TableCell align="right">Base Pay</TableCell>
                            <TableCell align="right">1st Calls</TableCell>
                            <TableCell align="right">2nd Calls</TableCell>
                            <TableCell align="right">3rd Calls</TableCell>
                            <TableCell align="right">4th Calls</TableCell>
                            <TableCell align="right">5th Calls</TableCell>
                            <TableCell align="right">Verified</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {allAgentsData.map((agent) => (
                            <TableRow key={agent.id}>
                              <TableCell>{agent.fullName}</TableCell>
                              <TableCell align="right">{agent.stats.incoming}</TableCell>
                              <TableCell align="right">{agent.stats.successful}</TableCell>
                              <TableCell align="right">
                                {agent.stats.incoming > 0
                                  ? ((agent.stats.successful / agent.stats.incoming) * 100).toFixed(1) + '%'
                                  : '0%'
                                }
                              </TableCell>
                              <TableCell align="right">
                                {(agent.stats.totalTalkTimeSeconds / 3600).toFixed(1)}h
                              </TableCell>
                              <TableCell align="right">
                                ${agent.stats.totalTalkPay.toFixed(2)}
                              </TableCell>
                              <TableCell align="right">{agent.stats.callCounts.firstCalls}</TableCell>
                              <TableCell align="right">{agent.stats.callCounts.secondCalls}</TableCell>
                              <TableCell align="right">{agent.stats.callCounts.thirdCalls}</TableCell>
                              <TableCell align="right">{agent.stats.callCounts.fourthCalls}</TableCell>
                              <TableCell align="right">{agent.stats.callCounts.fifthCalls}</TableCell>
                              <TableCell align="right">{agent.stats.callCounts.verifiedAccounts}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          ) : (
            // Agent view - show individual performance
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Accordion expanded={expanded === 'performance'} onChange={handleAccordionChange('performance')}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">Performance Overview</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    {agentPerformanceData && (
                      <AgentPerformanceCard
                        performanceData={agentPerformanceData}
                        user={user}
                        showDetailsButton={false}
                      />
                    )}
                  </AccordionDetails>
                </Accordion>
              </Grid>

              {/* Total Bonus Earned - Simple Display */}
              <Grid item xs={12}>
                <Card>
                  <CardHeader
                    title="Total Bonus Earned"
                    action={
                      <Chip
                        label="From Database"
                        color="primary"
                        size="small"
                      />
                    }
                  />
                  <CardContent>
                    {bonusConfig && bonusConfig.totalPotentialBonus !== undefined && bonusConfig.totalPotentialBonus !== null ? (
                      <Box display="flex" justifyContent="center" alignItems="center" py={4}>
                        <Typography variant="h2" color="success.main" fontWeight="bold">
                          ${Number(bonusConfig.totalPotentialBonus).toFixed(2)}
                        </Typography>
                      </Box>
                    ) : (
                      <Alert severity="info">
                        No bonus data available. Contact your admin to set up your bonus rates.
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </motion.div>
      )}

      {/* Payment History Tab */}
      {tabValue === 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardHeader title="Payment History" />
            <CardContent>
              {paymentHistory.length === 0 ? (
                <Typography color="text.secondary">No payment history available.</Typography>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Period</TableCell>
                        <TableCell align="right">Base Pay</TableCell>
                        <TableCell align="right">Bonuses</TableCell>
                        <TableCell align="right">Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paymentHistory.map((payment, index) => (
                        <TableRow key={index}>
                          <TableCell>{payment.date}</TableCell>
                          <TableCell>{payment.period}</TableCell>
                          <TableCell align="right">${payment.basePay}</TableCell>
                          <TableCell align="right">${payment.bonuses}</TableCell>
                          <TableCell align="right">${payment.total}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Earnings Tab (Agent Only) */}
      {tabValue === 2 && user.role === 'agent' && bonusConfig && bonusConfig.bonusRates && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardHeader
                  title="Your Bonus Rates"
                  action={
                    <Chip
                      label="From Database"
                      color="primary"
                      size="small"
                    />
                  }
                />
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={4}>
                      <Box textAlign="center" p={2} sx={{ backgroundColor: 'primary.light', borderRadius: 1 }}>
                        <Typography variant="body2" color="text.secondary">1st Call</Typography>
                        <Typography variant="h5" color="primary.main">${Number(bonusConfig.bonusRates.firstCall || 0).toFixed(2)}</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Box textAlign="center" p={2} sx={{ backgroundColor: 'success.light', borderRadius: 1 }}>
                        <Typography variant="body2" color="text.secondary">2nd Call</Typography>
                        <Typography variant="h5" color="success.main">${Number(bonusConfig.bonusRates.secondCall || 0).toFixed(2)}</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Box textAlign="center" p={2} sx={{ backgroundColor: 'warning.light', borderRadius: 1 }}>
                        <Typography variant="body2" color="text.secondary">3rd Call</Typography>
                        <Typography variant="h5" color="warning.main">${Number(bonusConfig.bonusRates.thirdCall || 0).toFixed(2)}</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Box textAlign="center" p={2} sx={{ backgroundColor: 'info.light', borderRadius: 1 }}>
                        <Typography variant="body2" color="text.secondary">4th Call</Typography>
                        <Typography variant="h5" color="info.main">${Number(bonusConfig.bonusRates.fourthCall || 0).toFixed(2)}</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Box textAlign="center" p={2} sx={{ backgroundColor: 'secondary.light', borderRadius: 1 }}>
                        <Typography variant="body2" color="text.secondary">5th Call</Typography>
                        <Typography variant="h5" color="secondary.main">${Number(bonusConfig.bonusRates.fifthCall || 0).toFixed(2)}</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Box textAlign="center" p={2} sx={{ backgroundColor: 'error.light', borderRadius: 1 }}>
                        <Typography variant="body2" color="text.secondary">Verified Account</Typography>
                        <Typography variant="h5" color="error.main">${Number(bonusConfig.bonusRates.verifiedAcc || 0).toFixed(2)}</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                  <Divider sx={{ my: 3 }} />
                  <Box display="flex" justifyContent="center" alignItems="center">
                    <Box textAlign="center">
                      <Typography variant="h6" color="text.secondary">Total Potential Bonus</Typography>
                      <Typography variant="h3" color="success.main" fontWeight="bold">
                        ${Number(bonusConfig.totalPotentialBonus || 0).toFixed(2)}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Withdrawal Button */}
            <Grid item xs={12}>
              <Card>
                <CardHeader title="Withdraw Earnings" />
                <CardContent>
                  <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
                    <Typography variant="body1" color="text.secondary" textAlign="center">
                      Ready to withdraw your earnings? Click the button below to submit a withdrawal request.
                    </Typography>
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<WithdrawIcon />}
                      onClick={() => setWithdrawalModalOpen(true)}
                      disabled={withdrawalLoading}
                      sx={{
                        py: 1.5,
                        px: 4,
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                        '&:hover': {
                          background: 'linear-gradient(45deg, #1976D2 30%, #0288D1 90%)',
                        }
                      }}
                    >
                      {withdrawalLoading ? 'Processing...' : 'Withdraw Earnings'}
                    </Button>
                    <Typography variant="caption" color="text.secondary" textAlign="center">
                      Withdrawal requests are processed within 1-3 business days
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </motion.div>
      )}

      {/* Bonus Management Tab (Admin Only) */}
      {tabValue === 2 && user?.role === 'admin' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <AdminBonusManagement />
        </motion.div>
      )}

      {/* Withdrawal Modal */}
      <WithdrawalModal
        open={withdrawalModalOpen}
        onClose={handleWithdrawalModalClose}
        agentData={agentMetricsData}
        bonusConfig={bonusConfig}
        onWithdrawalRequest={handleWithdrawalRequest}
        user={user}
      />
    </Box>
  );
};

export default PayrollPage;