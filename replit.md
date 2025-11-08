# MikroNet - Mikrotik Network Management Dashboard

## Overview

MikroNet is a network administration tool for managing and monitoring Mikrotik router networks with OSPF topology visualization. The application provides automated network scanning, real-time status monitoring, asymmetric route detection, and interactive topology diagrams. It enables network administrators to discover routers, track OSPF neighbor relationships, and identify routing asymmetries across their network infrastructure.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React 18 with TypeScript for type-safe UI development
- Vite as the build tool and development server with HMR support
- Wouter for client-side routing (lightweight React Router alternative)

**UI Component System**
- shadcn/ui component library based on Radix UI primitives
- Tailwind CSS for utility-first styling with custom design tokens
- Class Variance Authority (CVA) for component variant management
- Design system follows a "system-based approach" inspired by Linear and Grafana
- Inter font for UI text, JetBrains Mono for technical data (IPs, router names)

**State Management**
- TanStack Query (React Query) for server state management and caching
- React Hook Form with Zod validation for form handling
- Local component state with React hooks for UI-specific state

**Network Visualization**
- ReactFlow library for interactive network topology diagrams
- Custom node positioning and styling for router representation
- Edge visualization for OSPF neighbor relationships with asymmetry highlighting

### Backend Architecture

**Server Framework**
- Express.js with TypeScript running on Node.js
- ESM module system throughout the codebase
- Custom Vite middleware integration for development workflow

**API Design**
- RESTful API endpoints under `/api` prefix
- JSON request/response format
- Server-Sent Events (SSE) pattern for real-time scan progress updates
- Session-based request handling with logging middleware

**Data Access Layer**
- In-memory storage implementation (`MemStorage`) for development
- Drizzle ORM schema definitions ready for PostgreSQL migration
- Storage interface abstraction allows swapping implementations

**External System Integration**
- RouterOS API client (`node-routeros`) for Mikrotik device communication
- Tailscale management via shell command execution for VPN connectivity
- Network scanner using CIDR subnet parsing for device discovery

### Data Storage Solutions

**Current Implementation (Development)**
- In-memory Map-based storage for routers, scans, and settings
- Demo data initialization in development environment
- No persistence between server restarts

**Production-Ready Schema (PostgreSQL)**
- Drizzle ORM schema defined with three main tables:
  - `routers`: Device information, status, and OSPF neighbor data (JSONB)
  - `scans`: Network scan history with results and metrics
  - `settings`: Global configuration including credentials and Tailscale status
- UUID primary keys with PostgreSQL `gen_random_uuid()`
- JSONB columns for flexible nested data (OSPF neighbors, scan results)
- Timestamp tracking for last seen and scan completion

**Migration Path**
- Database schema ready in `shared/schema.ts`
- Drizzle-kit configured for PostgreSQL migrations
- Connection via `@neondatabase/serverless` for serverless PostgreSQL
- Switch from `MemStorage` to Drizzle implementation needed for production

### Authentication & Authorization

**Current State**
- No authentication system implemented
- Single-user application assumed
- Mikrotik credentials stored in settings (username/password)
- Tailscale auth key via environment variable

**Security Considerations**
- Credentials stored in plaintext (should be encrypted for production)
- No session management or user access control
- Mikrotik API connections use basic authentication
- Environment variables for sensitive configuration

### External Dependencies

**Mikrotik Integration**
- `node-routeros` library for RouterOS API communication
- Connects to devices on port 8728 (default API port)
- Retrieves system identity, version, board model
- Queries OSPF neighbor tables for topology discovery
- 5-second connection timeout for unreachable devices

**Tailscale VPN**
- Shell command execution for Tailscale CLI operations
- `tailscale up` for connection with auth key and route acceptance
- `tailscale status --json` for connection verification and IP retrieval
- `tailscale down` for disconnection
- Enables secure access to routers across networks

**Network Scanning**
- `ip-cidr` library for CIDR subnet parsing and IP enumeration
- Parallel connection attempts to discovered IPs
- Progressive status updates via callback mechanism
- Stores discovered routers with full system information

**UI Component Libraries**
- Radix UI for accessible, unstyled component primitives (20+ components)
- Lucide React for consistent iconography
- ReactFlow for network diagram visualization with pan/zoom controls
- Embla Carousel for potential carousel UI patterns

**Development Tools**
- Replit-specific plugins for error overlay and dev banner
- TypeScript for type safety across full stack
- ESBuild for production bundling
- PostCSS with Autoprefixer for CSS processing