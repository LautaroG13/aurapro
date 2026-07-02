FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Forma shell (no exec/array) a propósito: ${PORT:-8000} necesita que
# el shell la expanda. Render asigna el puerto dinámicamente vía $PORT
# -- un valor fijo rompe el deploy. Localmente (docker-compose, sin
# $PORT seteado) cae al 8000 de siempre.
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
