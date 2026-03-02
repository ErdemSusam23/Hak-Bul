from dotenv import load_dotenv
import os

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
QDRANT_COLLECTION = os.getenv("QDRANT_COLLECTION", "hukuk_chunks")
SCORE_THRESHOLD = float(os.getenv("SCORE_THRESHOLD", "0.65"))
MOCK_MODE = os.getenv("MOCK_MODE", "true").lower() == "true"
MOCK_RETRIEVAL = os.getenv("MOCK_RETRIEVAL", "true").lower() == "true"
MOCK_LLM = os.getenv("MOCK_LLM", "true").lower() == "true"