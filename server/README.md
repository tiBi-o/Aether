# AetherPress Server

Backend service for AetherPress content generation and management.

## Development

Start the development server with auto-reload:

```bash
npm run dev
```

Start the production server:

```bash
npm start
```

## Testing

**IMPORTANT**: All commands must be run from within the `server/` directory.

Several test commands are available for different scenarios:

- `cd server && npm test` - Interactive development with watch mode
- `cd server && npm run test:run` - Run all tests once and exit (CI/CD or quick checks)
- `cd server && npm run test:watch` - Explicit watch mode (same as test)
- `cd server && npm run test:ci` - CI/CD with coverage reports

⚠️ Never run npm commands from the project root - there is no root package.json by design.
Each component (server, client) maintains its own independent node_modules and scripts.

### Current Coverage Status

The test suite currently has very low coverage that needs improvement:

- Total Tests: 10 (all passing)
- Files Needing Coverage:
  - aiService.js
  - check-and-migrate.js
  - crud.js
  - db.js
  - index.js
  - migrate.js

Coverage goals and improvement tasks are tracked in `docs/ISSUES.md`.
