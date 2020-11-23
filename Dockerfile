FROM node:alpine

COPY ./build /server

WORKDIR /server

RUN yarn install

CMD ["yarn", "start"]