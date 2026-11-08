# zsign builds on Debian without Xcode. Uses the upstream source and Makefile.
FROM debian:bookworm-slim AS zsign-builder
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates git g++ make pkg-config libssl-dev \
    && rm -rf /var/lib/apt/lists/*
RUN git clone --depth 1 https://github.com/zhlynn/zsign.git /src/zsign \
    && make -C /src/zsign/build/linux -j2 \
    && find /src/zsign -type f -name zsign -executable -print -quit | xargs -r -I{} cp {} /tmp/zsign \
    && test -x /tmp/zsign

FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates libssl3 \
    && rm -rf /var/lib/apt/lists/*
COPY --from=zsign-builder /tmp/zsign /usr/local/bin/zsign
WORKDIR /app
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi \
    && npm cache clean --force
COPY public ./public
COPY server.js ./server.js
USER node
ENV NODE_ENV=production PORT=3000 ZSIGN_PATH=/usr/local/bin/zsign
EXPOSE 3000
CMD ["node", "server.js"]
