FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm install --omit=dev

COPY . .

RUN mkdir -p data src/uploads

ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "start"]
