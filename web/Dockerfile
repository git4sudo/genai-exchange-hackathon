# Stage 1: Build Next.js app
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build  # output: export generates /app/out

# Stage 2: Serve with Nginx
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# Copy static files
COPY --from=builder /app/out/ /usr/share/nginx/html

# SPA fallback
RUN sed -i 's|try_files \$uri \$uri/ =404;|try_files \$uri \$uri/ /index.html;|' /etc/nginx/conf.d/default.conf

EXPOSE 8080
CMD ["sh", "-c", "sed -i 's/listen       80;/listen 8080;/' /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
