FROM node:20-alpine

WORKDIR /app

COPY v1-inseguro/package.json ./
RUN npm install --omit=dev

COPY v1-inseguro/ .
COPY lab /lab

RUN mkdir -p data src/uploads

EXPOSE 3000

ENV LAB_ASSETS_PATH=/lab

CMD ["npm", "start"]
