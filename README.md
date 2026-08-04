<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# floooow

### Intelligent family finances

**A calm, private workspace for understanding your family's money.**

Track everyday spending, plan budgets, follow investments and liabilities, manage shared expenses, and use AI to turn financial documents into useful insights.

<br />

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=111827)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Drizzle-4169E1?logo=postgresql&logoColor=white)
![Firebase](https://img.shields.io/badge/Auth-Firebase-FFCA28?logo=firebase&logoColor=111827)

## What is floooow?

floooow is a full-stack family finance dashboard built for clear decisions rather than spreadsheet maintenance. The interface is Slovak-first, supports light and dark themes, and keeps the main dashboard fast by storing day-to-day UI state locally in the browser.

### Highlights

- Monthly overview of income, expenses, savings, and category spending
- Transaction tracking with categories, subcategories, comments, and bank details
- Budget limits and annual financial reports
- Investment and children's savings tracking
- Mortgage and liability monitoring
- Insurance contract management
- Family assets and shared-expense settlement tracking
- Google authentication and Google Sheets synchronization
- Gemini-powered bank statement, mortgage, investment, and budget analysis
- PostgreSQL persistence through Drizzle ORM for database-backed API operations

## Technology

| Layer | Technology |
| --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind CSS, Recharts, Lucide |
| Backend | Express, TypeScript, `tsx` |
| AI | Google Gemini via `@google/genai` |
| Authentication | Firebase Authentication with Google provider |
| Database | PostgreSQL with Drizzle ORM |
| Spreadsheet integration | Google Sheets API |

## Run locally

### Prerequisites

- Node.js 22 or newer
- npm
- PostgreSQL (optional for the basic UI, required for database API features)
- A Gemini API key (optional, required for AI features)

### 1. Install dependencies

From the project directory, run `npm install`.

### 2. Configure environment variables

Copy [.env.example](.env.example) to `.env` and fill in the values you need. For local PostgreSQL, the application uses the settings below:

| Variable | Local value or purpose |
| --- | --- |
| `SQL_HOST` | `/tmp` for the local PostgreSQL socket |
| `SQL_DB_NAME` | `floooow_finances` |
| `SQL_USER` | Your local PostgreSQL user |
| `SQL_PASSWORD` | Your local PostgreSQL password |
| `SQL_ADMIN_USER` | PostgreSQL user used by Drizzle Kit |
| `SQL_ADMIN_PASSWORD` | PostgreSQL password used by Drizzle Kit |
| `GEMINI_API_KEY` | Optional Google Gemini API key |
| `APP_URL` | `http://localhost:3000` locally |

Never commit `.env`; it is excluded by [.gitignore](.gitignore).

### 3. Create the database schema

Create a PostgreSQL database named `floooow_finances`, then apply the Drizzle schema with:

`npx drizzle-kit push --config=src/db/drizzle.config.ts`

### 4. Start the development server

Run `npm run dev`, then open [http://localhost:3000](http://localhost:3000).

The development command starts Express and mounts Vite middleware on the same port. The database connection can be checked at [http://localhost:3000/api/db/health](http://localhost:3000/api/db/health).

## Available commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Express + Vite development server |
| `npm run lint` | Run the TypeScript check without emitting files |
| `npm run build` | Build the frontend and bundle the Express server |
| `NODE_ENV=production npm start` | Start the production server after building |
| `npm run clean` | Remove generated build output |

## Architecture

The application has two runtime paths:

1. The React interface renders immediately and uses local browser storage for much of the interactive dashboard state.
2. Express exposes `/api` endpoints for Gemini operations and `/api/db` endpoints for PostgreSQL-backed operations.

This means the UI can be previewed without a database, while production use of database-backed features requires PostgreSQL and the environment variables above.

## Deployment direction

For Azure, the recommended setup is:

- Azure Static Web Apps for the Vite frontend
- Azure App Service or Azure Container Apps for the Express API
- Azure Database for PostgreSQL for persistent data
- Azure application settings for `GEMINI_API_KEY` and database credentials

The SPA routing configuration is in [public/staticwebapp.config.json](public/staticwebapp.config.json). The backend should not be deployed as static frontend code because Gemini credentials and database credentials must remain server-side.

## Security notes

- Keep Gemini and PostgreSQL credentials on the server.
- Configure Firebase authorized domains before using Google sign-in from a deployed URL.
- Use a managed secret store or Azure application settings in production.
- Review API authentication and authorization before exposing the database routes publicly.

