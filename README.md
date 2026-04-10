# Shrike-Mirror Digital Twin

## Project Overview
The Shrike-Mirror project is a "Digital Twin" application. It connects physical hardware (an RP2040-based microcontroller called Shrike Lite) to a web-based dashboard in real-time. This allows users to monitor the physical state of the board, view historical data, and interact with the hardware using natural language powered by artificial intelligence.

The primary objective of this project is to provide a seamless bridge between embedded hardware and modern web technologies, enabling intelligent monitoring, debugging, and command execution through a central interface.

## Architecture and Components
The project is built using a modern, three-tier architecture:

### 1. MCU (Microcontroller Unit) Firmware
- **Location:** `mcu/main.py`
- **Language:** MicroPython
- **Hardware:** RP2040 (Shrike Lite board)
- **Functionality:** 
  The script runs directly on the microcontroller. It continuously reads the internal temperature sensor, monitors the available memory (heap), and toggles the state of the onboard LED. Every 500 milliseconds, it constructs a JSON packet containing the chip's unique ID, timestamp, LED state, temperature, and free memory, and sends this data over the serial connection with a specific prefix `DATA:`.

### 2. Backend Server
- **Location:** `backend/main.py`
- **Language/Framework:** Python, FastAPI
- **Database:** SQLite
- **Functionality:**
  The backend acts as the central hub. It runs a background thread that connects to the hardware via a USB Serial port using the `pyserial` library. 
  - **Serial Listener:** It constantly listens for incoming `DATA:` packets from the hardware, parses the JSON, and updates the "latest state" in memory.
  - **Database Persistence:** It stores all incoming telemetry data into a local SQLite database (`shrike_history.db`) for historical tracking.
  - **REST API Endpoints:** It exposes endpoints for the frontend to fetch the latest live data (`/mirror`), retrieve historical data (`/history`), and verify connections (`/handshake`).
  - **AI Integration:** Through the `/ask_ai` endpoint, it connects to Google's Gemini application programming interface. It feeds the recent board history and user questions into the AI prompt. If the AI determines a command needs to be sent (such as blinking an LED), the backend forwards this command over the serial connection to the physical board.

### 3. Frontend Web Interface
- **Location:** `frontend/` (Specifically `src/App.jsx` and `src/ShrikeBoard.jsx`)
- **Language/Framework:** JavaScript, React, Vite
- **Functionality:**
  The frontend is a visual dashboard that humans interact with. 
  - **Live Dashboard:** It polls the backend every 200 milliseconds to update a visual representation of the hardware, numeric readouts, and a live tracking line graph showing the temperature profile over time.
  - **Virtual Hardware:** An SVG-based dynamic graphic (`ShrikeBoard.jsx`) mirrors the physical board, visually indicating the active LED state.
  - **Time-Travel Debugger:** A slider that allows the user to pause the live feed and scrub through historical states fetched from the database, effectively seeing what the board was doing in the past.
  - **AI Console:** A terminal-like interface where the user can type natural language instructions or questions ("Is the board overheating?", "Check the LED state"). The frontend displays the AI's intelligent responses.

## Setup and Usage

### Requirements
- Python 3.x
- Node.js and npm (or Bun)
- A connected RP2040 board with the MicroPython firmware loaded.
- A Gemini API Key placed in a `.env` file in the `backend` directory.

### Running the System
1. **Hardware:** Flash the micro-python script to the RP2040 and plug it into your computer via USB (ensure it matches the COM port specified in the backend script).
2. **Backend:** Navigate to the `backend` directory, install the required python packages (`fastapi`, `uvicorn`, `pyserial`, `google-generativeai`, `python-dotenv`), and start the server using Uvicorn.
3. **Frontend:** Navigate to the `frontend` directory, install the node modules using your package manager, and run the development server via Vite.

Once all components are running, you can open the frontend dashboard in your browser to monitor the board and interact with the AI assistant.
