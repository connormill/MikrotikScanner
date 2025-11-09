# MikroNet - Mikrotik Network Management Dashboard

## Overview

MikroNet is a network administration tool for managing and monitoring Mikrotik router networks with OSPF topology visualization. The application provides automated network scanning, real-time status monitoring, asymmetric route detection, and interactive topology diagrams. It enables network administrators to discover routers, track OSPF neighbor relationships, identify routing asymmetries, and manage individual routers with edit, delete, and rescan capabilities.

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
- SSH tunnel (`ssh2`) for port forwarding through bastion host to access routers
- Tailscale management via shell command execution for VPN connectivity (alternative to SSH tunnel)
- Network scanner using CIDR subnet parsing for device discovery

### Data Storage Solutions

**Current Implementation (PostgreSQL)**
- PostgreSQL database with Drizzle ORM
- Database connection via `@neondatabase/serverless`
- Automated schema migrations with `drizzle-kit`
- Demo data initialization on first run in development

**Database Schema**
- `routers`: Device information, status, and OSPF neighbor data (JSONB)
- `scans`: Network scan history with results and asymmetry detection
- `settings`: Global configuration including Mikrotik credentials, SSH tunnel credentials, and Tailscale status
- UUID primary keys with PostgreSQL `gen_random_uuid()`
- JSONB columns for flexible nested data (OSPF neighbors, scan results)
- Timestamp tracking for last seen and scan completion

**Storage Implementation**
- `DatabaseStorage` class implements `IStorage` interface
- All API routes use database persistence
- Scan history and router configurations persist across restarts
- Automatic demo data seeding in development if database is empty

### Authentication & Authorization

**Current State**
- No authentication system implemented
- Single-user application assumed
- Mikrotik credentials stored in settings (username/password)
- Tailscale auth key via environment variable

**Security Considerations**
- Credentials stored in plaintext (should be encrypted for production)
- SSH tunnel credentials, Mikrotik passwords stored in database
- No session management or user access control
- Mikrotik API connections use basic authentication
- Environment variables for sensitive configuration (Tailscale auth key)

### External Dependencies

**Mikrotik Integration**
- `node-routeros` library for RouterOS API communication
- Connects to devices on port 8728 (default API port)
- Retrieves system identity, version, board model
- Queries OSPF neighbor tables for topology discovery
- 5-second connection timeout for unreachable devices

**SSH Tunnel (Primary Network Access Method)**
- `ssh2` library for SSH tunnel creation and port forwarding
- Connects to bastion host (e.g., 100.74.182.78) with SSH credentials
- Port forwarding for MikroTik API connections (port 8728) through tunnel
- Custom `SSHTunnelError` class for fatal error propagation
- Enables access to private network routers from Replit environment
- Required because Replit userspace networking doesn't route application traffic
- All scan and rescan operations use SSH tunnel when enabled

**Tailscale VPN (Alternative Network Access Method)**
- Shell command execution for Tailscale CLI operations
- `tailscale up` for connection with auth key and route acceptance
- `tailscale status --json` for connection verification and IP retrieval
- `tailscale down` for disconnection
- Enables secure access to routers across networks
- Note: Limited effectiveness in Replit due to userspace networking constraints

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

## Recent Changes

**SSH Tunnel Implementation (2025-11-09)**
- Implemented SSH tunnel infrastructure for accessing MikroTik routers through bastion host
- Added SSHTunnelManager class with port forwarding capabilities using ssh2 library
- Updated MikrotikClient and NetworkScanner to accept optional SSH tunnel for connections
- Created custom SSHTunnelError class for proper fatal error propagation
- Added SSH tunnel API endpoints (connect, disconnect, status, settings)
- Implemented Settings UI with SSH tunnel configuration section
- Fixed error handling to differentiate tunnel failures from router offline states
- All scan and rescan operations now properly use SSH tunnel when enabled
- SSH tunnel solves Replit userspace networking limitation for accessing private network routers

**Router Management Features Added (2025-11-08)**
- Added edit router functionality - Update router hostname and identity through dialog form
- Added delete router functionality - Remove routers with confirmation dialog
- Added single router rescan - Refresh individual router information and OSPF neighbors
- Improved Tailscale error messaging - Clearer explanation when daemon is not running
- Security: Implemented Zod validation to whitelist only editable fields (hostname/identity)

**Database Persistence Added (2025-11-08)**
- Migrated from in-memory storage to PostgreSQL database
- Implemented DatabaseStorage class with full CRUD operations
- All scan history and router configurations now persist across restarts
- Improved Tailscale error handling and user feedback

**Initial Implementation (2025-11-08)**
- Built complete MikroNet application for Mikrotik network management
- Implemented OSPF neighbor analysis and asymmetric route detection
- Created interactive topology visualization with ReactFlow
- Added Tailscale VPN integration for secure network access
- Designed professional UI with Inter and JetBrains Mono fonts
- Implemented real-time scan progress tracking with Server-Sent Events