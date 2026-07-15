<p align="center">
  <img src="Docs/banner.png" alt="WebPatcher Banner" width="100%" />
</p>

<h1 align="center">WebPatcher</h1>

<p align="center">
  <b>Automated Patch Recommendation Workflow for Web Application Vulnerabilities</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/MongoDB-8.x-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Express-5.x-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/LangChain-1.x-1C3C3C?style=for-the-badge&logo=langchain&logoColor=white" alt="LangChain" />
  <img src="https://img.shields.io/badge/OWASP%20ZAP-2.17-ED1C24?style=for-the-badge&logo=owasp&logoColor=white" alt="OWASP ZAP" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="License" />
</p>

<p align="center">
  <a href="#-key-features">Features</a> •
  <a href="#%EF%B8%8F-architecture">Architecture</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#%EF%B8%8F-environment-variables">Environment</a> •
  <a href="#-project-structure">Structure</a> •
  <a href="#-usage">Usage</a> •
  <a href="#-tech-stack">Tech Stack</a>
</p>

---

## 📖 Overview

**WebPatcher** is an end-to-end automated security platform that bridges the gap between **vulnerability discovery** and **code remediation**. It integrates OWASP ZAP (DAST scanning) with Large Language Models via LangChain to generate context-aware, framework-specific security patches — then validates those patches using behavioral analysis to ensure they don't break your application.

> **The Problem:** Automated scanners find hundreds of vulnerabilities, but developers spend weeks manually writing and testing patches.
>
> **The Solution:** WebPatcher scans → generates accurate code patches → validates them automatically → opens a Pull Request. End-to-end.

---

## ✨ Key Features

### 🔍 Intelligent Vulnerability Scanning
- **OWASP ZAP Integration** — Full DAST scanning with Classic Spider, AJAX Spider, and Active Scan using an aggressive "Pen Test" policy
- **Authenticated Scanning** — Configure form-based login for scanning protected application surfaces
- **Real-time Progress** — Live scan progress streamed via WebSockets (Socket.io)

### 🤖 AI-Powered Patch Generation
- **LangChain + LLM Pipeline** — Structured prompt engineering that forces the LLM to output precise JSON with reasoning, root cause analysis, vulnerable code, and suggested fixes
- **Context-Aware Patches** — Specify your tech stack (Node.js, Express, MongoDB, etc.) so patches use the correct ORM methods, middleware, and security paradigms
- **Full-File Remediation** — Patches entire source files while strictly preserving business logic

### ✅ Behavioral Patch Validation
- **Automated Validation Cycle** — Applies patches → restarts the server → re-scans with ZAP → compares before/after results
- **Behavioral Bucketing** — Normalizes API responses into semantic categories to mathematically verify patches don't introduce regressions
- **Schemathesis Fuzzing** — Property-based API testing using OpenAPI specs for rigorous pre/post-patch behavioral comparison
- **Smart Verdicts** — Automatically classifies changes as ✅ `VALID`, 🟡 `WARNING`, or 🔴 `INVALID`

### 🔗 GitHub Integration
- **Repository Cloning** — Sparse checkout of source code for patch mapping
- **Automated Pull Requests** — One-click PR creation with patched code pushed to a dedicated branch
- **GitHub OAuth** — Sign in with GitHub for seamless repository access

### 💬 BotPatcher AI Assistant
- **Built-in Chatbot** — "Webpatchy", a cybersecurity AI assistant powered by LangChain, provides real-time help with vulnerability analysis and platform navigation

### 📊 Rich Dashboard
- **Vulnerability Panel** — Browse all findings with severity badges, CWE codes, and expandable details
- **Recommendations Panel** — AI-generated fix suggestions with side-by-side code diffs
- **Statistics Panel** — Interactive donut charts and severity breakdowns
- **Compare Panel** — Scan-over-scan comparison to track vulnerability remediation progress
- **PDF Export** — One-click report export for compliance documentation

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React + Vite)                 │
│    Dashboard  •  Scan Progress  •  Code Diffs  •  BotPatcher   │
│                      Port 3000 (dev)                            │
└──────────────────────────┬──────────────────────────────────────┘
                           │ REST + WebSocket (Socket.io)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Core API Backend (Express.js)                 │
