# Dsync

Dsync is a modern video review and collaboration web platform inspired by Frame.io. It uses a clean black-and-white SaaS UI and includes seven core modules:

1. **Google Authentication Module** (simulated Google OAuth flow)
2. **Google Drive Integration Module** (simulated Drive connection and storage path)
3. **Video Upload & Management Module** (file upload or direct URL, list and select videos)
4. **Interactive Video Player Module** (timeline markers and timestamp comment jump)
5. **Shareable Link Module** (secure tokenized review links)
6. **Guest Comment Module** (name + email + timestamped comments without login)
7. **Dashboard Module** (overview of videos, comments, and review progress)

## Run locally

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173`.

## Notes

- This project is implemented as a lightweight front-end prototype with local storage persistence.
- Real-time comment updates are implemented via `BroadcastChannel` across open browser tabs.
- Google OAuth and Google Drive API calls are represented in a simulated UX workflow suitable for extension into production integrations.
