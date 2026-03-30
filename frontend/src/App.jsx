import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Thermometer, Cpu, Activity, ShieldCheck, Zap, Terminal } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import ShrikeBoard from './ShrikeBoard';

function App() {
  const [isLive, setIsLive] = useState(true);
  const [history, setHistory] = useState([]);
  const [seekIndex, setSeekIndex] = useState(0);
  const [chartData, setChartData] = useState([]); // New for Phase 3
  const [command, setCommand] = useState("");     // New for Phase 3
  const [boardData, setBoardData] = useState({
    id: "SEARCHING...",
    ts: 0,
    led: 0,
    temp: 0.0,
    mem: 0
  });


  const [aiResponse, setAiResponse] = useState("SYSTEM READY. AWAITING INPUT...");

  useEffect(() => {
    const interval = setInterval(() => {
      if (isLive) {
        axios.get('http://127.0.0.1:8000/mirror')
          .then(res => {
            setBoardData(res.data);
            // Update chart with live data (keep last 20 points)
            setChartData(prev => [...prev.slice(-19), {
              time: new Date().toLocaleTimeString().split(' ')[0],
              temp: res.data.temp
            }]);
          })
          .catch(err => console.error(err));
      }
    }, 200);

    const historyInterval = setInterval(() => {
      axios.get('http://127.0.0.1:8000/history?limit=50')
        .then(res => setHistory(res.data.reverse()))
        .catch(err => console.error(err));
    }, 5000);

    return () => {
      clearInterval(interval);
      clearInterval(historyInterval);
    };
  }, [isLive]);

  const handleCommand = async (e) => {
    e.preventDefault();
    if (!command.trim()) return; // Don't send empty messages

    const userQuery = command; // Save the message before clearing
    setCommand("");            // Clear the input box so you can type again
    setAiResponse("THINKING...");

    try {
      const res = await axios.post('http://127.0.0.1:8000/ask_ai', { message: userQuery });
      setAiResponse(res.data.response);
    } catch (err) {
      console.error("AI Error:", err);
      setAiResponse("ERROR: COULD NOT REACH BRAIN. CHECK BACKEND TERMINAL.");
    }
  };

  return (
    <div style={{ backgroundColor: '#050505', color: '#00ff99', minHeight: '100vh', padding: '40px', fontFamily: 'monospace' }}>

      {/* HEADER SECTION */}
      <header style={{ borderBottom: '2px solid #333', marginBottom: '30px', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', letterSpacing: '2px' }}>
            SHRIKE-MIRROR // <span style={{ color: '#555' }}>REFLECTION_MODE</span>
          </h1>
          <p style={{ color: '#888', fontSize: '0.8rem', marginTop: '5px' }}>HARDWARE_ID: {boardData.id}</p>
        </div>
        <div style={{ color: isLive ? '#00ff99' : '#ff0033', fontSize: '0.8rem', fontWeight: 'bold' }}>
          {isLive ? "● LIVE_SYNC_ACTIVE" : "○ SYSTEM_PAUSED"}
        </div>
      </header>

      {/* TOP ROW: VIRTUAL BOARD & LIVE CHART */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>

        {/* VIRTUAL BOARD COMPONENT */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Zap size={18} />
            <h3>VIRTUAL_HARDWARE</h3>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
            <ShrikeBoard ledState={boardData.led} />
          </div>
        </div>

        {/* TELEMETRY CHART */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Activity size={18} />
            <h3>THERMAL_TELEMETRY</h3>
          </div>
          <div style={{ height: '200px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="time" hide />
                <YAxis domain={['auto', 'auto']} stroke="#333" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333', color: '#00ff99' }} />
                <Line type="monotone" dataKey="temp" stroke="#00ff99" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* MIDDLE ROW: STAT CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <div style={cardStyle}>
          <h3><Thermometer size={14} /> TEMP</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{boardData.temp}°C</p>
        </div>
        <div style={cardStyle}>
          <h3><Cpu size={14} /> HEAP_FREE</h3>
          <p style={{ fontSize: '1.2rem' }}>{boardData.mem} bytes</p>
        </div>
        <div style={cardStyle}>
          <h3><Activity size={14} /> UPTIME</h3>
          <p style={{ fontSize: '1.2rem' }}>{boardData.ts} ms</p>
        </div>
      </div>

      {/* TIME-TRAVEL DEBUGGER */}
      <div style={{ marginTop: '20px', padding: '20px', background: '#111', borderRadius: '8px', border: '1px solid #222' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <h3 style={{ fontSize: '0.9rem', color: '#888' }}>TIME-TRAVEL_DEBUGGER</h3>
          <button
            onClick={() => setIsLive(!isLive)}
            style={{
              backgroundColor: isLive ? '#333' : '#00ff99',
              color: isLive ? '#888' : 'black', padding: '5px 15px', border: 'none', cursor: 'pointer', fontWeight: 'bold', borderRadius: '4px'
            }}
          >
            {isLive ? "PAUSE TO SEEK" : "RESUME LIVE"}
          </button>
        </div>
        <input
          type="range"
          min="0"
          max={history.length - 1}
          value={seekIndex}
          disabled={isLive}
          onChange={(e) => {
            const idx = e.target.value;
            setSeekIndex(idx);
            const h = history[idx];
            setBoardData({
              id: h.chip_id,
              ts: h.timestamp_ms,
              led: h.led_state,
              temp: h.temperature,
              mem: h.memory_free
            });
          }}
          style={{ width: '100%', accentColor: '#00ff99', cursor: isLive ? 'not-allowed' : 'pointer' }}
        />
      </div>

      {/* AI COMMAND CONSOLE */}
      <div style={{
        background: '#111',
        borderLeft: '4px solid #00ff99',
        padding: '15px',
        marginBottom: '15px',
        fontSize: '0.9rem',
        color: '#ddd',
        lineHeight: '1.4',
        fontStyle: 'italic'
      }}>
        <span style={{ color: '#00ff99', fontWeight: 'bold', marginRight: '10px' }}>GEMINI_VOICE:</span>
        {aiResponse}
        <form onSubmit={handleCommand} style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <Terminal size={20} color="#00ff99" />
          <span style={{ color: '#00ff99', fontWeight: 'bold' }}>GEMINI_LINK:</span>
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="Ask AI to analyze patterns or send commands..."
            style={{ background: 'transparent', border: 'none', color: '#fff', flex: 1, outline: 'none', fontSize: '1rem', fontFamily: 'monospace' }}
          />
        </form>
      </div>

    </div>
  );
}

const cardStyle = {
  background: '#111',
  border: '1px solid #222',
  padding: '20px',
  borderRadius: '8px',
};

export default App;