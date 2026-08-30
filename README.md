# Riftbound Vault

Riftbound Vault is a responsive collection manager for Riftbound cards. It tracks owned cards, storage, decks, loans, wishlist data, public friend libraries, and cloud synchronization across signed-in devices.

## Current architecture

- Static HTML, CSS, and JavaScript frontend
- Local browser state for fast interaction and offline-safe editing
- Supabase Auth and database-backed cloud synchronization
- Read-only public library snapshots for browsing friends' collections
- Generated Riftbound card and price data under `data/`
- Automatic GitHub Actions checks for JavaScript syntax, accidental secrets, and broken/duplicate page asset references

## Main features

- Card gallery with search and multi-select filters
- Quantity controls and bulk entry
- Physical storage routing and customization
- Deck management and premade deck support
- Loan tracking
- Wishlist and collection value tools
- Friend library browsing
- Full-size card inspection
- Desktop, tablet, and mobile interaction layers
- Cosmic and neon themes
- JSON backup/export
- Event-driven cloud sync without constant polling

## Data and security

The browser uses a Supabase publishable client key. Publishable keys are intended for frontend use. Access to private data is enforced by Supabase Row Level Security policies.

Do not commit service-role keys, private API keys, `.env` files, private certificates, or credentials. The repository includes an automated secret-validation workflow to catch common privileged credential patterns.

Authentication sessions are stored per the user's "Stay signed in" preference. Password inputs are cleared after authentication actions and when auth dialogs close.

## Performance notes

- Card images use lazy loading where appropriate.
- Cloud sync is event-driven and does not continuously poll the database.
- Theme-specific visual and audio assets load only for the selected theme.
- The service worker core shell is intentionally small so first visits do not trigger a large background download.

## Development

Serve the repository over HTTP rather than opening `index.html` directly:

```powershell
py -m http.server 8080
```

Then open `http://localhost:8080`.

## Card data

Card information is generated from community Riftbound data sources and updated by repository workflows. Riftbound and its artwork are owned by Riot Games. This project is not affiliated with Riot Games.
