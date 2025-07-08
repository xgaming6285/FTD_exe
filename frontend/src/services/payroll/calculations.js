import api from "../api";

// Default bonus rates (fallback if no admin configuration exists)
export const DEFAULT_BONUS_RATES = {
  firstCall: 0.0,
  secondCall: 0.0,
  thirdCall: 0.0,
  fourthCall: 0.0,
  fifthCall: 0.0,
  verifiedAcc: 0.0,
};

export const RATE_PER_SECOND = 0.00278;

/**
 * Calculate base pay from talk time
 * @param {number} totalSeconds - Total talk time in seconds
 * @returns {number} Base pay amount
 */
export const calculateBasePay = (totalSeconds) => {
  return totalSeconds * RATE_PER_SECOND;
};

/**
 * Get bonus configuration for an agent
 * @param {string} agentId - Agent ID
 * @returns {Promise<Object>} Agent bonus configuration
 */
export const getAgentBonusConfig = async (agentId) => {
  try {
    console.log("📡 Fetching bonus config for agent ID:", agentId);
    const response = await api.get(`/agent-bonuses/${agentId}`);
    console.log("✅ Bonus config fetched successfully:", response.data.data);
    return response.data.data;
  } catch (error) {
    console.error("❌ Error fetching agent bonus config:", error);
    console.log("🔄 Falling back to default configuration");
    // Return default configuration if agent config not found
    return {
      bonusRates: DEFAULT_BONUS_RATES,
      isDefault: true,
    };
  }
};

/**
 * Calculate bonuses using admin-configured rates
 * @param {Object} callCounts - Call counts object
 * @param {Object} bonusRates - Admin-configured bonus rates
 * @returns {Object} Calculated bonuses
 */
export const calculateBonuses = (
  callCounts,
  bonusRates = DEFAULT_BONUS_RATES
) => {
  const {
    firstCalls = 0,
    secondCalls = 0,
    thirdCalls = 0,
    fourthCalls = 0,
    fifthCalls = 0,
    verifiedAccounts = 0,
  } = callCounts;

  return {
    firstCallBonus: firstCalls * bonusRates.firstCall,
    secondCallBonus: secondCalls * bonusRates.secondCall,
    thirdCallBonus: thirdCalls * bonusRates.thirdCall,
    fourthCallBonus: fourthCalls * bonusRates.fourthCall,
    fifthCallBonus: fifthCalls * bonusRates.fifthCall,
    verifiedAccBonus: verifiedAccounts * bonusRates.verifiedAcc,
  };
};

/**
 * Calculate bonuses with agent-specific configuration
 * @param {string} agentId - Agent ID
 * @param {Object} callCounts - Call counts object
 * @returns {Promise<Object>} Calculated bonuses with configuration
 */
export const calculateAgentBonuses = async (agentId, callCounts) => {
  try {
    const bonusConfig = await getAgentBonusConfig(agentId);
    const bonuses = calculateBonuses(callCounts, bonusConfig.bonusRates);

    return {
      ...bonuses,
      bonusConfig: bonusConfig,
      totalBonus: Object.values(bonuses).reduce((sum, bonus) => sum + bonus, 0),
    };
  } catch (error) {
    console.error("Error calculating agent bonuses:", error);
    // Fallback to default rates
    const bonuses = calculateBonuses(callCounts, DEFAULT_BONUS_RATES);
    return {
      ...bonuses,
      bonusConfig: { bonusRates: DEFAULT_BONUS_RATES, isDefault: true },
      totalBonus: Object.values(bonuses).reduce((sum, bonus) => sum + bonus, 0),
    };
  }
};

/**
 * Calculate total payment
 * @param {number} basePay - Base pay from talk time
 * @param {Object} bonuses - Calculated bonuses
 * @param {number} fines - Fines to deduct
 * @returns {number} Total payment amount
 */
export const calculateTotalPayment = (basePay, bonuses, fines = 0) => {
  let totalBonuses = 0;

  if (bonuses.totalBonus !== undefined) {
    totalBonuses = bonuses.totalBonus;
  } else if (typeof bonuses === "object") {
    totalBonuses = Object.values(bonuses).reduce(
      (sum, bonus) => sum + bonus,
      0
    );
  }

  return basePay + totalBonuses - fines;
};

