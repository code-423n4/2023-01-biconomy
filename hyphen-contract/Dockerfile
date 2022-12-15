FROM node:16 AS deps
RUN apt-get update
RUN apt-get upgrade --yes
COPY ./package.json /app/
COPY ./yarn.lock /app/
WORKDIR /app
RUN yarn

FROM deps
COPY . /app/
RUN npx hardhat compile
RUN chmod a+x scripts/prod-replica-helpers/entrypoint.sh
WORKDIR /app