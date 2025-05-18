import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/layout/Layout";
import AuthForm from "../components/auth/AuthForm";
import Loader3D from "../components/common/Loader3D";

const Login = () => {
  const { currentUser, loading } = useAuth();
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    // Only set the document title, no more test logs
    document.title = "masaipay - login";
  }, []);

  // Add artificial delay after login is successful
  useEffect(() => {
    if (currentUser && !showLoader) {
      setShowLoader(true);
      // This timeout will keep showing the loader for 3 seconds
      setTimeout(() => {
        setShowLoader(false);
      }, 3000);
    }
  }, [currentUser]);

  if (loading) {
    return <Loader3D text="Loading login..." />;
  }

  // Show loader for 3 seconds after successful login
  if (showLoader) {
    return <Loader3D text="Preparing your dashboard..." />;
  }

  if (currentUser) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Layout>
      <AuthForm isLogin={true} />
    </Layout>
  );
};

export default Login;
