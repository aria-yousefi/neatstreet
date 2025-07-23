import React, {useState, useLayoutEffect, useRef} from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import gsap from 'gsap';

import UserReportsPage from './pages/UserReportsPage';
import ReportIssue from './pages/ReportIssue';
import ReportsMapPage from './pages/ReportsMapPage';
import NavBar from './components/NavBar';
import './App.css';
import './index.css';


function App() {

  return (
      <Router>
        <div>
          <NavBar />
          <div style={{ marginTop: 20 }}>
            <Routes>
              <Route path="/" element={<ReportIssue />} />
              <Route path="/user_reports" element={<UserReportsPage />} />
              <Route path="/reports_map" element={<ReportsMapPage />} />
            </Routes>
          </div>
        </div>
      </Router>
  );
};

export default App;