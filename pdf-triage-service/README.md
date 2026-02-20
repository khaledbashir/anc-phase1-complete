# PDF Page Triage API Service

This is a microservice built with FastAPI to parse large PDF files (such as RFP packages or construction specs) and score pages based on their relevance to a set of predefined keywords. Extracted pages without text are classified as drawings.

## Local Testing

1. Setup virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. Run the server locally:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

3. Health Check:
   ```bash
   curl http://localhost:8000/api/health
   ```

4. Process PDF:
   ```bash
   curl -X POST http://localhost:8000/api/triage -F "file=@/path/to/file.pdf"
   ```

5. Extract Pages:
   ```bash
   curl -X POST http://localhost:8000/api/extract -F "file=@/path/to/file.pdf" -F 'pages=[1, 5, 8]' -o result.pdf
   ```

## Docker

Build and run via Docker:
```bash
docker build -t pdf-triage-service .
docker run -p 8000:8000 pdf-triage-service
```
