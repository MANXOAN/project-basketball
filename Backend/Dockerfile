FROM node:22-alpine

WORKDIR /app

# mongodb-memory-server không cần trong container (dùng MongoDB service thật),
# bỏ bước tải binary MongoDB lúc npm install.
ENV MONGOMS_DISABLE_POSTINSTALL=1

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Chạy bằng user node (uid 1000) để file ghi ra thư mục mount (data/, backups/)
# thuộc về tài khoản trên máy host thay vì root.
RUN mkdir -p data backups && chown -R node:node /app
USER node

EXPOSE 3000
CMD ["npm", "start"]
