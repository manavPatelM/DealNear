FROM node:20-alpine
WORKDIR /app
COPY package.json .
COPY src src
EXPOSE 3000
USER node
CMD ["npm", "start"]
