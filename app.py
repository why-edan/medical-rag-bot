from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from routes.chat import router

app = FastAPI()

# Serve static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Register routes
app.include_router(router)

@app.get("/health")
def health():
    return {"status": "ok"}
