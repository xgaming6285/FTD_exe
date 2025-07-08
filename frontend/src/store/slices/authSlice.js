import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";
const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  agentPerformanceData: null,
};
export const login = createAsyncThunk(
  "auth/login",
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await api.post("/auth/login", { email, password });
      if (response.data.data.token) {
        localStorage.setItem("token", response.data.data.token);
      }
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Login failed");
    }
  }
);
export const fetchAgentPerformance = createAsyncThunk(
  "auth/fetchAgentPerformance",
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState();
      const user = state.auth.user;
      if (
        !user ||
        (user.role !== "agent" && user.role !== "admin") ||
        !user.fullName
      ) {
        return rejectWithValue("Agent name not found in user profile");
      }
      const response = await api.get(
        `/mongodb/agents/${encodeURIComponent(user.fullName)}`
      );
      if (!response.data.success || response.data.data.length === 0) {
        return rejectWithValue("No performance data found for this agent");
      }
      const latestData = response.data.data[0];
      return transformExternalAgentData(latestData);
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch agent performance"
      );
    }
  }
);
const transformExternalAgentData = (data) => {
  const incomingCalls = data.incoming_calls || {};
  const outgoingCalls = data.outgoing_calls || {};
  const timeToSeconds = (timeString) => {
    if (!timeString) return 0;
    const [hours, minutes, seconds] = timeString.split(":").map(Number);
    return hours * 3600 + minutes * 60 + seconds;
  };
  const ratePerSecond = 0.00278;
  const totalTimeSeconds = timeToSeconds(incomingCalls.total_time);
  const totalPay = (totalTimeSeconds * ratePerSecond).toFixed(2);
  return {
    id: data._id || data.agent_number,
    agentName: data.agent_name,
    agentNumber: data.agent_number,
    lastUpdated: data.last_updated,
    reportTimestamp: data.report_timestamp,
    taskId: data.task_id,
    incomingCalls: {
      total: parseInt(incomingCalls.total) || 0,
      successful: parseInt(incomingCalls.successful) || 0,
      unsuccessful: parseInt(incomingCalls.unsuccessful) || 0,
      totalTime: incomingCalls.total_time || "00:00:00",
      totalTimeSeconds: totalTimeSeconds,
      averageTime: incomingCalls.avg_time || "00:00:00",
      minTime: incomingCalls.min_time || "00:00:00",
      maxTime: incomingCalls.max_time || "00:00:00",
      averageWait: incomingCalls.avg_wait || "00:00:00",
      maxWait: incomingCalls.max_wait || "00:00:00",
      minWait: incomingCalls.min_wait || "00:00:00",
    },
    outgoingCalls: {
      total: parseInt(outgoingCalls.total) || 0,
      successful: parseInt(outgoingCalls.successful) || 0,
      unsuccessful: parseInt(outgoingCalls.unsuccessful) || 0,
      totalTime: outgoingCalls.total_time || "00:00:00",
      averageTime: outgoingCalls.avg_time || "00:00:00",
      minTime: outgoingCalls.min_time || "00:00:00",
      maxTime: outgoingCalls.max_time || "00:00:00",
    },
    metrics: {
      totalCalls:
        (parseInt(incomingCalls.total) || 0) +
        (parseInt(outgoingCalls.total) || 0),
      successRate: incomingCalls.total
        ? Math.round(
            (parseInt(incomingCalls.successful) /
              parseInt(incomingCalls.total)) *
              100
          )
        : 0,
      totalPay: parseFloat(totalPay),
      ratePerSecond: ratePerSecond,
    },
  };
};
export const register = createAsyncThunk(
  "auth/register",
  async (userData, { rejectWithValue }) => {
    try {
      const response = await api.post("/auth/register", userData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Registration failed"
      );
    }
  }
);
export const getMe = createAsyncThunk(
  "auth/getMe",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/auth/me");
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to get user info"
      );
    }
  }
);
export const updateProfile = createAsyncThunk(
  "auth/updateProfile",
  async (profileData, { rejectWithValue }) => {
    try {
      const response = await api.put("/auth/profile", profileData);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update profile"
      );
    }
  }
);
export const changePassword = createAsyncThunk(
  "auth/changePassword",
  async (passwordData, { rejectWithValue }) => {
    try {
      const response = await api.put("/auth/password", passwordData);
      return response.data.message;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to change password"
      );
    }
  }
);
export const acceptEula = createAsyncThunk(
  "auth/acceptEula",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.put("/users/accept-eula");
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to accept EULA"
      );
    }
  }
);
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      state.agentPerformanceData = null;
      localStorage.removeItem("token");
    },
    clearError: (state) => {
      state.error = null;
    },
    setCredentials: (state, action) => {
      const { user, token } = action.payload;
      state.user = user;
      state.token = token;
      state.isAuthenticated = true;
      state.error = null;
    },
    setAgentPerformanceData: (state, action) => {
      state.agentPerformanceData = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
        if (action.payload.agentPerformanceData) {
          state.agentPerformanceData = action.payload.agentPerformanceData;
        }
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      })
      .addCase(fetchAgentPerformance.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAgentPerformance.fulfilled, (state, action) => {
        state.isLoading = false;
        state.agentPerformanceData = action.payload;
        state.error = null;
      })
      .addCase(fetchAgentPerformance.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(getMe.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getMe.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(getMe.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      })
      .addCase(updateProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(changePassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(acceptEula.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(acceptEula.fulfilled, (state) => {
        state.isLoading = false;
        if (state.user) {
          state.user.eulaAccepted = true;
        }
      })
      .addCase(acceptEula.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});
export const { logout, clearError, setCredentials, setAgentPerformanceData } =
  authSlice.actions;
export const selectAuth = (state) => state.auth;
export const selectUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthLoading = (state) => state.auth.isLoading;
export const selectAuthError = (state) => state.auth.error;
export const selectAgentPerformanceData = (state) =>
  state.auth.agentPerformanceData;
export default authSlice.reducer;