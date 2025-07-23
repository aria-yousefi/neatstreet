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
            <strong>{report.issue_type}</strong><br />
            {report.address}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
    );
}



export default ReportsMap;

