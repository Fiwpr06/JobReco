# GraphHire - AI-Powered Job Recommendation System

GraphHire is a state-of-the-art job matching and recommendation platform powered by Artificial Intelligence. It leverages a Heterogeneous Graph Attention Network (HGAT) combined with dense vector embeddings to deliver highly accurate, semantic job recommendations tailored specifically to a candidate's CV and skill set.

Designed with a refined, professional dark-mode aesthetic akin to a Bloomberg Terminal, GraphHire focuses on a dense information architecture. It surfaces critical career insights—such as Skill Gap Analysis and SLWG learnability tiers—helping candidates navigate their careers efficiently and recruiters find the perfect match with data-driven confidence.

## ✨ Key Features

*   **Advanced AI Graph Matching (HGAT)**: At the core of GraphHire is a PyTorch Geometric-based Heterogeneous Graph Attention Network. It models the intricate, multi-layered relationships between Jobs, Skills, Candidates, and Companies. Unlike traditional keyword matching, the attention mechanism dynamically weighs the importance of different skills, offering context-aware and deeply personalized recommendations.
*   **Deep Semantic Search Engine**: GraphHire implements Meta's FAISS (IndexFlatIP) and `paraphrase-multilingual-MiniLM-L12-v2` Sentence Transformers. This converts job descriptions and CVs into dense, high-dimensional vector embeddings, enabling blazing-fast semantic retrieval that understands the *meaning* behind the text, not just exact keyword matches.
*   **Skill Gap Analysis & SLWG Tiering**: Our proprietary Skill Learnability-Weighted Gap (SLWG) analysis provides candidates with an actionable career roadmap. Instead of merely listing missing skills, it categorizes them into "easy", "medium", and "hard" learnability tiers based on the candidate's existing knowledge graph, allowing them to strategically prioritize their upskilling.
*   **Generative AI Explanations**: Integrates with Groq API (`llama-3.3-70b-versatile`) to generate highly personalized, natural-language career advice based on the candidate's exact skill gaps, penalty scores, and learnability tiers at ultra-fast speeds.
*   **Automated CV Parsing & Inference**: Seamlessly extracts structured data (skills, experience, education) from unstructured candidate uploads (PDF, Word). Includes an intelligent title-based fallback mechanism that can accurately infer years of experience based on position levels (e.g., Intern, Junior, Senior, CTO).
*   **High-Performance Hybrid Caching**: Designed for high throughput, the system employs a multi-layer caching architecture (L1 In-Memory LRU + L2 Redis). This caches computationally expensive HGAT similarity scores and vector searches, ensuring extremely low latency even under heavy user load.
*   **Multi-Platform Ecosystem**: A unified Turborepo monorepo housing a sophisticated Next.js Web Dashboard, a React Native Mobile Application for on-the-go access, and a robust FastAPI backend.

## 🛠️ Technology Stack

| Category | Technology |
| :--- | :--- |
| **Frontend (Web)** | Next.js 16, React 19, TailwindCSS v4, shadcn/ui, Zustand, Framer Motion |
| **Mobile App** | React Native 0.85, Expo 56 |
| **Backend (API)** | FastAPI, Python 3.x, Uvicorn, SQLAlchemy (Async) |
| **Machine Learning** | PyTorch, PyTorch Geometric, FAISS, Sentence-Transformers |
| **Database & Cache** | PostgreSQL (Asyncpg), Redis |
| **Monorepo Tools** | Turborepo, pnpm |

## 📁 Project Structure

This project is orchestrated using a Turborepo + pnpm workspace structure to ensure efficient builds and code sharing:

```text
.
├── apps/
│   ├── api/            # FastAPI Backend (HGAT, FAISS, Postgres, Redis, CV Parsing)
│   ├── mobile/         # React Native / Expo Mobile Application
│   └── web/            # Next.js Web Application (GraphHire Dashboard)
│       └── src/        # Frontend source code (App Router, Components, Hooks)
├── infra/              # Docker infrastructure configs (Postgres, Redis, Qdrant, Nginx)
├── packages/
│   ├── eslint-config/  # Shared ESLint configurations across apps
│   ├── shared-types/   # Shared TypeScript types and interfaces (DTOs)
│   └── tsconfig/       # Base TypeScript configurations
├── package.json        # Root workspace dependencies & scripts
├── pnpm-workspace.yaml # pnpm workspace definition
└── turbo.json          # Turborepo build pipeline configuration
```

