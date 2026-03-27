import machine
import time
import json
import binascii
import gc

# Initialize the onboard LED (GP25 on RP2040)
led = machine.Pin(25, machine.Pin.OUT)

# Initialize the Internal Temperature Sensor
sensor_temp = machine.ADC(4)
conversion_factor = 3.3 / (65535)

# Get the Unique ID of your specific chip
uid = binascii.hexlify(machine.unique_id()).decode('utf-8')

print("FIRMWARE_START")

while True:
    # 1. Toggle the LED (On/Off)
    led.toggle()
    
    # 2. Read Temperature
    reading = sensor_temp.read_u16() * conversion_factor
    temperature = 27 - (reading - 0.706)/0.001721
    
    # 3. Create the Data Packet
    data = {
        "id": uid,
        "ts": time.ticks_ms(),
        "led": led.value(),
        "temp": round(temperature, 2),
        "mem": gc.mem_free()
    }
    
    # 4. Print to Serial (This is what the Backend will read)
    # We use a prefix 'DATA:' so the backend can find the right lines
    print("DATA:" + json.dumps(data))
    
    # 5. Wait 500ms
    time.sleep(0.5)