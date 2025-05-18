import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Loader3D from "../common/Loader3D";

const ProtectedRoute = ({ children, requiredRole }) => {
  const { currentUser, userData, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Loader3D text="Authenticating..." />;
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && userData?.role !== requiredRole) {
    const redirectPath = userData?.role === "admin" ? "/admin" : "/mentor";
    return <Navigate to={redirectPath} replace />;
  }

  return children;
};

export default ProtectedRoute;
