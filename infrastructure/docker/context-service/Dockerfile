FROM python:3.11-slim AS base
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

FROM base AS builder
RUN apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*
COPY services/context-service/requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt
COPY packages/shared-utils /shared-utils
RUN pip install --no-cache-dir --prefix=/install /shared-utils

FROM base AS runner
COPY --from=builder /install /usr/local
COPY services/context-service /app
COPY packages/shared-utils /shared-utils
RUN pip install --no-cache-dir /shared-utils
EXPOSE 3001
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "3001", "--workers", "2"]
