# FTD VNC GUI Browser Session - Deployment Instructions

## Overview
This guide provides step-by-step instructions for deploying the FTD VNC GUI Browser Session system on an EC2 instance. The system allows users to view and interact with GUI browser sessions through their web browsers using VNC streaming.

## Prerequisites

### EC2 Instance Requirements
- **Instance Type**: t3.large or larger (minimum 2 vCPUs, 8GB RAM)
- **Operating System**: Ubuntu 22.04 LTS
- **Storage**: 30GB+ EBS volume
- **Security Group**: Open ports 80, 443, 3001, 5901, 6080, 8080

### Security Group Configuration
```bash
# HTTP/HTTPS
Port 80 (HTTP) - 0.0.0.0/0
Port 443 (HTTPS) - 0.0.0.0/0

# VNC and noVNC
Port 5901 (VNC) - Your IP only
Port 6080 (noVNC WebSocket) - 0.0.0.0/0
Port 8080 (noVNC Web Interface) - 0.0.0.0/0

# Session API
Port 3001 (Session API) - 0.0.0.0/0

# SSH
Port 22 (SSH) - Your IP only
```

## Step 1: Initial Server Setup

### 1.1 Connect to EC2 Instance
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

### 1.2 Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.3 Install Docker and Docker Compose
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu
newgrp docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 1.4 Install Additional Dependencies
```bash
sudo apt install -y git curl wget unzip python3 python3-pip nodejs npm
```

## Step 2: Application Deployment

### 2.1 Clone Repository
```bash
cd /home/ubuntu
git clone https://github.com/your-repo/FTD_exe.git
cd FTD_exe
```

### 2.2 Create Required Directories
```bash
mkdir -p browser_sessions logs ssl mongodb-init
chmod 755 browser_sessions logs
```

### 2.3 Configure Environment Variables
```bash
# Create .env file
cat > .env << 'EOF'
# VNC Configuration
VNC_PASSWORD=your-secure-vnc-password
DISPLAY=:1
RESOLUTION=1920x1080

# Database Configuration
MONGODB_URI=mongodb://admin:your-mongo-password@mongodb:27017/ftd_database?authSource=admin
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=your-mongo-password

# API Configuration
JWT_SECRET=your-jwt-secret-key-here
JWT_EXPIRE=30d
NODE_ENV=production

# Redis Configuration
REDIS_URL=redis://redis:6379

# Application URLs
EC2_GUI_BROWSER_URL=http://vnc-gui-browser:3001
REACT_APP_API_URL=http://your-ec2-ip:5000/api
REACT_APP_VNC_URL=http://your-ec2-ip:8080
EOF
```

### 2.4 Install Python Dependencies
```bash
pip3 install -r requirements.txt
python3 -m playwright install chromium
python3 -m playwright install-deps
```

## Step 3: SSL Certificate Setup (Optional but Recommended)

### 3.1 Install Certbot
```bash
sudo apt install -y certbot
```

### 3.2 Generate SSL Certificate
```bash
# Replace with your domain
sudo certbot certonly --standalone -d your-domain.com
```

### 3.3 Copy Certificates
```bash
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ./ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ./ssl/
sudo chown ubuntu:ubuntu ./ssl/*.pem
```

## Step 4: Build and Deploy

### 4.1 Test the Deployment
```bash
# Run the deployment test
python3 test_vnc_deployment.py
```

### 4.2 Build Docker Images
```bash
# Build VNC GUI Browser image
docker build -f Dockerfile.vnc -t ftd-vnc-gui-browser .

# Build backend image (if separate)
cd backend && docker build -t ftd-backend .
cd ..

# Build frontend image (if separate)
cd frontend && docker build -t ftd-frontend .
cd ..
```

### 4.3 Start Services
```bash
# Start with Docker Compose
docker-compose -f docker-compose.vnc.yml up -d

# Check service status
docker-compose -f docker-compose.vnc.yml ps
```

### 4.4 Verify Deployment
```bash
# Check container logs
docker-compose -f docker-compose.vnc.yml logs vnc-gui-browser

# Test endpoints
curl http://localhost:3001/health
curl http://localhost:8080
```

## Step 5: Configure Nginx (Production)

### 5.1 Update Nginx Configuration
```bash
# Edit nginx.conf to match your domain
nano nginx.conf
```

### 5.2 Test Nginx Configuration
```bash
docker-compose -f docker-compose.vnc.yml exec nginx-proxy nginx -t
```

### 5.3 Reload Nginx
```bash
docker-compose -f docker-compose.vnc.yml exec nginx-proxy nginx -s reload
```

## Step 6: Monitoring and Maintenance

### 6.1 Set Up Log Rotation
```bash
sudo nano /etc/logrotate.d/ftd-vnc
```

Add:
```
/home/ubuntu/FTD_exe/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 644 ubuntu ubuntu
}
```

### 6.2 Create Systemd Service (Optional)
```bash
sudo nano /etc/systemd/system/ftd-vnc.service
```

