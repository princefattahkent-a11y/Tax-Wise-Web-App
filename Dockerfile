# =============================================================================
# Stage 1: Install dependencies
# =============================================================================
FROM node:20-alpine AS deps

# Install libc compatibility for native modules (e.g. pdf-parse canvas bindings)
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy only manifests first → better layer caching
COPY package.json package-lock.json ./

# Clean install — exact versions from lockfile, no scripts
RUN npm ci --ignore-scripts

# =============================================================================
# Stage 2: Build the Next.js application
# =============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Bring in installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy all source files
COPY . .

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

# Build arguments — Railway injects these at build time for NEXT_PUBLIC_ vars
# (server-only secrets are NOT needed at build time)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

RUN npm run build

# =============================================================================
# Stage 3: Production runner (minimal image)
# =============================================================================
FROM node:20-alpine AS runner

RUN apk add --no-cache libc6-compat

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Copy only the files Next.js needs to serve the app
COPY --from=builder /app/public          ./public
COPY --from=builder /app/next.config.ts  ./next.config.ts
COPY --from=builder /app/package.json    ./package.json

# Copy the standalone build output (requires `output: 'standalone'` in next.config)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static    ./.next/static

USER nextjs

# Railway dynamically assigns a PORT; Next.js honours this env var out of the box
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
