# Multi-stage build for MikroNet
FROM node:20-slim AS base
WORKDIR /app

# Build stage - install ALL dependencies (including devDependencies)
FROM base AS builder
COPY package*.json ./
RUN npm ci --include=dev
COPY . .

# Build the frontend and backend
RUN npm run build

# Production dependencies only
FROM base AS prod-deps
COPY package*.json ./
RUN npm ci --omit=dev

# Production image
FROM node:20-slim AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Copy production dependencies and built files
COPY --from=prod-deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/server ./server
COPY --from=builder --chown=nodejs:nodejs /app/shared ./shared
COPY --from=builder --chown=nodejs:nodejs /app/drizzle.config.ts ./drizzle.config.ts

USER nodejs

# Expose port
EXPOSE 5000

# Set environment to production
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/settings', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start the application
CMD ["npm", "start"]
