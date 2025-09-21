# Coding Standards

This document outlines the coding standards and conventions for the All-in-One Enterprise AI Business Platform.

## General Principles

- **Clarity and Readability**: Code should be easy to read and understand. Prioritize clarity over cleverness.
- **Consistency**: Adhere to the established patterns and conventions found throughout the codebase.
- **DRY (Don't Repeat Yourself)**: Avoid code duplication by using shared functions and components where appropriate.
- **Single Responsibility Principle (SRP)**: Each module, class, or function should have one primary responsibility.

## TypeScript

- **Strict Mode**: All code should be written in TypeScript's strict mode.
- **Typing**: Use explicit types. Avoid the `any` type wherever possible.
- **Interfaces vs. Types**: Prefer `interface` for defining the shape of objects and classes. Use `type` for unions, intersections, or primitives.
- **Naming**: Use `PascalCase` for types and interfaces (e.g., `interface CustomerProfile`). Use `camelCase` for variables and functions.

## React

- **Functional Components**: All new components should be functional components using hooks.
- **Hooks**: Follow the rules of hooks. Custom hooks should be prefixed with `use` (e.g., `useCustomerData`).
- **Component Naming**: Use `PascalCase` for component files and component names (e.g., `CustomerTable.tsx`).
- **Props**: Use interfaces to define component props.

## Backend (Node.js / Express.js)

- **Async/Await**: Use `async/await` for all asynchronous operations.
- **Error Handling**: Use `try...catch` blocks for asynchronous operations and a centralized error handling middleware in Express.
- **Environment Variables**: All configuration and secrets must be managed through environment variables (e.g., `process.env.DATABASE_URL`). Do not hardcode them.

## Formatting

- **Prettier**: The project is configured to use Prettier for automatic code formatting. Ensure it is enabled in your editor to maintain consistency.
- **Line Length**: Keep lines under 120 characters where possible.
