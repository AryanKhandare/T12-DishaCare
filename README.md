Yes — use **DishaCare** consistently throughout the README.

Below is a cleaner, proper GitHub-ready `README.md` rather than the previous overly verbose version. It reflects your actual project stack: **Next.js + Express.js + PostgreSQL**, the emergency workflow, matching, WebSockets, reservation, fallback, authentication, and team architecture.

```markdown
# 🚑 DishaCare

## The right direction to emergency care.

DishaCare is a real-time emergency healthcare coordination platform that helps ambulance teams find and secure the most suitable hospital for a critical patient.

Instead of manually calling multiple hospitals to check ICU beds, ventilators, oxygen support, or required specialties, DishaCare connects emergency teams with nearby hospitals through a centralized real-time platform.

The system considers **resource availability, distance, estimated travel time, hospital load, and data freshness** to help emergency teams identify suitable hospitals and coordinate a time-limited reservation.

---

## 🚨 Problem

During a medical emergency, every minute matters.

Ambulance teams often need to find out:

- Which nearby hospital has an ICU bed?
- Is a ventilator available?
- Is oxygen support available?
- Does the hospital have the required specialty?
- How far is the hospital?
- How long will it take to reach the hospital?
- Is the hospital's availability information recent?
- Will the hospital accept the patient?

The traditional process often involves calling hospitals one by one, which can result in significant delays.

### DishaCare solves this by providing:

```text
Emergency Request
       ↓
Nearby Hospital Discovery
       ↓
Real-Time Hospital Responses
       ↓
Resource & Location Matching
       ↓
Ranked Hospital Matches
       ↓
Hospital Selection
       ↓
2-Minute Reservation
       ↓
Bed Confirmation
       ↓
Automatic Fallback if Required
```

---

# 🎯 Objectives

DishaCare aims to:

- Reduce the time required to find a suitable hospital.
- Connect ambulance teams with nearby hospitals.
- Match patient requirements with hospital resources.
- Provide transparent hospital match scores.
- Show the freshness of hospital availability data.
- Enable hospitals to respond to emergency requests in real time.
- Provide a temporary reservation mechanism.
- Automatically move to the next suitable hospital if a reservation fails.
- Maintain a complete emergency event history.
- Provide an administrative monitoring dashboard.

---

# ✨ Key Features

## 🚑 1. Emergency Request

The ambulance/dispatcher can create an emergency request containing:

- Patient reference
- Emergency type
- Current location
- ICU requirement
- Ventilator requirement
- Oxygen requirement
- Required specialty

The ambulance location can be obtained using the browser's geolocation API.

---

## 🏥 2. Nearby Hospital Discovery

DishaCare identifies hospitals near the ambulance based on geographical distance.

The matching radius is configurable.

Default:

```env
MATCHING_RADIUS_KM=15
```

---

## 📡 3. Real-Time Emergency Broadcasting

Once an emergency is created, eligible nearby hospitals receive the request through WebSockets.

```text
                 🚑 Ambulance
                      │
                      ▼
              DishaCare Backend
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
     Hospital A  Hospital B  Hospital C
          │           │           │
          └───── Real-Time ────────┘
                 Responses
```

Hospitals can then respond according to their current available resources.

---

# 🛏️ 4. Hospital Availability

Hospital staff can update their resource availability.

Example:

```text
ICU          ✓ Available
Ventilator   ✕ Unavailable
Oxygen       ✓ Available
Cardiac      ✓ Available
Burns        ✕ Unavailable
```

The hospital does not manually enter a fulfillment percentage.

DishaCare calculates the percentage automatically.

### Example

If a patient requires:

```text
ICU
Ventilator
Oxygen
Cardiac
```

and the hospital can provide:

```text
ICU
Oxygen
Cardiac
```

then:

```text
Fulfillment = 3 / 4 × 100
            = 75%
```

---

# 🧠 5. Hospital Matching Engine

DishaCare ranks hospitals using multiple factors.

| Factor | Weight |
|---|---:|
| Resource Match | 35% |
| ETA | 25% |
| Data Freshness | 15% |
| Hospital Load | 15% |
| Distance | 10% |

Each component is normalized to a score between:

```text
0 - 100
```

The final score is calculated using the configured weights.

### Example

```text
Resource Match     95
ETA                88
Freshness          92
Hospital Load      75
Distance           90
----------------------
Final Match Score  calculated
```

These weights are configurable and are part of the application's matching configuration.

---

# 📍 6. Distance Calculation

DishaCare uses:

- Ambulance latitude
- Ambulance longitude
- Hospital latitude
- Hospital longitude

to calculate geographical distance.

The MVP uses the **Haversine formula**.

```text
Ambulance GPS
     ↓
