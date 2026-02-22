FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy server code into /app/server so the module path is server.main
COPY . /app/server

ENV PORT=3000
EXPOSE 3000

CMD ["uvicorn", "server.main:app", "--host", "0.0.0.0", "--port", "3000"]
