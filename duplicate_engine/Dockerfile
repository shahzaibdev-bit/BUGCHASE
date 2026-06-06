# Bug Chase – Duplicate Detection Engine
# Designed to drop straight onto a Hugging Face Space (Docker SDK).

FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    DUPLICATE_ENGINE_PORT=7860

WORKDIR /app

COPY requirements.txt ./
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY . .

EXPOSE 7860

# HF Spaces routes incoming traffic to port 7860 by default.
CMD ["python", "main.py"]
