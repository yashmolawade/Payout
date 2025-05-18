import React from "react";
import Navbar from "./Navbar";
import "./Layout.css";

const Layout = ({ children }) => {
  return (
    <div className="layout">
      <Navbar />
      <main className="main-content">
        <div className="container">{children}</div>
      </main>
      <footer className="footer">
        <div className="container">
          <p>
            &copy; {new Date().getFullYear()} MentorPay. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
