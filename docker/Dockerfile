FROM python:3.11-slim

WORKDIR /app

# Set PYTHONPATH to include the app directory
ENV PYTHONPATH=/app

# Install Poetry
RUN pip install poetry==1.7.1

# Copy only dependency files first for better caching
COPY pyproject.toml poetry.lock* /app/

# Configure Poetry to not use a virtual environment
RUN poetry config virtualenvs.create false \
    && poetry install --no-interaction --no-ansi

# Copy rest of the source code
COPY . /app/

# Expose port for Railway
EXPOSE ${PORT:-8000}

# Start FastAPI server (Railway injects PORT env var)
CMD uvicorn app.backend.main:app --host 0.0.0.0 --port ${PORT:-8000}
