import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./Layout";
import Admin from "./pages/Admin";
import Loans from "./pages/Loans";
import Repayments from "./pages/Repayments";
import Dashboard from "./pages/Dashboard";

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/loans" element={<Loans />} />
          <Route path="/repayments" element={<Repayments />} />
          <Route path="/" element={<h2>Welcome! Select a menu item.</h2>} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;