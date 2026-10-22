FROM python:3.12-slim-bookworm

RUN apt-get update \
 && apt-get install -y --no-install-recommends libreoffice-impress fonts-noto-cjk fonts-noto-core fonts-liberation2 \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY *.py ./

ENV PYTHONUNBUFFERED=1
CMD exec gunicorn --bind :$PORT --workers 1 --threads 1 --timeout 900 main:app
