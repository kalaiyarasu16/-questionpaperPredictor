# AI Service (FastAPI)

This microservice analyzes uploaded question paper PDFs stored by the Node/Express backend and writes:

- `extracted_questions` collection
- `predictions` collection

## Setup

```bash
cd backend/ai_service
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

## Configure

Create `backend/ai_service/.env` (or set env vars):

```env
MONGODB_URI=mongodb://127.0.0.1:27017/questionbank
UPLOAD_DIR_ABS=C:\Users\kalai\OneDrive\Desktop\new project\backend\uploads
PORT=8001
```

Notes:
- `UPLOAD_DIR_ABS` must point to the Express upload directory that contains the PDFs.

## Run

```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```

Health:
- `GET http://127.0.0.1:8001/health`

