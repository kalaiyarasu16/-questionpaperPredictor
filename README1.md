# Question Paper Portal

A centralized platform where **students can search, view and download** previous year question papers, and **admins can upload/manage** PDF papers with metadata.

## Tech stack

- **Frontend**: React (Vite)
- **Backend**: Node.js + Express
- **Database**: MongoDB (Mongoose)
- **File storage**: Local disk (`backend/uploads/`)
- **Admin auth**: JWT with default credentials (change in `.env`)

## Project structure

- `backend/` Express API + MongoDB models + PDF upload
- `frontend/` React portal UI (student + admin)

## Database schema (MongoDB)

Collection: `papers`

- `subjectName` (string, indexed)
- `department` (string, indexed)
- `academicYear` (string, indexed)
- `semester` (string, indexed)
- `examType` (enum: `Mid | Model | Semester`)
- `fileOriginalName` (string)
- `fileName` (string) — stored filename in `uploads/`
- `fileUrl` (string) — public URL path like `/uploads/<file>`
- `fileSize` (number)
- `mimeType` (string)
- `downloads` (number, default 0)
- `createdAt`, `updatedAt` (timestamps)

## Setup (Windows)

### 1) Install MongoDB

Make sure MongoDB is running locally.

Default connection used:

- `mongodb://127.0.0.1:27017/questionbank`

### 2) Backend

```bash
cd backend
copy .env.example .env
npm install
npm run dev
```

Backend runs on `http://localhost:5000`

### 2b) AI Prediction Service (FastAPI)

This runs alongside the backend and is called by the API endpoints:

- `POST /api/analyze-papers`
- `GET /api/predict/:subject`
- `GET /api/repeated/:subject`
- `GET /api/topics/:subject`

```bash
cd backend/ai_service
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/ai_service/.env`:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/questionbank
UPLOAD_DIR_ABS=C:\Users\kalai\OneDrive\Desktop\new project\backend\uploads
PORT=8001
```

Run:

```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```

### 3) Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173` (Vite default).

## Default admin credentials

- **Username**: `admin`
- **Password**: `admin123`

Change these in `backend/.env`:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- also set a strong `JWT_SECRET`

## API endpoints (summary)

- `POST /api/auth/login` → admin login (returns JWT)
- `GET /api/papers` → list papers with filters + pagination
  - query params: `search, subjectName, department, academicYear, semester, examType, sort(recent|downloads), page, limit`
- `GET /api/papers/:id/download` → downloads the PDF and increments `downloads`
- `POST /api/papers` (admin) → upload a PDF with metadata (multipart form)
- `PUT /api/papers/:id` (admin) → edit metadata, optional replace PDF (multipart form)
- `DELETE /api/papers/:id` (admin) → delete paper + file
- `GET /api/stats` (admin) → total uploads/downloads

## Using the app

- **Student**: open homepage → search + apply filters → view PDF or download.
- **Admin**: go to `/admin` → login → upload PDFs + manage (edit/delete) → view stats.

