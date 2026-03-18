# Development Dockerfile
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies first (for better caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Install nodemon globally to ensure it's available
RUN npm install -g nodemon ts-node

# Copy TypeScript config
COPY tsconfig.json ./

# Copy source code
COPY . .

# Expose ports
EXPOSE 3000 3001

# Start development server
CMD ["npm", "run", "dev"]