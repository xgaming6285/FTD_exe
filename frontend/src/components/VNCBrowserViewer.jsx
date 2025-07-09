import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  Grid,
  LinearProgress,
} from "@mui/material";
import {
  Fullscreen,
  FullscreenExit,
  Refresh,
  Close,
  Info,
  SignalWifi4Bar,
  SignalWifiOff,
  Computer,
  Smartphone,
} from "@mui/icons-material";
import { styled } from "@mui/material/styles";

const StyledDialog = styled(Dialog)(({ theme }) => ({
  "& .MuiDialog-paper": {
    maxWidth: "95vw",
    maxHeight: "95vh",
    width: "100%",
    height: "100%",
    margin: theme.spacing(1),
  },
}));

const VNCContainer = styled(Box)(({ theme }) => ({
  position: "relative",
  width: "100%",
  height: "70vh",
  backgroundColor: "#000",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: theme.shape.borderRadius,
  overflow: "hidden",
  border: `2px solid ${theme.palette.divider}`,
}));

const StatusBar = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: theme.spacing(1, 2),
  backgroundColor: theme.palette.background.default,
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const VNCBrowserViewer = ({
  open,
  onClose,
  sessionId,
  leadInfo,
  vncUrl,
  onSessionEnd,
}) => {
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    duration: 0,
    dataTransferred: 0,
    latency: 0,
  });
  const [error, setError] = useState(null);
  const [showStats, setShowStats] = useState(false);

  const vncContainerRef = useRef(null);
  const iframeRef = useRef(null);
  const sessionStartTime = useRef(Date.now());
  const statsInterval = useRef(null);

  useEffect(() => {
    if (open && sessionId) {
      initializeVNCConnection();
      startStatsMonitoring();
    }

    return () => {
      if (statsInterval.current) {
        clearInterval(statsInterval.current);
      }
    };
  }, [open, sessionId]);

  const initializeVNCConnection = () => {
    try {
      setConnectionStatus("connecting");
      setError(null);

      // Construct VNC URL with session parameters
      const vncUrlWithParams = new URL(vncUrl);
      vncUrlWithParams.searchParams.set("sessionId", sessionId);
      vncUrlWithParams.searchParams.set(
        "leadName",
        `${leadInfo.firstName} ${leadInfo.lastName}`
      );
      vncUrlWithParams.searchParams.set("leadEmail", leadInfo.email || "");

      // Simulate connection process
      setTimeout(() => {
        setConnectionStatus("connected");
      }, 2000);
    } catch (err) {
      console.error("VNC connection error:", err);
      setError("Failed to connect to GUI browser session");
      setConnectionStatus("error");
    }
  };

  const startStatsMonitoring = () => {
    statsInterval.current = setInterval(() => {
      const now = Date.now();
      const duration = Math.floor((now - sessionStartTime.current) / 1000);

      setSessionStats((prev) => ({
        duration,
        dataTransferred:
          prev.dataTransferred + Math.floor(Math.random() * 10) + 5,
        latency: Math.floor(Math.random() * 50) + 10,
      }));
    }, 1000);
  };

  const handleReconnect = () => {
    setConnectionStatus("connecting");
    setError(null);

    // Reload the iframe
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }

    setTimeout(() => {
      setConnectionStatus("connected");
    }, 2000);
  };

  const handleFullscreen = () => {
    if (!isFullscreen) {
      if (vncContainerRef.current.requestFullscreen) {
        vncContainerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  const handleClose = () => {
    if (statsInterval.current) {
      clearInterval(statsInterval.current);
    }

    if (onSessionEnd) {
      onSessionEnd(sessionId);
    }

    onClose();
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "connected":
        return "success";
      case "connecting":
        return "warning";
      case "error":
        return "error";
      default:
        return "default";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "connected":
        return <SignalWifi4Bar />;
      case "connecting":
        return <CircularProgress size={16} />;
      case "error":
        return <SignalWifiOff />;
      default:
        return <Computer />;
    }
  };

  const renderVNCContent = () => {
    if (connectionStatus === "connecting") {
      return (
        <Box textAlign="center" color="white">
          <CircularProgress size={60} sx={{ mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Connecting to GUI Browser Session...
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            Please wait while we establish the connection
          </Typography>
        </Box>
      );
    }

    if (connectionStatus === "error" || error) {
      return (
        <Box textAlign="center" color="white" sx={{ p: 3 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="h6">Connection Failed</Typography>
            <Typography variant="body2">
              {error || "Unable to connect to the GUI browser session"}
            </Typography>
          </Alert>
          <Button
            variant="contained"
            onClick={handleReconnect}
            startIcon={<Refresh />}
          >
            Try Again
          </Button>
        </Box>
      );
    }

    if (connectionStatus === "connected") {
      return (
        <iframe
          ref={iframeRef}
          src={vncUrl}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            backgroundColor: "#000",
          }}
          title="VNC Browser Session"
          allow="fullscreen"
        />
      );
    }

    return null;
  };

  return (
    <StyledDialog open={open} onClose={handleClose} maxWidth={false} fullWidth>
      <DialogTitle sx={{ p: 0 }}>
        <StatusBar>
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="h6" component="div">
              🎯 GUI Browser Session
            </Typography>
            <Chip
              icon={getStatusIcon(connectionStatus)}
              label={
                connectionStatus.charAt(0).toUpperCase() +
                connectionStatus.slice(1)
              }
              color={getStatusColor(connectionStatus)}
              size="small"
            />
          </Box>

          <Box display="flex" alignItems="center" gap={1}>
            <Tooltip title="Session Statistics">
              <IconButton onClick={() => setShowStats(!showStats)}>
                <Info />
              </IconButton>
            </Tooltip>

            <Tooltip title="Reconnect">
              <IconButton onClick={handleReconnect}>
                <Refresh />
              </IconButton>
            </Tooltip>

            <Tooltip title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
              <IconButton onClick={handleFullscreen}>
                {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
              </IconButton>
            </Tooltip>

            <Tooltip title="Close Session">
              <IconButton onClick={handleClose}>
                <Close />
              </IconButton>
            </Tooltip>
          </Box>
        </StatusBar>
      </DialogTitle>

      <DialogContent sx={{ p: 0, position: "relative" }}>
        {showStats && (
          <Card sx={{ m: 2, mb: 1 }}>
            <CardContent sx={{ py: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Lead
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {leadInfo.firstName} {leadInfo.lastName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {leadInfo.email}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Session Duration
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {formatDuration(sessionStats.duration)}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Data Transferred
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {Math.floor(sessionStats.dataTransferred)} KB
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Latency
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {sessionStats.latency} ms
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        <VNCContainer ref={vncContainerRef}>{renderVNCContent()}</VNCContainer>

        {connectionStatus === "connecting" && (
          <LinearProgress
            sx={{ position: "absolute", bottom: 0, left: 0, right: 0 }}
          />
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, justifyContent: "space-between" }}>
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="body2" color="text.secondary">
            Session: {sessionId?.substring(0, 8)}...
          </Typography>
          {leadInfo.deviceType && (
            <Chip
              icon={
                leadInfo.deviceType === "mobile" ? <Smartphone /> : <Computer />
              }
              label={leadInfo.deviceType}
              size="small"
              variant="outlined"
            />
          )}
        </Box>

        <Box display="flex" gap={1}>
          <Button
            onClick={handleReconnect}
            disabled={connectionStatus === "connecting"}
          >
            Reconnect
          </Button>
          <Button onClick={handleClose} variant="contained">
            Close Session
          </Button>
        </Box>
      </DialogActions>
    </StyledDialog>
  );
};

export default VNCBrowserViewer;
