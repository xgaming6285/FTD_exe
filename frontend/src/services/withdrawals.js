import api from './api';

// Create withdrawal request
export const createWithdrawalRequest = async (withdrawalData) => {
  try {
    const response = await api.post('/withdrawals', withdrawalData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Get agent's withdrawal requests
export const getAgentWithdrawals = async (params = {}) => {
  try {
    const response = await api.get('/withdrawals/me', { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Get specific withdrawal request
export const getWithdrawal = async (withdrawalId) => {
  try {
    const response = await api.get(`/withdrawals/${withdrawalId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Admin functions
export const getAllWithdrawals = async (params = {}) => {
  try {
    const response = await api.get('/withdrawals', { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getWithdrawalStats = async () => {
  try {
    const response = await api.get('/withdrawals/stats');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const processWithdrawal = async (withdrawalId, processData) => {
  try {
    const response = await api.put(`/withdrawals/${withdrawalId}/process`, processData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Helper function to format withdrawal status
export const getWithdrawalStatusColor = (status) => {
  switch (status) {
    case 'pending':
      return 'warning';
    case 'approved':
      return 'info';
    case 'completed':
      return 'success';
    case 'rejected':
      return 'error';
    default:
      return 'default';
  }
};

// Helper function to format withdrawal status text
export const getWithdrawalStatusText = (status) => {
  switch (status) {
    case 'pending':
      return 'Pending Review';
    case 'approved':
      return 'Approved';
    case 'completed':
      return 'Completed';
    case 'rejected':
      return 'Rejected';
    default:
      return status;
  }
}; 