from typing import List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn
from dotenv import load_dotenv
from redis_client import get_redis
from task import execute_scan

load_dotenv()

app = FastAPI(title="BugChase Asset Discovery Engine")

# Redis (Upstash TLS via REDIS_URL)
r = get_redis()

class ScanRequest(BaseModel):
    companyId: str
    name: str
    domain: str
    isDomainVerified: bool
    scanSubdomains: bool = True
    scanShodan: bool = True
    scanNmap: bool = True
    # Single-host Nmap (e.g. deep scan on one asset).
    focusHost: Optional[str] = None
    # Hosts to port-scan when subdomain discovery is off (root + inventory).
    nmapTargets: Optional[List[str]] = None

@app.get("/health")
def health():
    try:
        r.ping()
        redis_ok = True
    except Exception:
        redis_ok = False
    return {"status": "ok" if redis_ok else "degraded", "redis": redis_ok}


@app.post("/initiate-scan")
def initiate_scan(scan_req: ScanRequest):
    domain = scan_req.domain
    
    if not scan_req.isDomainVerified:
        raise HTTPException(status_code=403, detail="Ownership verification required.")

    # Race Condition Protection: prevents duplicate concurrent scans for same domain
    lock_key = f"lock:scan:{domain}"
    if r.get(lock_key):
        raise HTTPException(status_code=409, detail="A scan for this target is already in the queue.")

    # Set lock for 15 minutes
    r.setex(lock_key, 900, "active")

    # Dispatch to the worker pool (Concurrently handles 4 companies)
    task = execute_scan.apply_async(
        kwargs={
            "company_id": scan_req.companyId,
            "domain": scan_req.domain,
            "do_sub": scan_req.scanSubdomains,
            "do_shodan": scan_req.scanShodan,
            "do_nmap": scan_req.scanNmap,
            "focus_host": scan_req.focusHost,
            "nmap_targets": scan_req.nmapTargets,
        }
    )

    try:
        final_data = task.get(timeout=600)
        r.delete(lock_key)
        if isinstance(final_data, dict) and final_data.get("error"):
            raise HTTPException(status_code=500, detail=str(final_data["error"]))
        return {"success": True, "results": final_data}
    except HTTPException:
        r.delete(lock_key)
        raise
    except Exception as e:
        r.delete(lock_key)
        raise HTTPException(status_code=500, detail=f"Scan timed out or worker failed: {e}")

if __name__ == "__main__":
    print("--- BUG CHASE ENGINE ONLINE ---", flush=True)
    uvicorn.run(app, host="0.0.0.0", port=9000)
