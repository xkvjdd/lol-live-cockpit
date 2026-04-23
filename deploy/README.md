# Deploy

Deployment target:

- Oracle Free VPS
- GitHub repo as source of truth
- `.env` stored only on VPS
- `systemd` service for backend
- Cloudflare Tunnel for private/safe browser access

TODO:

- Add `systemd` unit.
- Add VPS setup script.
- Add Cloudflare Tunnel notes.

## Current AWS Test Deployment

Public URL:

```text
http://15.135.167.228
```

Services on the EC2 instance:

- `nginx`
- `lol-cockpit-api.service`

Useful commands on the server:

```bash
sudo systemctl status nginx
sudo systemctl status lol-cockpit-api.service
sudo systemctl restart lol-cockpit-api.service
journalctl -u lol-cockpit-api.service -f
```

The frontend is served from:

```text
/usr/share/nginx/html/lol-live-cockpit
```

The backend/model API is served locally on the instance at:

```text
http://127.0.0.1:8765
```

Nginx proxies public `/api/...` requests to that local backend.

Do not store SSH private keys, Telegram tokens, or `.env` files in this repo or on GitHub.
