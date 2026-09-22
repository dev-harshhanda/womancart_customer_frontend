# syntax=docker/dockerfile:1

FROM public.ecr.aws/docker/library/node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies
FROM base AS deps
RUN corepack enable
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Build the application
FROM base AS builder
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# --- AWS SSM Parameter Store (build-time) ---------------------------------
# NEXT_PUBLIC_* values are inlined into the client bundle during `next build`,
# so they MUST be present here (runtime ECS secrets are too late for them).
# `scripts/load-ssm-env.mjs` fetches every parameter under SSM_PARAM_PATH and
# writes .env.production, which `next build` then loads automatically.
ARG AWS_REGION=ap-south-1
ARG SSM_PARAM_PATH=/womancart/prod/web/react/
# Set SSM_OPTIONAL=true to allow local builds without AWS access (skips fetch).
ARG SSM_OPTIONAL=false
ENV AWS_REGION=$AWS_REGION
ENV SSM_PARAM_PATH=$SSM_PARAM_PATH
ENV SSM_OPTIONAL=$SSM_OPTIONAL

# AWS credentials are provided via a BuildKit secret so they never land in an
# image layer. The secret file is a dotenv with:
#   AWS_ACCESS_KEY_ID=...
#   AWS_SECRET_ACCESS_KEY=...
#   AWS_SESSION_TOKEN=...   (only for temporary/role credentials)
# When building on a host/role that already has credentials (CodeBuild, EC2
# instance role), you can omit the secret and the SDK uses the ambient role.
RUN --mount=type=secret,id=aws_creds \
  sh -c 'if [ -f /run/secrets/aws_creds ]; then set -a; . /run/secrets/aws_creds; set +a; fi; \
  node scripts/load-ssm-env.mjs && yarn build'

# Production image
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=4115
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 4115

CMD ["node", "server.js"]
