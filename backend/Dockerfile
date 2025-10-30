# Dockerfile for Flask + Tesseract on Cloud Run
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
WORKDIR /app

# Install system deps for tesseract/opencv
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    tesseract-ocr \
    libtesseract-dev \
    libleptonica-dev \
    libsm6 libxrender1 libxext6 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy and install python deps
COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# Copy app
COPY . .

# create uploads folder
RUN mkdir -p /app/uploads

# Cloud Run expects $PORT environment variable
ENV PORT 8080
EXPOSE 8080

# Use gunicorn for production
CMD exec gunicorn --bind :$PORT app:app --workers 1 --threads 8 --timeout 0
