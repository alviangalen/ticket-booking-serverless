# Concert Ticket Booking Platform (Sheila on 7 • Kisah Klasik Festival 2026)
### Enterprise Event-Driven Serverless Architecture

Monorepo Serverless Web App untuk pemesanan tiket konser Sheila on 7 dengan proteksi concurrency tinggi ("War Tiket") dan **Enterprise Event-Driven Architecture (EDA)**. Didesain berdasarkan Design System Google Stitch **"Kisik-Indie Concert Flow"** (Meadow Festival Red Edition) dengan estetika retro-analog berpadu modern tactile UI.

---

## Arsitektur Sistem (Enterprise Event-Driven Architecture)

Aplikasi telah dimigrasikan ke arsitektur event-driven yang sepenuhnya ter-decoupling dan tahan beban tinggi:

```
[ Frontend React (Port 5173) ]
           │
           ▼  POST /tickets/book
[ API Gateway (Port 3000) ]
           │
           ▼
[ Lambda: enqueueBooking ] ──(Enqueues raw payload)──► [ Amazon SQS: BookingQueue ]
                                                                   │
                                                      (BatchSize: 1, SQS Trigger)
                                                                   ▼
                                                       [ Lambda: bookSeat ]
                                                                   │
                                                (Optimistic Concurrency Control +
                                                 Prisma Atomic Transaction Lock)
                                                                   ▼
                                                       [ PostgreSQL (Amazon RDS) ]
                                                                   ▲
                                                                   │
[ Frontend Admin / Webhook ] ── POST /tickets/simulate-payment ────┤
                                                                   ▼
                                                       [ Lambda: simulatePayment ]
                                                                   │ (Updates to PAID)
                                                                   ▼
                                                       [ Amazon EventBridge ]
                                                       Bus: default
                                                       Source: ticket.booking
                                                       DetailType: OrderPaid
                                                                   │
                                                                   ▼
                                                       [ AWS Step Functions ]
                                                    (OrderProcessingStateMachine)
                                                                   │
                                                ┌──────────────────┴──────────────────┐
                                                ▼                                     ▼
                                      Step 1: [generateTicketPdf]           Step 2: [broadcastNotification]
                                      (Simulate S3 PDF Generation)                    │
                                                                                      ▼
                                                                           [ Amazon SNS Topic ]
                                                                       (TicketNotificationTopic)
```

---

## Tech Stack & Target Deployment

- **Frontend (`/frontend`)**:
  - React 18, Vite, TypeScript
  - Tailwind CSS (desain tactile cards, perforated ticket stubs, custom hard shadows `border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]`)
  - AWS Amplify Authenticator (`@aws-amplify/ui-react`) untuk proteksi rute `/admin`
  - QR Code generator (`qrcode.react`) & Confetti celebration (`canvas-confetti`)
  - Centralized API Service (`src/services/api.ts`)
  - Target Deployment: **AWS Amplify**

- **Backend (`/backend`)**:
  - Node.js 20, TypeScript, Serverless Framework (`serverless.yml`)
  - Amazon SQS: `BookingQueue` untuk menyerap trafik lonjakan ("war tiket")
  - Amazon EventBridge: Event bus default untuk sinyal domain `OrderPaid`
  - AWS Step Functions: State Machine orchestrator beruntun (`generateTicketPdf` → `broadcastNotification`)
  - Amazon SNS: `TicketNotificationTopic` untuk notifikasi e-tiket multi-kanal
  - Amazon Cognito: User Pool & Client dengan JWT Authorizer pada HTTP API
  - Database: **PostgreSQL (Amazon RDS)** via **Prisma ORM**
  - Concurrency Control: **Optimistic Concurrency Locking** via `@default(0) version` & Prisma atomic interactive transactions
  - Target Deployment: **AWS API Gateway + AWS Lambda**

---

## Port & Layanan yang Digunakan (Ports & Services)

| Layanan / Service | Lingkungan | Port | URL / Connection String | Keterangan |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend Web App** | Vite Dev Server | **`5173`** | `http://localhost:5173` | UI React client untuk pemesanan tiket, live countdown, dan e-ticket modal. |
| **Frontend Admin Panel** | Vite Dev Server | **`5173`** | `http://localhost:5173/admin` | Operator Console promotor terlindungi Cognito Authenticator. |
| **Backend API Gateway** | Local Dev / Serverless | **`3000`** | `http://localhost:3000/dev` | Simulasi AWS API Gateway & Lambda handlers lokal (`src/devServer.ts`). |
| **Database PostgreSQL** | Docker Container | **`5433`** | `postgresql://postgres:postgres@localhost:5433/ticket_booking?schema=public` | Container PostgreSQL `ticket-postgres` dipetakan ke port host `5433`. |
| **Database PostgreSQL** | Amazon RDS (Prod) | **`5432`** | `postgresql://<user>:<password>@<rds-endpoint>:5432/ticket_booking?schema=public` | Port standar PostgreSQL pada deployment cloud Amazon RDS. |

