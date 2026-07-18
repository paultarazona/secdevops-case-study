FROM node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293

WORKDIR /app

RUN apk update && apk upgrade --no-cache && apk add --no-cache python3 make g++

# package-lock.json is intentionally NOT copied here: it is generated on
# Windows, where better-sqlite3 finds a prebuilt binary and never installs
# node-gyp (and its own pinned tar/glob/minimatch/cross-spawn versions). On
# this Linux/musl base, better-sqlite3 must compile from source, pulling in
# node-gyp's dependency chain - resolving fresh from package.json here (with
# "overrides" in effect) ensures those transitive deps get patched versions
# instead of whatever stale ones a Windows-generated lockfile would imply.
COPY v2-seguro/package.json ./
RUN npm install --omit=dev

COPY v2-seguro/ .
COPY lab /lab

RUN mkdir -p data src/uploads

# npm is needed only to install production dependencies. Removing it prevents
# unused npm tooling from expanding the production image's attack surface.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx /root/.npm

ENV NODE_ENV=production
ENV LAB_ASSETS_PATH=/lab

EXPOSE 3000

CMD ["node", "server.js"]
