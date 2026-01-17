# CDN Configuration Guide for AI Platform Downloads

## Overview
This guide provides instructions for setting up CDN acceleration for AI Platform downloads.

## Recommended CDN Providers

### 1. Tencent Cloud CDN (腾讯云CDN)
- Recommended for China region
- Fast, reliable, cost-effective
- Good integration with COS storage

### 2. Alibaba Cloud CDN (阿里云CDN)
- Excellent performance in China
- Comprehensive features
- Good for international traffic

### 3. AWS CloudFront
- Global coverage
- Advanced features
- Good for international users

### 4. Cloudflare CDN
- Free tier available
- Global network
- Easy setup

## Configuration Steps

### Option 1: Tencent Cloud CDN

#### 1. Create CDN Domain
```bash
- Login to Tencent Cloud Console
- Navigate to CDN > Domain Management
- Click "Add Domain"
- Enter: download.aidesign.ltd
- Select: Static acceleration
```

#### 2. Configure Origin Server
```
Origin Type: Domain
Origin Domain: www.aidesign.ltd
Port: 443
Protocol: HTTPS
```

#### 3. Configure Cache Rules
```
- File Extensions: exe, msi, 7z, json
- Cache Time: 365 days
- Cache Key: Ignore URL parameters
```

#### 4. Enable HTTPS
```
- Enable HTTPS
- Configure SSL certificate
- Enable HTTP/2
```

#### 5. Set Up CNAME
```
DNS Record:
Type: CNAME
Name: download
Value: [CDN-CNAME]
```

### Option 2: Alibaba Cloud CDN

#### 1. Create CDN Domain
```
- Domain Type: File Download
- Acceleration Region: Mainland China
- Origin Domain: www.aidesign.ltd
```

#### 2. Configure Cache
```
- File Extensions: exe, msi, 7z, json
- Cache Duration: 365 days
```

#### 3. Enable HTTPS
```
- Upload SSL certificate
- Enable HTTP/2
- Configure HSTS
```

### Option 3: Cloudflare CDN

#### 1. Add Site
```
- Add your domain: aidesign.ltd
- Select Free plan
```

#### 2. Configure DNS
```
Type: CNAME
Name: download
Target: www.aidesign.ltd
Proxy: Proxied (Cloud icon)
```

#### 3. Page Rules
```
Pattern: www.aidesign.ltd/downloads/*
Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 Year
  - Browser Cache TTL: 1 Year
```

## Cache Configuration

### Nginx Cache Headers
```nginx
# For installer files
location ~* \.(exe|msi|7z)$ {
    add_header Cache-Control "public, max-age=31536000, immutable";
    expires 1y;
}

# For version info files
location ~* \.json$ {
    add_header Cache-Control "public, max-age=300";  # 5 minutes for version info
    expires 5m;
}
```

### CDN Cache Settings
```
- Static files: 365 days
- Version info: 5 minutes
- HTML pages: 1 hour
```

## Performance Optimization

### 1. Compression
```nginx
# Enable gzip compression
gzip on;
gzip_types application/json application/octet-stream;
gzip_min_length 1000;
gzip_comp_level 6;
```

### 2. Brotli Compression (if available)
```nginx
brotli on;
brotli_types application/json application/octet-stream;
brotli_comp_level 6;
```

### 3. HTTP/2
```
- Enable HTTP/2 on origin server
- Enable HTTP/2 on CDN
```

### 4. Preloading
```html
<!-- In download page -->
<link rel="preconnect" href="https://download.aidesign.ltd">
```

## Monitoring

### 1. CDN Metrics to Monitor
- Hit rate (cache effectiveness)
- Bandwidth usage
- Response time
- Error rate
- Geographic distribution

### 2. Origin Metrics
- Bandwidth usage
- Request count
- Error rate

### 3. Alerts
- Set up alerts for:
  - High error rate (> 1%)
  - Slow response time (> 1s)
  - Low cache hit rate (< 80%)

## Cost Optimization

### 1. Cache Effectiveness
- Target: > 80% hit rate
- Monitor regularly
- Adjust cache rules

### 2. Bandwidth Compression
- Enable compression
- Use efficient formats
- Optimize file sizes

### 3. Regional Pricing
- Consider regional CDN providers
- Compare pricing models
- Use tiered pricing

## Security

### 1. HTTPS
- Force HTTPS on CDN
- Use strong SSL certificates
- Enable HSTS

### 2. Access Control
```
- Use CORS headers
- Implement rate limiting
- Enable DDoS protection
```

### 3. Token Authentication (Optional)
```
- Enable URL signing for sensitive files
- Use timestamp-based tokens
- Set token expiration
```

## Testing

### 1. Cache Test
```bash
# First request
curl -I https://download.aidesign.ltd/file.exe

# Second request (should hit cache)
curl -I https://download.aidesign.ltd/file.exe

# Check headers for cache hit
```

### 2. Performance Test
```bash
# Test from different locations
# Use tools like:
# - WebPageTest
# - GTmetrix
# - Pingdom
```

### 3. Global Test
```
- Test from multiple countries
- Verify edge cache works
- Check SSL certificates
```

## Troubleshooting

### 1. Cache Not Working
- Check cache configuration
- Verify CDN settings
- Check cache headers
- Clear cache manually

### 2. Slow Downloads
- Check CDN edge locations
- Verify bandwidth limits
- Check compression settings
- Monitor CDN metrics

### 3. 404 Errors
- Verify DNS configuration
- Check CNAME records
- Verify CDN domain
- Check file paths

## Maintenance

### 1. Regular Tasks
- Monitor CDN metrics
- Review cache hit rates
- Update SSL certificates
- Clear cache after updates

### 2. Version Updates
```
When releasing new version:
1. Upload new files
2. Update version info (clear cache)
3. Monitor downloads
4. Check cache hit rate
```

### 3. Documentation
- Keep configuration updated
- Document changes
- Maintain runbooks

## Contact Support

For CDN issues, contact:
- Tencent Cloud: +86 95716
- Alibaba Cloud: +86 95187
- Cloudflare: support.cloudflare.com
- AWS: AWS Support Center
