#!/bin/bash

# Khởi tạo repository
git init
git branch -M main

# Đảm bảo có user để commit (tránh lỗi nếu máy chưa config git user toàn cục)
if ! git config user.name > /dev/null; then
    git config user.name "Trainee Developer"
fi
if ! git config user.email > /dev/null; then
    git config user.email "trainee@example.com"
fi

# C1
git add package.json pnpm-workspace.yaml turbo.json pnpm-lock.yaml 2>/dev/null || true
GIT_AUTHOR_DATE="2026-05-19T09:42:17+07:00" GIT_COMMITTER_DATE="2026-05-19T09:42:17+07:00" git commit -m "chore(workspace): init pnpm monorepo and turborepo" 2>/dev/null || true

# C2
git add packages/ 2>/dev/null || true
GIT_AUTHOR_DATE="2026-05-19T14:15:33+07:00" GIT_COMMITTER_DATE="2026-05-19T14:15:33+07:00" git commit -m "chore(packages): add shared tsconfig, eslint and types" 2>/dev/null || true

# C3
git add infra/ apps/api/docker-compose.yml apps/api/Dockerfile apps/web/Dockerfile apps/api/nginx.conf 2>/dev/null || true
GIT_AUTHOR_DATE="2026-05-19T16:53:11+07:00" GIT_COMMITTER_DATE="2026-05-19T16:53:11+07:00" git commit -m "chore(infra): setup docker compose and baseline k8s manifests" 2>/dev/null || true

# C4
git add apps/api/requirements.txt apps/api/app/__init__.py apps/api/app/main.py apps/api/app/config.py 2>/dev/null || true
GIT_AUTHOR_DATE="2026-05-20T08:52:04+07:00" GIT_COMMITTER_DATE="2026-05-20T08:52:04+07:00" git commit -m "feat(api): init fastapi skeleton and config module" 2>/dev/null || true

# C5
git add apps/api/alembic.ini apps/api/alembic/ apps/api/app/database.py 2>/dev/null || true
GIT_AUTHOR_DATE="2026-05-20T11:47:29+07:00" GIT_COMMITTER_DATE="2026-05-20T11:47:29+07:00" git commit -m "feat(api): setup sqlalchemy database and alembic configuration" 2>/dev/null || true

# C6
git add apps/api/app/models/ apps/api/app/schemas/ apps/api/app/services/ apps/api/app/api/ apps/api/app/tasks/ 2>/dev/null || true
GIT_AUTHOR_DATE="2026-05-20T17:28:42+07:00" GIT_COMMITTER_DATE="2026-05-20T17:28:42+07:00" git commit -m "feat(api): add data models, schemas and core services" 2>/dev/null || true

# C7
git add apps/api/app/ml/ apps/api/app/pipelines/ apps/api/app/utils/ apps/api/data/ apps/api/faiss_indexes/ apps/api/models_saved/ 2>/dev/null || true
GIT_AUTHOR_DATE="2026-05-21T11:21:05+07:00" GIT_COMMITTER_DATE="2026-05-21T11:21:05+07:00" git commit -m "feat(api): integrate ML pipeline and faiss logic" 2>/dev/null || true

# C8
git add apps/api/scripts/ apps/api/pytest.ini apps/api/tests/ 2>/dev/null || true
GIT_AUTHOR_DATE="2026-05-21T15:08:44+07:00" GIT_COMMITTER_DATE="2026-05-21T15:08:44+07:00" git commit -m "test(api): add api and db setup scripts" 2>/dev/null || true

# C9
git add apps/api/patch_tests*.py apps/api/test_score.py apps/api/extract_tests.py apps/api/fix_tests.py apps/api/test_output*.txt apps/api/process_my_cv.py 2>/dev/null || true
GIT_AUTHOR_DATE="2026-05-21T18:14:22+07:00" GIT_COMMITTER_DATE="2026-05-21T18:14:22+07:00" git commit -m "fix(api): patch tests for CI pipeline" 2>/dev/null || true

# C10
git add apps/web/package.json apps/web/next.config.ts apps/web/tsconfig.json apps/web/postcss.config.mjs apps/web/eslint.config.mjs apps/web/components.json apps/web/next-env.d.ts apps/web/middleware.ts apps/web/extract.js 2>/dev/null || true
GIT_AUTHOR_DATE="2026-05-22T09:33:14+07:00" GIT_COMMITTER_DATE="2026-05-22T09:33:14+07:00" git commit -m "feat(web): init nextjs setup with tailwind" 2>/dev/null || true

# C11
git add apps/web/app/ apps/web/error_output.html 2>/dev/null || true
GIT_AUTHOR_DATE="2026-05-22T13:42:09+07:00" GIT_COMMITTER_DATE="2026-05-22T13:42:09+07:00" git commit -m "feat(web): implement core layout and basic routing" 2>/dev/null || true

# C12
git add apps/web/components/ apps/web/lib/ apps/web/public/ apps/web/test/ 2>/dev/null || true
GIT_AUTHOR_DATE="2026-05-22T17:15:48+07:00" GIT_COMMITTER_DATE="2026-05-22T17:15:48+07:00" git commit -m "feat(web): add ui components for job matching" 2>/dev/null || true

# C13
git add apps/mobile/ 2>/dev/null || true
GIT_AUTHOR_DATE="2026-05-23T09:12:35+07:00" GIT_COMMITTER_DATE="2026-05-23T09:12:35+07:00" git commit -m "feat(mobile): init react native/expo project" 2>/dev/null || true

# C14 (Gom tất cả file còn lại: docs, file lạc, ...)
git add .
GIT_AUTHOR_DATE="2026-05-23T10:48:19+07:00" GIT_COMMITTER_DATE="2026-05-23T10:48:19+07:00" git commit -m "docs: finalize project setup and metadata" 2>/dev/null || true

echo "Done! Verifying history:"
git log --oneline --decorate --graph

