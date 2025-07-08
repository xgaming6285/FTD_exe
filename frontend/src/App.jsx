import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, CircularProgress, Box } from '@mui/material';
import { Toaster } from 'react-hot-toast';
import { store, persistor } from './store/store';
import { selectUser, selectIsAuthenticated, acceptEula } from './store/slices/authSlice.js';
import ProtectedRoute from './components/common/ProtectedRoute.jsx';
import PublicRoute from './components/common/PublicRoute.jsx';
import MainLayout from './layouts/MainLayout.jsx';
import DisclaimerModal from './components/common/DisclaimerModal.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import LandingPage from './pages/LandingPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import OrdersPage from './pages/OrdersPage.jsx';
import LeadsPage from './pages/LeadsPage.jsx';
import UsersPage from './pages/UsersPage.jsx';
import ClientNetworksPage from './pages/ClientNetworksPage.jsx';
import OurNetworksPage from './pages/OurNetworksPage.jsx';
import CampaignsPage from './pages/CampaignsPage.jsx';
import PerformancePage from './pages/PerformancePage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import PayrollPage from './pages/PayrollPage.jsx';
import WithdrawalsPage from './pages/WithdrawalsPage.jsx';
import PaymentHistoryPage from './pages/PaymentHistoryPage.jsx';
// ClientBrokersPage removed - broker assignment integrated into orders workflow
import NotFoundPage from './pages/NotFoundPage.jsx';
import DisclaimerPage from './pages/DisclaimerPage.jsx';
import ReferencePage from './pages/ReferencePage.jsx';

// Component to handle role-based default routing
const RoleBasedRedirect = () => {
  const user = useSelector(selectUser);
  
  if (!user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  // Redirect agents to leads page instead of dashboard
  if (user.role === 'agent') {
    return <Navigate to="/leads" replace />;
  }
  
  // All other roles go to dashboard
  return <Navigate to="/dashboard" replace />;
};

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#dc004e',
      light: '#ff5983',
      dark: '#9a0036',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
  },
});

function AppContent() {
  const dispatch = useDispatch();
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const user = useSelector(selectUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  useEffect(() => {
    if (isAuthenticated && user && !user.eulaAccepted) {
      setDisclaimerOpen(true);
    } else {
      setDisclaimerOpen(false);
    }
  }, [isAuthenticated, user]);
  const handleAgree = () => {
    dispatch(acceptEula());
  };
  return (
    <>
      <Router>
        <Routes>
          {}
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/disclaimer" element={<DisclaimerPage />} />
          {}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<RoleBasedRedirect />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="reference" element={<ReferencePage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="leads" element={<LeadsPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="client-networks" element={<ClientNetworksPage />} />
            <Route path="our-networks" element={<OurNetworksPage />} />
            {/* client-brokers route removed - functionality integrated into orders */}
            <Route path="campaigns" element={<CampaignsPage />} />
            <Route path="performance" element={<PerformancePage />} />
            <Route path="payroll" element={<PayrollPage />} />
            <Route path="withdrawals" element={<WithdrawalsPage />} />
            <Route path="payment-history" element={<PaymentHistoryPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
          {}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Router>
      {}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            theme: {
              primary: 'green',
              secondary: 'black',
            },
          },
        }}
      />
      <DisclaimerModal open={disclaimerOpen} onAgree={handleAgree} />
    </>
  );
}

function App() {
  return (
    <Provider store={store}>
      <PersistGate
        loading={
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="100vh"
          >
            <CircularProgress />
          </Box>
        }
        persistor={persistor}
      >
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <AppContent />
        </ThemeProvider>
      </PersistGate>
    </Provider>
  );
}

export default App;