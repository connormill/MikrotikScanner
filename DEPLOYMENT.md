# MikroNet Deployment Guide

## Quick Start with Docker

### Prerequisites
- Docker and Docker Compose installed
- Access to your MikroTik router network
- PostgreSQL database (included in docker-compose setup)

### 1. Get the Code

**Option A: Download from Replit**
1. In your Replit workspace, click the three dots menu (⋮)
2. Select "Download as zip"
3. Transfer the zip file to your VM and extract it:
```bash
unzip mikronet.zip
cd mikronet
```

**Option B: Push to GitHub (Recommended)**
1. In Replit, open the Git pane from the Tools section
2. Connect to GitHub and push your code
3. Clone from GitHub on your VM:
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
```

**Configure Environment:**
```bash
# Create environment file
cp .env.example .env

# Edit .env with your credentials
nano .env
```

### 2. Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Database
POSTGRES_PASSWORD=your_secure_database_password

# MikroTik Router Credentials
MIKROTIK_USERNAME=admin
MIKROTIK_PASSWORD=your_mikrotik_password

# Session Secret (generate a random string)
SESSION_SECRET=your_random_secret_key_here
```

### 3. Deploy with Docker Compose

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down

# Stop and remove all data
docker-compose down -v
```

### 4. Access the Application

Once deployed, access MikroNet at:
- **Web UI**: http://localhost:5000
- **API**: http://localhost:5000/api

## Production Deployment

### Security Considerations

1. **Change default passwords**: Update all passwords in `.env`
2. **Use strong session secret**: Generate a cryptographically random string
3. **Enable HTTPS**: Use a reverse proxy (nginx, Caddy, Traefik)
4. **Firewall rules**: Only expose port 5000 to trusted networks
5. **Database backups**: Configure regular PostgreSQL backups

### Reverse Proxy Setup (nginx)

```nginx
server {
    listen 80;
    server_name mikronet.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # For Server-Sent Events (scan progress)
    location /api/scans {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding off;
    }
}
```

### Database Backups

```bash
# Backup PostgreSQL database
docker-compose exec postgres pg_dump -U mikronet mikronet > backup_$(date +%Y%m%d).sql

# Restore from backup
docker-compose exec -T postgres psql -U mikronet mikronet < backup_20240101.sql
```

## Manual Deployment (without Docker)

### Prerequisites
- Node.js 20 or later
- PostgreSQL 16 or later
- npm or yarn

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Database

```bash
# Set database connection string
export DATABASE_URL="postgresql://user:password@localhost:5432/mikronet"

# Run migrations
npm run db:push
```

### 3. Build and Run

```bash
# Build the frontend
npm run build

# Start the application
npm start

# For development
npm run dev
```

## Network Requirements

### Port Access
- **Application**: Port 5000 (can be changed via PORT env var)
- **Database**: Port 5432 (internal, not exposed)
- **MikroTik API**: Port 8728 (outbound to routers)

### Network Topology
MikroNet must be deployed on a network with direct Layer 3 connectivity to your MikroTik routers. Ensure:

1. The VM/container can reach MikroTik routers on port 8728
2. No firewalls block outbound connections to router IPs
3. MikroTik API service is enabled on all routers

### Testing Connectivity

```bash
# Test if you can reach a MikroTik router
nc -zv 10.10.254.1 8728

# If successful, you should see:
# Connection to 10.10.254.1 8728 port [tcp/*] succeeded!
```

## Monitoring and Logs

```bash
# View application logs
docker-compose logs -f app

# View database logs
docker-compose logs -f postgres

# Check container health
docker-compose ps

# View resource usage
docker stats
```

## Troubleshooting

### Cannot connect to routers
- Verify network connectivity: `ping <router-ip>`
- Check MikroTik API is enabled: `/ip service print` on router
- Verify credentials are correct
- Check firewall rules on both VM and routers

### Database connection errors
- Ensure PostgreSQL is running: `docker-compose ps`
- Check DATABASE_URL is correct
- Verify database exists: `docker-compose exec postgres psql -U mikronet -l`

### Application won't start
- Check logs: `docker-compose logs app`
- Verify all environment variables are set
- Ensure port 5000 is not already in use: `lsof -i :5000`

## Updating MikroNet

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose down
docker-compose up -d --build

# Check application started successfully
docker-compose logs -f app
```

## Support

For issues and questions:
1. Check the logs: `docker-compose logs -f app`
2. Verify network connectivity to routers
3. Review this deployment guide
4. Check application health: `curl http://localhost:5000/api/settings`
