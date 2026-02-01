import os
from groq import Groq
from dotenv import load_dotenv
load_dotenv()


_client = None

def get_groq_client():
    global _client
    if _client is None:
        _client = Groq(api_key=os.environ["GROQ_API_KEY"])
    return _client