---

## Directory Structure

```
ticket-booking/
├── .github/
│   └── workflows/
│       ├── frontend-deploy.yml   # CI/CD: Build and verify React frontend
│       └── backend-deploy.yml    # CI/CD: Serverless deploy backend to AWS Prod
│
├── frontend/                     # React UI application (Target: AWS Amplify)
│   ├── public/
│   │   └── hero-concert.jpg      # Aset visual konser lokal resolusi tinggi
│   ├── src/
│   │   ├── components/           # Reusable tactile UI components
│   │   │   ├── Navbar.tsx        # Announcement ribbon, logo SO7, nav + Admin button
│   │   │   ├── Hero.tsx          # Billboard hero 30 Tahun Kisah Klasik
│   │   │   ├── Countdown.tsx     # Scoreboard analog hitung mundur live
│   │   │   ├── Lineup.tsx        # Lineup musisi & bintang tamu
│   │   │   ├── TicketSection.tsx # Tiket perforasi tactile & stepper kuota
│   │   │   ├── CheckoutForm.tsx  # Form pemesan & pembayaran instan (QRIS/VA)
│   │   │   ├── BookingModal.tsx  # Modal E-Tiket instan dengan QR Code & print
│   │   │   ├── NewsSection.tsx   # Panduan wristband & logistik konser
│   │   │   ├── VenueInfo.tsx     # Info GBK Senayan & akses transportasi
│   │   │   └── Footer.tsx        # Info promotor & mitra resmi
│   │   ├── pages/
│   │   │   ├── HomePage.tsx      # Main layout pemesanan tiket publik
│   │   │   └── AdminPage.tsx     # Retro-Analog Operator Console (Cognito Authenticator)
│   │   ├── services/
│   │   │   └── api.ts            # Centralized API service ke API Gateway
│   │   ├── types/
│   │   │   ├── index.ts          # Strict TypeScript interfaces
│   │   │   └── amplify.d.ts      # Typing definitions for AWS Amplify UI
│   │   ├── App.tsx               # Client-side routing (/ dan /admin)
│   │   ├── index.css             # Tactile cards, hard shadows & animations
│   │   └── main.tsx
│   ├── package.json              # Include @aws-amplify/ui-react & aws-amplify
│   └── vite.config.ts            # Server port 5173
│
├── backend/                      # Serverless API (Target: AWS Lambda + EDA)
│   ├── prisma/
│   │   └── schema.prisma         # Event, TicketTier (version lock), Booking
│   ├── src/
│   │   ├── db/
│   │   │   ├── client.ts         # Prisma client singleton (reused across warm Lambdas)
│   │   │   └── seed.ts           # Seeder data konser & kuota tiket
│   │   ├── handlers/             # Single Responsibility Lambda functions
│   │   │   ├── health.ts         # GET /health
│   │   │   ├── getEvents.ts      # GET /events
│   │   │   ├── getTicketTiers.ts # GET /tickets/tiers
│   │   │   ├── enqueueBooking.ts # POST /tickets/book (SQS Producer)
│   │   │   ├── bookSeat.ts       # SQS Consumer (OCC Concurrency Lock Worker)
│   │   │   ├── simulatePayment.ts# POST /tickets/simulate-payment (EventBridge Emitter)
│   │   │   ├── generateTicketPdf.ts # Step Functions Task 1 (S3 PDF Generator)
│   │   │   ├── broadcastNotification.ts # Step Functions Task 2 (SNS Publisher)
│   │   │   ├── getAdminStats.ts  # GET /admin/stats (Cognito Protected)
│   │   │   ├── getBookingStatus.ts # GET /bookings/status
│   │   │   └── initDB.ts         # Serverless DB Init & Seeding (Manual trigger)
│   │   ├── utils/
│   │   │   ├── apiResponse.ts    # Standard API Gateway response formatting + CORS
│   │   │   ├── awsClients.ts     # Reusable AWS SDK v3 singletons (SQS, EventBridge, SNS)
│   │   │   └── types.ts          # Backend TypeScript interfaces
│   │   └── devServer.ts          # Local dev API Gateway runner (port 3000)
│   ├── package.json              # Include @aws-sdk clients & step functions plugin
│   └── serverless.yml            # Complete Serverless IaC + EDA resources
│
├── AGENTS.md                     # Engineering constraints & guidelines
└── README.md                     # Dokumentasi arsitektur & panduan sistem
```

