# Runtime image for the Python API
FROM python:3.12-slim AS base
WORKDIR /app
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/src ./src
COPY database.py ./
RUN mkdir -p /data
ENV DATABASE_URL=/data/performance_hq.db
EXPOSE 8000
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
