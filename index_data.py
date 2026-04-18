from helper import load_pdfs, text_split
from rag.embedding import encode_texts
from rag.vectorstore import get_pinecone_index

def main():
    print("📄 Loading PDFs...")
    texts = load_pdfs("data/")
    docs = text_split(texts)

    print(f"🔢 Total chunks: {len(docs)}")

    print("🧠 Generating embeddings...")
    embeddings = encode_texts([d["text"] for d in docs])

    print("📦 Connecting to Pinecone...")
    index = get_pinecone_index()

    print("⬆️ Uploading vectors...")
    for i, emb in enumerate(embeddings):
        index.upsert([
            {
                "id": str(i),
                "values": emb.tolist(),
                "metadata": {"text": docs[i]["text"][:500]},
            }
        ])

    print("✅ Indexing completed successfully")

if __name__ == "__main__":
    main()
