FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY . .

RUN mkdir -p data src/uploads

EXPOSE 3000

CMD ["npm", "start"]
