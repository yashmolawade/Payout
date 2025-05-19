import React from "react";
import "./UniversalLoader.css";

const UniversalLoader = ({ text = "Loading..." }) => {
  return (
    <div className="universal-loader-container">
      <div className="spinner-box">
        <div className="blue-orbit"></div>
        <div className="green-orbit"></div>
        <div className="red-orbit"></div>
        <div className="white-orbit"></div>
        <div className="w-ball"></div>
      </div>
      <div className="universal-loader-text">{text}</div>
    </div>
  );
};

export default UniversalLoader;
