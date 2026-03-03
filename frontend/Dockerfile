FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Vite env values are resolved at build time.
ARG VITE_API_URL=http://localhost:8000
ARG VITE_MOCK_MODE=false
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_MOCK_MODE=$VITE_MOCK_MODE

RUN npm run build

FROM nginx:1.27-alpine

# Serve built app
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