│  Auth  •  Scan Orchestration  •  Patch Applicator  •  GitHub   │
│                       Port 5050                                 │
│                                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │   MongoDB   │  │  OWASP ZAP   │  │  Validation Engine     │  │
│  │  (Mongoose) │  │  (Daemon)    │  │  Schemathesis + jq     │  │
│  │  Port 27017 │  │  Port 8080   │  │  Behavioral Bucketing  │  │
│  └─────────────┘  └──────────────┘  └────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ REST
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              LangChain Patch Generator (TypeScript)             │
│     Prompt Engineering  •  Token Management  •  Rate Limiting   │
│                       Port 3001                                 │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
                   ┌───────────────┐
                   │   LLM API     │
                   │  (OpenRouter  │
                   │   / OpenAI)   │
                   └───────────────┘
```

**Scan Lifecycle:**

```
queued → running → analyzing → patching → validating → completed
                                              │
                            ┌─────────────────┴─────────────────┐
                            │  1. Apply patches to cloned repo  │
                            │  2. Install dependencies          │
                            │  3. Start patched server          │
                            │  4. Targeted ZAP re-scan          │
                            │  5. Schemathesis behavioral test  │
                            │  6. Semantic comparison & verdict │
                            └───────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version | Required | Notes |
|------|---------|----------|-------|
| **Node.js** | ≥ 18.x | ✅ | Runtime for all services |
| **npm** | ≥ 9.x | ✅ | Package management |
| **MongoDB** | ≥ 6.x | ⚡ | Falls back to in-memory server if unavailable |
| **Java JDK** | ≥ 11 | ✅ | Required to run OWASP ZAP |
| **OWASP ZAP** | 2.17.0 | ✅ | Place in `backend/services/Zed Attack Proxy/` |
| **Python** | ≥ 3.9 | ⬜ | Optional — for Schemathesis behavioral testing |
| **Schemathesis** | Latest | ⬜ | Optional — `pip install schemathesis` |
| **Firefox + geckodriver** | Latest | ⬜ | Optional — for AJAX Spider DOM analysis |
| **jq** | Latest | ⬜ | Optional — for HAR report normalization |

### 1. Clone the Repository

```bash
git clone https://github.com/OmarHassan-99/WebPatcher.git
cd WebPatcher
```

### 2. Install Dependencies

```bash
# Install root dependencies (concurrently)
npm install

# Install all service dependencies
npm install --prefix backend
npm install --prefix frontend
npm install --prefix langchain
```

### 3. Configure Environment Variables

