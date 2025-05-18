import React, { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/layout/Layout";
import AuthForm from "../components/auth/AuthForm";
import Loader3D from "../components/common/Loader3D";

const Register = () => {
  const { currentUser, loading } = useAuth();

  useEffect(() => {
    // Update document title
    document.title = "masaipay - register";
  }, []);

  if (loading) {
    return <Loader3D text="Loading registration..." />;
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
