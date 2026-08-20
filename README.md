# Sahayog AI — Government Schemes, Simplified

> An AI-powered, multilingual citizen welfare discovery platform helping Indian citizens seamlessly find, evaluate eligibility, and apply for government schemes using Hybrid Search and Generative AI (RAG).

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115.0-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3.1-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5.4.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-Motor_3.5.1-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-1.5_Flash%2FPro-4285F4?style=for-the-badge&logo=google)](https://ai.google.dev)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

<img width="1900" height="967" alt="Sahayog AI Platform" src="https://github.com/user-attachments/assets/9ad85926-bb5f-45ef-9ec2-b62ce29b0eee" />

---

## 📌 Overview

India has hundreds of central and state government welfare schemes across agriculture, healthcare, education, housing, social security, and entrepreneurship. However, citizens often face challenges due to:
- Complex eligibility criteria across multiple parameters (income, landholding, caste, age, state).
- Fragmented portals and lack of unified search.
- Language barriers.

**Sahayog AI** bridges this gap by combining **smart eligibility matching**, **fast vector/hybrid semantic search**, and a **context-aware Generative AI Assistant (Google Gemini RAG)** supporting **8 Indian languages**, empowering citizens to find schemes they are eligible for in seconds.

---

## ✨ Key Features

- **🎯 Smart Eligibility Engine**: Evaluates citizen profiles (age, gender, income, occupation, location, caste, state) against 700+ government schemes with granular scoring, eligibility explanations, and gap analysis.
- **🤖 Multilingual AI Chatbot (RAG)**: Conversational assistant powered by Google Gemini (with an offline rule-based fallback). Features conversation memory, active-scheme follow-up resolution, off-topic detection, and real-time WebSocket streaming (`/ws/chat`).
- **🌐 8 Supported Languages**: Full UI localization across **English (`en`)**, **हिन्दी (`hi`)**, **தமிழ் (`ta`)**, **मराठी (`mr`)**, **বাংলা (`bn`)**, **తెలుగు (`te`)**, **ಕನ್ನಡ (`kn`)**, and **ગુજરાતી (`gu`)** with instant switching and translation caching.
- **⚡ High-Performance Hybrid & Semantic Search**: Pure-Python TF-IDF vector indexing and cosine similarity with disk caching (`tfidf_index.pkl`), pre-warmed $O(1)$ scheme dictionary lookups, and optional Gemini embeddings.
- **📊 Interactive Analytics Dashboard**: Real-time visualization of scheme distribution across categories, state coverage, and personal eligibility breakdowns.
- **💾 Saved Schemes & Bookmarking**: Save, manage, and track schemes with persistent user accounts in MongoDB.
- **🌓 Modern Responsive UI**: Clean light/dark mode design, floating AI assistant widget, collapsible animated scheme cards with required documents checklists, and mobile-friendly layouts.
- **🔐 Secure Authentication**: JWT (JSON Web Token) authentication with non-blocking async bcrypt password hashing and user profile management.

---

## 🏛️ System Architecture

```
                       ┌─────────────────────────┐
                       │  User Browser / Client   │
                       └────────────┬────────────┘
                                    │
                         HTTP / REST│ WebSocket
                                    ▼
                       ┌─────────────────────────┐
                       │   React 18 + Vite SPA   │
                       │ (Tailwind/CSS, i18n UI) │
                       └────────────┬────────────┘
                                    │
                         /api/*     │ /ws/chat
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │                 FastAPI Backend Engine                 │
       │                                                        │
       │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
       │  │ Auth & Users │  │ Scheme Search│  │ Match Engine │  │
       │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
       │         │                 │                 │          │
       │  ┌──────┴───────┐  ┌──────┴───────┐         │          │
       │  │ Saved Schemes│  │ Chat & RAG   │         │          │
       │  └──────────────┘  └──────┬───────┘         │          │
       └───────────────────────────┼─────────────────┼──────────┘
                                   │                 │
            ┌──────────────────────┼─────────────────┴────────────┐
            ▼                      ▼                              ▼
 ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐
 │  MongoDB Database  │ │ TF-IDF Vector Store│ │  Google Gemini AI  │
 │ (Users, Saved Data)│ │ (Fast In-Memory/DB)│ │ (RAG Generation)   │
 └────────────────────┘ └────────────────────┘ └────────────────────┘
```

> Detailed architecture diagrams and mobile UI mockups are available in the [`architecture/`](./architecture) directory.

---

## 📁 Repository Structure

```
sahayog-ai/
├── architecture/             # Architecture diagrams (SVG & PNG) & UI mockups
│   ├── system_architecture.svg
│   ├── mobile_ui_mockup.svg
│   └── ...
├── backend/                  # FastAPI Backend Application
│   ├── app/
│   │   ├── data/             # Scheme dataset (700+ schemes) & matching logic
│   │   │   ├── schemes.json  # Comprehensive scheme database
│   │   │   ├── schemes.py    # In-memory scheme loader and indexer
│   │   │   ├── matcher.py    # Profile eligibility scoring engine
│   │   │   └── assistant.py  # Rule-based fallback assistant
│   │   ├── rag/              # Retrieval-Augmented Generation (RAG) module
│   │   │   ├── embedder.py   # TF-IDF & Gemini vector indexer
│   │   │   ├── generator.py  # Gemini prompt builder & streaming generator
│   │   │   ├── hybrid.py     # Hybrid search combining vectors & keywords
│   │   │   └── memory.py     # Session conversation memory
│   │   ├── routes/           # REST & WebSocket API routes
│   │   │   ├── auth.py       # User registration, login, profile (/api/auth)
│   │   │   ├── schemes.py    # Scheme catalogue & details (/api/schemes)
│   │   │   ├── match.py      # Profile eligibility match (/api/match)
│   │   │   ├── chat.py       # AI chat & WebSocket stream (/api/chat, /ws/chat)
│   │   │   └── saved.py      # User bookmarks (/api/saved)
│   │   ├── auth.py           # JWT generation & password verification
│   │   ├── config.py         # App configuration & settings
│   │   ├── database.py       # MongoDB async client (Motor)
│   │   ├── main.py           # Application entrypoint, CORS, lifespan handlers
│   │   └── models.py         # Pydantic data models & request schemas
│   ├── chroma_db/            # Vector cache index
│   └── requirements.txt      # Python dependencies
├── frontend/                 # React 18 + Vite Frontend Application
│   ├── src/
│   │   ├── components/       # Reusable components (Hero, Navbar, Chatbot, Forms, Cards)
│   │   ├── context/          # React Contexts (AuthContext, ThemeContext, LanguageContext)
│   │   ├── i18n/             # Translations (en, hi, bn, mr, ta, te, gu, kn)
│   │   ├── styles/           # Global styles & design tokens
│   │   ├── utils/            # Translation & category helpers
│   │   ├── App.jsx           # Main routing & state orchestration
│   │   └── main.jsx          # DOM entry point
│   ├── package.json          # Node dependencies & build scripts
│   └── vite.config.js        # Vite config with API/WebSocket proxy
├── docs/                     # Technical documentation & architecture briefs
└── presentation/             # Presentation deck (.pptx)
```

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** & **npm**
- **MongoDB** (Local instance on `mongodb://localhost:27017` or MongoDB Atlas URI)
- **Google Gemini API Key** (Optional, for full AI assistant features — [Get an API Key](https://aistudio.google.com/))

---

### 1. Backend Setup

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment:**
   - **Windows (PowerShell):**
     ```powershell
     python -m venv .venv
     .\.venv\Scripts\Activate.ps1
     ```
   - **macOS / Linux:**
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure Environment Variables:**
   Create a `.env` file in the `backend/` directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   MONGO_URI=mongodb://127.0.0.1:27017/sahayog_ai
   JWT_SECRET=your_jwt_secret_key_min_32_characters
   JWT_EXPIRE_HOURS=72
   ADMIN_KEY=sahayog_admin_123
   CHROMA_PATH=./chroma_db
   ```

5. **Start the FastAPI Server:**
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   The backend will be live at `http://localhost:8000`.

---

### 2. Frontend Setup

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install Node dependencies:**
   ```bash
   npm install
   ```

3. **Start the Vite development server:**
   ```bash
   npm run dev
   ```
   The frontend will be accessible at `http://localhost:5173`.

---

## 🔧 Environment Configuration

| Variable | Type | Default | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | `string` | *(Optional)* | Google Gemini API key for conversational RAG. (Falls back to rule-based assistant if not provided) |
| `MONGO_URI` | `string` | `mongodb://127.0.0.1:27017/sahayog_ai` | MongoDB connection string |
| `JWT_SECRET` | `string` | *(Required)* | Secret key used for signing JWT access tokens (minimum 32 characters recommended) |
| `JWT_EXPIRE_HOURS` | `integer` | `72` | Token validity duration in hours |
| `ADMIN_KEY` | `string` | `sahayog_admin_123` | Secret admin key required to trigger index rebuilds |
| `CHROMA_PATH` | `string` | `./chroma_db` | Storage path for cached vector index (`tfidf_index.pkl`) |

---

## 📡 API Reference

Interactive API documentation is automatically generated by FastAPI:
- **Swagger UI**: [`http://localhost:8000/docs`](http://localhost:8000/docs)
- **ReDoc**: [`http://localhost:8000/redoc`](http://localhost:8000/redoc)

### Key Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user profile and receive JWT token |
| `POST` | `/api/auth/login` | Authenticate user credentials and receive JWT token |
| `GET` | `/api/auth/me` | Fetch currently logged-in user profile |
| `PUT` | `/api/auth/me` | Update user profile criteria (income, occupation, state, etc.) |
| `GET` | `/api/schemes/` | List and filter schemes with search, category, and pagination |
| `GET` | `/api/schemes/stats` | Scheme counts, category breakdown, and RAG index status |
| `GET` | `/api/schemes/categories` | Retrieve all distinct scheme categories |
| `GET` | `/api/schemes/{scheme_id}` | Fetch scheme details with semantic similar scheme suggestions |
| `GET` | `/api/schemes/admin/rebuild-index` | Re-build TF-IDF vector index (Requires `X-Admin-Key` header) |
| `POST` | `/api/match/` | Hybrid match user profile against 700+ schemes with scoring |
| `POST` | `/api/match/explain/{scheme_id}` | Detailed eligibility breakdown for a specific scheme |
| `POST` | `/api/chat/` | Send HTTP chat message to Gemini RAG assistant |
| `WS` | `/ws/chat` | Real-time WebSocket streaming for conversational AI |
| `GET` | `/api/chat/history/{session_id}` | Retrieve session chat history |
| `DELETE`| `/api/chat/history/{session_id}` | Clear session chat history |
| `GET` | `/api/saved/` | Get user's saved/bookmarked schemes |
| `POST` | `/api/saved/` | Bookmark a scheme |
| `DELETE`| `/api/saved/{scheme_id}` | Remove scheme from bookmarks |
| `GET` | `/api/health` | System health check (MongoDB & RAG index status) |

---

## 🔄 Rebuilding the Scheme Vector Index

When new schemes are added to `backend/app/data/schemes.json`, you can rebuild the search index on the fly without restarting the server:

```bash
curl -X GET http://localhost:8000/api/schemes/admin/rebuild-index \
  -H "X-Admin-Key: sahayog_admin_123"
```

---

## 👥 Target Users & Impact

- **Farmers & Agricultural Workers**: Direct access to PM-KISAN, crop insurance (PMFBY), tractor subsidies, and soil health card schemes.
- **Students & Youth**: Scholarships, skill development programs (PMKVY), and education loans.
- **Women & Self-Help Groups**: Healthcare (PMMVY), entrepreneurship schemes, and financial aid.
- **Senior Citizens & Differently-Abled**: Pension programs, assistive devices, and medical assistance.
- **Small Business Owners & Artisans**: PM SVANidhi, PM Vishwakarma, and Mudra loans.

---

## 🤝 Contributing

Contributions are welcome!
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is distributed under the MIT License. See `LICENSE` for more information.


