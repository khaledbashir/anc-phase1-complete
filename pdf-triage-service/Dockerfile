FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

# Set environment variables for the extraction pipeline
ENV OPENROUTER_API_KEY=""
ENV ANYTHINGLLM_URL="https://basheer-anything-llm.prd42b.easypanel.host"
ENV ANYTHINGLLM_API_KEY=""

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
