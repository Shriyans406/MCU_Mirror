import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

model = genai.GenerativeModel('models/gemini-2.5-flash')
try:
    res = model.generate_content("hello")
    print("SUCCESS", res.text)
except Exception as e:
    import traceback
    traceback.print_exc()
