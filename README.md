# IBID Web Application

---

## 🛠️ Technology Stack & Frameworks

*   **Frontend Framework**: **Angular v19** (utilizing Zoneless Change Detection, reactive state signals, standalone component architecture, and Server-Side Rendering / SSR).
*   **Database & CMS**: **PocketBase** (a headless, Go-based CMS running on an embedded SQLite database for lightweight, real-time dynamic content mapping).
*   **Unit Testing**: **Vitest** (for high-speed testing execution).
*   **Styling**: **SCSS** (for modular, vanilla CSS stylesheet compilation).

---

## 🌐 Supported Languages / Idiomas Suportados

The application supports internationalization (i18n) with the following languages:

*   **Portuguese (`pt`)** (Default)
*   **English (`en`)**
*   **Spanish (`es`)**
*   **French (`fr`)**

---

## 🏛️ Directory Layout (CFS Pattern)

*   **Core**: Houses global singletons, router initialization, dynamic meta headers, interceptors, and layouts.
*   **Features**: Isolates page-level views and administrative modules.
*   **Shared**: Exposes stateless UI widgets, utility functions, directives, and types.

**Why CFS**: This layout ensures clean boundary control, prevents state pollution, and allows individual feature pages to be modified or deprecated independently without side-effects.

---

## 💾 Database Strategy (PocketBase + SQLite)

We use PocketBase as a headless CMS with an embedded SQLite database.

**Why PocketBase**: Decoupling content from compiled bundles allows runtime content changes and route metadata updates without requiring frontend redeployments.

**⚠️ Database Alteration Rule**: A database backup must be created (via PocketBase Admin Settings -> Backups, or by duplicating `pb_data/`) before any database alteration or schema changes.

---

## 💎 Clean Code & Development Standards

The codebase must strictly follow:

*   **Composition over Inheritance**
*   **OOP**
*   **SOLID**

### Meaningful Names
*   Use intention-revealing names.
*   Avoid disinformation and confusing abbreviations.
*   Make meaningful distinctions between names.
*   Use pronounceable names.
*   Use searchable names.
*   Avoid mental mapping (such as single-letter variables: i, j, x).
*   Use nouns for classes and types.
*   Use verbs for functions and methods.

### Functions
*   Keep functions as small as possible.
*   Do one thing (Single Responsibility).
*   Keep only one level of abstraction per function.
*   Write code that reads from top to bottom (The Stepdown Rule).
*   Limit the number of arguments to 0, 1, or 2 (avoid more than 3).
*   Do not use flag arguments (boolean parameters that change the function's behavior).
*   Avoid any side effects.
*   Separate commands from queries (Command Query Separation).
*   Treat error handling as "one thing" within the function.
*   Avoid duplicate code (DRY - Don't Repeat Yourself).

### Comments
*   Explain decisions through readable code, not comments.
*   Remove any commented-out code (Dead Code).
*   Avoid redundant, noisy, or obvious comments.
*   Use comments only to explain complex architectural decisions or warnings of consequences.

### Formatting and Organization
*   Keep files small (maximum of 200 to 300 lines).
*   Use vertical spacing to separate concepts and blocks of code.
*   Keep related concepts physically close in the file.
*   Declare variables as close as possible to where they are used.
*   Keep lines of code short (maximum of 100-120 characters).
*   Use consistent and automated indentation (Prettier/ESLint).

### Objects, Classes, and Data Structures
*   Hide internal implementation details through abstraction.
*   Clearly differentiate Objects (expose behavior, hide data) from Data Structures (expose data, have no behavior).
*   Respect the Law of Demeter (a method of an object should only call methods of the object itself or of objects it creates/receives).
*   Keep classes small and focused on a single responsibility.

### Error Handling
*   Use exceptions (throw errors) instead of returning error codes.
*   Write try-catch blocks first when structuring logic prone to failure.
*   Do not return null or undefined if it can be avoided.
*   Do not pass null or undefined as arguments to functions.

### TypeScript Best Practices
*   Strictly forbid the use of the any type (use unknown or Generics).
*   Use readonly to ensure the immutability of arrays and properties.
*   Avoid numeric enums (prefer union types or as const).
*   Use Optional Chaining (?.) and Nullish Coalescing (??) for null-safety.
*   Prefer Interfaces for public APIs and Type Aliases for unions and intersections.
*   Use Type Guards instead of manual type assertions (as Type).

---

## 🚀 Development & Build Commands

### Setup
```bash
npm install
```

### Run Frontend Client
```bash
npm run dev
```

### Run CMS Backend
```bash
npm run bd
```

### Run Unit Tests
```bash
npm run test
```

### Build Production
```bash
npm run build
```
