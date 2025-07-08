import api from "./api";
import { RATE_PER_SECOND, calculateBasePay } from "./payroll/calculations";
export const fetchAgentMetrics = async (agentName) => {
  try {
    console.log("Fetching metrics for agent:", agentName);
    const response = await api.get(
      `/mongodb/agents/${encodeURIComponent(agentName)}`
    );
    console.log("Agent metrics response:", response.data);
    if (response.data.success && response.data.data.length > 0) {
      const latestData = response.data.data[0];
      return transformMetricsData(latestData);
    }
    throw new Error("No data found for agent");
  } catch (error) {
    console.error("Error fetching agent metrics:", error);
    throw error;
  }
};
export const fetchAllAgentsMetrics = async () => {
  try {
    console.log("Fetching all agents metrics");
    const agentsResponse = await api.get("/mongodb/agents");
    console.log("All agents response:", agentsResponse.data);
    if (!agentsResponse.data.success) {
      throw new Error("Failed to fetch agents list");
    }
    const performanceResponse = await api.get("/mongodb/agents/performance");
    console.log("Performance response:", performanceResponse.data);
    if (!performanceResponse.data.success) {
      throw new Error("Failed to fetch agents performance");
    }
    const agentsData = performanceResponse.data.agents.map((agent) =>
      transformMetricsData(agent)
    );
    return agentsData;
  } catch (error) {
    console.error("Error fetching all agents metrics:", error);
    throw error;
  }
};
const transformMetricsData = (data) => {
  const incomingCalls = data.incoming_calls || {};
  const getId = (data) => {
    if (data._id) {
      return typeof data._id === "object" && data._id.toString
        ? data._id.toString()
        : data._id;
    }
    return data.agent_number || String(Date.now());
  };
  return {
    id: getId(data),
    fullName: data.agent_name,
    metrics: {
      incoming: parseInt(incomingCalls.total) || 0,
      unsuccessful: parseInt(incomingCalls.unsuccessful) || 0,
      successful: parseInt(incomingCalls.successful) || 0,
      averageTime: convertTimeStringToSeconds(incomingCalls.avg_time),
      totalTime: convertTimeStringToSeconds(incomingCalls.total_time),
      minTime: incomingCalls.min_time,
      maxTime: incomingCalls.max_time,
      avgWaitTime: incomingCalls.avg_wait,
      lastUpdated: data.last_updated || data.extracted_at,
    },
    stats: {
      id: getId(data),
      name: data.agent_name,
      incoming: parseInt(incomingCalls.total) || 0,
      failed: parseInt(incomingCalls.unsuccessful) || 0,
      successful: parseInt(incomingCalls.successful) || 0,
      totalTalkTime: incomingCalls.total_time || "00:00:00",
      totalTalkTimeSeconds: convertTimeStringToSeconds(
        incomingCalls.total_time
      ),
      ratePerSecond: RATE_PER_SECOND,
      totalTalkPay: calculateBasePay(
        convertTimeStringToSeconds(incomingCalls.total_time)
      ),
      callCounts: {
        firstCalls: data.call_counts?.firstCalls || 0,
        secondCalls: data.call_counts?.secondCalls || 0,
        thirdCalls: data.call_counts?.thirdCalls || 0,
        fourthCalls: data.call_counts?.fourthCalls || 0,
        fifthCalls: data.call_counts?.fifthCalls || 0,
        verifiedAccounts: data.call_counts?.verifiedAccounts || 0,
      },
      fines: data.fines || 0,
    },
  };
};
const convertTimeStringToSeconds = (timeString) => {
  if (!timeString) return 0;
  const [hours, minutes, seconds] = timeString.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
};
const calculateTotalPay = (totalSeconds) => {
  return calculateBasePay(totalSeconds);
};