Latitude + Longitude
     ↓
Haversine Formula
     ↓
Distance in KM
```

---

# 🚗 7. ETA Calculation

For the MVP, ETA can be estimated using a configurable emergency vehicle speed.

```text
ETA = Distance / Emergency Speed
```

Default:

```env
DEFAULT_EMERGENCY_SPEED_KMPH=40
```

The MVP ETA is an estimate and does not represent real-time traffic.

A routing service can be integrated later for traffic-aware ETA.

---

# 🕐 8. Data Freshness

Every hospital availability update stores a timestamp.

Example:

```text
ICU Available

Updated 2 minutes ago
```

or:

```text
Updated 31 minutes ago
⚠️ Stale
```

The freshness information is also considered by the matching engine.

---

# 📊 9. Ranked Hospital Results

The ambulance/dispatcher receives hospitals ranked according to the matching engine.

Example:

```text
┌────────────────────────────────────┐
│ City Hospital                      │
│ Match Score: 94                    │
│ Distance: 4.2 km                   │
│ ETA: 7 min                         │
│ Fulfillment: 100%                  │
│ Data Updated: 2 min ago            │
└────────────────────────────────────┘

┌────────────────────────────────────┐
│ Central Hospital                   │
│ Match Score: 88                    │
│ Distance: 5.8 km                   │
│ ETA: 10 min                        │
│ Fulfillment: 75%                   │
│ Data Updated: 4 min ago            │
└────────────────────────────────────┘
```

---

# 🏥 10. Hospital Selection

The ambulance team selects a hospital from the ranked results.

An important design principle is:

> Hospitals do not hold resources during the initial broadcast and matching phase.

A reservation is created only after the ambulance team selects a hospital.

This prevents unnecessary resource locking across multiple hospitals.

---

# ⏱️ 11. Two-Minute Reservation

After a hospital is selected, DishaCare creates a reservation request.

```text
Ambulance
    ↓
Select Hospital
    ↓
Create Reservation
    ↓
Hospital Notification
    ↓
2-Minute Confirmation Window
```

The hospital can:

```text
✓ ACCEPT
✕ REJECT
```

If accepted:

```text
Reservation
     ↓
ACCEPTED
     ↓
Resources Held
     ↓
Emergency Confirmed
```

---

# 🔄 12. Automatic Fallback

If the selected hospital:

- Rejects the request
- Does not respond
- Reservation expires

DishaCare automatically moves to the next eligible hospital.

```text
Hospital A
    ↓
Reservation
    ↓
Timeout
    ↓
Hospital B
    ↓
Reservation
    ↓
Accepted
```

If no suitable hospitals remain:

```text
NO_HOSPITAL_AVAILABLE
```

---

# ⚡ 13. Real-Time WebSockets

DishaCare uses WebSockets for real-time communication.

### Hospital

```text
/ws/hospital/:hospitalId
```

### Ambulance / Dispatcher

```text
/ws/ambulance/:ambulanceId
```

WebSockets are used for emergency broadcasts, matching updates, reservation notifications, and fallback events.

---

# 📡 WebSocket Events

The system supports events such as:

```text
NEW_EMERGENCY
MATCHING_UPDATE
RESERVATION_REQUEST
RESERVATION_CREATED
RESERVATION_ACCEPTED
RESERVATION_REJECTED
RESERVATION_EXPIRED
FALLBACK_TRIGGERED
NEXT_HOSPITAL_SELECTED
BED_HELD
NO_HOSPITAL_AVAILABLE
```

---

# 🗺️ Google Maps Directions

DishaCare can provide a **View Directions** option for the selected hospital.

The frontend can open Google Maps using the ambulance and hospital coordinates.

Example:

```text
Google Maps Directions

Origin:
Ambulance Latitude, Longitude

