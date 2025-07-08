import api from "./api";

// Get all agent fines (admin)
export const getAllAgentFines = async () => {
  try {
    const response = await api.get("/agent-fines/all");
    return response.data.data;
  } catch (error) {
    console.error("Error fetching all agent fines:", error);
    throw error;
  }
};

// Get fines summary for all agents (admin)
export const getFinesSummary = async () => {
  try {
    const response = await api.get("/agent-fines/summary");
    return response.data.data;
  } catch (error) {
    console.error("Error fetching fines summary:", error);
    throw error;
  }
};

// Get fines for a specific agent
export const getAgentFines = async (agentId, includeResolved = false) => {
  try {
    const response = await api.get(`/agent-fines/agent/${agentId}`, {
      params: { includeResolved },
    });
    return response.data.data;
  } catch (error) {
    console.error("Error fetching agent fines:", error);
    throw error;
  }
};

// Get total active fines for an agent
export const getAgentTotalFines = async (agentId) => {
  try {
    const response = await api.get(`/agent-fines/agent/${agentId}/total`);
    return response.data.data;
  } catch (error) {
    console.error("Error fetching agent total fines:", error);
    throw error;
  }
};

// Create a new fine for an agent
export const createAgentFine = async (agentId, fineData) => {
  try {
    const response = await api.post(`/agent-fines/agent/${agentId}`, fineData);
    return response.data.data;
  } catch (error) {
    console.error("Error creating agent fine:", error);
    throw error;
  }
};

// Update a fine
export const updateAgentFine = async (fineId, fineData) => {
  try {
    const response = await api.put(`/agent-fines/${fineId}`, fineData);
    return response.data.data;
  } catch (error) {
    console.error("Error updating agent fine:", error);
    throw error;
  }
};

// Resolve a fine (mark as paid, waived, etc.)
export const resolveAgentFine = async (fineId, status, notes) => {
  try {
    const response = await api.patch(`/agent-fines/${fineId}/resolve`, {
      status,
      notes,
    });
    return response.data.data;
  } catch (error) {
    console.error("Error resolving agent fine:", error);
    throw error;
  }
};

// Delete a fine
export const deleteAgentFine = async (fineId) => {
  try {
    const response = await api.delete(`/agent-fines/${fineId}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting agent fine:", error);
    throw error;
  }
};
