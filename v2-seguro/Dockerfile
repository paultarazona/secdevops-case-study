FROM node:20-alpine

WORKDIR /app

RUN apk update && apk upgrade --no-cache && apk add --no-cache python3 make g++

# package-lock.json is intentionally NOT copied here: it is generated on
# Windows, where better-sqlite3 finds a prebuilt binary and never installs
# node-gyp (and its own pinned tar/glob/minimatch/cross-spawn versions). On
# this Linux/musl base, better-sqlite3 must compile from source, pulling in
# node-gyp's dependency chain - resolving fresh from package.json here (with
# "overrides" in effect) ensures those transitive deps get patched versions
# instead of whatever stale ones a Windows-generated lockfile would imply.
COPY package.json ./
RUN npm install --omit=dev

COPY . .

RUN mkdir -p data src/uploads

ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "start"]
