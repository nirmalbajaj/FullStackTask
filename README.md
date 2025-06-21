# Employee Feedback System

A web-based feedback management system where managers can provide structured feedback to team members, and employees can view and acknowledge their feedback.

## Tech Stack

**Frontend**: React, Tailwind CSS, Lucide Icons

**Backend:** FastAPI, SQLAlchemy, SQLite

**Database:** SQLite (configurable for PostgreSQL/MySQL)

## How to Run

### Backend (Docker)
```bash
cd backend
docker build -t feedback-backend .
docker run -p 8000:8000 feedback-backend
```

**Note:** If using Docker Desktop, click "Run" → "Optional settings" → Set Host Port to `8000`

Backend: http://localhost:8000

### Frontend (Manual)
```bash
cd frontend
npm install
npm run dev
```
Frontend: http://localhost:3000

### Alternative: Manual Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install fastapi uvicorn sqlalchemy pydantic
python main.py or uvicorn main:app --relaod
```

## Demo Credentials

- **Manager:** username: `manager1`, password: `password123`
- **Employee:** username: `employee1`, password: `password123`
- **Employee:** username: `employee2`, password: `password123`
