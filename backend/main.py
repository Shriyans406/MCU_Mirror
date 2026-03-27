import serial
import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import threading
import sqlite3
from typing import Optional


# 1. SETUP THE API
app = FastAPI()

# Allow the Frontend to talk to the Backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_credentials=True,
    allow_headers=["*"],
)

# 2. SERIAL CONFIGURATION
# !!! CHANGE 'COM3' TO YOUR PORT FROM THONNY !!!
SERIAL_PORT = 'COM5' 
BAUD_RATE = 115200

# This variable holds the "Mirror" of your board
latest_state = {
    "id": "OFFLINE",
    "ts": 0,
    "led": 0,
    "temp": 0.0,
    "mem": 0
}

# 1. Initialize Database
DB_NAME = "shrike_history.db"

def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    # Create the history table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS telemetry (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chip_id TEXT,
            timestamp_ms INTEGER,
            led_state INTEGER,
            temperature REAL,
            memory_free INTEGER,
            received_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

# Run the initialization
init_db()

def listen_to_board():
    """This function runs in the background and listens to the USB port"""
    global latest_state
    try:
        # Open the connection
        ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
        print(f"SUCCESS: Connected to Shrike on {SERIAL_PORT}")
        
        while True:
            line = ser.readline().decode('utf-8').strip()
            print(f"RAW_DEBUG: '{line}'")
            # Look for our 'DATA:' prefix
            if line.startswith("DATA:"):
                json_str = line.replace("DATA:", "")
                try:
                    latest_state = json.loads(json_str)
                    
                    # --- NEW: SAVE TO DATABASE ---
                    conn = sqlite3.connect(DB_NAME)
                    cursor = conn.cursor()
                    cursor.execute('''
                        INSERT INTO telemetry (chip_id, timestamp_ms, led_state, temperature, memory_free)
                        VALUES (?, ?, ?, ?, ?)
                    ''', (
                        latest_state['id'], 
                        latest_state['ts'], 
                        latest_state['led'], 
                        latest_state['temp'], 
                        latest_state['mem']
                    ))
                    conn.commit()
                    conn.close()
                    # -----------------------------

                    print(f"SAVED -> Temp: {latest_state['temp']}°C")
                except Exception as e:
                    print(f"Database Error: {e}")
    except Exception as e:
        print(f"SERIAL ERROR: {e}")

# 3. START THE BACKGROUND LISTENER
thread = threading.Thread(target=listen_to_board, daemon=True)
thread.start()

# 4. API ENDPOINT FOR THE FRONTEND
@app.get("/mirror")
async def get_mirror():
    """The React app will call this to get the latest board state"""
    return latest_state

@app.get("/handshake")
async def handshake():
    """Returns the unique hardware ID to 'lock' the session"""
    return {"chip_id": latest_state.get("id", "UNKNOWN")}

@app.get("/history")
async def get_history(limit: int = 100):
    """Returns the last 100 recorded ticks for the UI seek bar"""
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row # This makes results look like dictionaries
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM telemetry ORDER BY id DESC LIMIT ?', (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.get("/seek/{record_id}")
async def seek_to_record(record_id: int):
    """Returns a specific historical 'tick' by its ID"""
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM telemetry WHERE id = ?', (record_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return {"error": "Record not found"}