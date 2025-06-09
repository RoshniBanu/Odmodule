import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { AuthProvider } from "./contexts/AuthContext";
import theme from "./theme";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";
import ODRequestForm from "./components/ODRequestForm";
import ODRequestList from "./components/ODRequestList";
import FacultyODRequestList from "./components/FacultyODRequestList";
import LandingPage from "./components/LandingPage";
import { useAuth } from "./contexts/AuthContext";
import PrivateRoute from "./components/PrivateRoute";
import "./styles/components.css"; 

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" />;
  }

  return children;
};

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Router
            future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
          >
            <Routes>
              {}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/" element={<LandingPage />} />

              {}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              {}
              <Route
                path="/student/od-request"
                element={
                  <ProtectedRoute allowedRoles={["student"]}>
                    <ODRequestForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/my-requests"
                element={
                  <ProtectedRoute allowedRoles={["student"]}>
                    <ODRequestList />
                  </ProtectedRoute>
                }
              />

              {}
              <Route
                path="/faculty/od-requests"
                element={
                  <ProtectedRoute allowedRoles={["faculty"]}>
                    <FacultyODRequestList />
                  </ProtectedRoute>
                }
              />

              {}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Router>
        </LocalizationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
