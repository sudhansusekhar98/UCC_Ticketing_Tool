import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import useAuthStore from './context/authStore';
import useThemeStore from './context/themeStore';
import signalRService from './services/signalr';

// Layout
import Layout from './components/layout/Layout';

// Pages
import Login from './pages/auth/Login';
import Dashboard from './pages/dashboard/Dashboard';
import TicketsList from './pages/tickets/TicketsList';
import TicketDetail from './pages/tickets/TicketDetail';
import TicketForm from './pages/tickets/CreateTicket';
import SitesList from './pages/sites/SitesList';
import SiteForm from './pages/sites/SiteForm';
import AssetsList from './pages/assets/AssetsList';
import AssetForm from './pages/assets/AssetForm';
import UsersList from './pages/users/UsersList';
import UserForm from './pages/users/UserForm';
import UserRights from './pages/admin/UserRights';
import Settings from './pages/settings/Settings';
import Profile from './pages/profile/Profile';
import NotificationsManagement from './pages/notifications/NotificationsManagement';
import NotificationsList from './pages/notifications/NotificationsList';

// Protected Route Component
function ProtectedRoute({ children, allowedRoles, requiredRight }) {
  const { isAuthenticated, user, hasRole, hasRightForAnySite } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles || requiredRight) {
    const roleMatch = !allowedRoles || hasRole(allowedRoles);
    const permissionMatch = !requiredRight || hasRightForAnySite(requiredRight);

    if (!roleMatch && !permissionMatch) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <Layout>{children}</Layout>;
}

// Public Route Component
function PublicRoute({ children }) {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function App() {
  const { isAuthenticated, accessToken, user } = useAuthStore();
  const { initTheme, setupSystemThemeListener, setTheme } = useThemeStore();

  // Sync theme from user preferences
  useEffect(() => {
    if (isAuthenticated && user?.preferences?.theme) {
      setTheme(user.preferences.theme);
    }
  }, [isAuthenticated, user, setTheme]);


  // Initialize theme on app load
  useEffect(() => {
    initTheme();
    const cleanup = setupSystemThemeListener();
    return cleanup;
  }, [initTheme, setupSystemThemeListener]);

  // Connect to SignalR when authenticated
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      signalRService.start(accessToken);

      // Set up notification handlers
      signalRService.onTicketCreated((ticketNumber, priority) => {
        console.log('New ticket created:', ticketNumber, priority);
      });

      signalRService.onTicketAssigned((ticketNumber) => {
        console.log('Ticket assigned to you:', ticketNumber);
      });
    }

    return () => {
      if (!isAuthenticated) {
        signalRService.stop();
      }
    };
  }, [isAuthenticated, accessToken]);


  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-lg)',
          },
          success: {
            iconTheme: {
              primary: 'var(--success-500)',
              secondary: 'white',
            },
          },
          error: {
            iconTheme: {
              primary: 'var(--danger-500)',
              secondary: 'white',
            },
          },
        }}
      />

      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Tickets */}
          <Route
            path="/tickets"
            element={
              <ProtectedRoute>
                <TicketsList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tickets/new"
            element={
              <ProtectedRoute 
                allowedRoles={['Admin', 'Supervisor', 'Dispatcher']}
                requiredRight="CREATE_TICKET"
              >
                <TicketForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tickets/:id"
            element={
              <ProtectedRoute>
                <TicketDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tickets/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Supervisor', 'Dispatcher']}>
                <TicketForm />
              </ProtectedRoute>
            }
          />

          {/* Sites */}
          <Route
            path="/sites"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Supervisor', 'Dispatcher', 'L1Engineer', 'L2Engineer']}>
                <SitesList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sites/new"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Supervisor']}>
                <SiteForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sites/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Supervisor']}>
                <SiteForm />
              </ProtectedRoute>
            }
          />

          {/* Assets */}
          <Route
            path="/assets"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Supervisor', 'Dispatcher', 'ClientViewer', 'L1Engineer', 'L2Engineer']}>
                <AssetsList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assets/new"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Supervisor']}>
                <AssetForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assets/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Supervisor']}>
                <AssetForm />
              </ProtectedRoute>
            }
          />

          {/* Users */}
          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Supervisor', 'L1Engineer', 'L2Engineer']}>
                <UsersList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users/new"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <UserForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <UserForm />
              </ProtectedRoute>
            }
          />

          {/* User Rights */}
          <Route
            path="/user-rights"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <UserRights />
              </ProtectedRoute>
            }
          />

          {/* Settings */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />

          {/* Notifications Management - Admin Only */}
          <Route
            path="/notifications/manage"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <NotificationsManagement />
              </ProtectedRoute>
            }
          />

          {/* Notifications List - All Users */}
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationsList />
              </ProtectedRoute>
            }
          />

          {/* Profile */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;

