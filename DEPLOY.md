# 狼人杀游戏部署文档

本文档提供完整的部署指南，包括本地开发环境、Docker 部署和生产环境部署。

## 目录

- [系统要求](#系统要求)
- [本地开发环境](#本地开发环境)
- [Docker 部署](#docker-部署)
- [生产环境部署](#生产环境部署)
- [环境变量配置](#环境变量配置)
- [SSL/HTTPS 配置](#sslhttps-配置)
- [监控与日志](#监控与日志)
- [常见问题](#常见问题)

---

## 系统要求

### 最低配置

| 组件 | 要求 |
|------|------|
| CPU | 2 核 |
| 内存 | 4 GB |
| 存储 | 20 GB SSD |
| 网络 | 100 Mbps |

### 推荐配置

| 组件 | 要求 |
|------|------|
| CPU | 4 核 |
| 内存 | 8 GB |
| 存储 | 50 GB SSD |
| 网络 | 1 Gbps |

### 软件要求

- **Node.js**: v18.0.0 或更高版本
- **Bun**: v1.0.0 或更高版本（用于运行测试）
- **Docker**: v20.10 或更高版本
- **Docker Compose**: v2.0 或更高版本

---

## 本地开发环境

### 1. 克隆项目

```bash
git clone <repository-url>
cd workspace
```

### 2. 启动 Nakama 服务器

```bash
# 进入后端目录
cd nakama

# 安装依赖
npm install

# 编译 TypeScript
npm run build

# 返回项目根目录
cd ..

# 配置本地密钥（必需；.env 已 gitignore，勿提交）
cp .env.example .env
# 编辑 .env，为 NAKAMA_CONSOLE_* 与 NAKAMA_RUNTIME_HTTP_KEY 设置强随机值

# 启动 Docker 服务（Nakama + CockroachDB，本地开发）
# 注意：Cockroach 使用 --insecure，仅适用于本机开发；共享/生产环境需另行配置 TLS/认证
docker compose --env-file .env up -d

# 查看日志
docker compose logs -f nakama
```

### 3. 启动前端开发服务器

```bash
# 新开一个终端
cd client

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 4. 访问服务

| 服务 | 地址 | 绑定 |
|------|------|------|
| 前端应用 | http://localhost:3000 | — |
| Nakama HTTP API | http://localhost:7350 | 全接口（开发） |
| Nakama Console | http://localhost:7351 | `127.0.0.1` only |
| Nakama gRPC | http://localhost:7349 | 全接口（开发） |
| CockroachDB Console | http://localhost:8080 | `127.0.0.1` only |
| CockroachDB SQL | localhost:26257 | `127.0.0.1` only |

Nakama 控制台凭证来自 `.env`（见 `.env.example`），仓库不再提交默认账号密码。
历史上曾提交过的弱密钥如仍在线上使用，请立即轮换。
### 5. 运行测试

```bash
cd nakama

# 运行所有测试
npm run test

# 监听模式运行测试
npm run test:watch
```

---

## Docker 部署

### 基础部署

项目已包含本地开发用 `docker-compose.yml`（需先配置 `.env`）：

```bash
cp .env.example .env   # 首次：填入强随机密钥
# 构建并启动所有服务
docker compose --env-file .env up -d --build

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f
```

### 服务说明

| 服务 | 镜像 | 端口（宿主机） |
|------|------|----------------|
| nakama | registry.heroiclabs.com/heroiclabs/nakama:3.21.1 | 7349, 7350；控制台 `127.0.0.1:7351` |
| cockroachdb | cockroachdb/cockroach:v23.1.11 | `127.0.0.1:26257` / `127.0.0.1:8080`（`--insecure`，仅本地） |

### 数据持久化

数据存储在 Docker volume 中：
- `cockroachdb_data`: 数据库数据

```bash
# 查看 volumes
docker volume ls

# 备份数据
docker run --rm -v cockroachdb_data:/data -v $(pwd):/backup alpine tar cvf /backup/cockroachdb-backup.tar /data
```

### 停止服务

```bash
# 停止服务（保留数据）
docker-compose down

# 停止服务并删除数据
docker-compose down -v
```

---

## 生产环境部署

### 方案一：Docker Compose 部署

#### 1. 准备生产配置

创建 `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  cockroachdb:
    image: cockroachdb/cockroach:v23.1.11
    container_name: werewolf-cockroachdb
    command: start-single-node --insecure --store=attrs=ssd,path=/var/lib/cockroach/
    restart: always
    volumes:
      - cockroachdb_data:/var/lib/cockroach
    networks:
      - werewolf-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health?ready=1"]
      interval: 10s
      timeout: 5s
      retries: 5

  nakama:
    image: registry.heroiclabs.com/heroiclabs/nakama:3.21.1
    container_name: werewolf-nakama
    entrypoint:
      - "/bin/sh"
      - "-ec"
      - >
        /nakama/nakama migrate up --database.address root@cockroachdb:26257 &&
        exec /nakama/nakama --config /nakama/data/nakama-config.yml
        --database.address root@cockroachdb:26257
        --console.username "$$NAKAMA_CONSOLE_USERNAME"
        --console.password "$$NAKAMA_CONSOLE_PASSWORD"
        --console.signing_key "$$NAKAMA_CONSOLE_SIGNING_KEY"
        --runtime.http_key "$$NAKAMA_RUNTIME_HTTP_KEY"
    restart: always
    depends_on:
      cockroachdb:
        condition: service_healthy
    volumes:
      - ./nakama-config.prod.yml:/nakama/data/nakama-config.yml:ro
      - ./nakama/build:/nakama/data/modules:ro
    ports:
      - "7350:7350"
    networks:
      - werewolf-network
    environment:
      - TZ=Asia/Shanghai
      - NAKAMA_CONSOLE_USERNAME=${NAKAMA_CONSOLE_USERNAME:?required}
      - NAKAMA_CONSOLE_PASSWORD=${NAKAMA_CONSOLE_PASSWORD:?required}
      - NAKAMA_CONSOLE_SIGNING_KEY=${NAKAMA_CONSOLE_SIGNING_KEY:?required}
      - NAKAMA_RUNTIME_HTTP_KEY=${NAKAMA_RUNTIME_HTTP_KEY:?required}

  nginx:
    image: nginx:alpine
    container_name: werewolf-nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./client/dist:/usr/share/nginx/html:ro
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - nakama
    networks:
      - werewolf-network

networks:
  werewolf-network:
    driver: bridge

volumes:
  cockroachdb_data:
    driver: local
```

#### 2. 创建生产 Nakama 配置

创建 `nakama-config.prod.yml`:

```yaml
name: werewolf-game
data_dir: /nakama/data

logger:
  stdout: true
  level: warn
  format: json

metrics:
  reporting_freq_sec: 60
  namespace: werewolf

runtime:
  js_entrypoint: build/index.js
  # http_key 通过 --runtime.http_key / 环境变量注入，勿写入仓库
  env:
    - GAME_NAME=werewolf
    - MIN_PLAYERS=6
    - MAX_PLAYERS=18
    - DEFAULT_PLAYERS=9

session:
  token_expiry_sec: 7200
  refresh_token_expiry_sec: 604800

socket:
  max_message_size_bytes: 4096
  max_request_size_bytes: 131072
  read_buffer_size_bytes: 4096
  write_buffer_size_bytes: 4096

match:
  input_queue_size: 128
  call_queue_size: 128
  max_empty_sec: 300

console:
  port: 7351
  address: "127.0.0.1"
  # username / password / signing_key 通过 CLI 与环境变量注入，勿写入仓库
```

生产环境务必使用密钥管理或 `.env`（勿提交）提供 `NAKAMA_CONSOLE_*` 与 `NAKAMA_RUNTIME_HTTP_KEY`。
共享/生产环境的 Cockroach 应启用 TLS 与认证；本仓库 compose 的 `--insecure` 仅用于本地开发。

#### 3. 创建 Nginx 配置

创建 `nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    sendfile on;
    keepalive_timeout 65;
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # Upstream for Nakama
    upstream nakama {
        server nakama:7350;
        keepalive 64;
    }

    # HTTP -> HTTPS redirect
    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
        ssl_prefer_server_ciphers off;

        # Frontend static files
        root /usr/share/nginx/html;
        index index.html;

        location / {
            try_files $uri $uri/ /index.html;
        }

        # Nakama API proxy
        location /v2/ {
            proxy_pass http://nakama;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # WebSocket support
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_read_timeout 86400;
        }
    }
}
```

#### 4. 构建和部署

```bash
# 构建前端
cd client
npm run build
cd ..

# 构建后端
cd nakama
npm run build
cd ..

# 启动生产环境
docker-compose -f docker-compose.prod.yml up -d
```

### 方案二：云平台部署

#### AWS 部署架构

```
┌─────────────────────────────────────────────────────────────┐
│                        CloudFront (CDN)                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    Application Load Balancer                │
└────────────┬─────────────────────────────────┬──────────────┘
             │                                 │
┌────────────▼────────────┐      ┌─────────────▼─────────────┐
│   ECS Fargate (Nakama)  │      │   S3 + CloudFront (前端)  │
│   - 2+ 容器实例          │      │   - 静态文件托管          │
│   - Auto Scaling        │      │   - PWA 支持              │
└────────────┬────────────┘      └───────────────────────────┘
             │
┌────────────▼────────────┐
│   RDS PostgreSQL        │
│   - Multi-AZ 部署       │
│   - 自动备份            │
└─────────────────────────┘
```

#### 阿里云部署示例

```bash
# 使用阿里云容器服务 ACK

# 1. 创建镜像仓库并推送镜像
docker tag werewolf-nakama registry.cn-hangzhou.aliyuncs.com/your-namespace/werewolf-nakama:latest
docker push registry.cn-hangzhou.aliyuncs.com/your-namespace/werewolf-nakama:latest

# 2. 创建 Kubernetes 部署配置
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
```

---

## 环境变量配置

### Nakama 密钥（必需，见 `.env.example`）

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `NAKAMA_CONSOLE_USERNAME` | 控制台用户名 | 无（必须设置） |
| `NAKAMA_CONSOLE_PASSWORD` | 控制台密码 | 无（必须设置） |
| `NAKAMA_CONSOLE_SIGNING_KEY` | 控制台会话签名密钥 | 无（必须设置） |
| `NAKAMA_RUNTIME_HTTP_KEY` | Runtime HTTP key | 无（必须设置） |

### Nakama 游戏配置

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `GAME_NAME` | 游戏名称 | werewolf |
| `MIN_PLAYERS` | 最小玩家数 | 6 |
| `MAX_PLAYERS` | 最大玩家数 | 18 |
| `DEFAULT_PLAYERS` | 默认玩家数 | 9 |

### 前端配置

在生产环境构建前端时，可以设置以下环境变量：

```bash
# .env.production
VITE_NAKAMA_HOST=your-domain.com
VITE_NAKAMA_PORT=443
VITE_NAKAMA_USE_SSL=true
```

前端代码中使用：

```typescript
const host = import.meta.env.VITE_NAKAMA_HOST || 'localhost';
const port = import.meta.env.VITE_NAKAMA_PORT || '7350';
const useSSL = import.meta.env.VITE_NAKAMA_USE_SSL === 'true';
```

---

## SSL/HTTPS 配置

### 使用 Let's Encrypt

```bash
# 安装 certbot
apt install certbot

# 获取证书
certbot certonly --standalone -d your-domain.com

# 证书位置
# /etc/letsencrypt/live/your-domain.com/fullchain.pem
# /etc/letsencrypt/live/your-domain.com/privkey.pem

# 复制到项目
mkdir ssl
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/
cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/

# 设置自动续期
echo "0 0 * * * certbot renew --quiet && docker-compose restart nginx" | crontab -
```

### WebSocket SSL

确保 Nginx 配置正确代理 WebSocket：

```nginx
location /v2/ {
    proxy_pass http://nakama;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 86400;
}
```

---

## 监控与日志

### 日志收集

#### 使用 Docker 日志

```bash
# 查看 Nakama 日志
docker-compose logs -f nakama

# 查看最近 100 行日志
docker-compose logs --tail=100 nakama

# 导出日志
docker-compose logs nakama > nakama.log
```

#### 配置日志级别

在 `nakama-config.yml` 中：

```yaml
logger:
  stdout: true
  level: info  # debug, info, warn, error
  format: json
```

### 监控指标

Nakama 内置 Prometheus 指标：

```yaml
# nakama-config.yml
metrics:
  reporting_freq_sec: 60
  namespace: werewolf
  prometheus_port: 9100  # 可选，暴露 Prometheus 端口
```

#### Prometheus 配置

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'nakama'
    static_configs:
      - targets: ['nakama:9100']
```

### 健康检查

```bash
# Nakama 健康检查
curl http://localhost:7350/healthcheck

# CockroachDB 健康检查
curl http://localhost:8080/health?ready=1
```

---

## 常见问题

### 1. Docker 容器启动失败

**问题**: Nakama 容器无法启动，提示数据库连接失败

**解决方案**:
```bash
# 检查 CockroachDB 是否健康
docker-compose logs cockroachdb

# 等待数据库完全启动后重启 Nakama
docker-compose restart nakama
```

### 2. WebSocket 连接失败

**问题**: 前端无法建立 WebSocket 连接

**解决方案**:
- 检查 Nginx 是否正确配置 WebSocket 代理
- 确认防火墙允许 WebSocket 端口
- 检查 SSL 证书是否有效

```bash
# 测试 WebSocket 连接
wscat -c wss://your-domain.com/v2/ws
```

### 3. 内存不足

**问题**: Nakama 或 CockroachDB 内存溢出

**解决方案**:
```yaml
# docker-compose.yml 添加资源限制
services:
  nakama:
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G
```

### 4. 数据库迁移失败

**问题**: Nakama 启动时数据库迁移失败

**解决方案**:
```bash
# 手动执行迁移
docker-compose exec nakama /nakama/nakama migrate up --database.address root@cockroachdb:26257
```

### 5. 前端打包失败

**问题**: Vite 构建时内存不足

**解决方案**:
```bash
# 增加 Node.js 内存限制
NODE_OPTIONS=--max-old-space-size=4096 npm run build
```

### 6. PWA 不工作

**问题**: Service Worker 无法注册

**解决方案**:
- PWA 需要 HTTPS 环境
- 确认 `manifest.json` 正确配置
- 检查 Service Worker 文件是否正确生成

---

## 性能优化建议

### 1. 数据库优化

- 使用 CockroachDB 集群模式（3 节点以上）
- 配置合适的内存和存储
- 定期备份和清理过期数据

### 2. Nakama 优化

```yaml
# nakama-config.yml
socket:
  max_message_size_bytes: 4096  # 限制消息大小
match:
  max_empty_sec: 300  # 空房间超时
```

### 3. 前端优化

- 启用 Gzip 压缩
- 使用 CDN 分发静态资源
- 合理配置缓存策略

### 4. 网络优化

- 使用 CDN 加速
- 配置多区域部署
- WebSocket 连接池

---

## 安全建议

1. **更改默认密码**: 修改 Nakama Console 的默认密码
2. **限制控制台访问**: 生产环境禁止公网访问控制台
3. **启用 HTTPS**: 所有通信使用 SSL/TLS
4. **定期更新**: 保持 Nakama 和依赖包最新
5. **日志审计**: 记录所有关键操作

---

## 联系支持

如有问题，请：
1. 查看 [Nakama 官方文档](https://heroiclabs.com/docs/)
2. 提交 GitHub Issue
3. 加入社区讨论

---

*文档版本: 1.0.0*
*最后更新: 2026-01-01*
