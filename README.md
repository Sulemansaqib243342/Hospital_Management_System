# 🏥 SS Pharmaceuticals HMS — Hospital Management System

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

A premium, full-stack Hospital Management System designed for **SS Pharmaceuticals**. This application provides a comprehensive suite of tools for healthcare providers to manage patients, appointments, pharmacy inventory, and billing through a unified, secure dashboard.

---

## 🚀 Key Features

- 🔐 **Secure Authentication** — JWT-based login/logout with role-based access control.
- 📊 **Real-time Dashboard** — Live KPIs for appointments, patient registrations, and revenue.
- 📂 **Patient Management** — Full CRUD operations for patient records and history.
- 📅 **Smart Scheduling** — Efficient appointment booking and doctor availability tracking.
- 💊 **Pharmacy Suite** — Inventory management with low-stock alerts and digital prescriptions.
- 💳 **Billing & Invoicing** — Supports multiple payment methods; status updates automatically.
- 🏛️ **PostgreSQL Optimization** — Business logic offloaded to Database Views, Stored Procedures, and Triggers.

---

## 🛠️ Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS, React Router, Axios
- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL (Vercel Postgres)
- **Security:** JWT + bcryptjs
- **Deployment:** Vercel (Frontend + Backend + Database)

---

## 📂 Project Architecture

```bash
hospital-hms/
├── backend/              # Node.js + Express API
│   ├── controllers/      # Business logic
│   ├── db/               # PostgreSQL connection + schema.sql
│   ├── middleware/       # JWT auth middleware
│   ├── routes/           # API endpoints
│   └── server.js         # Entry point
└── frontend/             # React app (Vite + Tailwind)
    └── src/
        ├── context/      # Global Auth State
        ├── pages/        # Dashboard, Patients, Pharmacy, etc.
        ├── components/   # UI Layout & Sidebar
        └── services/     # API Client (Axios)
```

---

## ⚙️ Installation & Setup

### 1. Clone the repository
```bash
git clone https://github.com/Sulemansaqib243342/Hospital_Management_System.git
```

### 2. Backend Configuration
```bash
cd backend
npm install
```
Create a `.env` file in the `backend` folder (see `.env.example`):
```env
POSTGRES_URL=your_vercel_postgres_connection_url
JWT_SECRET=your_secure_secret_key
CLIENT_URL=https://your-frontend.vercel.app
INIT_SECRET=your_init_secret_key
```
Run locally: `npm run dev`

### 3. Frontend Configuration
```bash
cd frontend
npm install
npm run dev
```
Create a `.env` file in the `frontend` folder:
```env
VITE_API_BASE_URL=http://localhost:5002/api
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔑 Default Login

> ⚠️ **Security Note:** Default credentials are stored securely in Vercel Environment Variables. Contact the administrator for access.

---

## 👤 Author
**Suleman Saqib**  
[GitHub Profile](https://github.com/Sulemansaqib243342) | [LinkedIn](https://www.linkedin.com/in/sulemansaqib)

---
*Developed as a Full-Stack Semester Project at Air University, Islamabad.*
