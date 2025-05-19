import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/layout/Layout";
import AuthForm from "../components/auth/AuthForm";
import { useLoading } from "../contexts/LoadingContext";

const Login = () => {
  const { currentUser, loading } = useAuth();
  const [showLoader, setShowLoader] = useState(false);
  const { showLoader: showLoading, hideLoader } = useLoading();

  useEffect(() => {
    // Only set the document title, no more test logs
    document.title = "masaipe - login";
  }, []);

  useEffect(() => {
    if (loading) {
      showLoading("Loading login...");
    } else {
      hideLoader();
    }
  }, [loading, showLoading, hideLoader]);

  // Hide loader on successful login (redirect)
  useEffect(() => {
    if (currentUser) {
      hideLoader();
    }
  }, [currentUser, hideLoader]);

  // Add artificial delay after login is successful
  useEffect(() => {
    if (currentUser && !showLoader) {
      setShowLoader(true);
      setTimeout(() => {
        setShowLoader(false);
      }, 3000);
    }
  }, [currentUser]);

  if (loading) {
    return null;
  }

  if (showLoader) {
    return null;
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
