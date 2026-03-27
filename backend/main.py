import serial
import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import threading

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
                    print(f"SYNC -> Temp: {latest_state['temp']}°C | LED: {latest_state['led']}")
                except:
                    print("Error parsing JSON")
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