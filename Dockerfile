FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
ARG BASE_PATH=""
ENV BASE_PATH=$BASE_PATH
RUN npm run build

FROM node:24-bookworm-slim AS runner
LABEL org.opencontainers.image.licenses="CC-BY-NC-SA-4.0" \
      org.opencontainers.image.authors="Vincent CHALAMON (original); Erik Engler (adaptation)"
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000 RALLY_DATA_DIR=/app/.data
ARG BASE_PATH=""
ENV BASE_PATH=$BASE_PATH
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/LICENSE /app/NOTICE.md ./
RUN mkdir -p /app/.data && chown node:node /app/.data
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000'+(process.env.BASE_PATH||'')+'/api/rally/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["sh", "-c", "exec node server.js >/dev/null 2>&1"]
