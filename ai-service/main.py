from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams
from typing import Any, Dict, List, Optional
import os
import uuid
from contextlib import asynccontextmanager
import uvicorn

APP_TITLE = "BugChase Duplicate Detection Service"
COLLECTION_NAME = os.getenv("QDRANT_COLLECTION", "bug_reports")
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
MODEL_NAME = os.getenv("EMBED_MODEL", "all-MiniLM-L6-v2")
VECTOR_SIZE = 384
# Deterministic Qdrant point id per Mongo report so re-indexing updates the same vector.
POINT_ID_NAMESPACE = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")


def report_point_id(report_id: str) -> uuid.UUID:
    return uuid.uuid5(POINT_ID_NAMESPACE, str(report_id))


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        ensure_collection()
    except Exception as exc:
        print(f"[startup warning] Qdrant initialization failed: {exc}")
    yield


app = FastAPI(title=APP_TITLE, lifespan=lifespan)
model = SentenceTransformer(MODEL_NAME)
qdrant = QdrantClient(url=QDRANT_URL)
qdrant_ready = False


class EmbedStoreRequest(BaseModel):
    report_id: str
    text: str = Field(min_length=1)
    metadata: Optional[Dict[str, Any]] = None


class SearchRequest(BaseModel):
    report_id: str
    text: str = Field(min_length=1)


class BulkIndexItem(BaseModel):
    report_id: str
    text: str
    metadata: Optional[Dict[str, Any]] = None


class BulkIndexRequest(BaseModel):
    reports: List[BulkIndexItem]


def ensure_collection() -> None:
    global qdrant_ready
    existing = [c.name for c in qdrant.get_collections().collections]
    if COLLECTION_NAME not in existing:
        qdrant.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
        )
    qdrant_ready = True


def ensure_qdrant_ready() -> None:
    if not qdrant_ready:
        raise HTTPException(
            status_code=503,
            detail=(
                f"Qdrant is unavailable at {QDRANT_URL}. "
                "Start Qdrant and retry the request."
            ),
        )


@app.get("/health")
def health() -> Dict[str, str]:
    return {
        "status": "ok" if qdrant_ready else "degraded",
        "qdrant_url": QDRANT_URL,
    }


@app.post("/embed-and-store")
def embed_and_store(payload: EmbedStoreRequest) -> Dict[str, Any]:
    try:
        ensure_qdrant_ready()
        vector = model.encode(payload.text, normalize_embeddings=True).tolist()
        point = PointStruct(
            id=report_point_id(payload.report_id),
            vector=vector,
            payload={
                "report_id": payload.report_id,
                **(payload.metadata or {}),
            },
        )
        qdrant.upsert(collection_name=COLLECTION_NAME, points=[point])
        return {"status": "success", "report_id": payload.report_id}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"embed-and-store failed: {exc}") from exc


@app.post("/bulk-index")
def bulk_index(payload: BulkIndexRequest) -> Dict[str, Any]:
    """Index multiple reports at once — used to back-fill existing DB reports."""
    try:
        ensure_qdrant_ready()
        points = []
        for item in payload.reports:
            if not item.text.strip():
                continue
            vector = model.encode(item.text, normalize_embeddings=True).tolist()
            points.append(
                PointStruct(
                    id=report_point_id(item.report_id),
                    vector=vector,
                    payload={
                        "report_id": item.report_id,
                        **(item.metadata or {}),
                    },
                )
            )
        if points:
            qdrant.upsert(collection_name=COLLECTION_NAME, points=points)
        return {"status": "success", "indexed": len(points)}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"bulk-index failed: {exc}") from exc


@app.post("/search-duplicates")
def search_duplicates(payload: SearchRequest) -> Dict[str, Any]:
    try:
        ensure_qdrant_ready()
        vector = model.encode(payload.text, normalize_embeddings=True).tolist()

        # qdrant-client >= 1.7: use query_points instead of deprecated search()
        results = qdrant.query_points(
            collection_name=COLLECTION_NAME,
            query=vector,
            limit=int(os.getenv("QDRANT_DUPLICATE_SEARCH_LIMIT", "32")),
            with_payload=True,
        )

        # results is a QueryResponse; actual points are in results.points
        points = results.points if hasattr(results, "points") else results

        matches: List[Dict[str, Any]] = []
        for item in points:
            p = item.payload or {}
            if str(p.get("report_id")) == str(payload.report_id):
                continue
            matches.append(
                {
                    "report_id": str(p.get("report_id", "")),
                    "score": float(item.score),
                    "metadata": p,
                }
            )
            if len(matches) >= int(os.getenv("DUPLICATE_MATCH_RETURN_LIMIT", "15")):
                break

        return {"status": "success", "matches": matches}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"search-duplicates failed: {exc}") from exc


if __name__ == "__main__":
    default_port = int(os.getenv("PORT", "8001"))
    uvicorn.run("main:app", host="0.0.0.0", port=default_port, reload=False)
