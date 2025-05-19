import React, { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/layout/Layout";
import AuthForm from "../components/auth/AuthForm";
import { useLoading } from "../contexts/LoadingContext";

const Register = () => {
  const { currentUser, loading } = useAuth();
  const { showLoader, hideLoader } = useLoading();

  useEffect(() => {
    if (loading) {
      showLoader("Loading registration...");
    } else {
      hideLoader();
    }
  }, [loading, showLoader, hideLoader]);

  // Hide loader on successful register (redirect)
  useEffect(() => {
    if (currentUser) {
      hideLoader();
    }
  }, [currentUser, hideLoader]);

  if (loading) {
    return null;
  }

  if (currentUser) {
    return <Navigate to="/" />;
  }

  return (
    <Layout>
      <AuthForm isLogin={false} />
    </Layout>
  );
};

export default Register;
