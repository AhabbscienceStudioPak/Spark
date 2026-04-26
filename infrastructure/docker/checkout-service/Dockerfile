FROM python:3.11-slim AS base
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

FROM base AS builder
RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev && rm -rf /var/lib/apt/lists/*
COPY services/checkout-service/requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt
COPY packages/shared-utils /shared-utils
RUN pip install --no-cache-dir --prefix=/install /shared-utils

FROM base AS runner
RUN apt-get update && apt-get install -y --no-install-recommends libpq5 && rm -rf /var/lib/apt/lists/*
COPY --from=builder /install /usr/local
COPY services/checkout-service /app
COPY packages/shared-utils /shared-utils
RUN pip install --no-cache-dir /shared-utils
EXPOSE 3003
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "3003", "--workers", "2"]
