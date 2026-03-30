import serial
import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import threading
import sqlite3
from typing import Optional
import google.generativeai as genai

import os
from dotenv import load_dotenv

load_dotenv()

# 1. SETUP THE API
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_credentials=True,
    allow_headers=["*"],
)

# 2. SERIAL CONFIGURATION
SERIAL_PORT = 'COM5' 
BAUD_RATE = 115200

# --- GEMINI AI SETUP ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Check if the key exists before starting
if not GEMINI_API_KEY:
    print("CRITICAL ERROR: GEMINI_API_KEY not found in .env file!")
else:
    genai.configure(api_key=GEMINI_API_KEY)

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('models/gemini-2.0-flash')

SYSTEM_PROMPT = """
You are an Embedded Systems Expert for the Shrike-Mirror Digital Twin project.
Your job is to analyze telemetry from an RP2040 (Shrike Lite) board.
You will receive JSON data containing temperature, LED state, and memory.
1. If the user asks a question, explain the hardware state in plain English.
2. If you see a thermal spike (>40C), warn them about potential overheating.
3. If the user gives a command like 'blink', include the word BLINK in your response.
Keep responses concise and professional.
"""

latest_state = {
    "id": "OFFLINE",
    "ts": 0,
    "led": 0,
    "temp": 0.0,
    "mem": 0
}

# --- GLOBAL SERIAL OBJECT (Required for AI to send commands) ---
ser = None 

DB_NAME = "shrike_history.db"

def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
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

init_db()

def listen_to_board():
    global latest_state, ser
    print(f"--- ATTEMPTING TO OPEN {SERIAL_PORT} ---")
    try:
        ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
        print(f"SUCCESS: Connected to Shrike on {SERIAL_PORT}")
        
        while True:
            # Read a line from the board
            raw_line = ser.readline()
            
            # 1. DEBUG: Show us what the board is sending (RAW BYTES)
            if raw_line:
                try:
                    line = raw_line.decode('utf-8').strip()
                    print(f"DEBUG_INCOMING: '{line}'") # This will show in your terminal
                    
                    if line.startswith("DATA:"):
                        json_str = line.replace("DATA:", "")
                        latest_state = json.loads(json_str)
                        print(f"STATE_UPDATED: Temp={latest_state['temp']}")
                    else:
                        print("SKIP: Line did not start with 'DATA:'")
                except Exception as decode_err:
                    print(f"DECODE_ERROR: {decode_err}")
            else:
                # If raw_line is empty, the board isn't sending anything
                print("WAITING: No data received in last 1 second...")
                
    except Exception as e:
        print(f"SERIAL_CRASH: {e}")

thread = threading.Thread(target=listen_to_board, daemon=True)
thread.start()

@app.get("/mirror")
async def get_mirror():
    return latest_state

@app.get("/handshake")
async def handshake():
    return {"chip_id": latest_state.get("id", "UNKNOWN")}

@app.get("/history")
async def get_history(limit: int = 100):
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM telemetry ORDER BY id DESC LIMIT ?', (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

# 2. ADDED HOME ROUTE (To stop the "Not Found" error)
@app.get("/")
async def root():
    return {"status": "Shrike-Mirror Backend is Running", "check_data_at": "/mirror"}

@app.post("/ask_ai")
async def ask_ai(payload: dict):
    global ser
    user_message = payload.get("message", "")
    
    try:
        # Fetch history
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()
        cursor.execute('SELECT temperature, led_state FROM telemetry ORDER BY id DESC LIMIT 5')
        history = cursor.fetchall()
        conn.close()

        # Build context
        context = f"Board History: {history}\nUser Message: {user_message}"
        
        # We use a try block specifically for the AI generation
        try:
            response = model.generate_content([SYSTEM_PROMPT, context])
            ai_text = response.text
        except Exception as model_err:
            print(f"MODEL_NAME_ERROR: {model_err}")
            # Fallback to standard pro model if flash fails
            temp_model = genai.GenerativeModel('gemini-pro')
            response = temp_model.generate_content([SYSTEM_PROMPT, context])
            ai_text = response.text

        # Command Logic
        if "BLINK" in ai_text.upper():
            if ser and ser.is_open:
                ser.write(b"BLINK\n")
                print("AI EXECUTED BLINK")

        return {"response": ai_text}

    except Exception as e:
        print(f"GENERAL_AI_CRASH: {e}")
        return {"response": f"AI_OFFLINE: {str(e)}"}