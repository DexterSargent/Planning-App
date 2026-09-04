# Stage 1: Build React frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/public ./public
COPY frontend/src ./src
# Set API_URL to /api for the production build
ENV REACT_APP_API_URL=/api
RUN npm run build

# Stage 2: Build Python API and serve
FROM python:3.12-slim AS base
WORKDIR /app
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/src ./src

# Copy built frontend from stage 1
COPY --from=frontend-build /app/frontend/build /app/frontend/build

RUN mkdir -p /data
ENV DATABASE_URL=/data/performance_hq.db
ENV PYTHONPATH=/app/src
EXPOSE 8000
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
