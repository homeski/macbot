FROM node:boron

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json /usr/src/app/
RUN npm install

# Copy photos
COPY photos/ /usr/src/app/

# Bundle app source
COPY . /usr/src/app

EXPOSE 8080
ENTRYPOINT ["npm", "start"]
