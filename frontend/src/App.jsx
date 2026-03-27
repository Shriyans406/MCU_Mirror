import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Thermometer, Cpu, Activity, ShieldCheck } from 'lucide-react';

function App() {
  const [boardData, setBoardData] = useState({
    id: "SEARCHING...",
    ts: 0,
    led: 0,
    temp: 0.0,
    mem: 0
  });

  // This "Effect" runs every 200ms to pull data from Python
  useEffect(() => {
    const interval = setInterval(() => {
      axios.get('http://127.0.0.1:8000/mirror')
        .then(res => {
          setBoardData(res.data);
        })
        .catch(err => console.error("Backend unreachable. Is main.py running?"));
    }, 200); // 5 times per second sync

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      backgroundColor: '#0a0a0a',
      color: '#00ff99',
      minHeight: '100vh',
      padding: '40px',
      fontFamily: 'monospace'
    }}>
      {/* HEADER SECTION */}
      <header style={{ borderBottom: '2px solid #333', marginBottom: '30px', paddingBottom: '10px' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', letterSpacing: '2px' }}>
          SHRIKE-MIRROR // <span style={{ color: '#555' }}>V1.0</span>
        </h1>
        <p style={{ color: '#888', fontSize: '0.8rem' }}>HARDWARE_ID: {boardData.id}</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>

        {/* VIRTUAL LED CARD */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={18} />
            <h3>USER_LED (GP0)</h3>
          </div>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              margin: 'auto',
              backgroundColor: boardData.led ? '#ff0033' : '#222',
              boxShadow: boardData.led ? '0 0 30px #ff0033' : 'none',
              transition: 'all 0.05s ease-in-out',
              border: '2px solid #444'
            }}></div>
            <p style={{ marginTop: '15px', color: boardData.led ? '#ff0033' : '#444' }}>
              {boardData.led ? 'STATUS: HIGH' : 'STATUS: LOW'}
            </p>
          </div>
        </div>

        {/* TEMPERATURE CARD */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Thermometer size={18} />
            <h3>CORE_TEMP</h3>
          </div>
          <p style={{ fontSize: '3rem', fontWeight: 'bold', margin: '10px 0' }}>
            {boardData.temp}<span style={{ fontSize: '1rem' }}>°C</span>
          </p>
          <div style={{ width: '100%', height: '5px', backgroundColor: '#222' }}>
            <div style={{
              width: `${(boardData.temp / 50) * 100}%`,
              height: '100%',
              backgroundColor: '#00ff99'
            }}></div>
          </div>
        </div>

        {/* MEMORY CARD */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Cpu size={18} />
            <h3>FREE_HEAP</h3>
          </div>
          <p style={{ fontSize: '1.5rem', margin: '15px 0' }}>{boardData.mem} bytes</p>
          <p style={{ color: '#555', fontSize: '0.7rem' }}>UPTIME_MS: {boardData.ts}</p>
        </div>

      </div>

      {/* SYSTEM STATUS FOOTER */}
      <footer style={{ marginTop: '50px', borderTop: '1px solid #222', paddingTop: '10px', display: 'flex', gap: '20px' }}>
        <div style={{ color: '#00ff99', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '8px', height: '8px', backgroundColor: '#00ff99', borderRadius: '50%' }}></div>
          LIVE_SYNC_ACTIVE
        </div>
      </footer>
    </div>
  );
}

// Styling for the cards
const cardStyle = {
  background: '#111',
  border: '1px solid #222',
  padding: '20px',
  borderRadius: '8px',
  position: 'relative',
  overflow: 'hidden'
};

export default App;