Create the file `backend/.env` with the following variables (see the [Environment Variables](#%EF%B8%8F-environment-variables) section for details):

```bash
cp backend/.env.example backend/.env
# Then edit backend/.env with your actual values
```

### 4. Set Up OWASP ZAP

Download [OWASP ZAP 2.17.0](https://www.zaproxy.org/download/) and place the contents (including `zap-2.17.0.jar`) inside:

```
backend/services/Zed Attack Proxy/
```

### 5. Run the Platform

```bash
# Start everything: Frontend + Backend + LangChain + Ollama + ZAP
npm run dev:full

# Without ZAP auto-start (start ZAP manually):
npm run dev:nozap

# Without ZAP or Ollama:
npm run dev
```

| Service | URL |
|---------|-----|
| **Frontend** | [http://localhost:3000](http://localhost:3000) |
| **Backend API** | [http://localhost:5050](http://localhost:5050) |
| **LangChain API** | [http://localhost:3001](http://localhost:3001) |
| **ZAP Daemon** | `http://localhost:8080` |

---

## ⚙️ Environment Variables

Create a `backend/.env` file. Below is a **simulated `.env`** with all required and optional fields:

```env
# ═══════════════════════════════════════════════════════════════
#  DATABASE
# ═══════════════════════════════════════════════════════════════
# MongoDB connection string. If unreachable, falls back to an
# in-memory MongoDB instance automatically.
MONGODB_URI="mongodb+srv://<username>:<password>@<cluster>.mongodb.net/webPatcher_db?retryWrites=true&w=majority"

# ═══════════════════════════════════════════════════════════════
#  SERVER
# ═══════════════════════════════════════════════════════════════
PORT=5050
FRONT_END_ORIGIN="http://localhost:3000"

# ═══════════════════════════════════════════════════════════════
#  SESSION & SECURITY
# ═══════════════════════════════════════════════════════════════
# Secret key for express-session. Use a strong, random string.
SECRET_SESSION_KEY="your-super-secret-session-key-here"

# Secret key for CSRF double-submit cookie protection.
CSRF_SECRET_KEY="your-csrf-secret-key-here"

# 256-bit hex key for encrypting sensitive data (e.g. GitHub tokens at rest).
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY="your-64-character-hex-encryption-key-here"

# ═══════════════════════════════════════════════════════════════
#  LANGCHAIN / AI
# ═══════════════════════════════════════════════════════════════
# URL of the LangChain patch generator microservice.
LANGCHAIN_API_URL="http://localhost:3001"
LANGCHAIN_PORT=3001

# OpenAI-compatible API key (supports OpenRouter, OpenAI, etc.)
# If using OpenRouter: https://openrouter.ai/keys
OPENAI_API_KEY="sk-or-v1-your-api-key-here"

# ═══════════════════════════════════════════════════════════════
#  GITHUB INTEGRATION
# ═══════════════════════════════════════════════════════════════
# GitHub OAuth App credentials (for "Sign in with GitHub").
# Create at: https://github.com/settings/developers
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# GitHub App credentials (for automated PR creation).
# Create at: https://github.com/settings/apps
GITHUB_APP_ID="your-github-app-id"

# The full RSA private key for your GitHub App.
# Generate from your GitHub App settings → Private keys → Generate.
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
your-private-key-content-here
-----END RSA PRIVATE KEY-----"
```

> [!TIP]
> **Quick start without external services:** You can run WebPatcher with just `MONGODB_URI`, `PORT`, `SECRET_SESSION_KEY`, `CSRF_SECRET_KEY`, and `OPENAI_API_KEY`. MongoDB will auto-fallback to an in-memory instance, and GitHub features are optional.

---

## 📁 Project Structure

```
WebPatcher/
│
├── 📂 backend/                     # Core API Server (Express.js)
│   ├── config/
│   │   ├── db.js                   # MongoDB connection (with memory-server fallback)
│   │   └── env.js                  # dotenv configuration
│   ├── controllers/
│   │   ├── chatController.js       # BotPatcher AI chatbot endpoint
│   │   ├── recommendationController.js
│   │   ├── scanController.js       # Main scan orchestration (42KB — the brain)
│   │   └── userController.js       # Auth, registration, GitHub OAuth
│   ├── middleware/
│   │   └── auth.js                 # Session authentication guard
│   ├── models/
│   │   ├── scanJobModel.js         # ScanJob schema (status, context, auth, validation)
│   │   ├── ScanReportModel.js      # Persisted scan reports
│   │   ├── ScanRecommendationModel.js
│   │   └── userModel.js            # User schema (email/password + GitHub OAuth)
│   ├── routes/
│   │   ├── scanRoutes.js           # /api/scans/*
│   │   ├── userRoute.js            # /auth/*
│   │   ├── recommendationRoutes.js # /api/recommendations/*
│   │   └── chatRoutes.js           # /api/chat/*
│   ├── services/
│   │   ├── zapService.js           # ZAP daemon control (spider + active scan)
│   │   ├── zapAuthService.js       # Authenticated scan configuration
│   │   ├── validationOrchestrator.js  # 🔑 Full validation cycle (900+ lines)
│   │   ├── patchApplicatorService.js  # Apply/rollback patches in cloned repos
│   │   ├── serverManagerService.js    # Detect runtime, start/stop patched servers
│   │   ├── githubService.js        # Repo cloning with sparse checkout
│   │   ├── pullRequestGithub.js    # Automated PR creation via Octokit
│   │   ├── DecisionMaker.js        # LLM-based decision engine
│   │   ├── patchService.js         # Patch generation coordination
│   │   ├── localPatchService.js    # Local file patch management
│   │   ├── mappingService.js       # URL → source file mapping
│   │   ├── UrlMapper.js            # Intelligent URL-to-file resolution
│   │   ├── smgrepService.js        # Semgrep static analysis integration
│   │   ├── openapiService.js       # OpenAPI spec generation
│   │   ├── openapiUpdaterService.js
│   │   ├── openapiValidationService.js
│   │   ├── schemathesisService.js  # Schemathesis API fuzzing
│   │   ├── jqNormalizerService.js  # HAR report normalization
│   │   ├── queueService.js         # RabbitMQ job queue (optional)
│   │   ├── socketService.js        # Socket.io event broadcasting
│   │   └── cleanupService.js       # Stalled scan recovery
│   ├── scripts/
│   │   ├── normalize.jq            # jq script for HAR normalization
│   │   ├── summarize.jq            # jq script for behavioral summaries
│   │   └── schemathesis-compare.js # Advanced behavioral diff engine
│   ├── workers/
│   │   └── scanWorker.js           # Background scan worker
│   ├── server.js                   # Express app entry point
│   └── .env                        # Environment variables (not committed)
│
├── 📂 frontend/                    # React SPA (Vite)
│   └── src/
│       ├── App.jsx                 # Router configuration
│       ├── pages/
│       │   ├── Home.jsx            # Landing page
│       │   ├── Auth.jsx            # Login / Register
│       │   ├── Profile.jsx         # User profile & settings
│       │   ├── Targets.jsx         # Scan history list
│       │   ├── NewTarget.jsx       # New scan wizard
│       │   ├── TargetDetails.jsx   # Scan results dashboard
│       │   └── Info.jsx            # Platform information
│       ├── components/
│       │   ├── ui/                 # Reusable UI (inputs, loading, animated BG)
│       │   │   └── BotPatcher.jsx  # Floating AI chatbot widget
│       │   ├── targets/            # Scan cards, progress panels, details
│       │   ├── forms/              # Form components
│       │   ├── layout/             # Navbar, sidebar, layout wrappers
│       │   └── sections/           # Landing page sections
│       ├── hooks/                  # Custom React hooks
│       ├── api/                    # Axios API clients
│       ├── utils/                  # Auth checks, HTTP helpers
│       ├── schemas/                # Yup validation schemas
│       ├── react-bits/             # Animated UI primitives
│       ├── lottie/                 # Lottie animation files
│       └── index.css               # Global styles & design tokens
│
├── 📂 langchain/                   # LLM Patch Generator Microservice (TypeScript)
│   └── src/
│       ├── server.ts               # Express API server
│       ├── services/
│       │   ├── PatchGenerator.ts   # Core LLM patch engine (17KB)
│       │   └── LLMProvider.ts      # LLM client abstraction
│       ├── adapters/
│       │   └── ZapFindingAdapter.ts # Normalize ZAP findings → internal format
│       ├── schemas/                # Zod schemas for structured LLM output
│       ├── types/                  # TypeScript type definitions
│       └── utils/                  # Token estimation, rate limiting
│
├── 📂 Docs/                        # Project documentation
│   ├── Documentation.md            # Full academic documentation (32KB)
│   └── banner.png                  # Repository banner
│
├── 📂 docker-files/                # Docker configurations (future)
├── 📂 web_patcher_storage/         # Cloned repos & temp storage (gitignored)
├── package.json                    # Root workspace (concurrently scripts)
└── walkthrough.md                  # Schemathesis comparison strategy guide
```

---

## 💡 Usage

### 1. Create an Account
Navigate to `http://localhost:3000/auth` and register with email/password or sign in with GitHub.

### 2. Start a New Scan
1. Click **"New Target"**
2. Enter the **target URL** (the running web app to scan)
3. *(Optional)* Enter the **GitHub repo URL** for source code access
4. Select the **tech stack context** (language, framework, database, OS)
5. *(Optional)* Configure **authentication** for scanning protected pages
6. Click **"Start Scan"**

### 3. Monitor Progress
Watch the real-time progress panel as WebPatcher:
- 🕷️ Crawls the application (Classic + AJAX Spider)
- ⚔️ Runs active vulnerability attacks
- 🔬 Analyzes and classifies findings
- 🤖 Generates AI-powered patches
- ✅ Validates patches (if repo is connected)

### 4. Review Results
- **Vulnerabilities Tab** — Browse all discovered vulnerabilities with severity, CWE, and HTTP evidence
- **Recommendations Tab** — View AI-generated patches with side-by-side code diffs
- **Statistics Tab** — Visual breakdown of vulnerability distribution
- **Compare Tab** — Compare with previous scans to track remediation progress

### 5. Deploy Fixes
- Copy the suggested patches manually, **or**
- Use the automated **GitHub PR** feature to push patches directly to your repository

---

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| **Express.js 5** | REST API framework |
| **MongoDB + Mongoose** | Document database & ODM |
| **Socket.io** | Real-time bidirectional events |
| **OWASP ZAP** | Dynamic Application Security Testing |
| **express-session + connect-mongo** | Session management |
| **csrf-csrf** | Double-submit CSRF protection |
| **bcrypt** | Password hashing |
| **jsonwebtoken** | JWT authentication |
| **Octokit** | GitHub API client |
| **RabbitMQ (amqplib)** | Optional message queue for scan jobs |

### Frontend
| Technology | Purpose |
|---|---|
| **React 19** | UI framework |
| **Vite 5** | Build tool & dev server |
| **TanStack React Query** | Server state management |
| **React Router v7** | Client-side routing |
| **Framer Motion** | Animations & transitions |
| **Tailwind CSS 4** | Utility-first styling |
| **Lucide React** | Icon library |
| **Formik + Yup** | Form handling & validation |
| **Lottie** | Animated illustrations |
| **react-hot-toast** | Toast notifications |

### AI / Security
| Technology | Purpose |
|---|---|
| **LangChain** | LLM orchestration framework |
| **OpenAI / OpenRouter** | LLM API provider |
| **TypeScript** | Type-safe LangChain service |
| **Zod** | Runtime schema validation for LLM output |
| **Schemathesis** | API property-based testing |
| **jq** | JSON normalization of HAR reports |

---

## 📋 Available Scripts

### Root

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Frontend + Backend + LangChain |
| `npm run dev:full` | Start all services including ZAP + Ollama |
| `npm run dev:nozap` | Start without ZAP (start ZAP manually) |
| `npm run zap` | Start ZAP daemon standalone |

### Backend (`cd backend/`)

| Command | Description |
|---------|-------------|
| `npm run server` | Start Express server with nodemon |
| `npm run worker` | Start background scan worker |
| `npm test` | Run Jest test suite |
| `npm run openapi:validate:latest` | Validate latest OpenAPI spec |
| `npm run schemathesis:run:latest` | Run Schemathesis against latest spec |

### Frontend (`cd frontend/`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview production build |

### LangChain (`cd langchain/`)

| Command | Description |
|---------|-------------|
| `npm run server` | Start LangChain API server |
| `npm run build` | Compile TypeScript |

---

## 🧪 Behavioral Testing

WebPatcher implements a novel **Behavioral Bucketing** strategy for patch validation. Instead of noisy byte-level diffs, it categorizes API behavior into semantic buckets:

```
Input: { name: "a" × 1000 }  →  Bucket: name_too_long
Input: { name: 123 }          →  Bucket: name_wrong_type
Response: 400 + "name required" →  Bucket: validation:name_required
```

**Verdicts per endpoint:**

| Icon | Verdict | Meaning |
|------|---------|---------|
| ✅ | `IDENTICAL` | No behavioral difference |
| 🟢 | `VALID` | All changes are expected security improvements |
| 🟡 | `WARNING` | Minor regressions — manual review recommended |
| 🔴 | `INVALID` | Significant regressions — patch broke behavior |
| ⚪ | `FUZZING_NOISE` | Minor statistical fluctuations (ignored) |

Run a standalone comparison:
```bash
node backend/scripts/schemathesis-compare.js before.har after.har
```

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Push** to the branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 👏 Acknowledgements

- **[OWASP ZAP](https://www.zaproxy.org/)** — The world's most widely used DAST tool
- **[LangChain](https://js.langchain.com/)** — Framework for building LLM applications
- **[Schemathesis](https://schemathesis.readthedocs.io/)** — Property-based API testing
- **Ain Shams University** — Faculty of Computer & Information Sciences

---

<p align="center">
  Built with ❤️ for a more secure web
</p>
