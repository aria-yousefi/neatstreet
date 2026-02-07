import { useEffect, useState } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import icon from '../assets/green_icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    iconSize: [25, 41], // size of the icon
    iconAnchor: [12, 41], // point of the icon which will correspond to marker's location
    shadowUrl: iconShadow
});

L.Marker.prototype.options.icon = DefaultIcon;

var OpenStreetMap_Mapnik = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
	maxZoom: 19,
	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});

function ReportsMap(props) {
  const { reports = [] } = props || {};
  const [position, setPosition] = useState(null);
  const [seattleReports, setSeattleReports] = useState([]);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude]);
      },
      (err) => {
        console.error('Geolocation error:', err);
        alert('Unable to retrieve your location. Using default location.');
      }
    );
  }, []);

    // Fetch Seattle 311 data from Flask
  useEffect(() => {
    fetch('http://127.0.0.1:5000/seattle_reports') // change to your backend URL
      .then((res) => res.json())
      .then((data) => setSeattleReports(data))
      .catch((err) => console.error('Error fetching Seattle data:', err));
  }, []);

  if (!position) {
    return <p>Loading map...</p>;
  }
     

    return(
      
    <MapContainer center={position} zoom={13} className ="h-screen w-screen z-0">
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {reports.map((report, index) => (
        <Marker key={index} position={[report.latitude, report.longitude]}>
          <Popup>
            <img 
              src={`/uploads/${report.image_filename}`} 
              alt={report.issue_type} 
              style={{ maxWidth: '300px', display: 'block', marginBottom: '0.5rem' }} 
            />
            <strong>{report.issue_type}</strong><br />
            {report.address}
          </Popup>
        </Marker>
      ))}

      {/* Seattle open-data reports */}
      {seattleReports.map((report, index) => (
        <Marker key={`seattle-${index}`} position={[report.lat, report.lng]}>
          <Popup>
            <strong>Type:</strong> {report.type}<br />
            <strong>Status:</strong> {report.status}<br />
            <strong>Date:</strong> {report.created_date}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
    );
}



export default ReportsMap;

