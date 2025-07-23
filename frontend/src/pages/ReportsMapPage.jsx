import { useEffect, useState } from 'react';
import axios from 'axios';
import ReportsMap from '../components/ReportsMap';

function ReportsMapPage() {
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
        <ReportsMap reports={reports} />
    </div>
  );
};

export default ReportsMapPage;