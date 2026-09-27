# SmartPass Platform

SmartPass is a comprehensive Event Ticketing and Management Platform. It provides an end-to-end solution for organizing events, selling tickets securely, and scanning them at the door.

## 🚀 Key Features

* **Cryptographic Ticketing**: Generates highly secure, verifiable tickets (PDFs with QR/barcodes).
* **Event Portal**: A public-facing web application for attendees to discover events and purchase tickets.
* **Admin Dashboard**: A comprehensive control panel for event organizers to manage events, track ticket sales, and view analytics.
* **Scanner App**: A dedicated application for venue doors to scan and cryptographically verify attendee tickets.
* **Secure API**: A fast, robust backend with role-based access control and rate limiting.

## 🏗️ Tech Stack

* **Backend**: Python, FastAPI, SQLAlchemy, PostgreSQL, SlowAPI (Rate Limiting).
* **Frontend**: React 18, Vite, Tailwind CSS, Framer Motion, Recharts.

---

## 🛠️ Local Setup & Development

### 1. Backend Setup

The backend is a FastAPI application that requires Python 3.8+.

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the development server:
   ```bash
   uvicorn main:app --reload
   ```
   *The API will be available at http://localhost:8000. API Documentation (Swagger) is at http://localhost:8000/docs.*

### 2. Frontend Setup

The frontend consists of three distinct React applications. You can run any of them using `npm` (or `yarn`/`pnpm`).

For example, to run the **Event Portal**:

1. Navigate to the directory:
   ```bash
   cd frontend/event-portal
   ```
2. Install Node.js dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```

*(Repeat these steps for `frontend/admin-dashboard` or `frontend/scanner-app` depending on what you want to work on).*

---

## 🤝 Contributing
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