Destination:
Hospital Latitude, Longitude
```

The basic directions functionality does not require embedding the Google Maps SDK.

---

# 👥 User Roles

DishaCare has three main roles.

## 🚑 Dispatcher / Emergency Team

Can:

- Login
- Create emergency requests
- View nearby hospitals
- View hospital match scores
- Compare hospitals
- Select hospitals
- Track reservations
- View fallback status
- View emergency events

---

## 👩‍⚕️ Hospital Nurse

Can:

- Create an account
- Select their associated hospital
- Login
- Update hospital availability
- Receive emergency requests
- Respond to emergency requirements
- Accept reservations
- Reject reservations

---

## 👨‍💼 Administrator

Can:

- Monitor hospitals
- Monitor active emergencies
- View system metrics
- View stale availability
- View reservation history
- View event logs
- Monitor the hospital network

Public users cannot create an administrator account.

---

# 🔐 Authentication

DishaCare uses JWT-based authentication.

### Authentication APIs

```http
POST /api/auth/signup
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

Passwords are securely hashed using:

```text
bcrypt / bcryptjs
```

Role-based middleware protects restricted endpoints.

---

# 📝 Signup

Public signup supports:

```text
DISPATCHER
HOSPITAL_NURSE
```

For hospital nurses, the user selects an active hospital.

The backend associates the authenticated nurse with that hospital.

The backend does not trust a hospital ID from the client when modifying hospital data.

Administrators are created through controlled backend/seed configuration.

---

# 🗄️ Database

DishaCare uses:

```text
PostgreSQL
```

The database stores:

- Users
- Hospitals
- Bed availability
- Emergency requests
- Hospital responses
- Reservations
- Event logs

---

# 📚 Database Schema

## Users

```text
users
├── id
├── name
├── email
├── password_hash
├── role
├── hospital_id
├── is_active
├── created_at
└── updated_at
```

---

## Hospitals

```text
hospitals
├── id
├── name
├── address
├── city
├── state
├── pincode
├── latitude
├── longitude
├── phone
├── hospital_type
├── specialties
├── current_load
├── is_active
├── source
├── source_reference
├── created_at
└── updated_at
```

---

## Bed Availability

```text
bed_availability
├── id
├── hospital_id
├── icu_available
├── ventilator_available
├── oxygen_available
├── cardiac_available
├── burns_available
├── last_updated
└── updated_by
```

---

## Emergency Requests

```text
emergency_requests
├── id
├── patient_reference
├── emergency_type
├── latitude
├── longitude
├── requires_icu
├── requires_ventilator
├── requires_oxygen
├── specialty
├── status
├── created_by
├── created_at
└── updated_at
```

---

## Hospital Responses

```text
hospital_responses
├── id
├── emergency_id
├── hospital_id
├── icu_available
├── ventilator_available
├── oxygen_available
├── cardiac_available
├── burns_available
├── fulfillment_percentage
├── status
├── responded_at
├── created_at
└── updated_at
```

---

## Reservations

```text
reservations
├── id
├── emergency_id
├── hospital_id
├── status
├── requested_at
├── expires_at
├── responded_at
├── hold_token
├── created_at
└── updated_at
```

---

## Event Logs

```text
event_logs
├── id
├── emergency_id
├── hospital_id
├── reservation_id
├── event_type
├── message
├── metadata
└── created_at
```

---

# 🔄 Emergency Status

```text
CREATED
   ↓
BROADCASTING
   ↓
MATCHED
   ↓
RESERVATION_PENDING
   ↓
CONFIRMED
   ↓
COMPLETED
```

An emergency can also be:

```text
CANCELLED
```

---

# 🔄 Reservation Status

```text
PENDING
   │
   ├── ACCEPTED
   │
   ├── REJECTED
   │
   └── EXPIRED
```

After an accepted reservation is released:

```text
ACCEPTED
   ↓
RELEASED
```

---

# 📝 Hospital Response Status

```text
PENDING
   ↓
RESPONDED
```

A response can also become:

```text
WITHDRAWN
```

---

# 📜 Event Logging

DishaCare maintains an event history for emergency operations.

Examples:

```text
EMERGENCY_CREATED
EMERGENCY_BROADCAST
HOSPITAL_RESPONSE_RECEIVED
MATCHING_COMPLETED
HOSPITAL_SELECTED
RESERVATION_CREATED
RESERVATION_ACCEPTED
RESERVATION_REJECTED
RESERVATION_EXPIRED
FALLBACK_TRIGGERED
NEXT_HOSPITAL_SELECTED
BED_HELD
BED_RELEASED
EMERGENCY_COMPLETED
EMERGENCY_CANCELLED
```

---

# 🤖 AI Integration

DishaCare can use **Groq** for non-critical AI features such as:

- Match explanations
- Emergency summaries
- Administrative summaries

