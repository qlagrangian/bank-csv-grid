# GEMINI.md

** Think in English, interface with user in Japanese. Think Hard and do Excellent Perform. **

## Project Overview

This project is a web application for managing and analyzing bank transactions. It allows users to import bank transaction data from CSV files, categorize transactions using a hierarchical tagging system, and view aggregated financial data. The application is built with Next.js, TypeScript, and a modern frontend stack, using Prisma as the ORM for database interaction. The core feature is a data grid that provides a spreadsheet-like interface for viewing and editing transactions.

### Key Technologies

*   **Framework:** [Next.js](https://nextjs.org/)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **UI Library:** [React](https://react.dev/)
*   **Data Grid:** [React Data Grid](https://adazzle.github.io/react-data-grid/)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
*   **CSV Parsing:** [Papa Parse](https://www.papaparse.com/)
*   **ORM:** [Prisma](https://www.prisma.io/)
*   **State Management:** [Zustand](https://github.com/pmndrs/zustand)
*   **Schema Validation:** [Zod](https://zod.dev/)
*   **Testing:** [Jest](https://jestjs.io/)

### Architecture

The application follows a standard Next.js project structure.

*   The frontend is built with React components and custom hooks, located in the `src` directory.
*   The main page (`src/app/page.tsx`) serves as the central dashboard for all operations.
*   API routes are used to handle backend operations like fetching data from the database, importing CSV data, and updating transactions.
*   The database schema is defined in `prisma/schema.prisma` and consists of `Transaction`, `Tag`, `TagAssignment`, and `Loan` models.

## Building and Running

### Prerequisites

*   Node.js
*   A running PostgreSQL database instance.

### Installation

1.  Install dependencies:
    ```bash
    npm install
    ```
2.  Set up the environment variables. Create a `.env` file in the root of the project and add the `DATABASE_URL`:
    ```
    DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
    ```
3.  Apply the database schema:
    ```bash
    npx prisma db push
    ```

### Running the Development Server

To run the application in development mode, use the following command:

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

### Building for Production

To build the application for production, use the following command:

```bash
npm run build
```

### Running in Production

To run the application in production mode, use the following command:

```bash
npm run start
```

## Testing

To run the tests, use the following command:

```bash
npm run test
```

## Development Conventions

*   **Styling:** The project uses Tailwind CSS for styling. Utility classes should be used whenever possible.
*   **State Management:** Zustand is used for global state management. For local component state, use React's `useState` and `useReducer` hooks.
*   **Data Fetching:** SWR is used for data fetching on the client-side.
*   **Code Style:** The project uses ESLint and Prettier to enforce a consistent code style. Run `npm run lint` to check for linting errors.
*   **Commits:** Follow the conventional commit format for commit messages.
