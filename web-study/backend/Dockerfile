FROM node:24-alpine
WORKDIR /app
COPY web-study/ /app/web-study/
ENV HOST=0.0.0.0 PORT=8787 DATABASE_PATH=/data/study.sqlite
RUN mkdir /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 8787
CMD ["node", "web-study/backend/server.mjs"]
