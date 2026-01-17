# AI Platform Deployment Checklist

## Pre-Deployment Checklist

### Server Preparation
- [ ] Cloud server ready (2 CPU, 4GB RAM minimum)
- [ ] OS installed (Ubuntu 20.04 LTS or CentOS 8)
- [ ] SSH access configured
- [ ] Firewall rules set (ports 80, 443 open)
- [ ] Root/sudo access available

### Domain Configuration
- [ ] Domain registered: www.aidesign.ltd
- [ ] DNS A record configured
- [ ] DNS CNAME for CDN configured (if using CDN)
- [ ] DNS propagation complete

### SSL Certificate
- [ ] SSL certificate obtained (Let's Encrypt or commercial)
- [ ] Certificate installed
- [ ] Auto-renewal configured
- [ ] HTTPS working

### Storage Setup
- [ ] Create directory: /var/www/aidesign.ltd
- [ ] Create subdirectories:
  - [ ] /var/www/aidesign.ltd/downloads
  - [ ] /var/www/aidesign.ltd/releases
  - [ ] /var/www/aidesign.ltd/releases/v1.0.0
- [ ] Set permissions: chown -R www-data:www-data /var/www/aidesign.ltd

## Application Setup

### Nginx Installation
- [ ] Install Nginx: `apt install nginx` or `yum install nginx`
- [ ] Copy nginx.conf from deploy directory
- [ ] Enable configuration: `ln -s /etc/nginx/sites-available/aidesign /etc/nginx/sites-enabled/`
- [ ] Test configuration: `nginx -t`
- [ ] Restart Nginx: `systemctl restart nginx`
- [ ] Enable auto-start: `systemctl enable nginx`

### PHP (Optional, for API)
- [ ] Install PHP-FPM
- [ ] Configure Nginx to pass PHP requests
- [ ] Test PHP functionality

## File Upload

### Build Files
- [ ] Full installer built: desk/dist/AI智能体平台 Setup 1.0.0.exe
- [ ] Update package built: desk/dist-web/nsis-web/ai-platform-desktop-1.0.0-x64.nsis.7z
- [ ] Web installer built (if applicable)

### Upload to Server
```bash
# Upload full installer
scp "desk/dist/AI智能体平台 Setup 1.0.0.exe" user@server:/var/www/aidesign.ltd/releases/v1.0.0/

# Upload update package
scp desk/dist-web/nsis-web/ai-platform-desktop-1.0.0-x64.nsis.7z user@server:/var/www/aidesign.ltd/releases/v1.0.0/

# Copy to downloads folder
ssh user@server "cp /var/www/aidesign.ltd/releases/v1.0.0/AI智能体平台\ Setup\ 1.0.0.exe /var/www/aidesign.ltd/downloads/"

# Upload version info
scp deploy/latest.json user@server:/var/www/aidesign.ltd/releases/
scp deploy/release-info.json user@server:/var/www/aidesign.ltd/releases/
```

- [ ] Full installer uploaded
- [ ] Update package uploaded
- [ ] Files copied to downloads folder
- [ ] Version info uploaded
- [ ] File permissions set correctly

## CDN Configuration (Optional)

### Setup
- [ ] CDN account created (Tencent/Alibaba/AWS/Cloudflare)
- [ ] CDN domain added: download.aidesign.ltd
- [ ] Origin server configured
- [ ] Cache rules configured
- [ ] SSL certificate uploaded to CDN
- [ ] CNAME DNS record configured
- [ ] DNS propagation complete

### Testing
- [ ] Test download from CDN
- [ ] Verify cache working
- [ ] Test from different locations
- [ ] Check SSL certificate

## Testing

### URL Testing
- [ ] Test: https://www.aidesign.ltd/downloads/AI智能体平台 Setup 1.0.0.exe
- [ ] Test: https://www.aidesign.ltd/releases/v1.0.0/AI智能体平台 Setup 1.0.0.exe
- [ ] Test: https://www.aidesign.ltd/releases/latest.json
- [ ] Test: https://www.aidesign.ltd/api/version
- [ ] Test CDN URLs (if configured)

### Functionality Testing
- [ ] Download works
- [ ] Download speed acceptable
- [ ] File integrity verified (hash match)
- [ ] Installation successful
- [ ] Web Installer works (if applicable)
- [ ] Version API returns correct data

### Security Testing
- [ ] HTTPS enforced
- [ ] SSL certificate valid
- [ ] HTTP redirects to HTTPS
- [ ] CORS headers correct
- [ ] Security headers present

### Performance Testing
- [ ] Response time < 500ms
- [ ] Download speed > 1MB/s
- [ ] Cache hit rate > 80% (if using CDN)
- [ ] No 500 errors

## Monitoring Setup

### Nginx Logs
- [ ] Access log configured
- [ ] Error log configured
- [ ] Log rotation configured
- [ ] Monitoring tools set up

### Metrics
- [ ] Bandwidth usage monitoring
- [ ] Download count tracking
- [ ] Error rate monitoring
- [ ] Response time monitoring
- [ ] Uptime monitoring

### Alerts
- [ ] Server down alert configured
- [ ] High error rate alert configured
- [ ] Disk space alert configured
- [ ] SSL expiration alert configured

## Documentation

- [ ] Deployment guide created
- [ ] API documentation created
- [ ] Troubleshooting guide created
- [ ] Team notified of deployment
- [ ] Release notes published
- [ ] Download page updated

## Post-Deployment

### Verification
- [ ] Download page accessible
- [ ] All download links work
- [ ] Version API working
- [ ] No console errors
- [ ] User testing completed

### Maintenance
- [ ] Backup plan documented
- [ ] Rollback plan documented
- [ ] Monitoring dashboard set up
- [ ] Maintenance schedule defined
- [ ] Support team informed

## Security Hardening

### Server Security
- [ ] System updated: `apt update && apt upgrade`
- [ ] Firewall enabled: `ufw enable`
- [ ] SSH key authentication enforced
- [ ] Root login disabled
- [ ] Fail2ban installed and configured
- [ ] Auto-security updates enabled

### Application Security
- [ ] File permissions correct (644 for files, 755 for directories)
- [ ] No sensitive files exposed (.git, .env, etc.)
- [ ] Directory listing disabled
- [ ] Rate limiting configured
- [ ] DDoS protection enabled (if using CDN)

### Backup
- [ ] Backup script created
- [ ] Automated backups scheduled
- [ ] Offsite backup configured
- [ ] Restore procedure tested

## Final Checklist

- [ ] All tests passed
- [ ] Documentation complete
- [ ] Team trained
- [ ] Monitoring active
- [ ] Backup configured
- [ ] Security hardening complete
- [ ] Support ready
- [ ] Go live authorized

---

## Quick Reference

### Useful Commands

```bash
# Check Nginx status
systemctl status nginx

# Test Nginx configuration
nginx -t

# Restart Nginx
systemctl restart nginx

# View Nginx logs
tail -f /var/log/nginx/aidesign-access.log
tail -f /var/log/nginx/aidesign-error.log

# Check disk space
df -h

# Check file sizes
ls -lh /var/www/aidesign.ltd/downloads/
ls -lh /var/www/aidesign.ltd/releases/

# Test download
curl -I https://www.aidesign.ltd/downloads/AI智能体平台 Setup 1.0.0.exe

# Test version API
curl https://www.aidesign.ltd/api/version

# Clear Nginx cache (if configured)
rm -rf /var/cache/nginx/*
```

### Important Paths

```
Configuration: /etc/nginx/
Sites: /var/www/aidesign.ltd/
Logs: /var/log/nginx/
SSL Certs: /etc/nginx/ssl/
```

### Contact Information

- Technical Support: tech@aidesign.ltd
- Emergency Contact: emergency@aidesign.ltd
- CDN Provider: [Your CDN Provider Support]
