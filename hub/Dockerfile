FROM python:3.12-alpine
RUN apk add --no-cache git tzdata
ENV TZ=Asia/Shanghai PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend ./backend
COPY web ./web
RUN mkdir -p /app/data
EXPOSE 8788
CMD ["uvicorn","backend.app:app","--host","0.0.0.0","--port","8788"]
