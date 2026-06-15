# Start with a lightweight Node.js 20 image
FROM node:20-slim

# 🟢 NEW: Establishes a fallback timezone, dynamically overridable via your environment variables
ENV TZ=Asia/Kolkata

# Install system dependencies, Litestream, LibreOffice, Poppler, and Python runtime maps
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    tzdata \
    libreoffice \
    poppler-utils \
    gnupg \
    curl \
    git \
    python3 \
    python3-pip \
    python3-venv \
    libfontconfig1 \
    libjpeg62-turbo \
    libopenjp2-7 \
    libpng16-16 \
    libtiff6 \
    fontconfig \
    && \
    # 1. Download and install verified version of pdf2htmlEX
    wget https://github.com/pdf2htmlEX/pdf2htmlEX/releases/download/v0.18.8.rc1/pdf2htmlEX-0.18.8.rc1-master-20200630-Ubuntu-bionic-x86_64.deb && \
    dpkg -i pdf2htmlEX-0.18.8.rc1-master-20200630-Ubuntu-bionic-x86_64.deb || apt-get install -f -y && \
    rm pdf2htmlEX-0.18.8.rc1-master-20200630-Ubuntu-bionic-x86_64.deb && \
    # 2. Install Litestream
    wget https://github.com/benbjohnson/litestream/releases/download/v0.3.13/litestream-v0.3.13-linux-amd64.deb && \
    dpkg -i litestream-v0.3.13-linux-amd64.deb && \
    rm litestream-v0.3.13-linux-amd64.deb && \
    # Clean up apt caches to keep image size small
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency files first for Docker caching
COPY package*.json ./
RUN npm install

# Copies everything from your project root into the container's /app folder
COPY . .

# Ensure the isolated cluster deployment directories exist with permissions
RUN mkdir -p /app/data /app/tmp /tmp/apps && \
    chmod +x /app/run.sh && \
    chown -R 1000:1000 /app /app/tmp /tmp/apps

USER 1000
ENV PORT=7860
EXPOSE 7860

# Point directly to the root run.sh script position
ENTRYPOINT ["/bin/bash", "/app/run.sh"]