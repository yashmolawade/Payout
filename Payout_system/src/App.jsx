import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { lazyLoad } from "./utils/lazyImport.jsx";

// Use improved lazy loading with error boundaries
const LandingPage = lazyLoad(() => import("./pages/LandingPage"));
const Home = lazyLoad(() => import("./pages/Home"));
const Login = lazyLoad(() => import("./pages/Login"));
const Register = lazyLoad(() => import("./pages/Register"));

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
            <Route path="/" element={<LandingPage />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
