FROM python:3.11-slim

WORKDIR /app

RUN adduser --disabled-password --gecos "" appuser \
    && mkdir -p /model_cache \
    && chown -R appuser:appuser /model_cache

ENV HF_HOME=/model_cache

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

USER appuser

RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/paraphrase-multilingual-mpnet-base-v2')"

COPY . .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]