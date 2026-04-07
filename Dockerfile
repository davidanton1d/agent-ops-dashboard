FROM node:22-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:22-slim
WORKDIR /app
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev
COPY backend/ ./backend/
COPY --from=frontend-build /app/backend/public ./backend/public
RUN mkdir -p data

ENV PORT=3100
ENV CLAUDE_DIR=/root/.claude
EXPOSE 3100
CMD ["node", "backend/src/index.js"]
