# Backend-only Dockerfile for Render deployment
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install Python for the session scripts
RUN apk add --no-cache python3 py3-pip

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm install --only=production

# Copy backend source code
COPY . .

# Copy Python scripts from parent directory
COPY ../agent_session_browser.py ./
COPY ../requirements.txt ./

# Install Python dependencies
RUN pip3 install -r requirements.txt

# Install Playwright
RUN python3 -m playwright install chromium

# Expose port
EXPOSE 5000

# Start the application
CMD ["npm", "start"] 