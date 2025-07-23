import { useState } from 'react';
import axios from 'axios';
import gsap from 'gsap';
import { useLayoutEffect, useRef } from 'react';

function ReportForm() {
  const [image, setImage] = useState(null);
  const [report, setReport] = useState(null);

  const handleUpload = () => {
    if (!image) return alert("Upload an image first");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const formData = new FormData();
        formData.append('image', image);
        formData.append('lat', position.coords.latitude);
        formData.append('lon', position.coords.longitude);

        axios.post('http://localhost:5000/report', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        .then(res => setReport(res.data))
        .catch(err => {
          // Try to show backend error message if available
          const backendMsg = err.response?.data?.error || err.response?.data?.message;
          alert('Error uploading report: ' + (backendMsg || err.message));
          console.error('Upload error:', err);
        });
      },
      (error) => {
        alert('Geolocation error: ' + error.message);
      }
    );
  };

  
  const comp = useRef(null);
  useLayoutEffect(() => {
    let ctx = gsap.context(() => {
      const t1 = gsap.timeline()
      t1.from("#intro-slide", {
        duration: 1.3,
      }).from("#intro-text", {
        opacity: 0,
        y: "+=30",
      }).to("#intro-text", {
        opacity: 0,
        y: "-=30",
        delay: 0.3,
      }).to("#intro-slide", {
        opacity: 0,
        duration: 0,
        onComplete: () => {
          document.getElementById("intro-slide").style.display = "none";
        }
      })
    }, comp);

    return () => ctx.revert();
  
  }, []);

  return (
    <div className="relative" ref={comp}>
      <div className="h-screen p-10 bg-green-50 absolute top-0 left-0 font-titillium z-10 w-full flex tracking-tight" id="intro-slide">
          <h1 className="text-9xl text-green-700 justify-center" id="intro-text">Let's keep your city clean.</h1>
      </div>

        <div className="mt-10 mx-auto max-w-md p-4 bg-green-200 shadow-md rounded-lg">
        <h2 className="text-2xl font-titillium text-green-700 mb-4">Submit a New Report</h2>
        <input className="mb-3 font-titillium" type="file" accept="image/*" onChange={e => setImage(e.target.files[0])} />
        <button class="bg-green-500 hover:bg-green-700 text-white font-titillium py-2 px-4 rounded-xl" onClick={handleUpload}>
            Submit Report
        </button>

        {report && (
            <div className="mt-6 p-4 bg-green-50 shadow-md rounded-lg font-titillium text-green-700 mb-4 text-xl">
            <h3>Report Summary</h3>
            <img src={report.image_url} alt={report.issue_type} className="justify-center"/>
            <p><strong>Issue:</strong> {report.issue_type}</p>
            <p><strong>Address:</strong> {report.address}</p>
            </div>
        )}
        </div>
    </div>
  );
}

export default ReportForm;
