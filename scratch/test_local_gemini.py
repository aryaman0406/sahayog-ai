import google.generativeai as genai
import sys
import os

# Configure output encoding for Windows terminal
sys.stdout.reconfigure(encoding='utf-8')

# Read key from environment variable or placeholder
API_KEY = os.environ.get("GEMINI_API_KEY", "YOUR_API_KEY_HERE")

print("Initializing Gemini API connection...")
genai.configure(api_key=API_KEY)

try:
    print("Testing connection with model: gemini-flash-latest...")
    model = genai.GenerativeModel("gemini-flash-latest")
    response = model.generate_content("Explain how AI works in 5 words.")
    print("Successfully connected!")
    print(f"Gemini Response: {response.text.strip()}")
except Exception as e:
    print(f"Failed to connect or generate content: {e}")
