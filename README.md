# Sahayog AI — Government Schemes, Simplified

A full-stack platform to help Indian citizens discover and apply for government welfare schemes using semantic search and Generative AI (RAG).

<img width="1900" height="967" alt="image" src="https://github.com/user-attachments/assets/9ad85926-bb5f-45ef-9ec2-b62ce29b0eee" />

## Tech Stack
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![ChromaDB](https://img.shields.io/badge/ChromaDB-FF4F00?style=for-the-badge)
![Gemini AI](https://img.shields.io/badge/Google_Gemini-4285F4?style=for-the-badge&logo=google)

## Features
- **Semantic & Hybrid Search**: Uses Sentence Transformers and BM25-style logic to find schemes based on profiles.
- **AI Assistant**: A Gemini-powered RAG assistant providing context-aware guidance in English and Hindi.
- **Dynamic Eligibility Matching**: Scores user profiles against specific scheme requirements.
- **User Dashboard**: Save favorite schemes and view personalized analytics.

## Setup Instructions

### 1. Backend Setup
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate
pip install -r requirements.txt
```

Set up your `.env` file based on `.env.example` or the default parameters. Make sure MongoDB is running locally on port 27017 or update your `MONGO_URI`.

Run the backend server:
```powershell
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup
```powershell
cd frontend
npm install
npm run dev
```
The frontend will start at `http://localhost:5173`.

## Adding Real Scheme Data
To populate the database with the full dataset:
1. Replace `backend/app/data/schemes.json` with your 700+ schemes dataset (make sure it matches the structure in `sample_schemes.json`).
2. Make a GET request to `http://localhost:8000/api/schemes/admin/rebuild-index` with the header `X-Admin-Key: sahayog_admin_123`.

## Architecture Diagram
```
User (Browser)
   │
   ▼
[ React Frontend ]
   │
   │ (REST / WebSocket)
   ▼
[ FastAPI Backend ] ───────┐
   │                       │
   ├── [ ChromaDB ]        │
   │   (Vector Search)     │
   │                       │
   ├── [ MongoDB ]         │
   │   (Auth, Saved Data)  │
   │                       │
   └── [ Gemini API ] ─────┘
       (RAG Generation)
```

## API Documentation
Once the backend is running, visit:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

Key Endpoints:
- `POST /api/auth/register` & `/login`
- `GET /api/schemes/`
- `POST /api/match/`
- `WS /ws/chat`

## Environment Variables
| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Your Google Gemini API Key |
| `MONGO_URI` | MongoDB Connection String (e.g., `mongodb://localhost:27017`) |
| `JWT_SECRET` | Secret key for JWT signing |
| `JWT_EXPIRE_HOURS` | Token expiry time in hours |
| `ADMIN_KEY` | Password to rebuild the ChromaDB index |
| `CHROMA_PATH` | Path to store the local vector db (`./chroma_db`) |

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License
[MIT](https://choosealicense.com/licenses/mit/)
