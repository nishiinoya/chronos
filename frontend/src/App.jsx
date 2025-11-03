import { useEffect, useState } from "react";
export default function App() {
  const [status, setStatus] = useState("checking...");
  useEffect(() => {
    const API = import.meta.env.VITE_API_URL || "http://localhost:4000";
    fetch(`${API}/health`)
      .then(r => r.json())
      .then(d => setStatus(JSON.stringify(d)))
      .catch(e => setStatus("Error: " + e.message));
  }, []);
  return <div style={{padding:24,fontFamily:"system-ui"}}>
    <h1>Chronos frontend</h1>
    <p>Backend status: {status}</p>
  </div>;
}
