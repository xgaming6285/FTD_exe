import axios from "axios";
import { store } from "../store/store";
import { logout } from "../store/slices/authSlice";
const backendAPI = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});
const externalAPI = axios.create({
  baseURL: "https://agent-report-scraper.onrender.com/api",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});
backendAPI.interceptors.request.use(
  (config) => {
    const state = store.getState();
    const token = state.auth.token;
    console.log("Backend API Request:", {
      fullUrl: `${config.baseURL}${config.url}`,
      method: config.method,
    });
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error("Backend API Request Error:", error);
    return Promise.reject(error);
  }
);
externalAPI.interceptors.request.use(
  (config) => {
    console.log("External API Request:", {
      fullUrl: `${config.baseURL}${config.url}`,
      method: config.method,
    });
    return config;
  },
  (error) => {
    console.error("External API Request Error:", error);
    return Promise.reject(error);
  }
);
backendAPI.interceptors.response.use(
  (response) => {
    console.log("Backend API Response:", {
      url: response.config.url,
      status: response.status,
    });
    return response;
  },
  (error) => {
    console.error("Backend API Response Error:", {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
    });
    if (error.response?.status === 401) {
      store.dispatch(logout());
    }
    if (!error.response) {
      error.message = "Network error. Please check your connection.";
    }
    return Promise.reject(error);
  }
);
externalAPI.interceptors.response.use(
  (response) => {
    console.log("External API Response:", {
      url: response.config.url,
      status: response.status,
    });
    return response;
  },
  (error) => {
    console.error("External API Response Error:", {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
    });
    if (!error.response) {
      error.message =
        "External API network error. Please check your connection.";
    }
    return Promise.reject(error);
  }
);
const api = {
  get: (url, config) => {
    if (
      url.startsWith("/mongodb/") ||
      url.startsWith("/bonus-report/") ||
      url.startsWith("/scrape-enhanced") ||
      url.startsWith("/results/") ||
      url.startsWith("/agent-calls/")
    ) {
      console.log(`🌐 Routing to EXTERNAL API: ${url}`);
      return externalAPI.get(url, config);
    }
    console.log(`🏠 Routing to BACKEND API: ${url}`);
    return backendAPI.get(url, config);
  },
  post: (url, data, config) => {
    if (
      url.startsWith("/mongodb/") ||
      url.startsWith("/bonus-report/") ||
      url.startsWith("/scrape-enhanced") ||
      url.startsWith("/results/") ||
      url.startsWith("/agent-calls/")
    ) {
      console.log(`🌐 Routing to EXTERNAL API: ${url}`);
      return externalAPI.post(url, data, config);
    }
    console.log(`🏠 Routing to BACKEND API: ${url}`);
    return backendAPI.post(url, data, config);
  },
  put: (url, data, config) => {
    if (
      url.startsWith("/mongodb/") ||
      url.startsWith("/bonus-report/") ||
      url.startsWith("/scrape-enhanced") ||
      url.startsWith("/results/") ||
      url.startsWith("/agent-calls/")
    ) {
      console.log(`🌐 Routing to EXTERNAL API: ${url}`);
      return externalAPI.put(url, data, config);
    }
    console.log(`🏠 Routing to BACKEND API: ${url}`);
    return backendAPI.put(url, data, config);
  },
  delete: (url, config) => {
    if (
      url.startsWith("/mongodb/") ||
      url.startsWith("/bonus-report/") ||
      url.startsWith("/scrape-enhanced") ||
      url.startsWith("/results/") ||
      url.startsWith("/agent-calls/")
    ) {
      console.log(`🌐 Routing to EXTERNAL API: ${url}`);
      return externalAPI.delete(url, config);
    }
    console.log(`🏠 Routing to BACKEND API: ${url}`);
    return backendAPI.delete(url, config);
  },
  patch: (url, data, config) => {
    if (
      url.startsWith("/mongodb/") ||
      url.startsWith("/bonus-report/") ||
      url.startsWith("/scrape-enhanced") ||
      url.startsWith("/results/") ||
      url.startsWith("/agent-calls/")
    ) {
      console.log(`🌐 Routing to EXTERNAL API: ${url}`);
      return externalAPI.patch(url, data, config);
    }
    console.log(`🏠 Routing to BACKEND API: ${url}`);
    return backendAPI.patch(url, data, config);
  },
};



export default api;
