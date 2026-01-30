# app.py
from fastapi import FastAPI, Form, Request
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from dotenv import load_dotenv
import os
import json
from helper import load_pdfs, text_split, get_embeddings_model, embed_texts
from pinecone import Pinecone, ServerlessSpec
from groq import Groq

load_dotenv()
app = FastAPI()

# --- Serve static files and templates ---
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# --- Global placeholders ---
index = None
emb_model = None
groq_client = None
docs = None

# --- Startup event to load everything once ---
@app.on_event("startup")
async def startup_event():
    global index, emb_model, groq_client, docs

    print("⏳ Starting server and initializing RAG resources...")

    # Pinecone setup
    PINECONE_API_KEY = os.environ.get("PINECONE_API_KEY")
    pc = Pinecone(api_key=PINECONE_API_KEY)
    index_name = "medical-chatbot"
    if not pc.has_index(index_name):
        pc.create_index(
            name=index_name,
            dimension=384,
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region="us-east-1"),
        )
    index = pc.Index(index_name)

    # Groq client
    GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
    groq_client = Groq(api_key=GROQ_API_KEY)

    # Load PDFs & split
    texts = load_pdfs("data/")
    docs = text_split(texts)
    print(f"📄 Total chunks to embed: {len(docs)}")

    # Load embedding model (caches weights locally)
    emb_model = get_embeddings_model()  # usually SentenceTransformer("all-MiniLM-L6-v2")
    embeddings = embed_texts([d["text"] for d in docs], emb_model)

    # Batch upsert to Pinecone
    batch_size = 100
    for i in range(0, len(docs), batch_size):
        batch_vectors = [
            {
                "id": str(i+j),
                "values": embeddings[i+j].tolist(),
                "metadata": {"text": docs[i+j]["text"][:500]}
            }
            for j in range(min(batch_size, len(docs)-i))
        ]
        index.upsert(batch_vectors)
    print("✅ All chunks upserted in Pinecone")


# --- Home page ---
@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("chat.html", {"request": request})


# --- Chat endpoint with streaming ---
@app.post("/get")
async def get_answer(msg: str = Form(...)):
    try:
        # Encode the query
        query_emb = emb_model.encode([msg])[0].tolist()

        # Pinecone query
        results = index.query(
            vector=query_emb,
            top_k=3,
            include_metadata=True
        )
        context = "\n".join([x["metadata"]["text"] for x in results["matches"]])

        # Prompt
        prompt = f"Answer the question using the context below:\n\nContext:\n{context}\n\nQuestion: {msg}\nAnswer:"

        # Groq chat completion with streaming
        completion = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",  # Changed to a valid model
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_completion_tokens=1024,
            stream=True
        )

        # Generator function for streaming
        def generate():
            for chunk in completion:
                if chunk.choices[0].delta.content:
                    # Send each chunk as Server-Sent Events format
                    yield f"data: {json.dumps({'text': chunk.choices[0].delta.content})}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(generate(), media_type="text/event-stream")

    except Exception as e:
        # Return error as JSON
        return {"answer": f"⚠️ Error generating answer: {str(e)}"}