## 🚀 Getting Started

Run the entire stack in development mode with just a few commands:

```bash
# 1. Install dependencies
pnpm install

# 2. Setup environment variables
cp .env.example .env

# 3. Start infrastructure (Postgres, Redis, VectorDB)
docker-compose -f infra/docker-compose.dev.yml up -d

# 4. Start all apps concurrently (API, Web, Mobile)
pnpm run dev
```

> **Note**: To run the backend standalone for ML testing, use `cd apps/api && uvicorn app.main:app --reload`.

## 📜 Available Scripts

These scripts are available in the root `package.json`:

*   `pnpm run dev`: Starts all applications in development mode using Turbo.
*   `pnpm run build`: Builds all packages and applications for production.
*   `pnpm run lint`: Runs ESLint across the entire workspace.
*   `pnpm run format`: Formats codebase using Prettier.
*   `pnpm run generate-types`: Generates shared TypeScript types (if configured).

## 🏗️ Architecture Overview

*   **Backend (`apps/api`)**: A high-performance Python FastAPI service. It orchestrates user authentication (JWT + bcrypt), CV parsing, and job matching. The Machine Learning pipeline handles Graph Inference (PyG) and semantic similarity searches via FAISS.
*   **Frontend (`apps/web`)**: A data-forward Next.js application featuring a Bloomberg Terminal-esque dark mode aesthetic. It emphasizes legibility and utilizes radar charts, skill heatmaps, and SLWG badges to present complex AI intelligence professionally to both candidates and recruiters.
*   **Mobile (`apps/mobile`)**: A React Native application powered by Expo, providing a seamless, cross-platform mobile experience.
*   **Database**: PostgreSQL is utilized for storing structured relational data (Users, CVs, Jobs, Skills, Applications).
*   **Cache**: Redis serves as an L2 cache layer to store heavily requested HGAT similarity scores, minimizing duplicate graph computation.

## 🔐 Environment Variables

Example `.env` configuration at the root directory:

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

# External APIs (Generative Explanations)
GROQ_API_KEY=your_groq_api_key

# Cloudinary (Image & CV Storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Payments (VietQR Integration)
BANK_ID=MB
BANK_ACCOUNT_NO=000000000
BANK_ACCOUNT_NAME=COMPANY_NAME
PAYMENT_WEBHOOK_SECRET=default-webhook-secret-change-me

# Web
NODE_ENV=development
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate_another_secret_key_here
NEXT_PUBLIC_API_URL=http://localhost/api
```

## 🔌 API Documentation

The backend API is self-documented using OpenAPI. Once the backend service is running, you can navigate to:

*   **Swagger UI**: `http://localhost:8000/docs`
*   **ReDoc**: `http://localhost:8000/redoc`

Core endpoint groups include:
*   `/auth`: JWT login and registration flows.
*   `/cvs`: Candidate CV uploading, parsing, and management.
*   `/jobs`: Job posting creation, management, and semantic search.
*   `/matching`: Triggering AI Graph Matching and SLWG Analysis.
*   `/skills`: Tracking skill taxonomies and market trends.

## 🛳️ Deployment

*   **Docker Compose**: The production setup is centralized in `infra/docker-compose.yml`. It orchestrates the full stack including the API, Web app, Postgres, Redis, Qdrant, Celery, and an Nginx API Gateway that routes traffic securely between services.
*   **Backend ML Requirements**: Deployed within the Docker Compose stack. Ensure the ML host environment has sufficient memory (RAM) to load the PyTorch HGAT weights and the Sentence-Transformer model into memory.
*   **Frontend**: Can be built and served within the Docker Compose stack or easily deployed seamlessly on Vercel.
*   **Mobile**: Deploy via Expo Application Services (EAS) for iOS TestFlight and Google Play Console distribution.

## 🤝 Contributing

1.  Branch off the `main` branch (`git checkout -b feature/your-feature-name`).
2.  Follow the workspace structure: place frontend components in `apps/web` and backend logic in `apps/api`.
3.  Ensure your code matches the existing aesthetic and architectural vision of GraphHire.
4.  Run `pnpm run lint` and `pnpm run format` before pushing your commits.
5.  Open a Pull Request describing your changes in detail.
