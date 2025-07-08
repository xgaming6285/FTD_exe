import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  IconButton,
  Collapse,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  useMediaQuery,
  useTheme,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import {
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as InjectIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Send as SendIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Business as BusinessIcon,
} from "@mui/icons-material";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import api from "../services/api";
import { selectUser } from "../store/slices/authSlice";
import { getSortedCountries } from "../constants/countries";
import LeadDetailCard from "../components/LeadDetailCard";
import SessionAccessButton from "../components/SessionAccessButton";
import SessionStatusChip from "../components/SessionStatusChip";

const createOrderSchema = (userRole) => {
  return yup
    .object({
      ftd: yup
        .number()
        .integer("Must be a whole number")
        .min(0, "Cannot be negative")
        .default(0),
      filler: yup
        .number()
        .integer("Must be a whole number")
        .min(0, "Cannot be negative")
        .default(0),
      cold: yup
        .number()
        .integer("Must be a whole number")
        .min(0, "Cannot be negative")
        .default(0),
      live: yup
        .number()
        .integer("Must be a whole number")
        .min(0, "Cannot be negative")
        .default(0),
      countryFilter: yup
        .string()
        .required("Country filter is required")
        .min(2, "Country must be at least 2 characters"),
      genderFilter: yup.string().oneOf(["", "male", "female"]).default(""),
      notes: yup.string().default(""),
      selectedClientNetwork: yup
        .string()
        .required("Client Network selection is required"),
      selectedOurNetwork: yup
        .string()
        .required("Our Network selection is required"),
      selectedCampaign: yup
        .string()
        .required("Campaign selection is mandatory for all orders"),
      injectionMode: yup.string().oneOf(["bulk", "scheduled"]).default("bulk"),
      injectionStartTime: yup.string().default(""),
      injectionEndTime: yup.string().default(""),
      minInterval: yup
        .number()
        .min(10, "Minimum interval must be at least 10 seconds")
        .max(1800, "Maximum interval cannot exceed 30 minutes")
        .default(30),
      maxInterval: yup
        .number()
        .min(30, "Maximum interval must be at least 30 seconds")
        .max(3600, "Maximum interval cannot exceed 1 hour")
        .default(300)
        .test(
          "min-max",
          "Maximum interval must be greater than minimum interval",
          function (value) {
            const { minInterval } = this.parent;
            return !minInterval || !value || value > minInterval;
          }
        ),
      deviceSelectionMode: yup
        .string()
        .oneOf(["individual", "bulk", "ratio", "random"])
        .default("random"),
      bulkDeviceType: yup
        .string()
        .oneOf(["windows", "android", "ios", "mac"])
        .default("android"),
      deviceRatio: yup.object({
        windows: yup
          .number()
          .min(0, "Must be 0 or greater")
          .max(10, "Must be 10 or less")
          .integer("Must be a whole number")
          .default(0),
        android: yup
          .number()
          .min(0, "Must be 0 or greater")
          .max(10, "Must be 10 or less")
          .integer("Must be a whole number")
          .default(0),
        ios: yup
          .number()
          .min(0, "Must be 0 or greater")
          .max(10, "Must be 10 or less")
          .integer("Must be a whole number")
          .default(0),
        mac: yup
          .number()
          .min(0, "Must be 0 or greater")
          .max(10, "Must be 10 or less")
          .integer("Must be a whole number")
          .default(0),
      }),
      availableDeviceTypes: yup.object({
        windows: yup.boolean().default(true),
        android: yup.boolean().default(true),
        ios: yup.boolean().default(true),
        mac: yup.boolean().default(true),
      }),
    })
    .test(
      "at-least-one",
      "At least one lead type must be requested",
      (value) => {
        return (
          (value.ftd || 0) +
            (value.filler || 0) +
            (value.cold || 0) +
            (value.live || 0) >
          0
        );
      }
    )
    .test(
      "device-ratio",
      "At least one device ratio must be greater than 0 for ratio mode",
      (value) => {
        if (value.deviceSelectionMode === "ratio") {
          return Object.values(value.deviceRatio || {}).some(
            (ratio) => ratio > 0
          );
        }
        return true;
      }
    )
    .test(
      "available-devices",
      "At least one device type must be selected for random mode",
      (value) => {
        if (value.deviceSelectionMode === "random") {
          return Object.values(value.availableDeviceTypes || {}).some(
            (enabled) => enabled
          );
        }
        return true;
      }
    )
    .test("bulk-device", "Device type is required for bulk mode", (value) => {
      if (value.deviceSelectionMode === "bulk") {
        return value.bulkDeviceType && value.bulkDeviceType.trim() !== "";
      }
      return true;
    });
};
const getStatusColor = (status) => {
  const colors = {
    fulfilled: "success",
    pending: "warning",
    cancelled: "error",
    partial: "info",
  };
  return colors[status] || "default";
};
const getPriorityColor = (priority) => {
  const colors = {
    high: "error",
    medium: "warning",
    low: "info",
  };
  return colors[priority] || "default";
};
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
};
const OrdersPage = () => {
  const user = useSelector(selectUser);
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({
    message: "",
    severity: "info",
  });
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [injectionStatus, setInjectionStatus] = useState({});
  const [isInjecting, setIsInjecting] = useState({});
  const [clientNetworks, setClientNetworks] = useState([]);
  const [loadingClientNetworks, setLoadingClientNetworks] = useState(false);
  const [ourNetworks, setOurNetworks] = useState([]);
  const [loadingOurNetworks, setLoadingOurNetworks] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  // Client broker state removed - handled in post-order assignment workflow
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalOrders, setTotalOrders] = useState(0);
  const [filters, setFilters] = useState({
    status: "",
    priority: "",
    startDate: "",
    endDate: "",
  });
  const debouncedFilters = useDebounce(filters, 500);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRowData, setExpandedRowData] = useState({});
  const [expandedLeads, setExpandedLeads] = useState({});
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(createOrderSchema(user?.role)),
    defaultValues: createOrderSchema(user?.role).getDefault(),
  });
  const [manualFTDDialog, setManualFTDDialog] = useState({
    open: false,
    order: null,
    lead: null,
    step: "confirm",
  });
  const [manualFTDDomain, setManualFTDDomain] = useState("");
  const [processingLeads, setProcessingLeads] = useState({});

  // Broker Assignment Dialog State
  const [brokerAssignmentDialog, setBrokerAssignmentDialog] = useState({
    open: false,
    order: null,
    leadsWithBrokers: [],
    assignments: {},
    loading: false,
  });
  const [clientBrokers, setClientBrokers] = useState([]);
  const [loadingClientBrokers, setLoadingClientBrokers] = useState(false);

  // Create Broker Dialog State
  const [createBrokerDialog, setCreateBrokerDialog] = useState({
    open: false,
    loading: false,
  });
  const [manageBrokersDialog, setManageBrokersDialog] = useState({
    open: false,
    loading: false,
  });

  // Delete Broker Confirmation State
  const [deleteBrokerDialog, setDeleteBrokerDialog] = useState({
    open: false,
    broker: null,
    loading: false,
  });

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setNotification({ message: "", severity: "info" });
    try {
      const params = new URLSearchParams({
        page: page + 1,
        limit: rowsPerPage,
      });
      Object.entries(debouncedFilters).forEach(([key, value]) => {
        if (value) {
          params.append(key, value);
        }
      });
      const response = await api.get(`/orders?${params}`);
      setOrders(response.data.data);
      setTotalOrders(response.data.pagination.total);
    } catch (err) {
      setNotification({
        message: err.response?.data?.message || "Failed to fetch orders",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, debouncedFilters]);
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);
  useEffect(() => {
    if (notification.message) {
      const timer = setTimeout(() => {
        setNotification({ message: "", severity: "info" });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification.message]);
  const fetchClientNetworks = useCallback(async () => {
    if (user?.role !== "affiliate_manager" && user?.role !== "admin") return;
    setLoadingClientNetworks(true);
    try {
      const endpoint =
        user?.role === "affiliate_manager"
          ? "/client-networks/my-networks"
          : "/client-networks?isActive=true";
      const response = await api.get(endpoint);
      setClientNetworks(response.data.data || []);
    } catch (err) {
      console.error("Failed to fetch client networks:", err);
      setNotification({
        message: "Failed to load client networks",
        severity: "warning",
      });
    } finally {
      setLoadingClientNetworks(false);
    }
  }, [user?.role]);

  const fetchOurNetworks = useCallback(async () => {
    if (user?.role !== "affiliate_manager" && user?.role !== "admin") return;
    setLoadingOurNetworks(true);
    try {
      const endpoint =
        user?.role === "affiliate_manager"
          ? "/our-networks/my-networks"
          : "/our-networks?isActive=true";
      const response = await api.get(endpoint);
      setOurNetworks(response.data.data || []);
    } catch (err) {
      console.error("Failed to fetch our networks:", err);
      setNotification({
        message: "Failed to load our networks",
        severity: "warning",
      });
    } finally {
      setLoadingOurNetworks(false);
    }
  }, [user?.role]);
  const fetchCampaigns = useCallback(async () => {
    setLoadingCampaigns(true);
    try {
      const endpoint =
        user?.role === "affiliate_manager"
          ? "/campaigns/my-campaigns"
          : "/campaigns?isActive=true&status=active&limit=1000";
      const response = await api.get(endpoint);
      setCampaigns(response.data.data || []);
    } catch (err) {
      console.error("Failed to fetch campaigns:", err);
      setNotification({
        message: "Failed to load campaigns",
        severity: "warning",
      });
    } finally {
      setLoadingCampaigns(false);
    }
  }, [user?.role]);

  const fetchClientBrokers = useCallback(async () => {
    setLoadingClientBrokers(true);
    try {
      const response = await api.get("/client-brokers");
      setClientBrokers(response.data.data || []);
    } catch (error) {
      console.error("Error fetching client brokers:", error);
      setNotification({
        message: "Failed to load client brokers",
        severity: "error",
      });
    } finally {
      setLoadingClientBrokers(false);
    }
  }, []);

  const onSubmitOrder = useCallback(
    async (data) => {
      try {
        const availableDeviceTypesArray = Object.entries(
          data.availableDeviceTypes || {}
        )
          .filter(([_, enabled]) => enabled)
          .map(([deviceType, _]) => deviceType);
        const orderData = {
          requests: {
            ftd: data.ftd || 0,
            filler: data.filler || 0,
            cold: data.cold || 0,
            live: data.live || 0,
          },
          priority: data.priority,
          country: data.countryFilter,
          gender: data.genderFilter,
          notes: data.notes,
          selectedClientNetwork: data.selectedClientNetwork,
          selectedOurNetwork: data.selectedOurNetwork,
          selectedCampaign: data.selectedCampaign,
          // selectedClientBroker removed - brokers will be assigned after order fulfillment
          injectionMode: data.injectionMode,
          ...(data.injectionStartTime &&
            data.injectionStartTime.trim() && {
              injectionStartTime: data.injectionStartTime,
            }),
          ...(data.injectionEndTime &&
            data.injectionEndTime.trim() && {
              injectionEndTime: data.injectionEndTime,
            }),
          minInterval: data.minInterval,
          maxInterval: data.maxInterval,
          injectFiller: data.filler > 0,
          injectCold: data.cold > 0,
          injectLive: data.live > 0,
          injectionSettings: {
            deviceConfig: {
              selectionMode: data.deviceSelectionMode,
              bulkDeviceType: data.bulkDeviceType,
              deviceRatio: data.deviceRatio,
              availableDeviceTypes: availableDeviceTypesArray,
            },
          },
        };
        await api.post("/orders", orderData);
        setNotification({
          message: "Order created successfully!",
          severity: "success",
        });
        setCreateDialogOpen(false);
        reset();
        fetchOrders();
      } catch (err) {
        setNotification({
          message: err.response?.data?.message || "Failed to create order",
          severity: "error",
        });
      }
    },
    [reset, fetchOrders]
  );
  const handleViewOrder = useCallback(async (orderId) => {
    try {
      const response = await api.get(`/orders/${orderId}`);
      setSelectedOrder(response.data.data);
      setViewDialogOpen(true);
    } catch (err) {
      setNotification({
        message: err.response?.data?.message || "Failed to fetch order details",
        severity: "error",
      });
    }
  }, []);
  const toggleLeadExpansion = useCallback((leadId) => {
    setExpandedLeads((prev) => ({
      ...prev,
      [leadId]: !prev[leadId],
    }));
  }, []);
  const expandAllLeads = useCallback((leads) => {
    const expandedState = {};
    leads.forEach((lead) => {
      expandedState[lead._id] = true;
    });
    setExpandedLeads((prev) => ({ ...prev, ...expandedState }));
  }, []);
  const collapseAllLeads = useCallback((leads) => {
    const collapsedState = {};
    leads.forEach((lead) => {
      collapsedState[lead._id] = false;
    });
    setExpandedLeads((prev) => ({ ...prev, ...collapsedState }));
  }, []);
  const handleExportLeads = useCallback(async (orderId) => {
    try {
      setNotification({ message: "Preparing CSV export...", severity: "info" });
      const response = await api.get(`/orders/${orderId}/export`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      const contentDisposition = response.headers["content-disposition"];
      let filename = `order_${orderId}_leads_${
        new Date().toISOString().split("T")[0]
      }.csv`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setNotification({
        message: "CSV export completed successfully!",
        severity: "success",
      });
    } catch (err) {
      setNotification({
        message: err.response?.data?.message || "Failed to export leads",
        severity: "error",
      });
    }
  }, []);
  const toggleRowExpansion = useCallback(
    async (orderId) => {
      const isCurrentlyExpanded = !!expandedRowData[orderId];
      if (isCurrentlyExpanded) {
        const newExpandedData = { ...expandedRowData };
        delete newExpandedData[orderId];
        setExpandedRowData(newExpandedData);
      } else {
        try {
          const response = await api.get(`/orders/${orderId}`);
          setExpandedRowData((prev) => ({
            ...prev,
            [orderId]: response.data.data,
          }));
        } catch (err) {
          setNotification({
            message: "Could not load order details for expansion.",
            severity: "error",
          });
        }
      }
    },
    [expandedRowData]
  );
  const handleChangePage = useCallback((event, newPage) => {
    setPage(newPage);
  }, []);
  const handleChangeRowsPerPage = useCallback((event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);
  const handleFilterChange = useCallback(
    (field) => (event) => {
      const value = event.target.value;
      setFilters((prev) => ({ ...prev, [field]: value }));
      setPage(0);
    },
    []
  );
  const clearFilters = useCallback(() => {
    setFilters({ status: "", priority: "", startDate: "", endDate: "" });
    setPage(0);
  }, []);
  const handleOpenCreateDialog = useCallback(() => {
    setCreateDialogOpen(true);
    fetchClientNetworks();
    fetchOurNetworks();
    fetchCampaigns();
    // fetchClientBrokers removed - handled in post-order assignment
  }, [fetchClientNetworks, fetchOurNetworks, fetchCampaigns]);
  const handleStartInjection = useCallback(
    async (orderId) => {
      setIsInjecting((prev) => ({ ...prev, [orderId]: true }));
      setInjectionStatus((prev) => ({
        ...prev,
        [orderId]: { success: null, message: "Starting injection..." },
      }));
      try {
        const response = await api.post(`/orders/${orderId}/start-injection`);
        setInjectionStatus((prev) => ({
          ...prev,
          [orderId]: {
            success: true,
            message: "Injection started successfully!",
          },
        }));
        fetchOrders();
      } catch (err) {
        setInjectionStatus((prev) => ({
          ...prev,
          [orderId]: {
            success: false,
            message: err.response?.data?.message || "Failed to start injection",
          },
        }));
      } finally {
        setIsInjecting((prev) => ({ ...prev, [orderId]: false }));
        setTimeout(() => {
          setInjectionStatus((prev) => ({
            ...prev,
            [orderId]: { success: null, message: "" },
          }));
        }, 5000);
      }
    },
    [fetchOrders]
  );
  const handlePauseInjection = useCallback(
    async (orderId) => {
      try {
        await api.post(`/orders/${orderId}/pause-injection`);
        setNotification({
          message: "Injection paused successfully!",
          severity: "success",
        });
        fetchOrders();
      } catch (err) {
        setNotification({
          message: err.response?.data?.message || "Failed to pause injection",
          severity: "error",
        });
      }
    },
    [fetchOrders]
  );
  const handleStopInjection = useCallback(
    async (orderId) => {
      try {
        await api.post(`/orders/${orderId}/stop-injection`);
        setNotification({
          message: "Injection stopped successfully!",
          severity: "success",
        });
        fetchOrders();
      } catch (err) {
        setNotification({
          message: err.response?.data?.message || "Failed to stop injection",
          severity: "error",
        });
      }
    },
    [fetchOrders]
  );

  const handleAssignBrokers = useCallback(
    async (order) => {
      try {
        setBrokerAssignmentDialog((prev) => ({ ...prev, loading: true }));
        setNotification({
          message: "Loading broker assignment interface...",
          severity: "info",
        });

        // Fetch client brokers and leads that need assignment
        await fetchClientBrokers();
        const response = await api.get(
          `/orders/${order._id}/pending-broker-assignment`
        );

        if (response.data.data.leadsWithBrokers.length === 0) {
          setNotification({
            message: "No leads found that need broker assignment.",
            severity: "warning",
          });
          setBrokerAssignmentDialog((prev) => ({ ...prev, loading: false }));
          return;
        }

        const leadsWithBrokers = response.data.data.leadsWithBrokers;

        // Open the broker assignment dialog
        setBrokerAssignmentDialog({
          open: true,
          order: order,
          leadsWithBrokers: leadsWithBrokers,
          assignments: {},
          loading: false,
        });

        setNotification({
          message: `Found ${leadsWithBrokers.length} leads ready for broker assignment.`,
          severity: "success",
        });
      } catch (err) {
        setNotification({
          message:
            err.response?.data?.message ||
            "Failed to load broker assignment interface",
          severity: "error",
        });
        setBrokerAssignmentDialog((prev) => ({ ...prev, loading: false }));
      }
    },
    [fetchClientBrokers]
  );

  // Skip broker assignment functionality removed

  const handleBrokerAssignmentChange = useCallback((leadId, clientBrokerId) => {
    setBrokerAssignmentDialog((prev) => ({
      ...prev,
      assignments: {
        ...prev.assignments,
        [leadId]: clientBrokerId,
      },
    }));
  }, []);

  const handleSubmitBrokerAssignments = useCallback(async () => {
    try {
      setBrokerAssignmentDialog((prev) => ({ ...prev, loading: true }));
      setNotification({
        message: "Assigning brokers to leads...",
        severity: "info",
      });

      const { order, assignments } = brokerAssignmentDialog;

      // Prepare broker assignments for API call
      const brokerAssignments = Object.entries(assignments)
        .filter(([leadId, brokerId]) => brokerId && brokerId !== "")
        .map(([leadId, brokerId]) => ({
          leadId: leadId,
          clientBroker: brokerId,
          domain: null, // Will be set during injection or can be set later
        }));

      if (brokerAssignments.length === 0) {
        setNotification({
          message: "Please select at least one broker assignment.",
          severity: "warning",
        });
        setBrokerAssignmentDialog((prev) => ({ ...prev, loading: false }));
        return;
      }

      // Call the API to assign brokers
      const response = await api.post(`/orders/${order._id}/assign-brokers`, {
        brokerAssignments: brokerAssignments,
      });

      setNotification({
        message: `Successfully assigned brokers to ${brokerAssignments.length} leads!`,
        severity: "success",
      });

      // Close dialog and refresh orders
      setBrokerAssignmentDialog({
        open: false,
        order: null,
        leadsWithBrokers: [],
        assignments: {},
        loading: false,
      });

      // Refresh orders to show updated status
      setTimeout(() => {
        fetchOrders();
      }, 1000);
    } catch (err) {
      setNotification({
        message: err.response?.data?.message || "Failed to assign brokers",
        severity: "error",
      });
      setBrokerAssignmentDialog((prev) => ({ ...prev, loading: false }));
    }
  }, [brokerAssignmentDialog, fetchOrders]);

  const handleCloseBrokerDialog = useCallback(() => {
    setBrokerAssignmentDialog({
      open: false,
      order: null,
      leadsWithBrokers: [],
      assignments: {},
      loading: false,
    });
  }, []);

  const handleCreateNewBroker = useCallback(() => {
    setCreateBrokerDialog({ open: true, loading: false });
  }, []);

  const handleCloseCreateBrokerDialog = useCallback(() => {
    setCreateBrokerDialog({ open: false, loading: false });
  }, []);

  const handleSubmitNewBroker = useCallback(
    async (brokerData) => {
      try {
        setCreateBrokerDialog((prev) => ({ ...prev, loading: true }));
        setNotification({
          message: "Creating new client broker...",
          severity: "info",
        });

        const response = await api.post("/client-brokers", brokerData);

        setNotification({
          message: `Client broker "${brokerData.name}" created successfully!`,
          severity: "success",
        });

        // Refresh client brokers list
        await fetchClientBrokers();

        // Close dialog
        handleCloseCreateBrokerDialog();
      } catch (err) {
        setNotification({
          message:
            err.response?.data?.message || "Failed to create client broker",
          severity: "error",
        });
        setCreateBrokerDialog((prev) => ({ ...prev, loading: false }));
      }
    },
    [fetchClientBrokers]
  );

  const handleManageBrokers = useCallback(() => {
    setManageBrokersDialog({ open: true, loading: false });
    fetchClientBrokers();
  }, [fetchClientBrokers]);

  const handleCloseManageBrokersDialog = useCallback(() => {
    setManageBrokersDialog({ open: false, loading: false });
  }, []);

  const handleDeleteBroker = useCallback((broker) => {
    setDeleteBrokerDialog({ open: true, broker, loading: false });
  }, []);

  const handleConfirmDeleteBroker = useCallback(async () => {
    try {
      setDeleteBrokerDialog((prev) => ({ ...prev, loading: true }));
      setNotification({
        message: "Deleting client broker...",
        severity: "info",
      });

      const brokerId = deleteBrokerDialog.broker._id;
      await api.delete(`/client-brokers/${brokerId}`);

      setNotification({
        message: `Client broker "${deleteBrokerDialog.broker.name}" deleted successfully!`,
        severity: "success",
      });

      // Refresh client brokers list
      await fetchClientBrokers();

      // Close dialog
      setDeleteBrokerDialog({ open: false, broker: null, loading: false });
    } catch (err) {
      setNotification({
        message:
          err.response?.data?.message || "Failed to delete client broker",
        severity: "error",
      });
      setDeleteBrokerDialog((prev) => ({ ...prev, loading: false }));
    }
  }, [deleteBrokerDialog.broker, fetchClientBrokers]);

  const handleCloseDeleteBrokerDialog = useCallback(() => {
    setDeleteBrokerDialog({ open: false, broker: null, loading: false });
  }, []);

  const isValidDomain = useCallback((domain) => {
    if (!domain || !domain.trim()) return false;
    const trimmedDomain = domain.trim();
    const domainPattern =
      /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i;
    const ipPattern = /^(https?:\/\/)?((\d{1,3}\.){3}\d{1,3})(:\d+)?(\/.*)?$/;
    return domainPattern.test(trimmedDomain) || ipPattern.test(trimmedDomain);
  }, []);
  const handleOpenManualFTDInjection = useCallback((order, lead) => {
    const networkHistory = lead.clientNetworkHistory?.find(
      (history) => history.orderId?.toString() === order._id.toString()
    );
    if (networkHistory && networkHistory.injectionStatus === "completed") {
      setNotification({
        message: "This FTD lead has already been processed",
        severity: "warning",
      });
      return;
    }
    setManualFTDDialog({
      open: true,
      order: order,
      lead: lead,
      step: "confirm",
    });
    setManualFTDDomain("");
  }, []);

  const handleCloseManualFTDDialog = useCallback(() => {
    if (manualFTDDialog.step === "domain_input" && !manualFTDDomain.trim()) {
      setNotification({
        message:
          "Please enter the broker domain before closing. This field is mandatory.",
        severity: "warning",
      });
      return;
    }
    setManualFTDDialog({
      open: false,
      order: null,
      lead: null,
      step: "confirm",
    });
    setManualFTDDomain("");
  }, [manualFTDDialog.step, manualFTDDomain]);
  const handleStartManualFTDInjection = useCallback(async () => {
    const { order, lead } = manualFTDDialog;
    if (!order || !lead) return;
    setManualFTDDialog((prev) => ({ ...prev, step: "processing" }));
    setProcessingLeads((prev) => ({ ...prev, [lead._id]: true }));
    setNotification({
      message: `Starting manual ${lead.leadType?.toUpperCase()} injection for ${
        lead.firstName
      } ${lead.lastName}...`,
      severity: "info",
    });
    try {
      const response = await api.post(
        `/orders/${order._id}/leads/${lead._id}/manual-injection-start`
      );
      if (response.data.success) {
        setManualFTDDialog((prev) => ({ ...prev, step: "domain_input" }));

        // Local browser session
        setNotification({
          message:
            "Browser opened for manual form filling. Please fill the form manually and close the browser when done.",
          severity: "info",
        });
      } else {
        throw new Error(
          response.data.message || "Failed to start manual injection"
        );
      }
    } catch (error) {
      console.error("Manual injection start failed:", error);
      setNotification({
        message:
          error.response?.data?.message ||
          `Failed to start manual ${lead.leadType?.toUpperCase()} injection`,
        severity: "error",
      });
      setManualFTDDialog((prev) => ({ ...prev, step: "confirm" }));
    } finally {
      setProcessingLeads((prev) => ({ ...prev, [lead._id]: false }));
    }
  }, [manualFTDDialog.order, manualFTDDialog.lead]);
  const handleSubmitManualFTDDomain = useCallback(async () => {
    const { order, lead } = manualFTDDialog;
    if (!order || !lead || !manualFTDDomain.trim()) return;

    try {
      const response = await api.post(
        `/orders/${order._id}/leads/${lead._id}/manual-injection-complete`,
        {
          domain: manualFTDDomain.trim(),
        }
      );

      setNotification({
        message: `Manual ${lead.leadType?.toUpperCase()} injection completed successfully for ${
          lead.firstName
        } ${lead.lastName}!`,
        severity: "success",
      });

      handleCloseManualFTDDialog();

      // Update both the main orders list and expanded order data
      await fetchOrders();

      // If we need to refresh expanded or selected order data, fetch it once and reuse
      const needsExpandedRefresh = expandedRowData[order._id];
      const needsSelectedRefresh =
        selectedOrder && selectedOrder._id === order._id;

      if (needsExpandedRefresh || needsSelectedRefresh) {
        try {
          const orderDetailResponse = await api.get(`/orders/${order._id}`);
          const refreshedOrderData = orderDetailResponse.data.data;

          if (needsExpandedRefresh) {
            setExpandedRowData((prev) => ({
              ...prev,
              [order._id]: refreshedOrderData,
            }));
          }

          if (needsSelectedRefresh) {
            setSelectedOrder(refreshedOrderData);
          }
        } catch (error) {
          console.error("Failed to refresh order data:", error);
        }
      }
    } catch (error) {
      console.error("Manual injection completion failed:", error);
      let errorMessage = `Failed to complete manual ${lead.leadType?.toUpperCase()} injection`;
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      setNotification({
        message: errorMessage,
        severity: "error",
      });
    }
  }, [
    manualFTDDialog.order,
    manualFTDDialog.lead,
    manualFTDDomain,
    handleCloseManualFTDDialog,
    fetchOrders,
    expandedRowData,
    selectedOrder,
  ]);
  const renderLeadCounts = (label, requested, fulfilled) => (
    <Typography variant="body2">
      {label}: {requested || 0} requested, {fulfilled || 0} fulfilled
    </Typography>
  );
  return (
    <Box sx={{ p: isSmallScreen ? 2 : 3 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        flexDirection={isSmallScreen ? "column" : "row"}
        sx={{ mb: 3, alignItems: isSmallScreen ? "flex-start" : "center" }}
      >
        <Typography
          variant={isSmallScreen ? "h5" : "h4"}
          gutterBottom
          sx={{ mb: isSmallScreen ? 2 : 0 }}
        >
          Orders
        </Typography>
        {(user?.role === "admin" || user?.role === "affiliate_manager") && (
          <Box
            sx={{
              display: "flex",
              gap: 1,
              flexDirection: isSmallScreen ? "column" : "row",
              width: isSmallScreen ? "100%" : "auto",
            }}
          >
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreateDialog}
              size={isSmallScreen ? "small" : "medium"}
              sx={{ width: isSmallScreen ? "100%" : "auto" }}
            >
              Create Order
            </Button>
            <Button
              variant="outlined"
              startIcon={<BusinessIcon />}
              onClick={handleManageBrokers}
              size={isSmallScreen ? "small" : "medium"}
              sx={{ width: isSmallScreen ? "100%" : "auto" }}
            >
              Manage Brokers
            </Button>
          </Box>
        )}
      </Box>
      {}
      {notification.message && (
        <Collapse in={!!notification.message}>
          <Alert
            severity={notification.severity}
            sx={{ mb: 2 }}
            onClose={() => setNotification({ message: "", severity: "info" })}
          >
            {notification.message}
          </Alert>
        </Collapse>
      )}
      {}
      {Object.entries(injectionStatus).map(
        ([orderId, status]) =>
          status.message && (
            <Collapse key={orderId} in={!!status.message}>
              <Alert
                severity={
                  status.success === true
                    ? "success"
                    : status.success === false
                    ? "error"
                    : "info"
                }
                sx={{ mb: 1 }}
                onClose={() =>
                  setInjectionStatus((prev) => ({
                    ...prev,
                    [orderId]: { success: null, message: "" },
                  }))
                }
              >
                <strong>Order {orderId.slice(-8)}:</strong> {status.message}
              </Alert>
            </Collapse>
          )
      )}
      {}
      <Card sx={{ mb: 3 }}>
        <CardContent
          sx={{
            p: isSmallScreen ? 1.5 : 2,
            "&:last-child": { pb: isSmallScreen ? 1.5 : 2 },
          }}
        >
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h6">Filters</Typography>
            <IconButton onClick={() => setShowFilters(!showFilters)}>
              {showFilters ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
          <Collapse in={showFilters}>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filters.status}
                    label="Status"
                    onChange={handleFilterChange("status")}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="fulfilled">Fulfilled</MenuItem>
                    <MenuItem value="partial">Partial</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={filters.priority}
                    label="Priority"
                    onChange={handleFilterChange("priority")}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Start Date"
                  type="date"
                  value={filters.startDate}
                  onChange={handleFilterChange("startDate")}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="End Date"
                  type="date"
                  value={filters.endDate}
                  onChange={handleFilterChange("endDate")}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                />
              </Grid>
              <Grid item xs={12}>
                <Button onClick={clearFilters} variant="outlined" size="small">
                  Clear Filters
                </Button>
              </Grid>
            </Grid>
          </Collapse>
        </CardContent>
      </Card>
      {}
      <Paper>
        <TableContainer>
          <Table size={isSmallScreen ? "small" : "medium"}>
            <TableHead>
              <TableRow>
                <TableCell>Order ID</TableCell>
                <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                  Requester
                </TableCell>
                <TableCell>Requests (F/Fi/C/L)</TableCell>
                <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                  Fulfilled (F/Fi/C/L)
                </TableCell>
                <TableCell>Status</TableCell>
                <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>
                  Injection
                </TableCell>
                <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                  Priority
                </TableCell>
                <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                  Created
                </TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => {
                  const isExpanded = !!expandedRowData[order._id];
                  const expandedDetails = expandedRowData[order._id];
                  return (
                    <React.Fragment key={order._id}>
                      <TableRow hover>
                        <TableCell>{order._id.slice(-8)}</TableCell>
                        <TableCell
                          sx={{ display: { xs: "none", md: "table-cell" } }}
                        >
                          {order.requester?.fullName}
                        </TableCell>
                        <TableCell>{`${order.requests?.ftd || 0}/${
                          order.requests?.filler || 0
                        }/${order.requests?.cold || 0}/${
                          order.requests?.live || 0
                        }`}</TableCell>
                        <TableCell
                          sx={{ display: { xs: "none", md: "table-cell" } }}
                        >{`${order.fulfilled?.ftd || 0}/${
                          order.fulfilled?.filler || 0
                        }/${order.fulfilled?.cold || 0}/${
                          order.fulfilled?.live || 0
                        }`}</TableCell>
                        <TableCell>
                          <Chip
                            label={order.status}
                            color={getStatusColor(order.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell
                          sx={{ display: { xs: "none", lg: "table-cell" } }}
                        >
                          <Chip
                            label={order.injectionSettings?.status || "pending"}
                            color={
                              order.injectionSettings?.status === "completed"
                                ? "success"
                                : order.injectionSettings?.status ===
                                  "in_progress"
                                ? "warning"
                                : order.injectionSettings?.status === "failed"
                                ? "error"
                                : "default"
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell
                          sx={{ display: { xs: "none", sm: "table-cell" } }}
                        >
                          <Chip
                            label={order.priority}
                            color={getPriorityColor(order.priority)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell
                          sx={{ display: { xs: "none", sm: "table-cell" } }}
                        >
                          {new Date(order.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => handleViewOrder(order._id)}
                            title="View Order"
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleExportLeads(order._id)}
                            title="Export Leads as CSV"
                          >
                            <DownloadIcon fontSize="small" />
                          </IconButton>

                          {}
                          {(user?.role === "admin" ||
                            user?.role === "affiliate_manager") && (
                            <>
                              {order.injectionSettings.status === "pending" &&
                                ((order.fulfilled?.cold || 0) > 0 ||
                                  (order.fulfilled?.live || 0) > 0) && (
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      handleStartInjection(order._id)
                                    }
                                    title="Start Injection"
                                    disabled={isInjecting[order._id]}
                                    color="primary"
                                  >
                                    {isInjecting[order._id] ? (
                                      <CircularProgress size={16} />
                                    ) : (
                                      <InjectIcon fontSize="small" />
                                    )}
                                  </IconButton>
                                )}
                              {order.injectionSettings.status ===
                                "in_progress" && (
                                <>
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      handlePauseInjection(order._id)
                                    }
                                    title="Pause Injection"
                                    color="warning"
                                  >
                                    <PauseIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      handleStopInjection(order._id)
                                    }
                                    title="Stop Injection"
                                    color="error"
                                  >
                                    <StopIcon fontSize="small" />
                                  </IconButton>
                                </>
                              )}
                              {}
                            </>
                          )}
                          <IconButton
                            size="small"
                            onClick={() => toggleRowExpansion(order._id)}
                            title={isExpanded ? "Collapse" : "Expand"}
                          >
                            {isExpanded ? (
                              <ExpandLessIcon />
                            ) : (
                              <ExpandMoreIcon />
                            )}
                          </IconButton>
                        </TableCell>
                      </TableRow>
                      {}
                      <TableRow>
                        <TableCell
                          sx={{ p: 0, borderBottom: "none" }}
                          colSpan={9}
                        >
                          <Collapse
                            in={isExpanded}
                            timeout="auto"
                            unmountOnExit
                          >
                            <Box sx={{ p: 2, bgcolor: "action.hover" }}>
                              <Typography variant="h6" gutterBottom>
                                Order Details
                              </Typography>
                              {expandedDetails ? (
                                <Grid container spacing={2}>
                                  <Grid item xs={12} md={6}>
                                    <Typography variant="body2">
                                      <strong>Notes:</strong>{" "}
                                      {expandedDetails.notes || "N/A"}
                                    </Typography>
                                    <Typography variant="body2">
                                      <strong>Country Filter:</strong>{" "}
                                      {expandedDetails.countryFilter || "Any"}
                                    </Typography>
                                    <Typography variant="body2">
                                      <strong>Gender Filter:</strong>{" "}
                                      {expandedDetails.genderFilter || "Any"}
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={12} md={6}>
                                    <Typography variant="body2">
                                      <strong>Assigned Leads:</strong>{" "}
                                      {expandedDetails.leads?.length || 0}
                                    </Typography>
                                    {}
                                    <Box sx={{ display: { sm: "none" } }}>
                                      <Typography variant="body2">
                                        <strong>Priority:</strong>{" "}
                                        {expandedDetails.priority}
                                      </Typography>
                                      <Typography variant="body2">
                                        <strong>Created:</strong>{" "}
                                        {new Date(
                                          expandedDetails.createdAt
                                        ).toLocaleString()}
                                      </Typography>
                                      <Typography variant="body2">
                                        <strong>Fulfilled:</strong>{" "}
                                        {`${
                                          expandedDetails.fulfilled?.ftd || 0
                                        }/${
                                          expandedDetails.fulfilled?.filler || 0
                                        }/${
                                          expandedDetails.fulfilled?.cold || 0
                                        }/${
                                          expandedDetails.fulfilled?.live || 0
                                        }`}
                                      </Typography>
                                    </Box>
                                  </Grid>

                                  {/* Client Broker Assignment Section */}
                                  {expandedDetails.injectionProgress
                                    ?.brokerAssignmentPending &&
                                    (expandedDetails.status === "fulfilled" ||
                                      expandedDetails.status === "partial") &&
                                    (user?.role === "admin" ||
                                      user?.role === "affiliate_manager") && (
                                      <Grid item xs={12}>
                                        <Alert
                                          severity="warning"
                                          sx={{ mb: 2 }}
                                        >
                                          <Box
                                            sx={{
                                              display: "flex",
                                              justifyContent: "space-between",
                                              alignItems: "center",
                                              width: "100%",
                                            }}
                                          >
                                            <Box>
                                              <Typography
                                                variant="body2"
                                                sx={{ fontWeight: "bold" }}
                                              >
                                                🎯 Client Broker Assignment
                                                Required
                                              </Typography>
                                              <Typography variant="body2">
                                                This order has{" "}
                                                {expandedDetails.leads
                                                  ?.length || 0}{" "}
                                                leads that need client broker
                                                assignment. Assign brokers to
                                                complete the order workflow.
                                              </Typography>
                                            </Box>
                                            <Button
                                              variant="contained"
                                              color="primary"
                                              size="small"
                                              startIcon={<BusinessIcon />}
                                              onClick={() =>
                                                handleAssignBrokers(
                                                  expandedDetails
                                                )
                                              }
                                              sx={{
                                                ml: 2,
                                                whiteSpace: "nowrap",
                                              }}
                                            >
                                              Assign Brokers
                                            </Button>
                                          </Box>
                                        </Alert>
                                      </Grid>
                                    )}

                                  {expandedDetails.leads &&
                                    expandedDetails.leads.length > 0 && (
                                      <Grid item xs={12}>
                                        <Box
                                          sx={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            mb: 1,
                                          }}
                                        >
                                          <Typography variant="subtitle2">
                                            Assigned Leads
                                          </Typography>
                                          <Button
                                            size="small"
                                            startIcon={<DownloadIcon />}
                                            onClick={() =>
                                              handleExportLeads(order._id)
                                            }
                                            variant="outlined"
                                            sx={{ mr: 1 }}
                                          >
                                            Export CSV
                                          </Button>
                                          <Button
                                            size="small"
                                            onClick={() =>
                                              expandAllLeads(
                                                expandedDetails.leads
                                              )
                                            }
                                            variant="outlined"
                                            sx={{ mr: 1 }}
                                          >
                                            Expand All
                                          </Button>
                                          <Button
                                            size="small"
                                            onClick={() =>
                                              collapseAllLeads(
                                                expandedDetails.leads
                                              )
                                            }
                                            variant="outlined"
                                          >
                                            Collapse All
                                          </Button>
                                        </Box>
                                        <TableContainer
                                          component={Paper}
                                          elevation={2}
                                        >
                                          <Table size="small">
                                            <TableHead>
                                              <TableRow>
                                                <TableCell>Type</TableCell>
                                                <TableCell>Name</TableCell>
                                                <TableCell
                                                  sx={{
                                                    display: {
                                                      xs: "none",
                                                      sm: "table-cell",
                                                    },
                                                  }}
                                                >
                                                  Country
                                                </TableCell>
                                                <TableCell
                                                  sx={{
                                                    display: {
                                                      xs: "none",
                                                      sm: "table-cell",
                                                    },
                                                  }}
                                                >
                                                  Email
                                                </TableCell>
                                                <TableCell>Actions</TableCell>
                                              </TableRow>
                                            </TableHead>
                                            <TableBody>
                                              {expandedDetails.leads.map(
                                                (lead) => (
                                                  <React.Fragment
                                                    key={lead._id}
                                                  >
                                                    <TableRow>
                                                      <TableCell>
                                                        <Chip
                                                          label={lead.leadType?.toUpperCase()}
                                                          size="small"
                                                        />
                                                      </TableCell>
                                                      <TableCell>
                                                        {lead.firstName}{" "}
                                                        {lead.lastName}
                                                      </TableCell>
                                                      <TableCell
                                                        sx={{
                                                          display: {
                                                            xs: "none",
                                                            sm: "table-cell",
                                                          },
                                                        }}
                                                      >
                                                        {lead.country}
                                                      </TableCell>
                                                      <TableCell
                                                        sx={{
                                                          display: {
                                                            xs: "none",
                                                            sm: "table-cell",
                                                          },
                                                        }}
                                                      >
                                                        {lead.newEmail}
                                                      </TableCell>
                                                      <TableCell>
                                                        <IconButton
                                                          size="small"
                                                          onClick={() =>
                                                            toggleLeadExpansion(
                                                              lead._id
                                                            )
                                                          }
                                                          aria-label={
                                                            expandedLeads[
                                                              lead._id
                                                            ]
                                                              ? "collapse"
                                                              : "expand"
                                                          }
                                                        >
                                                          {expandedLeads[
                                                            lead._id
                                                          ] ? (
                                                            <ExpandLessIcon />
                                                          ) : (
                                                            <ExpandMoreIcon />
                                                          )}
                                                        </IconButton>
                                                        {}
                                                        {(lead.leadType ===
                                                          "ftd" ||
                                                          lead.leadType ===
                                                            "filler") &&
                                                          (user?.role ===
                                                            "admin" ||
                                                            user?.role ===
                                                              "affiliate_manager") &&
                                                          (() => {
                                                            const networkHistory =
                                                              lead.clientNetworkHistory?.find(
                                                                (history) =>
                                                                  history.orderId?.toString() ===
                                                                  order._id.toString()
                                                              );
                                                            const isCompleted =
                                                              networkHistory &&
                                                              networkHistory.injectionStatus ===
                                                                "completed";
                                                            const isProcessing =
                                                              processingLeads[
                                                                lead._id
                                                              ];
                                                            if (!isCompleted) {
                                                              return (
                                                                <IconButton
                                                                  size="small"
                                                                  onClick={() =>
                                                                    handleOpenManualFTDInjection(
                                                                      order,
                                                                      lead
                                                                    )
                                                                  }
                                                                  title={`Manual ${lead.leadType.toUpperCase()} Injection for ${
                                                                    lead.firstName
                                                                  } ${
                                                                    lead.lastName
                                                                  }`}
                                                                  color="primary"
                                                                  disabled={
                                                                    false
                                                                  }
                                                                >
                                                                  {isProcessing ? (
                                                                    <CircularProgress
                                                                      size={16}
                                                                    />
                                                                  ) : (
                                                                    <SendIcon fontSize="small" />
                                                                  )}
                                                                </IconButton>
                                                              );
                                                            }
                                                            return (
                                                              <Chip
                                                                label="Injected"
                                                                size="small"
                                                                color="success"
                                                                variant="outlined"
                                                              />
                                                            );
                                                          })()}
                                                      </TableCell>
                                                    </TableRow>
                                                    {expandedLeads[
                                                      lead._id
                                                    ] && (
                                                      <TableRow>
                                                        <TableCell
                                                          colSpan={5}
                                                          sx={{
                                                            py: 0,
                                                            border: 0,
                                                          }}
                                                        >
                                                          <Collapse
                                                            in={
                                                              expandedLeads[
                                                                lead._id
                                                              ]
                                                            }
                                                            timeout="auto"
                                                            unmountOnExit
                                                          >
                                                            <Box sx={{ p: 2 }}>
                                                              <LeadDetailCard
                                                                lead={lead}
                                                              />
                                                            </Box>
                                                          </Collapse>
                                                        </TableCell>
                                                      </TableRow>
                                                    )}
                                                  </React.Fragment>
                                                )
                                              )}
                                            </TableBody>
                                          </Table>
                                        </TableContainer>
                                      </Grid>
                                    )}
                                </Grid>
                              ) : (
                                <Box
                                  sx={{
                                    display: "flex",
                                    justifyContent: "center",
                                    p: 2,
                                  }}
                                >
                                  <CircularProgress />
                                </Box>
                              )}
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={totalOrders}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
      {}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create New Order</DialogTitle>
        <form onSubmit={handleSubmit(onSubmitOrder)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Controller
                  name="ftd"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="FTD"
                      type="number"
                      error={!!errors.ftd}
                      helperText={errors.ftd?.message}
                      inputProps={{ min: 0 }}
                      size="small"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <Controller
                  name="filler"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Filler"
                      type="number"
                      error={!!errors.filler}
                      helperText={errors.filler?.message}
                      inputProps={{ min: 0 }}
                      size="small"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <Controller
                  name="cold"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Cold"
                      type="number"
                      error={!!errors.cold}
                      helperText={errors.cold?.message}
                      inputProps={{ min: 0 }}
                      size="small"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <Controller
                  name="live"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Live"
                      type="number"
                      error={!!errors.live}
                      helperText={errors.live?.message}
                      inputProps={{ min: 0 }}
                      size="small"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="priority"
                  control={control}
                  render={({ field }) => (
                    <FormControl
                      fullWidth
                      size="small"
                      error={!!errors.priority}
                    >
                      <InputLabel>Priority</InputLabel>
                      <Select {...field} label="Priority">
                        <MenuItem value="low">Low</MenuItem>
                        <MenuItem value="medium">Medium</MenuItem>
                        <MenuItem value="high">High</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="gender"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth size="small" error={!!errors.gender}>
                      <InputLabel>Gender (Optional)</InputLabel>
                      <Select {...field} label="Gender (Optional)">
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="male">Male</MenuItem>
                        <MenuItem value="female">Female</MenuItem>
                        <MenuItem value="not_defined">Not Defined</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="countryFilter"
                  control={control}
                  render={({ field }) => (
                    <FormControl
                      fullWidth
                      size="small"
                      error={!!errors.countryFilter}
                    >
                      <InputLabel>Country Filter *</InputLabel>
                      <Select
                        {...field}
                        label="Country Filter *"
                        value={field.value || ""}
                      >
                        {getSortedCountries().map((country) => (
                          <MenuItem key={country.code} value={country.name}>
                            {country.name}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.countryFilter?.message && (
                        <Typography
                          variant="caption"
                          color="error"
                          sx={{ mt: 0.5, ml: 1.5 }}
                        >
                          {errors.countryFilter.message}
                        </Typography>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>
              {}
              {(user?.role === "affiliate_manager" ||
                user?.role === "admin") && (
                <Grid item xs={12}>
                  <Controller
                    name="selectedClientNetwork"
                    control={control}
                    render={({ field }) => (
                      <FormControl
                        fullWidth
                        size="small"
                        error={!!errors.selectedClientNetwork}
                      >
                        <InputLabel>Client Network *</InputLabel>
                        <Select
                          {...field}
                          label="Client Network *"
                          value={field.value || ""}
                          disabled={loadingClientNetworks}
                        >
                          <MenuItem value="" disabled>
                            <em>Select Client Network</em>
                          </MenuItem>
                          {clientNetworks.map((network) => (
                            <MenuItem key={network._id} value={network._id}>
                              {network.name}
                              {network.description && (
                                <Typography
                                  variant="caption"
                                  sx={{
                                    display: "block",
                                    color: "text.secondary",
                                  }}
                                >
                                  {network.description}
                                </Typography>
                              )}
                            </MenuItem>
                          ))}
                        </Select>
                        {errors.selectedClientNetwork?.message && (
                          <Typography
                            variant="caption"
                            color="error"
                            sx={{ mt: 0.5, ml: 1.5 }}
                          >
                            {errors.selectedClientNetwork.message}
                          </Typography>
                        )}
                        {!errors.selectedClientNetwork?.message && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ mt: 0.5, ml: 1.5 }}
                          >
                            {loadingClientNetworks
                              ? "Loading client networks..."
                              : `${clientNetworks.length} client network(s) available`}
                          </Typography>
                        )}
                      </FormControl>
                    )}
                  />
                </Grid>
              )}
              {}
              <Grid item xs={12}>
                <Controller
                  name="selectedOurNetwork"
                  control={control}
                  render={({ field }) => (
                    <FormControl
                      fullWidth
                      size="small"
                      error={!!errors.selectedOurNetwork}
                    >
                      <InputLabel>Our Network *</InputLabel>
                      <Select
                        {...field}
                        label="Our Network *"
                        value={field.value || ""}
                        disabled={loadingOurNetworks}
                      >
                        <MenuItem value="" disabled>
                          <em>Select Our Network</em>
                        </MenuItem>
                        {ourNetworks.map((network) => (
                          <MenuItem key={network._id} value={network._id}>
                            {network.name}
                            {network.description && (
                              <Typography
                                variant="caption"
                                sx={{
                                  display: "block",
                                  color: "text.secondary",
                                }}
                              >
                                {network.description}
                              </Typography>
                            )}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.selectedOurNetwork?.message && (
                        <Typography
                          variant="caption"
                          color="error"
                          sx={{ mt: 0.5, ml: 1.5 }}
                        >
                          {errors.selectedOurNetwork.message}
                        </Typography>
                      )}
                      {!errors.selectedOurNetwork?.message && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ mt: 0.5, ml: 1.5 }}
                        >
                          {loadingOurNetworks
                            ? "Loading our networks..."
                            : `${ourNetworks.length} our network(s) available`}
                        </Typography>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>
              {}
              <Grid item xs={12}>
                <Controller
                  name="selectedCampaign"
                  control={control}
                  render={({ field }) => (
                    <FormControl
                      fullWidth
                      size="small"
                      error={!!errors.selectedCampaign}
                    >
                      <InputLabel>Campaign *</InputLabel>
                      <Select
                        {...field}
                        label="Campaign *"
                        value={field.value || ""}
                        disabled={loadingCampaigns}
                      >
                        <MenuItem value="" disabled>
                          <em>Select a Campaign</em>
                        </MenuItem>
                        {campaigns.map((campaign) => (
                          <MenuItem key={campaign._id} value={campaign._id}>
                            {campaign.name}
                            {campaign.description && (
                              <Typography
                                variant="caption"
                                sx={{
                                  display: "block",
                                  color: "text.secondary",
                                }}
                              >
                                {campaign.description}
                              </Typography>
                            )}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.selectedCampaign?.message && (
                        <Typography
                          variant="caption"
                          color="error"
                          sx={{ mt: 0.5, ml: 1.5 }}
                        >
                          {errors.selectedCampaign.message}
                        </Typography>
                      )}
                      {!errors.selectedCampaign?.message && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ mt: 0.5, ml: 1.5 }}
                        >
                          {loadingCampaigns
                            ? "Loading campaigns..."
                            : `${campaigns.length} campaign(s) available`}
                        </Typography>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>
              {/* Client Broker Assignment - Moved to post-order workflow */}
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mt: 1 }}>
                  <Typography variant="body2">
                    <strong>Client Broker Assignment:</strong> Client brokers
                    will be assigned after your order is fulfilled and leads are
                    obtained. You'll be able to assign brokers to leads once the
                    order status changes to "fulfilled" or "partial".
                  </Typography>
                </Alert>
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="notes"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Notes"
                      multiline
                      rows={3}
                      error={!!errors.notes}
                      helperText={errors.notes?.message}
                      size="small"
                    />
                  )}
                />
              </Grid>
              {}
              <Grid item xs={12}>
                <Typography
                  variant="subtitle2"
                  sx={{ mb: 1, fontWeight: "bold" }}
                >
                  Lead Injection Settings
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mb: 2 }}
                >
                  Only Cold and Live leads will be automatically injected. FTD
                  and Filler leads require manual injection.
                </Typography>
              </Grid>
              {}
              <Grid item xs={12} sm={6}>
                <Controller
                  name="injectionMode"
                  control={control}
                  render={({ field: modeField }) => (
                    <FormControl
                      fullWidth
                      size="small"
                      error={!!errors.injectionMode}
                    >
                      <InputLabel>Injection Mode</InputLabel>
                      <Select {...modeField} label="Injection Mode">
                        <MenuItem value="bulk">Auto Inject (Bulk)</MenuItem>
                        <MenuItem value="scheduled">
                          Auto Inject (Scheduled)
                        </MenuItem>
                      </Select>
                      {errors.injectionMode && (
                        <Typography
                          variant="caption"
                          color="error"
                          sx={{ mt: 0.5, ml: 1.5 }}
                        >
                          {errors.injectionMode.message}
                        </Typography>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>
              {}
              <Controller
                name="injectionMode"
                control={control}
                render={({ field: modeField }) =>
                  modeField.value === "scheduled" && (
                    <>
                      <Grid item xs={12} sm={3}>
                        <Controller
                          name="injectionStartTime"
                          control={control}
                          render={({ field: timeField }) => (
                            <TextField
                              {...timeField}
                              fullWidth
                              label="Start Time"
                              type="time"
                              InputLabelProps={{ shrink: true }}
                              size="small"
                              error={!!errors.injectionStartTime}
                              helperText={errors.injectionStartTime?.message}
                            />
                          )}
                        />
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <Controller
                          name="injectionEndTime"
                          control={control}
                          render={({ field: timeField }) => (
                            <TextField
                              {...timeField}
                              fullWidth
                              label="End Time"
                              type="time"
                              InputLabelProps={{ shrink: true }}
                              size="small"
                              error={!!errors.injectionEndTime}
                              helperText={errors.injectionEndTime?.message}
                            />
                          )}
                        />
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <Controller
                          name="minInterval"
                          control={control}
                          render={({ field: intervalField }) => (
                            <TextField
                              {...intervalField}
                              fullWidth
                              label="Min Interval (seconds)"
                              type="number"
                              inputProps={{ min: 10, max: 1800, step: 5 }}
                              size="small"
                              error={!!errors.minInterval}
                              helperText={
                                errors.minInterval?.message ||
                                "Minimum time between injections"
                              }
                            />
                          )}
                        />
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <Controller
                          name="maxInterval"
                          control={control}
                          render={({ field: intervalField }) => (
                            <TextField
                              {...intervalField}
                              fullWidth
                              label="Max Interval (seconds)"
                              type="number"
                              inputProps={{ min: 30, max: 3600, step: 5 }}
                              size="small"
                              error={!!errors.maxInterval}
                              helperText={
                                errors.maxInterval?.message ||
                                "Maximum time between injections"
                              }
                            />
                          )}
                        />
                      </Grid>
                    </>
                  )
                }
              />
              {}
              <Grid item xs={12}>
                <Typography
                  variant="subtitle2"
                  sx={{ mb: 1, fontWeight: "bold" }}
                >
                  Device Configuration
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mb: 2 }}
                >
                  Configure device types for lead injection. Each lead gets a
                  unique fingerprint for the assigned device type.
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="deviceSelectionMode"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth size="small">
                      <InputLabel>Device Selection Mode</InputLabel>
                      <Select {...field} label="Device Selection Mode">
                        <MenuItem value="random">Random Assignment</MenuItem>
                        <MenuItem value="bulk">
                          Bulk Assignment (Same Device)
                        </MenuItem>
                        <MenuItem value="ratio">
                          Ratio-based Distribution
                        </MenuItem>
                        <MenuItem value="individual">
                          Individual Assignment
                        </MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              {}
              <Controller
                name="deviceSelectionMode"
                control={control}
                render={({ field }) =>
                  field.value === "bulk" && (
                    <Grid item xs={12} sm={6}>
                      <Controller
                        name="bulkDeviceType"
                        control={control}
                        render={({ field: deviceField }) => (
                          <FormControl fullWidth size="small">
                            <InputLabel>Device Type</InputLabel>
                            <Select {...deviceField} label="Device Type">
                              <MenuItem value="windows">
                                Windows Desktop
                              </MenuItem>
                              <MenuItem value="android">
                                Android Mobile
                              </MenuItem>
                              <MenuItem value="ios">iPhone/iPad</MenuItem>
                              <MenuItem value="mac">Mac Desktop</MenuItem>
                            </Select>
                          </FormControl>
                        )}
                      />
                    </Grid>
                  )
                }
              />
              {}
              <Controller
                name="deviceSelectionMode"
                control={control}
                render={({ field }) =>
                  field.value === "ratio" && (
                    <>
                      <Grid item xs={12}>
                        <Typography
                          variant="body2"
                          sx={{ mb: 1, fontWeight: "medium" }}
                        >
                          Device Distribution Ratios (0-10 scale):
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={2.4}>
                        <Controller
                          name="deviceRatio.windows"
                          control={control}
                          render={({ field: ratioField }) => (
                            <TextField
                              {...ratioField}
                              fullWidth
                              label="Windows"
                              type="number"
                              inputProps={{ min: 0, max: 10, step: 1 }}
                              size="small"
                            />
                          )}
                        />
                      </Grid>
                      <Grid item xs={12} sm={2.4}>
                        <Controller
                          name="deviceRatio.android"
                          control={control}
                          render={({ field: ratioField }) => (
                            <TextField
                              {...ratioField}
                              fullWidth
                              label="Android"
                              type="number"
                              inputProps={{ min: 0, max: 10, step: 1 }}
                              size="small"
                            />
                          )}
                        />
                      </Grid>
                      <Grid item xs={12} sm={2.4}>
                        <Controller
                          name="deviceRatio.ios"
                          control={control}
                          render={({ field: ratioField }) => (
                            <TextField
                              {...ratioField}
                              fullWidth
                              label="iOS"
                              type="number"
                              inputProps={{ min: 0, max: 10, step: 1 }}
                              size="small"
                            />
                          )}
                        />
                      </Grid>
                      <Grid item xs={12} sm={2.4}>
                        <Controller
                          name="deviceRatio.mac"
                          control={control}
                          render={({ field: ratioField }) => (
                            <TextField
                              {...ratioField}
                              fullWidth
                              label="Mac"
                              type="number"
                              inputProps={{ min: 0, max: 10, step: 1 }}
                              size="small"
                            />
                          )}
                        />
                      </Grid>
                    </>
                  )
                }
              />
              {}
              <Controller
                name="deviceSelectionMode"
                control={control}
                render={({ field }) =>
                  field.value === "random" && (
                    <Grid item xs={12}>
                      <Typography
                        variant="body2"
                        sx={{ mb: 1, fontWeight: "medium" }}
                      >
                        Available Device Types for Random Selection:
                      </Typography>
                      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                        <Controller
                          name="availableDeviceTypes.windows"
                          control={control}
                          render={({ field: deviceField }) => (
                            <FormControlLabel
                              control={
                                <Checkbox
                                  {...deviceField}
                                  checked={deviceField.value}
                                />
                              }
                              label="Windows"
                            />
                          )}
                        />
                        <Controller
                          name="availableDeviceTypes.android"
                          control={control}
                          render={({ field: deviceField }) => (
                            <FormControlLabel
                              control={
                                <Checkbox
                                  {...deviceField}
                                  checked={deviceField.value}
                                />
                              }
                              label="Android"
                            />
                          )}
                        />
                        <Controller
                          name="availableDeviceTypes.ios"
                          control={control}
                          render={({ field: deviceField }) => (
                            <FormControlLabel
                              control={
                                <Checkbox
                                  {...deviceField}
                                  checked={deviceField.value}
                                />
                              }
                              label="iOS"
                            />
                          )}
                        />
                        <Controller
                          name="availableDeviceTypes.mac"
                          control={control}
                          render={({ field: deviceField }) => (
                            <FormControlLabel
                              control={
                                <Checkbox
                                  {...deviceField}
                                  checked={deviceField.value}
                                />
                              }
                              label="Mac"
                            />
                          )}
                        />
                      </Box>
                    </Grid>
                  )
                }
              />
            </Grid>
            {errors[""] && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {errors[""]?.message}
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting ? <CircularProgress size={24} /> : "Create Order"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      {}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Order Details</DialogTitle>
        <DialogContent dividers>
          {selectedOrder && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Order ID</Typography>
                <Typography variant="body2">{selectedOrder._id}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Requester</Typography>
                <Typography variant="body2">
                  {selectedOrder.requester?.fullName} (
                  {selectedOrder.requester?.email})
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Status</Typography>
                <Chip
                  label={selectedOrder.status}
                  color={getStatusColor(selectedOrder.status)}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Priority</Typography>
                <Chip
                  label={selectedOrder.priority}
                  color={getPriorityColor(selectedOrder.priority)}
                  size="small"
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2">
                  Requests vs Fulfilled
                </Typography>
                {renderLeadCounts(
                  "FTD",
                  selectedOrder.requests?.ftd,
                  selectedOrder.fulfilled?.ftd
                )}
                {renderLeadCounts(
                  "Filler",
                  selectedOrder.requests?.filler,
                  selectedOrder.fulfilled?.filler
                )}
                {renderLeadCounts(
                  "Cold",
                  selectedOrder.requests?.cold,
                  selectedOrder.fulfilled?.cold
                )}
                {renderLeadCounts(
                  "Live",
                  selectedOrder.requests?.live,
                  selectedOrder.fulfilled?.live
                )}
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Country Filter</Typography>
                <Typography variant="body2">
                  {selectedOrder.countryFilter || "Any"}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Gender Filter</Typography>
                <Typography variant="body2">
                  {selectedOrder.genderFilter || "Any"}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2">Notes</Typography>
                <Typography variant="body2">
                  {selectedOrder.notes || "N/A"}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2">Created</Typography>
                <Typography variant="body2">
                  {new Date(selectedOrder.createdAt).toLocaleString()}
                </Typography>
              </Grid>
              {}
              {selectedOrder.leads?.some((lead) => lead.leadType === "ftd") && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Session Statistics
                  </Typography>
                  <Box
                    sx={{
                      bgcolor: "action.hover",
                      p: 2,
                      borderRadius: 1,
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    {(() => {
                      const ftdLeads = selectedOrder.leads.filter(
                        (lead) => lead.leadType === "ftd"
                      );
                      const leadsWithSessions = ftdLeads.filter(
                        (lead) =>
                          lead.browserSession && lead.browserSession.sessionId
                      );
                      const activeSessions = leadsWithSessions.filter(
                        (lead) => lead.browserSession.isActive
                      );
                      const expiredSessions = leadsWithSessions.filter(
                        (lead) => {
                          const createdAt = new Date(
                            lead.browserSession.createdAt
                          );
                          const thirtyDaysAgo = new Date(
                            Date.now() - 30 * 24 * 60 * 60 * 1000
                          );
                          return createdAt < thirtyDaysAgo;
                        }
                      );
                      const expiringSessions = leadsWithSessions.filter(
                        (lead) => {
                          const createdAt = new Date(
                            lead.browserSession.createdAt
                          );
                          const expirationDate = new Date(
                            createdAt.getTime() + 30 * 24 * 60 * 60 * 1000
                          );
                          const sevenDaysFromNow = new Date(
                            Date.now() + 7 * 24 * 60 * 60 * 1000
                          );
                          const thirtyDaysAgo = new Date(
                            Date.now() - 30 * 24 * 60 * 60 * 1000
                          );
                          return (
                            createdAt >= thirtyDaysAgo &&
                            expirationDate < sevenDaysFromNow
                          );
                        }
                      );
                      return (
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6} md={3}>
                            <Typography variant="body2" color="text.secondary">
                              Total FTD Leads:{" "}
                              <strong>{ftdLeads.length}</strong>
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={6} md={3}>
                            <Typography variant="body2" color="success.main">
                              With Sessions:{" "}
                              <strong>{leadsWithSessions.length}</strong>
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={6} md={3}>
                            <Typography variant="body2" color="primary.main">
                              Active: <strong>{activeSessions.length}</strong>
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={6} md={3}>
                            <Typography variant="body2" color="error.main">
                              Expired: <strong>{expiredSessions.length}</strong>
                            </Typography>
                          </Grid>
                          {expiringSessions.length > 0 && (
                            <Grid item xs={12}>
                              <Typography
                                variant="body2"
                                color="warning.main"
                                sx={{ fontWeight: "bold" }}
                              >
                                ⚠️ {expiringSessions.length} session(s) expiring
                                within 7 days
                              </Typography>
                            </Grid>
                          )}
                        </Grid>
                      );
                    })()}
                  </Box>
                </Grid>
              )}
              <Grid item xs={12}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Typography variant="subtitle2">
                    Assigned Leads ({selectedOrder.leads?.length || 0})
                  </Typography>
                  {selectedOrder.leads?.length > 0 && (
                    <Box>
                      <Button
                        size="small"
                        onClick={() => expandAllLeads(selectedOrder.leads)}
                        variant="outlined"
                        sx={{ mr: 1 }}
                      >
                        Expand All
                      </Button>
                      <Button
                        size="small"
                        onClick={() => collapseAllLeads(selectedOrder.leads)}
                        variant="outlined"
                      >
                        Collapse All
                      </Button>
                    </Box>
                  )}
                </Box>
                {selectedOrder.leads?.length > 0 ? (
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Type</TableCell>
                          <TableCell>Name</TableCell>
                          <TableCell
                            sx={{ display: { xs: "none", sm: "table-cell" } }}
                          >
                            Country
                          </TableCell>
                          <TableCell
                            sx={{ display: { xs: "none", sm: "table-cell" } }}
                          >
                            Email
                          </TableCell>
                          <TableCell
                            sx={{ display: { xs: "none", md: "table-cell" } }}
                          >
                            Session
                          </TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedOrder.leads.map((lead) => (
                          <React.Fragment key={lead._id}>
                            <TableRow>
                              <TableCell>
                                <Chip
                                  label={lead.leadType.toUpperCase()}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>
                                {lead.firstName} {lead.lastName}
                              </TableCell>
                              <TableCell
                                sx={{
                                  display: { xs: "none", sm: "table-cell" },
                                }}
                              >
                                {lead.country}
                              </TableCell>
                              <TableCell
                                sx={{
                                  display: { xs: "none", sm: "table-cell" },
                                }}
                              >
                                {lead.newEmail}
                              </TableCell>
                              <TableCell
                                sx={{
                                  display: { xs: "none", md: "table-cell" },
                                }}
                              >
                                {lead.leadType === "ftd" &&
                                lead.browserSession &&
                                lead.browserSession.sessionId ? (
                                  <SessionStatusChip
                                    sessionData={lead.browserSession}
                                  />
                                ) : lead.leadType === "ftd" ? (
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    No Session
                                  </Typography>
                                ) : (
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    N/A
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell>
                                <Box
                                  sx={{
                                    display: "flex",
                                    gap: 0.5,
                                    alignItems: "center",
                                  }}
                                >
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      toggleLeadExpansion(lead._id)
                                    }
                                    aria-label={
                                      expandedLeads[lead._id]
                                        ? "collapse"
                                        : "expand"
                                    }
                                  >
                                    {expandedLeads[lead._id] ? (
                                      <ExpandLessIcon />
                                    ) : (
                                      <ExpandMoreIcon />
                                    )}
                                  </IconButton>
                                  {}
                                  {(lead.leadType === "ftd" ||
                                    lead.leadType === "filler") &&
                                    (user?.role === "admin" ||
                                      user?.role === "affiliate_manager") &&
                                    (() => {
                                      const networkHistory =
                                        lead.clientNetworkHistory?.find(
                                          (history) =>
                                            history.orderId?.toString() ===
                                            selectedOrder._id.toString()
                                        );
                                      const isCompleted =
                                        networkHistory &&
                                        networkHistory.injectionStatus ===
                                          "completed";
                                      const isProcessing =
                                        processingLeads[lead._id];
                                      if (!isCompleted) {
                                        return (
                                          <IconButton
                                            size="small"
                                            onClick={() =>
                                              handleOpenManualFTDInjection(
                                                selectedOrder,
                                                lead
                                              )
                                            }
                                            title={`Manual ${lead.leadType.toUpperCase()} Injection for ${
                                              lead.firstName
                                            } ${lead.lastName}`}
                                            color="primary"
                                            disabled={false}
                                          >
                                            {isProcessing ? (
                                              <CircularProgress size={16} />
                                            ) : (
                                              <SendIcon fontSize="small" />
                                            )}
                                          </IconButton>
                                        );
                                      }
                                      return (
                                        <Chip
                                          label="Injected"
                                          size="small"
                                          color="success"
                                          variant="outlined"
                                        />
                                      );
                                    })()}
                                  {}
                                  {lead.leadType === "ftd" &&
                                    lead.browserSession &&
                                    lead.browserSession.sessionId && (
                                      <SessionAccessButton
                                        lead={lead}
                                        user={user}
                                        size="small"
                                        variant="icon"
                                        onSessionAccess={(lead, response) => {
                                          console.log(
                                            "Session access initiated for lead:",
                                            lead._id,
                                            response
                                          );
                                        }}
                                      />
                                    )}
                                </Box>
                              </TableCell>
                            </TableRow>
                            {expandedLeads[lead._id] && (
                              <TableRow>
                                <TableCell
                                  colSpan={6}
                                  sx={{ py: 0, border: 0 }}
                                >
                                  <Collapse
                                    in={expandedLeads[lead._id]}
                                    timeout="auto"
                                    unmountOnExit
                                  >
                                    <Box sx={{ p: 2 }}>
                                      <LeadDetailCard lead={lead} />
                                    </Box>
                                  </Collapse>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography variant="body2">No leads assigned</Typography>
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>

          <Button
            onClick={() => handleExportLeads(selectedOrder._id)}
            startIcon={<DownloadIcon />}
            variant="contained"
            color="primary"
          >
            Export Leads CSV
          </Button>
        </DialogActions>
      </Dialog>
      {}
      <Dialog
        open={manualFTDDialog.open}
        onClose={handleCloseManualFTDDialog}
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown={
          manualFTDDialog.step === "processing" ||
          manualFTDDialog.step === "domain_input"
        }
        onBackdropClick={
          manualFTDDialog.step === "domain_input"
            ? undefined
            : handleCloseManualFTDDialog
        }
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <SendIcon color="primary" />
            <Typography variant="h6">
              Manual {manualFTDDialog.lead?.leadType?.toUpperCase() || "Lead"}{" "}
              Injection
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Order #{manualFTDDialog.order?._id?.slice(-8)}
            {manualFTDDialog.lead && (
              <>
                {" "}
                - {manualFTDDialog.lead.firstName}{" "}
                {manualFTDDialog.lead.lastName}
              </>
            )}
          </Typography>
        </DialogTitle>
        <DialogContent>
          {manualFTDDialog.step === "confirm" && manualFTDDialog.lead && (
            <>
              <Typography variant="body1" sx={{ mb: 2 }}>
                This will open a browser window with the landing form for{" "}
                <strong>
                  {manualFTDDialog.lead.firstName}{" "}
                  {manualFTDDialog.lead.lastName}
                </strong>
                . The form will be automatically filled with the{" "}
                {manualFTDDialog.lead.leadType?.toUpperCase()} lead information.
                You will need to:
              </Typography>
              <Box component="ol" sx={{ pl: 2, mb: 2 }}>
                <li>
                  Review the auto-filled form with the following{" "}
                  {manualFTDDialog.lead.leadType?.toUpperCase()} lead
                  information:
                </li>
                <Box component="ul" sx={{ pl: 2, mb: 1 }}>
                  <li>
                    Name: {manualFTDDialog.lead.firstName}{" "}
                    {manualFTDDialog.lead.lastName}
                  </li>
                  <li>Email: {manualFTDDialog.lead.newEmail}</li>
                  <li>Phone: {manualFTDDialog.lead.newPhone}</li>
                  <li>Country: {manualFTDDialog.lead.country}</li>
                </Box>
                <li>Make any necessary corrections to the auto-filled data</li>
                <li>Click the submit button to submit the form</li>
                <li>Wait for any redirects to complete</li>
                <li>Copy the final domain/URL from the browser address bar</li>
                <li>Close the browser window</li>
                <li>Enter the copied domain in the next step</li>
              </Box>
              <Alert severity="info" sx={{ mt: 2 }}>
                The form will be automatically filled with the{" "}
                {manualFTDDialog.lead.leadType?.toUpperCase()} lead data. Review
                the information, submit the form, and make sure to copy the
                final domain before closing the browser!
              </Alert>
            </>
          )}
          {manualFTDDialog.step === "processing" && (
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              py={3}
            >
              <CircularProgress size={40} sx={{ mb: 2 }} />
              <Typography variant="body1" align="center">
                Browser is opening... The form will be auto-filled with{" "}
                {manualFTDDialog.lead?.leadType?.toUpperCase()} data. Please
                review, submit, and close the browser when done.
              </Typography>
            </Box>
          )}
          {manualFTDDialog.step === "domain_input" &&
            (() => {
              const isDomainValid = isValidDomain(manualFTDDomain);
              const domainTrimmed = manualFTDDomain.trim();
              return (
                <>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    Please enter the final domain/URL that you copied from the
                    browser:
                  </Typography>
                  <TextField
                    fullWidth
                    label="Final Domain/URL *"
                    placeholder="e.g., https://example.com or example.com"
                    value={manualFTDDomain}
                    onChange={(e) => setManualFTDDomain(e.target.value)}
                    sx={{ mb: 2 }}
                    autoFocus
                    required
                    error={Boolean(domainTrimmed && !isDomainValid)}
                    helperText={
                      !domainTrimmed
                        ? "This field is mandatory"
                        : isDomainValid
                        ? "✓ Valid domain format detected"
                        : "⚠️ Please enter a valid domain or URL"
                    }
                    InputLabelProps={{
                      style: {
                        color: isDomainValid ? "#4caf50" : undefined,
                      },
                    }}
                    InputProps={{
                      style: {
                        borderColor: isDomainValid ? "#4caf50" : undefined,
                      },
                      endAdornment: domainTrimmed ? (
                        <Box sx={{ mr: 1 }}>
                          {isDomainValid ? (
                            <CheckCircleIcon color="success" fontSize="small" />
                          ) : (
                            <ErrorIcon color="error" fontSize="small" />
                          )}
                        </Box>
                      ) : null,
                    }}
                  />
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Make sure this is the final domain after all redirects, not
                    the original form URL.
                  </Alert>
                  <Alert severity="error">
                    <strong>Important:</strong> This dialog cannot be closed
                    until you enter the broker domain. This field is mandatory
                    for completing the FTD injection.
                  </Alert>
                </>
              );
            })()}
        </DialogContent>
        <DialogActions>
          {manualFTDDialog.step === "confirm" && (
            <>
              <Button onClick={handleCloseManualFTDDialog}>Cancel</Button>
              <Button
                onClick={handleStartManualFTDInjection}
                variant="contained"
                startIcon={<SendIcon />}
              >
                Start Manual{" "}
                {manualFTDDialog.lead?.leadType?.toUpperCase() || "Lead"}{" "}
                Injection
              </Button>
            </>
          )}
          {manualFTDDialog.step === "domain_input" &&
            (() => {
              const isDomainValid = isValidDomain(manualFTDDomain);
              const domainTrimmed = manualFTDDomain.trim();
              const isDisabled = !domainTrimmed || !isDomainValid;
              return (
                <Button
                  onClick={handleSubmitManualFTDDomain}
                  variant="contained"
                  disabled={isDisabled}
                  startIcon={
                    isDomainValid ? (
                      <CheckCircleIcon />
                    ) : domainTrimmed ? (
                      <ErrorIcon />
                    ) : (
                      <SendIcon />
                    )
                  }
                  fullWidth
                  color={isDomainValid ? "success" : "primary"}
                  sx={{
                    bgcolor: isDomainValid
                      ? "#4caf50"
                      : isDisabled
                      ? undefined
                      : "#1976d2",
                    "&:hover": {
                      bgcolor: isDomainValid
                        ? "#45a049"
                        : isDisabled
                        ? undefined
                        : "#1565c0",
                    },
                    "&:disabled": {
                      bgcolor: "#cccccc",
                      color: "#666666",
                    },
                  }}
                >
                  {isDomainValid
                    ? "Complete Injection ✓"
                    : domainTrimmed
                    ? "Invalid Domain ⚠️"
                    : "Complete Injection"}
                </Button>
              );
            })()}
        </DialogActions>
      </Dialog>

      {/* Broker Assignment Dialog */}
      <Dialog
        open={brokerAssignmentDialog.open}
        onClose={handleCloseBrokerDialog}
        maxWidth="lg"
        fullWidth
        disableEscapeKeyDown={brokerAssignmentDialog.loading}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <BusinessIcon color="primary" />
            <Typography variant="h6">Assign Client Brokers to Leads</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Order #{brokerAssignmentDialog.order?._id?.slice(-8)} -{" "}
            {brokerAssignmentDialog.leadsWithBrokers?.length || 0} leads ready
            for broker assignment
          </Typography>
        </DialogTitle>
        <DialogContent>
          {brokerAssignmentDialog.loading ? (
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              py={3}
            >
              <CircularProgress size={40} sx={{ mb: 2 }} />
              <Typography variant="body1" align="center">
                Processing broker assignments...
              </Typography>
            </Box>
          ) : (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  Select a client broker for each lead. You can assign the same
                  broker to multiple leads or different brokers to different
                  leads. Leads without broker assignments will be skipped.
                </Typography>
              </Alert>

              {brokerAssignmentDialog.leadsWithBrokers?.length > 0 ? (
                <TableContainer component={Paper} elevation={2}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>
                          <strong>Lead</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Type</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Country</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Email</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Assign Broker</strong>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {brokerAssignmentDialog.leadsWithBrokers.map(
                        ({ lead }) => (
                          <TableRow key={lead._id}>
                            <TableCell>
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: "bold" }}
                              >
                                {lead.firstName} {lead.lastName}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={lead.leadType?.toUpperCase()}
                                size="small"
                                color={
                                  lead.leadType === "ftd"
                                    ? "success"
                                    : "default"
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {lead.country}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {lead.newEmail}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <FormControl size="small" sx={{ minWidth: 200 }}>
                                <InputLabel>Select Broker</InputLabel>
                                <Select
                                  value={
                                    brokerAssignmentDialog.assignments[
                                      lead._id
                                    ] || ""
                                  }
                                  label="Select Broker"
                                  onChange={(e) =>
                                    handleBrokerAssignmentChange(
                                      lead._id,
                                      e.target.value
                                    )
                                  }
                                  disabled={loadingClientBrokers}
                                >
                                  <MenuItem value="">
                                    <em>No broker assigned</em>
                                  </MenuItem>
                                  {clientBrokers
                                    .filter((broker) => broker.isActive)
                                    .map((broker) => (
                                      <MenuItem
                                        key={broker._id}
                                        value={broker._id}
                                      >
                                        <Box
                                          display="flex"
                                          alignItems="center"
                                          gap={1}
                                        >
                                          <BusinessIcon fontSize="small" />
                                          <Box>
                                            <Typography variant="body2">
                                              {broker.name}
                                            </Typography>
                                            {broker.domain && (
                                              <Typography
                                                variant="caption"
                                                color="text.secondary"
                                              >
                                                {broker.domain}
                                              </Typography>
                                            )}
                                          </Box>
                                        </Box>
                                      </MenuItem>
                                    ))}
                                  {/* Add New Broker Option */}
                                  <MenuItem
                                    onClick={handleCreateNewBroker}
                                    sx={{
                                      borderTop: "1px solid #e0e0e0",
                                      color: "primary.main",
                                    }}
                                  >
                                    <Box
                                      display="flex"
                                      alignItems="center"
                                      gap={1}
                                    >
                                      <AddIcon fontSize="small" />
                                      <Typography
                                        variant="body2"
                                        sx={{ fontWeight: "bold" }}
                                      >
                                        Create New Broker
                                      </Typography>
                                    </Box>
                                  </MenuItem>
                                </Select>
                              </FormControl>
                            </TableCell>
                          </TableRow>
                        )
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  align="center"
                  sx={{ py: 4 }}
                >
                  No leads found that need broker assignment.
                </Typography>
              )}

              {Object.keys(brokerAssignmentDialog.assignments).length > 0 && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Ready to assign:</strong>{" "}
                    {
                      Object.values(brokerAssignmentDialog.assignments).filter(
                        (v) => v
                      ).length
                    }{" "}
                    broker assignment(s) selected
                  </Typography>
                </Alert>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseBrokerDialog}
            disabled={brokerAssignmentDialog.loading}
          >
            Cancel
          </Button>
          {brokerAssignmentDialog.leadsWithBrokers?.length > 0 && (
            <Button
              onClick={handleSubmitBrokerAssignments}
              variant="contained"
              startIcon={<BusinessIcon />}
              disabled={
                brokerAssignmentDialog.loading ||
                Object.values(brokerAssignmentDialog.assignments).filter(
                  (v) => v
                ).length === 0
              }
              color="primary"
            >
              {brokerAssignmentDialog.loading
                ? "Assigning..."
                : `Assign ${
                    Object.values(brokerAssignmentDialog.assignments).filter(
                      (v) => v
                    ).length
                  } Broker(s)`}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Create New Broker Dialog */}
      <Dialog
        open={createBrokerDialog.open}
        onClose={handleCloseCreateBrokerDialog}
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown={createBrokerDialog.loading}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <AddIcon color="primary" />
            <Typography variant="h6">Create New Client Broker</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <CreateBrokerForm
            onSubmit={handleSubmitNewBroker}
            loading={createBrokerDialog.loading}
            onCancel={handleCloseCreateBrokerDialog}
          />
        </DialogContent>
      </Dialog>

      {/* Manage Brokers Dialog */}
      <Dialog
        open={manageBrokersDialog.open}
        onClose={handleCloseManageBrokersDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Box display="flex" alignItems="center" gap={1}>
              <BusinessIcon color="primary" />
              <Typography variant="h6">Manage Client Brokers</Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateNewBroker}
              size="small"
            >
              Create New
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent>
          <BrokerManagementTable
            brokers={clientBrokers}
            loading={loadingClientBrokers}
            onRefresh={fetchClientBrokers}
            onDelete={handleDeleteBroker}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseManageBrokersDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Broker Confirmation Dialog */}
      <Dialog
        open={deleteBrokerDialog.open}
        onClose={handleCloseDeleteBrokerDialog}
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown={deleteBrokerDialog.loading}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <DeleteIcon color="error" />
            <Typography variant="h6">Delete Client Broker</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {deleteBrokerDialog.broker && (
            <>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Warning:</strong> This action cannot be undone. All
                  data associated with this broker will be permanently deleted.
                </Typography>
              </Alert>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Are you sure you want to delete the client broker:
              </Typography>
              <Box sx={{ p: 2, bgcolor: "grey.100", borderRadius: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                  {deleteBrokerDialog.broker.name}
                </Typography>
                {deleteBrokerDialog.broker.domain && (
                  <Typography variant="body2" color="text.secondary">
                    Domain: {deleteBrokerDialog.broker.domain}
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary">
                  Created:{" "}
                  {new Date(
                    deleteBrokerDialog.broker.createdAt
                  ).toLocaleDateString()}
                </Typography>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseDeleteBrokerDialog}
            disabled={deleteBrokerDialog.loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDeleteBroker}
            variant="contained"
            color="error"
            startIcon={
              deleteBrokerDialog.loading ? (
                <CircularProgress size={16} />
              ) : (
                <DeleteIcon />
              )
            }
            disabled={deleteBrokerDialog.loading}
          >
            {deleteBrokerDialog.loading ? "Deleting..." : "Delete Broker"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Create Broker Form Component
const CreateBrokerForm = ({ onSubmit, loading, onCancel }) => {
  const [formData, setFormData] = useState({
    name: "",
    domain: "",
    isActive: true,
    notes: "",
  });

  const handleChange = (field) => (event) => {
    setFormData((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Broker Name *"
            value={formData.name}
            onChange={handleChange("name")}
            required
            disabled={loading}
            placeholder="e.g., Acme Trading Ltd"
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Domain"
            value={formData.domain}
            onChange={handleChange("domain")}
            disabled={loading}
            placeholder="e.g., acmetrading.com"
            helperText="Optional: Primary domain for this broker"
          />
        </Grid>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    isActive: e.target.checked,
                  }))
                }
                disabled={loading}
              />
            }
            label="Active"
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Notes"
            value={formData.notes}
            onChange={handleChange("notes")}
            multiline
            rows={3}
            disabled={loading}
            placeholder="Optional notes about this broker"
          />
        </Grid>
        <Grid item xs={12}>
          <Box display="flex" gap={1} justifyContent="flex-end">
            <Button onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading || !formData.name.trim()}
              startIcon={loading ? <CircularProgress size={16} /> : <AddIcon />}
            >
              {loading ? "Creating..." : "Create Broker"}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </form>
  );
};

// Broker Management Table Component
const BrokerManagementTable = ({ brokers, loading, onRefresh, onDelete }) => {
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (brokers.length === 0) {
    return (
      <Box textAlign="center" py={4}>
        <Typography variant="body2" color="text.secondary">
          No client brokers found. Create your first broker to get started.
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} elevation={1}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>
              <strong>Name</strong>
            </TableCell>
            <TableCell>
              <strong>Domain</strong>
            </TableCell>
            <TableCell>
              <strong>Status</strong>
            </TableCell>
            <TableCell>
              <strong>Created</strong>
            </TableCell>
            <TableCell>
              <strong>Actions</strong>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {brokers.map((broker) => (
            <TableRow key={broker._id}>
              <TableCell>
                <Box display="flex" alignItems="center" gap={1}>
                  <BusinessIcon fontSize="small" />
                  <Typography variant="body2">{broker.name}</Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {broker.domain || "N/A"}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip
                  label={broker.isActive ? "Active" : "Inactive"}
                  color={broker.isActive ? "success" : "default"}
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {new Date(broker.createdAt).toLocaleDateString()}
                </Typography>
              </TableCell>
              <TableCell>
                <IconButton size="small" title="Edit Broker">
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" title="View Details">
                  <ViewIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  title="Delete Broker"
                  onClick={() => onDelete(broker)}
                  color="error"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default OrdersPage;
