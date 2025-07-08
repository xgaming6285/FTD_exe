# Use Ubuntu as base image for better compatibility with Playwright
FROM ubuntu:22.04

# Set working directory
WORKDIR /app

# Set timezone and frontend to avoid interactive prompts
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    gnupg \
    lsb-release \
    ca-certificates \
    apt-transport-https \
    software-properties-common \
    python3 \
    python3-pip \
    python3-venv \
    build-essential \
    xvfb \
    x11-utils \
    xauth \
    dbus-x11 \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    libxss1 \
    libgconf-2-4 \
    net-tools \
    procps \
    chromium-browser \
    fonts-dejavu-core \
    nano vim git \
    && rm -rf /var/lib/apt/lists/*



# Reset frontend
ENV DEBIAN_FRONTEND=dialog

# Install Node.js 18
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs

# Copy package files
COPY backend/package*.json ./backend/
COPY requirements.txt .

# Install Node.js dependencies
RUN cd backend && npm install --only=production

# Install Python dependencies
RUN pip3 install -r requirements.txt

# Create python symlink for compatibility
RUN ln -s /usr/bin/python3 /usr/bin/python

# Install Playwright and browsers
RUN python3 -m playwright install chromium
RUN python3 -m playwright install-deps
RUN python3 -m playwright install chromium --force

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p backend/uploads backend/screenshots screenshots

# Make Python scripts executable
RUN chmod +x /app/*.py



# Set environment variables
ENV NODE_ENV=production
ENV PYTHONPATH=/app
ENV DISPLAY=:1
ENV XVFB_WHD=1920x1080x24

# Install Python dependencies
RUN python3 -m pip install --upgrade pip
RUN python3 -m pip install playwright fastapi uvicorn asyncio-mqtt pydantic

# Install Playwright browsers
RUN python3 -m playwright install chromium
RUN python3 -m playwright install-deps

# Create application directory
WORKDIR /app

# Copy application files
COPY gui_browser_session.py /app/
COPY session_api.py /app/

# Create necessary directories
RUN mkdir -p /app/sessions /app/logs /root/.config/chromium

# Expose ports
EXPOSE 5000 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

# Start the backend server
CMD ["node", "backend/server.js"] 