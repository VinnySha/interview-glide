# SecureBank - SDET Technical Interview

This repository contains a banking application for the Software Development Test Engineer (SDET) technical interview.

## 📋 Challenge Instructions

Please see [CHALLENGE.md](./CHALLENGE.md) for complete instructions and requirements.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start the application
npm run dev

# Open http://localhost:3000
```

## Security Configuration

Set a strong value for `SSN_ENCRYPTION_KEY` before running signup flows.

```bash
# Example: generate a random key string
openssl rand -base64 32
```

Then place it in your environment (e.g. `.env.local`):

```bash
SSN_ENCRYPTION_KEY=replace-with-generated-value
```

## 🛠 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run db:list-users` - List all users in database
- `npm run db:clear` - Clear all database data
- `npm test` - Run tests once (Vitest)
- `npm run test:watch` - Run tests in watch mode

Good luck with the challenge!
