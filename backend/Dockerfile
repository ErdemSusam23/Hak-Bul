FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

**4. `backend/.dockerignore`**
```
venv/
__pycache__/
*.pyc
.env
data/raw/
data/processed/
```

---

**5. `backend/.gitignore`**
```
venv/
__pycache__/
*.pyc
.env
data/raw/
data/processed/