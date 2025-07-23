import React, { useEffect, useState } from 'react';
import axios from 'axios';

function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReports() {
      try {
        const response = await axios.get('/user_reports'); 
        setReports(response.data);
      } catch (error) {
        console.error("Failed to load reports", error);
      } finally {
        setLoading(false);
      }
    }
    fetchReports();
  }, []);

  if (loading) return <div>Loading your reports...</div>;

  if (!reports.length) return <div>No reports found.</div>;

  return (
    <div>
      <h1 className="font-titillium text-green-700 text-2xl m-4">My Reports</h1>
      <ul style={{ listStyleType: 'none', padding: 0 }}>
        {reports.map(report => (
          <li key={report.id} className="mb-4 p-4 bg-green-200 rounded-lg shadow-md font-titillium w-full">
            <img 
              src={`/uploads/${report.image_filename}`} 
              alt={report.issue_type} 
              style={{ maxWidth: '300px', display: 'block', marginBottom: '0.5rem' }} 
            />
            <div className="font-titillium text-green-700 text-xl"><strong>Issue:</strong> {report.issue_type}</div>
            <div className="font-titillium text-green-700 text-xl"><strong>Address:</strong> {report.address}</div>
            <div className="font-titillium text-green-700 text-xl"><strong>Date and Time:</strong> {new Date(report.timestamp).toLocaleString()}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ReportsPage;
