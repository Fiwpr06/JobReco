# GraphHire

GraphHire is a state-of-the-art AI-powered job matching and recommendation platform. It leverages a Heterogeneous Graph Attention Network (HGAT) combined with dense vector embeddings to provide highly accurate, semantic job recommendations based on candidate CVs. 

Designed with a refined, professional dark-mode aesthetic, GraphHire focuses on dense information architecture to surface critical career insights—such as Skill Gap Analysis and SLWG learnability tiers—to help candidates navigate their careers.

## ✨ Features

*   **Advanced AI Matching**: Utilizes a PyTorch Geometric-based Heterogeneous Graph Attention Network (HGAT) to model complex relationships between jobs, skills, companies, and locations.
*   **Semantic Search**: Implements Meta's FAISS (IndexFlatIP) and `paraphrase-multilingual-MiniLM-L12-v2` Sentence Transformers for blazing-fast semantic retrieval of job candidates.
*   **Skill Gap Analysis (SLWG)**: Employs Skill Learnability-Weighted Gap (SLWG) analysis to categorize missing skills into "easy", "medium", and "hard" learnability tiers.
*   **Hybrid Caching Strategy**: Uses a robust multi-layer caching system (L1 In-Memory LRU + L2 Redis) to ensure low latency for high-throughput AI inference requests.
*   **Multi-Platform Ecosystem**: A cohesive monorepo housing a Next.js Web App, a React Native Mobile App, and a FastAPI Backend.

## 🛠️ Tech Stack

| Category | Technology |
| :--- | :--- |
| **Frontend (Web)** | Next.js 16, React 19, TailwindCSS v4, shadcn/ui, Zustand, Framer Motion |
| **Mobile App** | React Native 0.85, Expo 56 |
| **Backend (API)** | FastAPI, Python 3.x, Uvicorn, SQLAlchemy (Async) |
| **Machine Learning** | PyTorch, PyTorch Geometric, FAISS, Sentence-Transformers |
| **Database & Cache** | PostgreSQL (Asyncpg), Redis |
| **Monorepo Tools** | Turborepo, pnpm |

## 📁 Project Structure

This project uses a Turborepo + pnpm workspace structure:

```text
.
├── apps/
│   ├── api/            # FastAPI Backend (HGAT, FAISS, Postgres, Redis)
│   ├── mobile/         # React Native / Expo Mobile Application
│   └── web/            # Next.js Web Application (GraphHire Dashboard)
├── infra/              # Docker infrastructure (Postgres, Redis, Qdrant, Nginx)
├── packages/
│   ├── eslint-config/  # Shared ESLint configurations
│   ├── shared-types/   # Shared TypeScript types/interfaces
│   └── tsconfig/       # Shared TypeScript configurations
├── package.json        # Root workspace dependencies & scripts
├── pnpm-workspace.yaml # pnpm workspace definition
└── turbo.json          # Turborepo build pipeline
```

## 🚀 Getting Started

### 1. Install Dependencies

Make sure you have [pnpm](https://pnpm.io/) installed, then run from the root directory:

```bash
pnpm install
```

### 2. Setup Environment Variables

Create the `.env` file at the root directory:

```bash
cp .env.example .env
```
*(See the [Environment Variables](#-environment-variables) section below for details).*

### 3. Start Development Server

First, start the infrastructure services (Database, Cache, Vector DB) from the project root:

```bash
# From the project root
docker-compose -f infra/docker-compose.dev.yml up -d
```

Then, you can start the entire stack (API, Web, Mobile) simultaneously using Turborepo:

```bash
# From the project root
pnpm run dev
```

Alternatively, to run the backend separately:
```bash
cd apps/api
uvicorn app.main:app --reload
```

## 📜 Scripts

Available in the root `package.json`:

*   `pnpm run dev`: Starts all applications in development mode via Turbo.
*   `pnpm run build`: Builds all packages and applications.
*   `pnpm run lint`: Runs ESLint across the workspace.
*   `pnpm run format`: Formats code using Prettier.
*   `pnpm run generate-types`: Generates shared TypeScript types (if configured).

## 🏗️ Architecture Overview

*   **Backend (`apps/api`)**: A high-performance Python FastAPI service. It orchestrates user authentication (JWT + bcrypt), CV parsing, and job matching. The ML pipeline handles Graph Inference (PyG) and semantic similarity searches via FAISS.
*   **Frontend (`apps/web`)**: A data-forward Next.js application featuring a Bloomberg Terminal-esque dark mode aesthetic. Emphasizes legibility, radar charts, and SLWG badges to present AI intelligence professionally.
*   **Mobile (`apps/mobile`)**: A React Native app powered by Expo for seamless cross-platform mobile access.
*   **Database**: PostgreSQL stores structured relational data (Users, CVs, Jobs, Skills).
*   **Cache**: Redis serves as an L2 cache layer to store heavily requested HGAT similarity scores, minimizing duplicate computation.

## 🔐 Environment Variables

Example `.env` at the root directory:

```env
# Database & Cache
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_DB=job_matching
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/job_matching
REDIS_URL=redis://localhost:6379/0

# Security (Do NOT use default in production)
SECRET_KEY=generate_a_secure_random_key_here

# AI / ML Settings
EMBEDDING_MODEL=paraphrase-multilingual-MiniLM-L12-v2
FAISS_TOP_K_CANDIDATES=50

# Web
NODE_ENV=development
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate_another_secret_key_here
NEXT_PUBLIC_API_URL=http://localhost/api
```

## 🔌 API

The backend API is self-documented using OpenAPI. Once the backend is running, navigate to:

*   **Swagger UI**: `http://localhost:8000/docs`
*   **ReDoc**: `http://localhost:8000/redoc`

Endpoints are grouped into:
*   `/auth`: JWT login and registration
*   `/cvs`: Candidate CV management
*   `/jobs`: Job postings and semantic search
*   `/matching`: AI Graph Matching and SLWG Analysis
*   `/skills`: Skills tracking and market trends

## 🛳️ Deployment

*   **Docker Compose**: The production setup is centralized in `infra/docker-compose.yml`. It runs the full stack including API, Web, Postgres, Redis, Qdrant, Celery, and an Nginx API Gateway routing traffic between services.
*   **Backend**: Deployed within the Docker Compose stack. Ensure the ML environment has sufficient memory to load the PyTorch HGAT weights and Sentence-Transformer model.
*   **Frontend**: Built and served within the Docker Compose stack or easily deployable on Vercel.
*   **Mobile**: Deploy via Expo Application Services (EAS) for iOS TestFlight and Google Play Console.

## 🤝 Contributing

1.  Branch off `main` (`git checkout -b feature/your-feature`).
2.  Follow the workspace structure: place frontend logic in `apps/web` and backend logic in `apps/api`.
3.  Ensure your code matches the existing aesthetic and architectural vision.
4.  Run `pnpm run lint` and `pnpm run format` before pushing.
5.  Open a Pull Request describing your changes.