/**
 * Complete payment calculation for an agent
 * @param {string} agentId - Agent ID
 * @param {number} talkTimeSeconds - Talk time in seconds
 * @param {Object} callCounts - Call counts object
 * @param {number} fines - Fines to deduct
 * @returns {Promise<Object>} Complete payment calculation
 */
export const calculateAgentPayment = async (
  agentId,
  talkTimeSeconds,
  callCounts,
  fines = 0
) => {
  try {
    const basePay = calculateBasePay(talkTimeSeconds);
    const bonusCalculation = await calculateAgentBonuses(agentId, callCounts);
    const totalPayment = calculateTotalPayment(
      basePay,
      bonusCalculation,
      fines
    );

    return {
      basePay,
      bonuses: bonusCalculation,
      fines,
      totalPayment,
      bonusConfig: bonusCalculation.bonusConfig,
      talkTimeHours: talkTimeSeconds / 3600,
    };
  } catch (error) {
    console.error("Error calculating agent payment:", error);
    throw error;
  }
};

/**
 * Format bonus breakdown for display
 * @param {Object} bonuses - Bonus calculation object
 * @returns {Array} Formatted bonus items for UI display
 */
export const formatBonusBreakdown = (bonuses) => {
  const breakdown = [];

  if (!bonuses || typeof bonuses !== "object") {
    return breakdown;
  }

  // Handle the bonus calculation structure
  const bonusTypes = [
    { key: "firstCallBonus", label: "1st Call Bonus" },
    { key: "secondCallBonus", label: "2nd Call Bonus" },
    { key: "thirdCallBonus", label: "3rd Call Bonus" },
    { key: "fourthCallBonus", label: "4th Call Bonus" },
    { key: "fifthCallBonus", label: "5th Call Bonus" },
    { key: "verifiedAccBonus", label: "Verified Account Bonus" },
  ];

  bonusTypes.forEach((bonusType) => {
    if (bonuses[bonusType.key] && bonuses[bonusType.key] > 0) {
      breakdown.push({
        label: bonusType.label,
        amount: bonuses[bonusType.key],
        system: "admin-configured",
      });
    }
  });

  return breakdown;
};

/**
 * Utility functions for time conversion
 */
export const timeToSeconds = (time) => {
  const [hours, minutes, seconds] = time.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
};

export const secondsToTime = (totalSeconds) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((v) => v.toString().padStart(2, "0"))
    .join(":");
};

/**
 * Get all agent bonus configurations (admin only)
 * @returns {Promise<Array>} All agent bonus configurations
 */
export const getAllAgentBonusConfigs = async () => {
  try {
    const response = await api.get("/agent-bonuses");
    return response.data.data;
  } catch (error) {
    console.error("Error fetching all agent bonus configs:", error);
    throw error;
  }
};

/**
 * Update agent bonus configuration (admin only)
 * @param {string} agentId - Agent ID
 * @param {Object} bonusRates - New bonus rates
 * @param {string} notes - Optional notes
 * @returns {Promise<Object>} Updated bonus configuration
 */
export const updateAgentBonusConfig = async (
  agentId,
  bonusRates,
  notes = ""
) => {
  try {
    const response = await api.put(`/agent-bonuses/${agentId}`, {
      bonusRates,
      notes,
    });
    return response.data.data;
  } catch (error) {
    console.error("Error updating agent bonus config:", error);
    throw error;
  }
};

/**
 * Create default bonus configurations for all agents (admin only)
 * @returns {Promise<Object>} Creation result
 */

/**
 * Get bonus statistics (admin only)
 * @returns {Promise<Object>} Bonus statistics
 */
export const getBonusStats = async () => {
  try {
    const response = await api.get("/agent-bonuses/stats");
    return response.data.data;
  } catch (error) {
    console.error("Error fetching bonus stats:", error);
    throw error;
  }
};
