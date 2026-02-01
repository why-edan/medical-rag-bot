import json
from fastapi import APIRouter, Form, Request
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.templating import Jinja2Templates

from rag.embedding import encode_texts
from rag.vectorstore import get_pinecone_index
from rag.llm import get_groq_client

router = APIRouter()
templates = Jinja2Templates(directory="templates")

# Initialize shared resources
index = get_pinecone_index()
groq_client = get_groq_client()


@router.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse(
        "chat.html",
        {"request": request}
    )


@router.post("/get")
async def get_answer(msg: str = Form(...)):
    try:
        # Embed user query
        query_emb = encode_texts([msg])[0].tolist()

        # Query Pinecone
        results = index.query(
            vector=query_emb,
            top_k=3,
            include_metadata=True
        )

        context = "\n".join(
            [m["metadata"]["text"] for m in results["matches"]]
        )

        prompt = f"""
Answer the question using ONLY the context below.

Context:
{context}

Question: {msg}
Answer:
"""

        completion = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_completion_tokens=1024,
            stream=True
        )

        def generate():
            for chunk in completion:
                if chunk.choices[0].delta.content:
                    yield f"data: {json.dumps({'text': chunk.choices[0].delta.content})}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(
            generate(),
            media_type="text/event-stream"
        )

    except Exception as e:
        return {"error": str(e)}
