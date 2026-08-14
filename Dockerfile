
FROM node:24-bookworm-slim AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi


# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED=1

RUN \
  if [ -f yarn.lock ]; then yarn run build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm run build; \
  else echo "Lockfile not found." && exit 1; \
  fi

FROM --platform=linux/amd64 quay.io/openshift/origin-cli:5.1 AS openshift_cli

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ARG KUBECTL_VERSION=v1.33.3
ARG HELM_VERSION=v3.18.4

COPY scripts/install-kubernetes-tools.sh /tmp/install-kubernetes-tools.sh
COPY --from=openshift_cli /usr/bin/oc /usr/local/bin/oc.amd64

# Add Docker CLI, kubectl, and Helm for container and Kubernetes workflows.
RUN set -eux; \
  apt-get update; \
  apt-get install -y --no-install-recommends docker.io curl ca-certificates tar gzip; \
  chmod +x /usr/local/bin/oc.amd64; \
  printf '%s\n' '#!/bin/sh' \
    'if [ "$(uname -m)" = "x86_64" ]; then' \
    '  exec /usr/local/bin/oc.amd64 "$@"' \
    'fi' \
    'echo "OpenShift oc 5.1 is only available for amd64 in this image build." >&2' \
    'exit 1' > /usr/local/bin/oc; \
  chmod +x /usr/local/bin/oc; \
  rm -rf /var/lib/apt/lists/*; \
  chmod +x /tmp/install-kubernetes-tools.sh; \
  KUBECTL_VERSION="$KUBECTL_VERSION" HELM_VERSION="$HELM_VERSION" /tmp/install-kubernetes-tools.sh; \
  rm -f /tmp/install-kubernetes-tools.sh

ENV NODE_ENV=production
# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
CMD ["node", "server.js"]