Add:
```ini
[Unit]
Description=FTD VNC GUI Browser Service
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/ubuntu/FTD_exe
ExecStart=/usr/local/bin/docker-compose -f docker-compose.vnc.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.vnc.yml down
TimeoutStartSec=0
User=ubuntu

[Install]
WantedBy=multi-user.target
```

Enable service:
```bash
sudo systemctl enable ftd-vnc
sudo systemctl start ftd-vnc
```

### 6.3 Set Up Health Check Script
```bash
cat > health_check.sh << 'EOF'
#!/bin/bash
# Health check script for FTD VNC services

echo "Checking FTD VNC Services..."

# Check containers
docker-compose -f docker-compose.vnc.yml ps

# Check API health
curl -f http://localhost:3001/health || echo "API health check failed"

# Check noVNC
curl -f http://localhost:8080 || echo "noVNC health check failed"

# Check VNC server
docker-compose -f docker-compose.vnc.yml exec vnc-gui-browser ps aux | grep vnc || echo "VNC server check failed"

echo "Health check completed"
EOF

chmod +x health_check.sh
```

## Step 7: Integration with Existing Application

### 7.1 Update Backend Routes
Ensure your backend routes in `backend/routes/gui-browser.js` point to the correct EC2 URL:
```javascript
const EC2_GUI_BROWSER_URL = "http://your-ec2-ip:3001";
```

### 7.2 Update Frontend Configuration
Update your React app to use the VNC viewer:
```javascript
// In your frontend configuration
const VNC_URL = "http://your-ec2-ip:8080";
```

### 7.3 Database Connection
Ensure your main application can connect to the MongoDB instance running in the Docker setup.

## Step 8: Testing the Complete System

### 8.1 End-to-End Test
1. Access your main application
2. Create a new FTD lead
3. Start a GUI browser session
4. Verify the VNC stream appears in the browser
5. Test device simulation (mobile/desktop)
6. Test proxy functionality
7. Verify session cleanup

### 8.2 Performance Testing
```bash
# Monitor resource usage
docker stats

# Monitor logs
docker-compose -f docker-compose.vnc.yml logs -f
```

## Troubleshooting

### Common Issues

#### 1. VNC Server Not Starting
```bash
# Check display
echo $DISPLAY

# Check VNC processes
docker-compose -f docker-compose.vnc.yml exec vnc-gui-browser ps aux | grep vnc

# Restart VNC service
docker-compose -f docker-compose.vnc.yml restart vnc-gui-browser
```

#### 2. Browser Not Launching
```bash
# Check browser processes
docker-compose -f docker-compose.vnc.yml exec vnc-gui-browser ps aux | grep chromium

# Check logs
docker-compose -f docker-compose.vnc.yml logs vnc-gui-browser
```

#### 3. noVNC Connection Issues
```bash
# Check websocket connection
curl -H "Connection: Upgrade" -H "Upgrade: websocket" http://localhost:6080/websockify

# Check nginx proxy
docker-compose -f docker-compose.vnc.yml logs nginx-proxy
```

#### 4. Session API Issues
```bash
# Check API health
curl -v http://localhost:3001/health

# Check session creation
curl -X POST http://localhost:3001/sessions -H "Content-Type: application/json" -d '{"sessionId":"test","domain":"https://google.com"}'
```

### Log Locations
- Application logs: `/home/ubuntu/FTD_exe/logs/`
- Docker logs: `docker-compose -f docker-compose.vnc.yml logs [service]`
- System logs: `/var/log/syslog`

### Performance Optimization
1. Increase container memory limits if needed
2. Use SSD storage for better I/O performance
3. Configure swap file if memory is limited
4. Monitor CPU usage and scale instance if needed

## Security Considerations

1. **VNC Password**: Use a strong VNC password
2. **SSL/TLS**: Always use HTTPS in production
3. **Firewall**: Restrict access to necessary ports only
4. **Updates**: Keep Docker images and system updated
5. **Monitoring**: Set up monitoring for security events

## Backup and Recovery

### Database Backup
```bash
# Backup MongoDB
docker-compose -f docker-compose.vnc.yml exec mongodb mongodump --out /backup

# Backup Redis
docker-compose -f docker-compose.vnc.yml exec redis redis-cli BGSAVE
```

### Application Backup
```bash
# Backup application files
tar -czf ftd-vnc-backup-$(date +%Y%m%d).tar.gz /home/ubuntu/FTD_exe
```

## Scaling Considerations

For high-traffic deployments:
1. Use multiple EC2 instances with load balancer
2. Separate database to RDS
3. Use Redis Cluster for session management
4. Implement container orchestration with ECS or EKS

## Support and Maintenance

- Monitor logs regularly
- Set up alerts for service failures
- Keep Docker images updated
- Regular security updates
- Performance monitoring

## Conclusion

This deployment guide provides a complete setup for the FTD VNC GUI Browser Session system. Follow the steps carefully and test thoroughly before production use. For any issues, refer to the troubleshooting section or check the application logs.

Remember to:
- Replace placeholder values with your actual configuration
- Test the system thoroughly before production deployment
- Set up proper monitoring and alerting
- Keep backups of your configuration and data
- Follow security best practices

Your FTD VNC GUI Browser Session system should now be ready for production use! 