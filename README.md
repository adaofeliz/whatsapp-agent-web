# WhatsApp Agent Web

A full-stack WhatsApp analytics and messaging web application that reads from [wacli](https://github.com/steipete/wacli)'s SQLite database, provides AI-powered conversation analytics, and supports intelligent auto-response capabilities.

## Features

- **Chat History Browser** - View all your WhatsApp chats with real-time sync
- **AI Analytics** - Communication style profiles, timing analysis, frequency charts, dropout detection
- **Smart Proposals** - AI generates 3 contextual reply suggestions
- **Auto-Response** - Conservative safety (5/hr limit, approval queue for first 3 messages)
- **Message Sending** - Send messages directly through the web interface

## Quick Start with Docker Compose

### Prerequisites

1. **Install and authenticate wacli on your host machine:**
   ```bash
   git clone https://github.com/steipete/wacli.git
   cd wacli
   go build -tags sqlite_fts5 -o wacli ./cmd/wacli
   ./wacli auth
   # Scan QR code with WhatsApp on your phone
   ```

2. **Install Docker and Docker Compose**

3. **Get OpenRouter API key** (optional, for AI features) at [openrouter.ai](https://openrouter.ai)

### Run the Application

```bash
# Clone this repository
git clone https://github.com/adaofeliz/whatsapp-agent-web.git
cd whatsapp-agent-web

# Configure environment
cp .env.example .env
# Edit .env and set:
# - MASTER_PASSWORD_HASH (generate with: node -e "require('bcryptjs').hash('password', 10).then(console.log)")
# - JWT_SECRET (generate with: openssl rand -base64 32)
# - OPENROUTER_API_KEY (optional)
# - WACLI_DB_PATH, WACLI_STORE_DIR, WACLI_BINARY_PATH

# Build and start
docker compose build
docker compose up -d

# Access the app at http://localhost:3000
```

## How It Works

The Docker setup mounts your host's wacli installation:

1. **Data Mount**: Your `~/.wacli` directory is mounted read-only into the container
2. **Sync Process**: The container runs `wacli sync --follow` via supervisord
3. **Database Access**: App reads from wacli.db (WhatsApp data) and writes to app.db (settings)
4. **Message Sending**: Container stops sync, sends message, then restarts sync

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MASTER_PASSWORD_HASH` | Bcrypt hash of login password | `$2a$10$...` |
| `JWT_SECRET` | Secret for session tokens | `openssl rand -base64 32` |
| `OPENROUTER_API_KEY` | API key for AI features (optional) | `sk-or-v1-...` |
| `WACLI_DB_PATH` | Path to wacli database | `/Users/you/.wacli/wacli.db` |
| `WACLI_STORE_DIR` | Path to wacli store directory | `/Users/you/.wacli` |
| `WACLI_BINARY_PATH` | Path to wacli binary | `/usr/local/bin/wacli` |
| `APP_DB_PATH` | Path to app database | `./data/app.db` |

## Troubleshooting

**"wacli.db not found"**
- Verify wacli is authenticated: `ls -la ~/.wacli/`
- Check paths in `.env` match your system

**"Permission denied" on wacli.db**
- Ensure your user owns `~/.wacli`: `chmod -R u+r ~/.wacli`

**Sync not working**
```bash
# Check process status
docker compose exec app supervisorctl status

# View logs
docker compose logs -f app | grep wacli-sync

# Restart sync
docker compose exec app supervisorctl restart wacli-sync
```

**Container issues**
```bash
# View logs
docker compose logs app

# Rebuild from scratch
docker compose down -v
docker compose up --build
```

## Management Commands

```bash
# Check status
docker compose ps

# View logs
docker compose logs -f

# Stop the app
docker compose down

# Restart
docker compose restart

# Update and rebuild
docker compose down
git pull
docker compose build
docker compose up -d
```
