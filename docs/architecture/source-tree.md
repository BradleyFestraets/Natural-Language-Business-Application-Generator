# Source Tree

This document outlines the repository structure for the All-in-One Enterprise AI Business Platform.

## Repository Structure: Monorepo with Business System Modules

**Decision**: Extended monorepo architecture with dedicated modules for each business system
**Rationale**: Maintains development velocity while supporting comprehensive business functionality across applications, CRM, marketing, and support systems.

**High-Level Structure**:
```
/
├── client/         # Unified frontend with business system modules
├── server/         # Core API with dedicated service layers
│   ├── services/   # Business system services (CRM, marketing, support)
│   ├── engines/    # Cross-system workflow and automation engines
│   └── analytics/  # Unified business intelligence engine
├── shared/         # Common schemas, types, and utilities across all systems
└── docs/           # All project documentation (PRD, Architecture, Stories)
```
