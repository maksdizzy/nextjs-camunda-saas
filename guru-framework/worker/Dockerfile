# Use standard Python 3.12 slim image
FROM python:3.12-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    gcc \
    g++ \
    libpq-dev \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip
RUN pip install -U pip

ADD requirements.txt /requirements.txt

RUN pip install --no-cache-dir -r /requirements.txt

RUN mkdir /code/
WORKDIR /code/
ADD . /code/
ENV PYTHONPATH=.

# Keep container running - workers will be added as needed for specific BPMN tasks
CMD ["sh", "-c", "echo 'Worker container ready. Add specific BPMN workers as needed.' && tail -f /dev/null"]
