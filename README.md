<div align="center">

<img src="https://img.shields.io/badge/Syntra-Backend-7c3aed?style=for-the-badge&logoColor=white" alt="Syntra Backend" />

# Syntra — Backend

### REST API + real-time server for the Syntra AI support platform.

[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com)
[![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=flat-square&logo=socketdotio&logoColor=white)](https://socket.io)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-4285F4?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev)

[Frontend Repo](#) · [Live Demo](#) · [Report Bug](#)

</div>

---

## Overview

This is the backend for **Syntra** — an AI-powered customer support platform. It handles:

- **REST API** — auth, knowledge management, chatbot config, conversations
- **AI Chat** — Google Gemini with dynamic knowledge context injection
- **Real-Time** — Socket.io for live escalation, agent handover, and messaging
- **Escalation Engine** — server-side timers, status lifecycle, email fallback

---

## ✨ Key Backend Features

### 🧠 Gemini AI with Knowledge Context
Each chat message is processed by Gemini with dynamically injected knowledge — pulled from the relevant section's sources (URLs, CSVs, custom text). The AI only answers from your content.

### ⚡ Socket.io Real-Time Engine
Built on top of Express using `http.createServer`. Rooms are created per `conversationId` and `orgId` — chatbot users see only their conversation, dashboard agents see all org escalations.

### ⏱️ Server-Side Escalation Timers
When a conversation is escalated, a 10-minute `setTimeout` starts on the server. If no agent joins:
- Conversation marked `EXPIRED`
- AI message pushed to user asking for their email
- Org owner notified via email (Nodemailer)

Timers are stored in a `Map` and cancelled immediately if an agent joins.

### 🔐 JWT Session Tokens
Chatbot widget users receive a **2-hour JWT** containing `sessionId` (conversationId) and `chatbotId`. The server verifies this token on every socket connection — no login required for end users.

### 🏢 Multi-Tenant Architecture
Every resource (chatbot, knowledge, conversation) is scoped to an `org_id`. ScaleKit handles org creation, member invites, and role management.

---

## 🗄️ Database Schema

```prisma
enum ConversationStatus {
  OPEN
  ESCALATED
  ACTIVE
  RESOLVED
  EXPIRED
}

model Conversation {
  id               String             @id @default(uuid())
  chatbot_id       String
  org_id           String
  status           ConversationStatus @default(OPEN)
  escalation_count Int                @default(0)
  escalated_at     DateTime?
  resolved_at      DateTime?
  resolved_by      String?
  client_email     String?
  visitor_ip       String?
  user_email       String?
  name             String?
  created_at       DateTime           @default(now())
  messages         Message[]
}

model Message {
  id              String       @id @default(uuid())
  conversation_id String
  role            String       // "user" | "assistant" | "agent"
  content         String
  created_at      DateTime     @default(now())
  conversation    Conversation @relation(...)
}
```

---

## 🔌 Socket Events (Server Side)

| Event | Direction | Description |
|-------|-----------|-------------|
| `join:org` | on | Agent joins org room — sees all escalations |
| `conversation:join` | on | Widget joins via JWT token — verifies + joins room |
| `join:conversation` | on | Agent joins specific conversation room |
| `join:chat` | on | Agent claims chat — cancels timer, sets ACTIVE |
| `send:message` | on | Save message to DB + broadcast to room |
| `resolve:chat` | on | Mark RESOLVED, emit to user + org |
| `new:escalation` | emit | Push to org room when chat escalated |
| `agent:joined` | emit | Push to conversation when agent joins |
| `new:message` | emit | Push message to conversation room |
| `status:update` | emit | Push status change to conversation |
| `chat:expired` | emit | Push to org room when timer expires |

---

## 🛠️ Tech Stack

| Purpose | Technology |
|---------|-----------|
| Runtime | Node.js |
| Framework | Express.js |
| Language | TypeScript |
| Real-Time | Socket.io |
| AI | Google Gemini API |
| ORM | Prisma |
| Database | PostgreSQL (Neon) |
| Auth & Orgs | ScaleKit |
| Email | Nodemailer |
| File Uploads | Multer |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database (or [Neon](https://neon.tech) account)
- Google Gemini API key
- ScaleKit account

### Installation

```bash
git clone https://github.com/gauravssharma/syntra-backend.git
cd syntra-backend
npm install
```

### Environment Variables

Create a `.env` file:

```env
DATABASE_URL=your_neon_postgres_url
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_api_key
SCALEKIT_ENV_URL=your_scalekit_env_url
SCALEKIT_CLIENT_ID=your_scalekit_client_id
SCALEKIT_CLIENT_SECRET=your_scalekit_client_secret
MAIL_USER=your_email@gmail.com
MAIL_PASS=your_app_password
CLIENT_URL=http://localhost:3000
PORT=5000
```

### Database Setup

```bash
npx prisma migrate dev
npx prisma generate
```

### Run

```bash
npm run dev
```

Server runs at [http://localhost:5000](http://localhost:5000)

---

## 📡 API Routes

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/login` | Login via ScaleKit |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/knowledge` | List knowledge sources |
| POST | `/api/knowledge` | Add knowledge source |
| GET | `/api/section` | List sections |
| POST | `/api/section` | Create section |
| GET | `/api/chatBot` | Get chatbot config |
| PUT | `/api/chatBot` | Update chatbot config |
| GET | `/api/conversation` | List conversations |
| POST | `/api/conversation/chat` | Send message to AI |
| PUT | `/api/conversation/resolve` | Resolve conversation |
| GET | `/api/organization` | Get org details |
| POST | `/api/organization/invite` | Invite member |
| POST | `/api/widget/:id` | Widget chat endpoint |

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

Part of the [Syntra](https://github.com/gauravssharma/syntra) platform · Built by [Gaurav Sharma](https://gaurav-olive.vercel.app/)

</div>
