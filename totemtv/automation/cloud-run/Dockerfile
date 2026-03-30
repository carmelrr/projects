FROM python:3.11-slim

# Install FFmpeg and fonts (including Hebrew support)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    fonts-noto-core \
    fonts-noto-extra \
    && rm -rf /var/lib/apt/lists/*

# Install Noto Sans Hebrew for RTL text support
RUN apt-get update && apt-get install -y --no-install-recommends \
    fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/* \
    || true

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Cloud Run uses PORT env variable
ENV PORT=8080
EXPOSE 8080

CMD ["python", "main.py"]
