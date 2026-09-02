FROM node:20-bullseye-slim

# Install necessary libraries for canvas / sharp dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    fontconfig \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install production dependencies
RUN npm install --production

# Copy application files
COPY . .

# Environment configuration
ENV PORT=3000
ENV NODE_ENV=production
ENV AUTO_OPEN_BROWSER=false

EXPOSE 3000

# Start bot and dashboard
CMD ["npm", "start"]
