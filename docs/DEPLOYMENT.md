# Deployment Guide

This guide covers deploying the Bus Booking System to various platforms and environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Local Development](#local-development)
- [Production Deployment](#production-deployment)
- [Docker Deployment](#docker-deployment)
- [Cloud Deployment](#cloud-deployment)
- [SSL/HTTPS Setup](#sslhttps-setup)
- [Monitoring & Logging](#monitoring--logging)
- [Backup & Recovery](#backup--recovery)

## Prerequisites

Before deployment, ensure you have:

- **Node.js 18+** installed
- **MongoDB 6.0+** installed and running
- **Git** for version control
- **PM2** (for production process management)
- **Nginx** (for reverse proxy)

## Environment Setup

### Environment Variables

Create environment files for different environments:

#### Development (.env.development)
```env
NODE_ENV=development
PORT=5001
MONGODB_URI=mongodb://localhost:27017/bus_booking_dev
JWT_SECRET=your_development_jwt_secret_key_here
JWT_EXPIRE=30d
JWT_COOKIE_EXPIRE=30
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_password
CORS_ORIGIN=http://localhost:3000
```

#### Production (.env.production)
```env
NODE_ENV=production
PORT=5001
MONGODB_URI=mongodb://your-mongodb-uri/bus_booking_prod
JWT_SECRET=your_super_secure_production_jwt_secret
JWT_EXPIRE=30d
JWT_COOKIE_EXPIRE=30
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_password
CORS_ORIGIN=https://your-domain.com
REDIS_URL=redis://localhost:6379
```

### Database Setup

1. **Install MongoDB**:
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install mongodb
   
   # macOS
   brew install mongodb-community
   
   # Windows
   # Download from https://www.mongodb.com/try/download/community
   ```

2. **Start MongoDB**:
   ```bash
   # Ubuntu/Debian
   sudo systemctl start mongodb
   sudo systemctl enable mongodb
   
   # macOS
   brew services start mongodb-community
   ```

3. **Create Database**:
   ```bash
   mongo
   use bus_booking_prod
   db.createUser({
     user: "bus_booking_user",
     pwd: "secure_password",
     roles: ["readWrite"]
   })
   ```

## Local Development

### Backend Setup

1. **Clone and install**:
   ```bash
   cd backend
   npm install
   ```

2. **Set up environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Run migrations**:
   ```bash
   npm run migrate
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. **Install dependencies**:
   ```bash
   cd user-front
   npm install
   ```

2. **Start development server**:
   ```bash
   npm start
   ```

## Production Deployment

### Manual Deployment

1. **Prepare the server**:
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2
   sudo npm install -g pm2
   
   # Install Nginx
   sudo apt install nginx -y
   ```

2. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/bus-booking-system.git
   cd bus-booking-system
   ```

3. **Install dependencies**:
   ```bash
   # Backend
   cd backend
   npm install --production
   
   # Frontend
   cd ../user-front
   npm install --production
   ```

4. **Build frontend**:
   ```bash
   npm run build
   ```

5. **Configure environment**:
   ```bash
   cd ../backend
   cp .env.example .env.production
   # Edit .env.production with production values
   ```

6. **Run migrations**:
   ```bash
   npm run migrate
   ```

7. **Start with PM2**:
   ```bash
   pm2 start server.js --name "bus-booking-backend"
   pm2 save
   pm2 startup
   ```

### Nginx Configuration

Create Nginx configuration file:

```nginx
# /etc/nginx/sites-available/bus-booking
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Frontend
    location / {
        root /var/www/bus-booking-system/user-front/build;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /socket.io {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/bus-booking /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Docker Deployment

### Dockerfile

Create `Dockerfile` in the root directory:

```dockerfile
# Multi-stage build for production
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY backend/package*.json ./backend/
COPY user-front/package*.json ./user-front/

# Install dependencies
RUN cd backend && npm ci --only=production
RUN cd user-front && npm ci

# Copy source code
COPY backend ./backend
COPY user-front ./user-front

# Build frontend
RUN cd user-front && npm run build

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/backend ./backend
COPY --from=builder --chown=nodejs:nodejs /app/user-front/build ./user-front/build

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node backend/health-check.js

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "backend/server.js"]
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5001:5001"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/bus_booking
      - JWT_SECRET=${JWT_SECRET}
      - JWT_EXPIRE=30d
      - JWT_COOKIE_EXPIRE=30
      - EMAIL_HOST=${EMAIL_HOST}
      - EMAIL_PORT=${EMAIL_PORT}
      - EMAIL_USER=${EMAIL_USER}
      - EMAIL_PASS=${EMAIL_PASS}
    depends_on:
      - mongo
    volumes:
      - ./uploads:/app/backend/uploads
    restart: unless-stopped

  mongo:
    image: mongo:6.0
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=password
    volumes:
      - mongo_data:/data/db
      - ./mongo-init.js:/docker-entrypoint-initdb.d/mongo-init.js:ro
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - app
    restart: unless-stopped

volumes:
  mongo_data:
```

### Deployment Commands

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Update and restart
docker-compose pull
docker-compose up -d
```

## Cloud Deployment

### AWS Deployment

#### EC2 Setup

1. **Launch EC2 instance**:
   - AMI: Ubuntu 22.04 LTS
   - Instance Type: t3.medium (minimum)
   - Security Group: Allow ports 22, 80, 443, 5001

2. **Connect and setup**:
   ```bash
   ssh -i your-key.pem ubuntu@your-ec2-ip
   
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker ubuntu
   
   # Install Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

3. **Deploy application**:
   ```bash
   git clone https://github.com/yourusername/bus-booking-system.git
   cd bus-booking-system
   
   # Set environment variables
   export JWT_SECRET=your_secret_key
   export EMAIL_HOST=smtp.gmail.com
   export EMAIL_USER=your_email@gmail.com
   export EMAIL_PASS=your_email_password
   
   # Start services
   docker-compose up -d
   ```

#### RDS Setup

1. **Create RDS instance**:
   - Engine: MongoDB
   - Instance Class: db.t3.micro
   - Storage: 20 GB
   - Security Group: Allow port 27017 from EC2

2. **Update connection string**:
   ```env
   MONGODB_URI=mongodb://username:password@your-rds-endpoint:27017/bus_booking
   ```

### Heroku Deployment

1. **Install Heroku CLI**:
   ```bash
   # macOS
   brew tap heroku/brew && brew install heroku
   
   # Ubuntu
   sudo snap install heroku --classic
   ```

2. **Create Heroku app**:
   ```bash
   heroku login
   heroku create your-bus-booking-app
   ```

3. **Add MongoDB addon**:
   ```bash
   heroku addons:create mongolab:sandbox
   ```

4. **Set environment variables**:
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set JWT_SECRET=your_secret_key
   heroku config:set EMAIL_HOST=smtp.gmail.com
   heroku config:set EMAIL_USER=your_email@gmail.com
   heroku config:set EMAIL_PASS=your_email_password
   ```

5. **Deploy**:
   ```bash
   git push heroku main
   ```

### Vercel Deployment (Frontend Only)

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Deploy frontend**:
   ```bash
   cd user-front
   vercel
   ```

3. **Configure environment**:
   ```bash
   vercel env add REACT_APP_API_URL
   ```

## SSL/HTTPS Setup

### Let's Encrypt with Certbot

1. **Install Certbot**:
   ```bash
   sudo apt install certbot python3-certbot-nginx -y
   ```

2. **Obtain certificate**:
   ```bash
   sudo certbot --nginx -d your-domain.com -d www.your-domain.com
   ```

3. **Auto-renewal**:
   ```bash
   sudo crontab -e
   # Add: 0 12 * * * /usr/bin/certbot renew --quiet
   ```

### Nginx SSL Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Frontend
    location / {
        root /var/www/bus-booking-system/user-front/build;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

## Monitoring & Logging

### PM2 Monitoring

```bash
# Monitor processes
pm2 monit

# View logs
pm2 logs

# Restart application
pm2 restart bus-booking-backend

# Update application
pm2 reload bus-booking-backend
```

### Log Management

Create log rotation configuration:

```bash
# /etc/logrotate.d/bus-booking
/var/log/bus-booking/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 nodejs nodejs
    postrotate
        pm2 reloadLogs
    endscript
}
```

### Health Check Endpoint

Add health check to your backend:

```javascript
// backend/routes/health.js
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version
  });
});
```

## Backup & Recovery

### Database Backup

```bash
# Create backup script
#!/bin/bash
# /usr/local/bin/backup-mongo.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/mongodb"
mkdir -p $BACKUP_DIR

# Backup database
mongodump --uri="mongodb://localhost:27017/bus_booking" --out="$BACKUP_DIR/backup_$DATE"

# Compress backup
tar -czf "$BACKUP_DIR/backup_$DATE.tar.gz" -C "$BACKUP_DIR" "backup_$DATE"

# Remove uncompressed backup
rm -rf "$BACKUP_DIR/backup_$DATE"

# Keep only last 7 days of backups
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +7 -delete

echo "Backup completed: backup_$DATE.tar.gz"
```

### Automated Backup

```bash
# Add to crontab
sudo crontab -e

# Daily backup at 2 AM
0 2 * * * /usr/local/bin/backup-mongo.sh >> /var/log/backup.log 2>&1
```

### Recovery

```bash
# Restore from backup
tar -xzf backup_20240115_020000.tar.gz
mongorestore --uri="mongodb://localhost:27017/bus_booking" backup_20240115_020000/
```

## Troubleshooting

### Common Issues

1. **Port already in use**:
   ```bash
   sudo lsof -i :5001
   sudo kill -9 <PID>
   ```

2. **MongoDB connection issues**:
   ```bash
   sudo systemctl status mongodb
   sudo systemctl restart mongodb
   ```

3. **Permission issues**:
   ```bash
   sudo chown -R nodejs:nodejs /var/www/bus-booking-system
   sudo chmod -R 755 /var/www/bus-booking-system
   ```

4. **SSL certificate issues**:
   ```bash
   sudo certbot renew --dry-run
   sudo nginx -t
   sudo systemctl reload nginx
   ```

### Performance Optimization

1. **Enable gzip compression**:
   ```nginx
   gzip on;
   gzip_vary on;
   gzip_min_length 1024;
   gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
   ```

2. **Enable caching**:
   ```nginx
   location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
       expires 1y;
       add_header Cache-Control "public, immutable";
   }
   ```

3. **Database indexing**:
   ```javascript
   // Add indexes for frequently queried fields
   db.trips.createIndex({ "from": 1, "to": 1, "departureTime": 1 });
   db.bookings.createIndex({ "userId": 1, "createdAt": -1 });
   ```

This deployment guide covers the essential steps to deploy your Bus Booking System in various environments. Adjust the configurations based on your specific requirements and infrastructure. 