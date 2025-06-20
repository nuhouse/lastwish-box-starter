import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Homepage from "./components/Homepage";
import './App.css';

function App() {
  // Just hardcode "logged in" for now to simplify debugging
  return (
    <Router>
      <div className="app-root">
        <Sidebar />
        <div className="content">
          <div className="app-header">
            <img src="/logo-placeholder.png" alt="Logo" style={{ width: 44, height: 44, marginRight: 10 }} />
            <span style={{ fontWeight: "bold", fontSize: "1.3rem", letterSpacing: 1 }}>Lastwish Box</span>
          </div>
          <Routes>
            <Route path="/" element={<Homepage />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
