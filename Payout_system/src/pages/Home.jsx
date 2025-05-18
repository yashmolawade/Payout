import React, { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/layout/Layout";
import AdminDashboard from "../components/dashboard/AdminDashboard";
import MentorDashboard from "../components/dashboard/MentorDashboard";
import Loader3D from "../components/common/Loader3D";

const Home = () => {
  const { userData, loading } = useAuth();

  useEffect(() => {
    document.title = "masaipay - dashboard";
  }, []);

  if (loading) {
    return <Loader3D text="Loading Dashboard..." />;
  }

  if (!userData) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout>
      {userData.role === "admin" ? <AdminDashboard /> : <MentorDashboard />}
    </Layout>
  );
};

export default Home;
