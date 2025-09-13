# Use Node.js LTS as base image
FROM node:22


# Set working directory
WORKDIR /usr/src/app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy rest of the code
COPY . .

# Expose port
EXPOSE 8080

# Start app
CMD ["node", "src/server.js"]