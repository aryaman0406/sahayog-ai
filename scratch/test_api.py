import urllib.request
import json
import sys

# Set output encoding to UTF-8 to prevent Windows terminal print crashes
sys.stdout.reconfigure(encoding='utf-8')

url = "https://sahayog-ai-backend.onrender.com/api/chat/"
headers = {"Content-Type": "application/json"}

# Test case 1: Ask for a creative response (Gemini only)
payload_poem = {
    "message": "Write a one-sentence poem about Atal Pension Yojana.",
    "profile": {
        "age": 30,
        "income": 150000,
        "occupation": "farmer"
    },
    "session_id": "test_session_1",
    "language": "en"
}

# Test case 2: Ask about a specific query in Hindi
payload_hindi = {
    "message": "NPS क्या है और क्या यह APY से अलग है?",
    "profile": {},
    "session_id": "test_session_2",
    "language": "hi"
}

def make_request(payload, label):
    print(f"\n--- Running Test: {label} ---")
    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            print(f"User Query: {payload['message']}")
            print(f"Bot Reply: {res_data.get('reply', '')}")
            print(f"Schemes Used: {res_data.get('schemes_used', [])}")
    except Exception as e:
        print(f"Error making request: {e}")

make_request(payload_poem, "Poem Generation (Tests if Gemini is active)")
make_request(payload_hindi, "Hindi Contextual Query (Tests search & language)")
