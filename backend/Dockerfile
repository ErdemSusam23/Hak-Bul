FROM python:3.11-slim

WORKDIR /app

# curl healthcheck için, sonra cache temizle
RUN apt-get update && apt-get install -y --no-install-recommends curl fonts-dejavu-core \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# appuser oluştur
RUN adduser --disabled-password --gecos "" appuser

# Model cache dizini
ENV HF_HOME=/home/appuser/.cache/huggingface

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt \
    && find /usr/local -type d -name __pycache__ -exec rm -rf {} +

# Modeli build sırasında indir (Railway'de cold start olmaz)
RUN python -c "\
from sentence_transformers import SentenceTransformer; \
SentenceTransformer('intfloat/multilingual-e5-base')" \
    && chown -R appuser:appuser /home/appuser/.cache

USER appuser

COPY --chown=appuser:appuser . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
