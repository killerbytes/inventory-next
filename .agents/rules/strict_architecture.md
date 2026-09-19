# Strict Standalone & Database Architecture Rules

1. **ZERO MOCK DATA ALLOWED**: Hardcoded fallback arrays, mock objects, or sample state are strictly forbidden in production page components, routes, and services.
2. **DIRECT DB PERSISTENCE**: Every Server Component page and API handler MUST fetch live records directly from Sequelize ORM (`Product.findAll()`, `Category.findAll()`, `GoodReceipt.findAll()`, etc.).
3. **NEXT.JS 15 SERVER COMPONENTS FIRST**: No `"use client";` allowed on `page.tsx` files. Pages must be `async` Server Components. Interactive state must be extracted to `src/components/widgets/`.
4. **SCHEMA ALIGNMENT VERIFICATION**: Always verify database column schemas (such as setting `timestamps: false` for legacy tables lacking `createdAt`) against PostgreSQL before running queries.
5. **PROACTIVE ADVISORY MANDATE**: Whenever there is a technical gap, non-standard request, or trade-off, always present recommendations and clear options before making structural edits.