Example:

```text
Why this hospital?

This hospital currently satisfies all required
resources and has recently updated availability.
Its estimated travel time is also relatively low.
```

### Important

AI does not control critical emergency decisions.

The following remain deterministic backend operations:

- Hospital ranking
- Resource availability
- Reservation acceptance
- Reservation expiration
- Fallback selection
- Bed holding

If the AI service becomes unavailable, the core DishaCare system continues to operate.

---

# 🧩 System Architecture

```text
                    ┌─────────────────────┐
                    │       DishaCare     │
                    │      Frontend       │
                    │      Next.js        │
                    └──────────┬──────────┘
                               │
                         REST / WebSocket
                               │
                               ▼
                    ┌─────────────────────┐
                    │    Express.js       │
                    │      Backend        │
                    └──────────┬──────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
   Authentication      Matching Engine       Reservation
        │                    │                 Engine
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                             ▼
                    ┌─────────────────────┐
                    │     PostgreSQL      │
                    └─────────────────────┘
```

---

# 🛠️ Technology Stack

## Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS

## Backend

- Node.js
- Express.js
- JWT
- bcrypt / bcryptjs
- WebSockets

## Database

- PostgreSQL
- Prisma ORM

## Mapping

- Browser Geolocation API
- Haversine Distance
- Google Maps Directions

## AI

- Groq

---

# 📡 API Endpoints

## Authentication

```http
POST /api/auth/signup
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

## Hospitals

```http
GET   /api/hospitals
GET   /api/hospitals/:id
GET   /api/hospitals/:id/availability
PATCH /api/hospitals/:id/availability
```

## Emergency Requests

```http
POST /api/emergency-requests
GET  /api/emergency-requests/:id
POST /api/emergency-requests/:id/rank
GET  /api/emergency-requests/:id/matches
```

## Hospital Responses

```http
POST /api/emergency-requests/:id/responses
```

## Reservations

```http
POST /api/reservations
GET  /api/reservations/:id

POST /api/reservations/:id/accept
POST /api/reservations/:id/reject
POST /api/reservations/:id/expire
POST /api/reservations/:id/release
```

## Admin

```http
GET /api/admin/metrics
GET /api/admin/stale
```

## Events

```http
GET /api/events/:request_id
```

---

# 🔄 Complete Emergency Flow

```text
                🚑 AMBULANCE
                     │
                     ▼
            Create Emergency
                     │
                     ▼
              Backend API
                     │
                     ▼
          Find Nearby Hospitals
                     │
                     ▼
          Broadcast Emergency
                     │
       ┌─────────────┼─────────────┐
       ▼             ▼             ▼
   Hospital A    Hospital B    Hospital C
       │             │             │
       └──────── Responses ────────┘
                     │
                     ▼
              Matching Engine
                     │
                     ▼
             Ranked Hospitals
                     │
                     ▼
                Dispatcher
                     │
                     ▼
              Select Hospital
                     │
                     ▼
            Create Reservation
                     │
                     ▼
             2-Minute Timer
                     │
              ┌──────┴──────┐
              │             │
              ▼             ▼
           ACCEPT         REJECT
              │             │
              ▼             ▼
          BED HELD      FALLBACK
              │             │
              ▼             ▼
          CONFIRMED   NEXT HOSPITAL
```

---

# 🔐 Reservation Concurrency

Reservations are controlled by the backend.

The system should prevent:

```text
Available Beds = -1
```

and should prevent multiple simultaneous reservations from incorrectly claiming the same resource.

Database transactions and appropriate locking mechanisms are used for reservation operations.

---

# ⏱️ Reservation Timeout

Production configuration:

```env
RESERVATION_TIMEOUT_SECONDS=120
```

This gives the hospital:

```text
120 seconds = 2 minutes
```

to respond.

For hackathon testing, a shorter timeout can be configured:

```env
TEST_MODE=true
RESERVATION_TIMEOUT_SECONDS=20
```

The backend is authoritative for expiration. The frontend countdown is only a visual representation.

---

# 🌱 Environment Variables

Create a `.env` file in the backend.

Example:

```env
PORT=5000

DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/dishacare

JWT_SECRET=your_secret_here

MATCHING_RADIUS_KM=15

DEFAULT_EMERGENCY_SPEED_KMPH=40

RESERVATION_TIMEOUT_SECONDS=120

TEST_MODE=false

