# 🛣️ SafeRoute — Traffic Hazard Reporting & Analytics System

<div align="center">

**Real-time crowdsourced road hazard detection for Hyderabad**

[![HTML5](https://img.shields.io/badge/Frontend-HTML5%20%2B%20CSS3%20%2B%20JS-orange?style=for-the-badge&logo=html5)](.)
[![Node.js](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-green?style=for-the-badge&logo=nodedotjs)](.)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB-darkgreen?style=for-the-badge&logo=mongodb)](.)
[![Leaflet](https://img.shields.io/badge/Maps-Leaflet.js-blue?style=for-the-badge)](.)

*Geethanjali College of Engineering & Technology*
*Web Technologies (20CS22004) — Project Based Learning | Academic Year 2025–26*

</div>

---

## 📌 About

**SafeRoute** is a full-stack web application for real-time crowdsourced traffic hazard reporting and analytics. Citizens can report road hazards — accidents, potholes, congestion, floods, roadwork — which appear instantly on a live map. Admins and traffic authorities get a dashboard with analytics, hotspot rankings, and resolution tools.

---

## 🌐 Pages

| Page | File | Description |
|------|------|-------------|
| Landing | `index.html` | Home page with features, live stats, and overview |
| Login / Register | `login.html` | Sign in or create account with role selection |
| Live Map | `map.html` | Real-time hazard map with severity-coded markers and live sidebar |
| Report Hazard | `report.html` | Detailed report form with GPS, map pin, photo upload |
| Admin Dashboard | `dashboard.html` | KPI cards, charts, reports table, activity feed, hotspot rankings |

---

## ✨ Features

### For Citizens
- 🗺️ **Live hazard map** — OpenStreetMap with dark theme, severity-coded markers (🔴 Critical → 🟢 Low)
- 📍 **GPS-based reporting** — Auto-detect location or click map to pin
- ⚡ **Real-time updates** — New reports appear on map every 30 seconds
- 🔔 **Nearby alerts** — Get notified of high-severity hazards within 5km

### For Admins & Authorities
- 📊 **Analytics dashboard** — 4 KPI cards, line chart (7/30/90 day trends), doughnut chart by type
- 🗓️ **Reports table** — Searchable, filterable, with verify / resolve / delete actions
- 🔥 **Hotspot rankings** — Top 10 most dangerous locations with bar chart
- 👥 **User management** — View all users, activate/deactivate accounts
- 📡 **Live activity feed** — Real-time event stream

### Technical
- 🔒 **JWT-style sessions** — SHA-256 hashed passwords, 32-byte session tokens, 24h expiry
- 👤 **Role-based access** — `user` / `authority` / `admin` with route guards
- 🌍 **Haversine distance** — Geographic radius filtering for nearby alerts
- 📈 **MongoDB aggregation** — Hotspot and trend analytics via aggregate pipeline

---

## 🏗️ Project Structure

```
SafeRoute/
├── index.html          ← Landing page
├── login.html          ← Login / Register
├── map.html            ← Live hazard map
├── report.html         ← Report hazard form
├── dashboard.html      ← Admin dashboard
├── styles.css          ← Shared styles
├── auth.js             ← Shared auth utilities (token storage, guards, fetch)
├── server.js           ← Node.js + Express REST API
├── test-api.js         ← API test script
├── package.json        ← Node.js dependencies
├── .env.example        ← Environment variable template
└── README.md
```

---

## 🚀 Quick Start

### Option 1 — Frontend Only (no backend needed)
Just open any HTML file in your browser. All pages work standalone with mock/seeded data.

### Option 2 — Full Stack

```bash
# 1. Clone the repo
git clone https://github.com/SuryaSashank09/SafeRoute.git
cd SafeRoute

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env — set your MongoDB URI if not running locally

# 4. Start MongoDB (if running locally)
# Make sure mongod is running or use MongoDB Compass

# 5. Start the server
npm start
# or for auto-reload:
node server.js
```

Open **http://localhost:3000** in your browser.

**Test all API endpoints:**
```bash
node test-api.js
```

---

## 🔐 Default Login Accounts

| Role | Email | Password |
|------|-------|----------|
| 👑 Admin | admin@saferoute.in | admin123 |
| 🏛️ Authority | authority@hyderabad.gov.in | auth123 |
| 👤 User | user@saferoute.in | user123 |

---

## 🔌 API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login with email + password |
| POST | `/api/auth/register` | Create new account |
| POST | `/api/auth/logout` | Invalidate session |
| GET | `/api/auth/me` | Get current user info |

### Hazards
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/hazards` | Get all hazards (supports filters) |
| GET | `/api/hazards/:id` | Get single hazard |
| POST | `/api/hazards` | Submit new hazard report |
| PATCH | `/api/hazards/:id/status` | Update status (admin) |
| PATCH | `/api/hazards/:id/verify` | Verify a report (admin) |
| DELETE | `/api/hazards/:id` | Delete hazard (admin) |

**GET /api/hazards** query params: `type`, `severity`, `status`, `lat`, `lng`, `radius`, `limit`

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/summary` | Dashboard KPIs |
| GET | `/api/analytics/hotspots` | Top 10 hazard locations |
| GET | `/api/analytics/trends?days=7` | Daily report trend |

### Alerts & Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/alerts?lat=&lng=&radius=5` | Nearby active alerts |
| GET | `/api/users` | List all users (admin) |
| PATCH | `/api/users/:id/status` | Activate/deactivate user (admin) |

Full API docs: **http://localhost:3000/api**

---

## 🛠️ Tech Stack

### Frontend
| Tech | Usage |
|------|-------|
| HTML5 + CSS3 | Layout, animations, responsive design |
| Vanilla JavaScript (ES6+) | All interactivity, API calls, state management |
| Leaflet.js | Interactive map, markers, popups |
| Chart.js | Line chart, doughnut chart, analytics |
| CartoDB Dark Tiles | Dark-theme map tiles |
| Google Fonts (Orbitron, Syne, Space Mono) | Typography |

### Backend
| Tech | Usage |
|------|-------|
| Node.js | Runtime |
| Express.js | REST API framework |
| MongoDB + Mongoose | Database and ODM |
| crypto (built-in) | SHA-256 password hashing, session tokens |
| CORS | Cross-origin support |
| dotenv | Environment configuration |

---

## 🗄️ Database Schema

### Users
```
name, email (unique), password (hashed), phone, role (user/admin/authority), active
```

### Hazards
```
hazardId (SR-XXXX), type, severity, lat, lng, location, description,
reportedBy, reporterName, status (pending/active/resolved), verified, resolvedAt
```

### Sessions
```
token (unique), userId, expiresAt (auto-deleted via TTL index)
```

---
