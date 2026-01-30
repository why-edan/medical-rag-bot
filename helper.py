# helper.py
import os
import fitz  # PyMuPDF
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer

# --- Load PDFs ---
def load_pdfs(folder_path):
    texts = []
    for file in os.listdir(folder_path):
        if file.endswith(".pdf"):
            path = os.path.join(folder_path, file)
            doc = fitz.open(path)
            text = ""
            for page in doc:
                text += page.get_text()
            texts.append({"text": text, "file": file})
    return texts

# --- Split text into smaller chunks ---
def text_split(docs, chunk_size=400, chunk_overlap=50):
    splitter = RecursiveCharacterTextSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    chunks = []
    for doc in docs:
        split_texts = splitter.split_text(doc["text"])
        for s in split_texts:
            chunks.append({"text": s, "file": doc["file"]})
    return chunks

# --- Load embedding model ---
def get_embeddings_model(model_name="sentence-transformers/all-MiniLM-L6-v2"):
    model = SentenceTransformer(model_name)
    return model

# --- Embed a list of texts ---
def embed_texts(texts, model):
    embeddings = model.encode(texts)
    return embeddings
