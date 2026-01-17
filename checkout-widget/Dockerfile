FROM node:18-alpine

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build

RUN npm install -g serve
EXPOSE 3001
CMD ["serve", "dist", "-l", "3001"]