GROQ_API_KEY=your_groq_api_key
```

### Important

Never commit:

```text
.env
```

Commit:

```text
.env.example
```

instead.

---

# 🚀 Installation

## 1. Clone the Repository

```bash
git clone <repository-url>

cd DishaCare
```

---

# Backend Setup

```bash
cd backend

npm install
```

Create the environment file:

```bash
cp .env.example .env
```

Configure the PostgreSQL database and required environment variables.

Run Prisma:

```bash
npx prisma generate
```

Run migrations:

```bash
npx prisma migrate dev
```

Seed demo data if a seed script is available:

```bash
npm run seed
```

Start the backend:

```bash
npm run dev
```

---

# Frontend Setup

Open another terminal:

```bash
cd frontend

npm install
```

Start Next.js:

```bash
npm run dev
```

The frontend normally runs at:

```text
http://localhost:3000
```

---

# 🧪 Testing

The project should test the following areas.

## Authentication

- User signup
- Login
- Duplicate email
- Invalid credentials
- JWT validation
- Role authorization
- Invalid hospital during nurse signup
- Public admin signup rejection

## Matching

- Distance calculation
- Resource fulfillment
- ETA
- Freshness
- Hospital load
- Final match score
- Stale availability

## Reservations

- Reservation creation
- Hospital acceptance
- Hospital rejection
- Reservation expiration
- Bed hold
- Bed release
- Automatic fallback

## WebSockets

```text
Emergency
   ↓
Hospital

Hospital Response
   ↓
Ambulance

Reservation
   ↓
Hospital

Acceptance
   ↓
Ambulance

Fallback
   ↓
Next Hospital
```

---

# 📁 Project Structure

```text
DishaCare/
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── services/
│   └── public/
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── services/
│   │   ├── websocket/
│   │   ├── utils/
│   │   └── server.*
│   │
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.*
│   │
│   └── package.json
│
├── docs/
│   ├── FRONTEND_BACKEND_MAPPING.md
│   ├── DEV2_FRONTEND_CONTRACT.md
│   ├── MATCHING_ENGINE.md
│   ├── RESERVATION_FLOW.md
│   └── FALLBACK_FLOW.md
│
├── .gitignore
├── .env.example
└── README.md
```

---

# 🏥 Hospital Data Strategy

DishaCare separates hospital master information from live resource availability.

### Hospital Master Data

Examples:

- Hospital name
- Address
- Phone
- Latitude
- Longitude
- Hospital type
- Specialties

### Live Availability

Examples:

- ICU
- Ventilator
- Oxygen
- Cardiac
- Burns

Static hospital information can be imported from authoritative sources.

Live availability is maintained by participating hospitals through DishaCare.

The system should not claim that a static public listing represents current ICU or ventilator availability.

---

# 🎨 UI Design

DishaCare follows an **Emergency Operations × Healthcare Dashboard** design.

### Color Palette

```text
Navy       #17324D
Red        #D92D20
Green      #12B76A
Amber      #F79009
Blue       #2F6FED
Background #F7F9FC
```

### Typography

```text
Inter
Geist
Plus Jakarta Sans
```

The interface is designed to be:

- Fast
- Clear
- Responsive
- Mobile-friendly
- Easy to operate during emergencies

---

# 🖥️ Main Screens

### 1. Login

Role-based authentication.

### 2. Signup

Dispatcher and hospital nurse registration.

### 3. Emergency Creation

Enter patient requirements and current location.

### 4. Hospital Matching

Displays:

- Map
- Hospital cards
- Match score
- ETA
- Distance
- Resource fulfillment
- Data freshness
- Hospital load

### 5. Hospital Details

Shows the factors contributing to the match score.

### 6. Reservation

Displays selected hospital and confirmation countdown.

### 7. Automatic Fallback

Shows reservation timeout/rejection and the next hospital.

### 8. Hospital Availability

Large, simple controls for quickly updating resources.

### 9. Incoming Emergency

Hospital staff can review requirements and accept/reject the request.

### 10. Admin Dashboard

Displays system-level monitoring and emergency activity.

---

# 📱 Responsive Design

DishaCare is a responsive web application designed for:

```text
Desktop
Tablet
Mobile
```

Hospital staff can access the availability interface using a phone browser.

---

# 👨‍💻 Team Responsibilities

## Backend Developer 1

Responsible for:

- PostgreSQL
- Prisma
- Database schema
- Migrations
- Seed data
- Authentication
- JWT
- Users
- Hospitals
- Bed availability
- Emergency APIs
- Hospital responses
- Event logging
- Admin APIs
- API contracts
- Frontend/backend integration

---

## Backend Developer 2

Responsible for:

- Matching engine
- Distance calculation
- ETA
- Match scoring
- WebSockets
- Emergency broadcasting
- Real-time updates
- Reservation orchestration
- Two-minute timeout
- Automatic fallback
- Bed hold/release
- Concurrency handling
- Groq explanations
- Real-time notifications

---

## Frontend Team

Responsible for:

- Next.js application
- UI components
- Responsive design
- Emergency dashboard
- Hospital dashboard
- Admin dashboard
- Map interface
- Match cards
- Reservation countdown
- WebSocket integration
- Authentication screens
- Signup
- Loading/error states

---

# 🔒 Security

DishaCare follows basic application security practices:

- Password hashing
- JWT authentication
- Role-based authorization
- Protected APIs
- Hospital ownership validation
- Environment variables for secrets
- No plaintext passwords
- `.env` excluded from Git
- Server-side reservation validation
- Server-authoritative timeout
- Database transaction protection

---

# ⚡ Hackathon MVP Architecture

The project intentionally avoids unnecessary infrastructure.

The MVP does not require:

```text
Kafka
RabbitMQ
Redis
Kubernetes
Complex microservices
```

The core architecture is:

```text
Next.js
    +
