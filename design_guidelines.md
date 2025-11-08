# Design Guidelines: Mikrotik Network Management Dashboard

## Design Approach
**System-Based Approach** - Drawing from Linear's clean professional aesthetic combined with Grafana's data visualization excellence. This is a utility-focused network administration tool where clarity, efficiency, and data legibility are paramount.

## Core Design Elements

### Typography
- **Primary Font**: Inter (via Google Fonts CDN)
- **Headings**: Font weight 600, sizes: text-2xl (page titles), text-xl (section headers), text-lg (card headers)
- **Body**: Font weight 400, text-sm for tables and data, text-base for descriptions
- **Monospace**: JetBrains Mono for IP addresses, router names, and technical data

### Layout System
**Spacing Primitives**: Use Tailwind units of 2, 4, 6, and 8 (p-4, gap-6, m-8, etc.)
- Consistent padding: p-6 for cards, p-4 for compact elements
- Section gaps: gap-6 for grids, gap-4 for lists
- Page margins: Standard container with max-w-7xl, px-6

### Component Library

**Navigation**
- Left sidebar (fixed, w-64) with icon + label navigation items
- Top bar with Tailscale connection status, user menu, and quick actions
- Breadcrumb navigation for multi-level views

**Dashboard Cards**
- Elevated cards with subtle borders, rounded-lg corners
- Card headers with icon, title, and action button (aligned right)
- Status indicators using small colored dots with labels
- Metric cards showing: router count, active connections, detected issues

**Data Tables**
- Striped rows for readability
- Fixed header with sortable columns
- Compact row height (py-3) with text-sm
- Status badges inline (small pills with icons)
- Action buttons in final column

**Forms**
- Input fields with labels above, helper text below
- CIDR subnet input with validation indicator
- Credential fields grouped in bordered sections
- Primary action button (prominent), secondary action (ghost style)

**Network Topology Diagram**
- Large canvas area (min-h-[600px]) with zoom/pan controls
- Router nodes as circles with router name and IP
- OSPF relationships as connecting lines
- Asymmetrical routes highlighted with thicker lines and warning indicators
- Legend panel (absolute positioned, top-right) explaining node types and connection states

**Scan Interface**
- Progress bar with percentage and discovered router count
- Live log panel showing scan activity (scrollable, max-h-80, monospace text)
- Discovered routers appearing in real-time list below scanner

**Alerts & Notifications**
- Toast notifications (top-right) for scan complete, errors, connection status
- Inline warning banners for detected asymmetrical routing with "View Details" action
- Empty states with helpful illustrations and setup instructions

### Interaction Patterns
- Hover states: Subtle background change on table rows and clickable cards
- Loading states: Skeleton screens for data tables, spinner for topology diagram
- Click-to-copy for IP addresses and router names
- Expandable detail panels for router information (slide-in from right)

### Iconography
**Use Heroicons (via CDN)** for all interface icons:
- Network topology, router, shield (Tailscale), warning, check circle, refresh, settings, search

### Responsive Behavior
- **Desktop (lg:)**: Full sidebar, multi-column dashboard (2-3 columns)
- **Tablet (md:)**: Collapsible sidebar, 2-column dashboard
- **Mobile**: Hidden sidebar with hamburger menu, single column, simplified topology view

### Data Visualization
- Use D3.js or Cytoscape.js for network topology graph
- Force-directed layout for automatic node positioning
- Interactive: click nodes for details, drag to reposition
- Export SVG/PNG button in diagram toolbar

### Performance Considerations
- Virtual scrolling for router lists >100 items
- Lazy load topology diagram on tab switch
- Debounced subnet input validation
- Real-time updates via WebSocket connection for scan progress

## Page Structure

**Main Dashboard**: 3-column metric cards → Recent scans table → Quick actions
**Scan Page**: Subnet input form → Active scan progress → Results table → Topology tab
**Topology View**: Full-screen diagram with side panel for selected router details
**Settings**: Tabbed interface (Credentials, Tailscale, Scan Defaults, Export/Import)

**No images needed** - This is a data-focused admin tool where interface clarity trumps visual decoration.