---

## Daftar Endpoint API

Semua endpoint mengembalikan respons standar format `{ "success": boolean, "data": ..., "message": ... }`:

| Method | Endpoint | Trigger / Event | Deskripsi & Fungsi | File Handler |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/health` | API Gateway HTTP | Cek status kesehatan dan uptime backend API | [`health.ts`](backend/src/handlers/health.ts) |
| `GET` | `/events` | API Gateway HTTP | Mengambil detail konser, lokasi GBK, dan tanggal | [`getEvents.ts`](backend/src/handlers/getEvents.ts) |
| `GET` | `/tickets/tiers` | API Gateway HTTP | Mengambil daftar kategori tiket (*FESTIVAL A/B, VIP*), kuota live | [`getTicketTiers.ts`](backend/src/handlers/getTicketTiers.ts) |
| `POST` | `/tickets/book` | API Gateway HTTP | Memasukkan booking ke antrean `BookingQueue` (SQS Producer) | [`enqueueBooking.ts`](backend/src/handlers/enqueueBooking.ts) |
| `N/A` | `N/A` | Amazon SQS Event | Worker pemesanan tiket dengan transaksi atomik dan OCC | [`bookSeat.ts`](backend/src/handlers/bookSeat.ts) |
| `POST` | `/tickets/simulate-payment` | API Gateway HTTP | Update status `PAID` dan emit event `OrderPaid` ke EventBridge | [`simulatePayment.ts`](backend/src/handlers/simulatePayment.ts) |
| `N/A` | `N/A` | Step Functions Task 1 | Simulasi render file PDF e-tiket ke bucket S3 | [`generateTicketPdf.ts`](backend/src/handlers/generateTicketPdf.ts) |
| `N/A` | `N/A` | Step Functions Task 2 | Broadcast konfirmasi pemesanan ke topik Amazon SNS | [`broadcastNotification.ts`](backend/src/handlers/broadcastNotification.ts) |
| `GET` | `/admin/stats` | HTTP (Cognito JWT) | Statistik promotor, revenue, live inventory, log audit transaksi | [`getAdminStats.ts`](backend/src/handlers/getAdminStats.ts) |
| `GET` | `/bookings/status` | API Gateway HTTP | Memeriksa rincian e-tiket, QR payload, dan verifikasi pembayaran | [`getBookingStatus.ts`](backend/src/handlers/getBookingStatus.ts) |
| `N/A` | `N/A` | Manual Lambda Invoke | Inisialisasi DDL skema dan data seeder konser | [`initDB.ts`](backend/src/handlers/initDB.ts) |

---

## Panduan Menjalankan Aplikasi

### 1. Database PostgreSQL (Lokal via Docker)
Jalankan container PostgreSQL pada port `5433`:
```bash
docker run --name ticket-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=ticket_booking \
  -p 5433:5432 -d postgres:15-alpine
```

Sinkronkan skema Prisma dan lakukan seeder data awal:
```bash
cd backend
npx prisma db push
npm run prisma:seed
```

### 2. Backend (Port 3000)
Jalankan dev server API Gateway lokal:
```bash
cd backend
npm install
npm run dev
# Server aktif di http://localhost:3000/dev
```

Untuk memverifikasi endpoint:
```bash
curl http://localhost:3000/dev/health
curl http://localhost:3000/dev/tickets/tiers
curl http://localhost:3000/dev/admin/stats
```

### 3. Frontend (Port 5173)
Pastikan `VITE_API_URL` pada `frontend/.env` mengarah ke backend:
```env
VITE_API_URL="http://localhost:3000/dev"
```

Jalankan server Vite frontend:
```bash
cd frontend
npm install
npm run dev
# Buka http://localhost:5173 di browser
# Buka http://localhost:5173/admin untuk Operator Console
```

---

## CI/CD Deployment via GitHub Actions

Repositori dilengkapi dengan dua alur kerja GitHub Actions otomatis di direktori `.github/workflows/`:

1. **Frontend CI/CD (`frontend-deploy.yml`)**:
   - Terpicu saat push ke `main`/`master` pada path `frontend/**`.
   - Menginstal dependensi (`npm ci`), memvalidasi TypeScript, dan membuat build produksi (`npm run build`).
2. **Backend CI/CD (`backend-deploy.yml`)**:
   - Terpicu saat push ke `main`/`master` pada path `backend/**`.
   - Mengonfigurasi kredensial AWS via GitHub Secrets (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`).
   - Menjalankan `npx prisma generate` dan mendeply seluruh stack Serverless ke lingkungan produksi AWS (`npx serverless deploy --stage prod`).