Express.js
    +
PostgreSQL
    +
WebSockets
```

This keeps the system lightweight and suitable for rapid hackathon development.

---

# 📈 Future Scope

Future versions of DishaCare can include:

### 🚗 Traffic-Aware ETA

Integration with routing APIs for live traffic conditions.

### 🏥 Hospital System Integration

Integration with hospital information systems for automated availability updates.

### 📡 IoT Integration

Automatic resource/bed availability updates.

### 📱 Dedicated Mobile Application

Native or React Native application for ambulance teams and hospitals.

### 🔔 Push Notifications

SMS and push notifications as an alternative communication channel.

### 🧠 Predictive Capacity

Prediction of future hospital resource availability.

### 🌐 Multi-City Expansion

Expansion to multiple cities and healthcare networks.

### 🏛️ Healthcare Ecosystem Integration

Integration with authorized healthcare facility and emergency-care systems.

---

# 🎬 Hackathon Demo Flow

The complete demonstration can be performed as follows:

### Step 1 — Dispatcher Login

Login as an emergency dispatcher.

### Step 2 — Create Emergency

Example:

```text
Emergency: Critical Cardiac Case

ICU          ✓
Ventilator   ✓
Oxygen       ✓
Cardiac      ✓
```

### Step 3 — Send Emergency

The emergency is broadcast to eligible nearby hospitals.

### Step 4 — Hospital Responses

Hospitals receive the request and respond with their available resources.

### Step 5 — Matching

DishaCare calculates:

```text
Resource Match
ETA
Distance
Freshness
Hospital Load
Final Match Score
```

### Step 6 — Select Hospital

The dispatcher selects the preferred hospital.

### Step 7 — Reservation

A two-minute confirmation request is sent to the hospital.

### Step 8 — Demonstrate Failure

Hospital A rejects or fails to respond.

### Step 9 — Automatic Fallback

DishaCare automatically sends the request to Hospital B.

### Step 10 — Confirmation

Hospital B accepts.

```text
BED HELD
     ↓
EMERGENCY CONFIRMED
```

### Step 11 — Event Timeline

Show the complete sequence of events.

---

# 💡 Core USP

DishaCare combines:

```text
Real-Time Hospital Availability
            +
Geospatial Matching
            +
Resource Matching
            +
ETA
            +
Data Freshness
            +
Hospital Load
            +
Time-Limited Reservation
            +
Automatic Fallback
            +
WebSocket Communication
```

into a single emergency coordination platform.

### The core idea:

> **Don't just find the nearest hospital. Find a suitable hospital and coordinate acceptance before the ambulance arrives.**

---

# 🏆 DishaCare

## The right direction to emergency care.

```text
🚑 Emergency
      ↓
📍 Locate
      ↓
🏥 Match
      ↓
📊 Rank
      ↓
⏱️ Reserve
      ↓
🔒 Hold
      ↓
❤️ Care
```

---

## 📄 License

DishaCare is a hackathon prototype.

Before production deployment, healthcare data privacy, security, regulatory compliance, hospital authorization, and integration requirements should be evaluated appropriately.
```
