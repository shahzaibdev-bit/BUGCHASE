import os
import re
import ssl
import subprocess
from celery import Celery

from redis_url import get_redis_url_from_env, uses_tls, ssl_cert_kwargs

_redis_url = get_redis_url_from_env()

app = Celery(
    "bugchase",
    broker=_redis_url,
    backend=_redis_url,
)

# Upstash requires TLS (rediss://). Plain redis:// is rejected → "Connection closed by server".
if uses_tls(_redis_url):
    ssl_opts = ssl_cert_kwargs()
    app.conf.broker_use_ssl = ssl_opts
    app.conf.redis_backend_use_ssl = ssl_opts

# celery-task-meta-* keys: scan results, expire automatically (default 1h).
# _kombu.binding.* keys: Celery/Kombu queue wiring — must NOT have TTL (fixed, tiny, ~3 keys).
_result_ttl_sec = int(os.environ.get("CELERY_RESULT_TTL_SEC", "3600"))
app.conf.update(
    result_expires=_result_ttl_sec,
    result_extended=True,
    broker_connection_retry_on_startup=True,
)

def parse_nmap_to_dict(raw_stdout):
    """
    Parses raw Nmap output into a keyed dictionary of subdomains.
    """
    scan_data = {}
    reports = raw_stdout.split("Nmap scan report for ")
    
    for report in reports[1:]:
        lines = report.strip().split('\n')
        target = lines[0].split('(')[0].strip()
        
        ports = []
        protocol = "tcp"
        
        for line in lines:
            match = re.search(r"(\d+)/(tcp|udp)\s+open", line)
            if match:
                ports.append(int(match.group(1)))
                protocol = match.group(2)
        
        if ports:
            scan_data[target] = {
                "ports": ports,
                "protocol": protocol
            }
            
    return scan_data


def resolve_nmap_targets(domain, live_assets, focus_host=None, nmap_targets=None):
    """Pick hosts for Nmap without requiring a subdomain pass first."""
    if focus_host and str(focus_host).strip():
        return str(focus_host).strip()

    hosts = []
    seen = set()

    def add(host):
        h = (host or "").strip()
        if not h:
            return
        key = h.lower()
        if key in seen:
            return
        seen.add(key)
        hosts.append(h)

    for h in live_assets or []:
        add(h)
    for h in nmap_targets or []:
        add(h)
    add(domain)

    if not hosts:
        return domain
    return " ".join(hosts[:10])


@app.task(name="execute_scan")
def execute_scan(
    company_id,
    domain,
    do_sub,
    do_shodan,
    do_nmap,
    focus_host=None,
    nmap_targets=None,
):
    # INITIALIZE RESULTS WITH ALL KEYS
    results = {
        "domain": domain, 
        "live_subdomains": [], # This was missing in the return!
        "scan_data": {}, 
        "shodan_intel": "Skipped"
    }

    try:
        live_assets = []
        # Step 1: Active Discovery & Probing
        if do_sub:
            print(f"[*] Running Discovery and httpx-toolkit for {domain}", flush=True)
            cmd = f"subfinder -d {domain} -silent | httpx-toolkit -silent -threads 100"
            res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            
            if res.stdout:
                # Store the cleaned live assets
                live_assets = [d.replace('http://', '').replace('https://', '') for d in res.stdout.strip().split('\n')]
                # POPULATE THE LIST FOR THE FINAL RESPONSE
                results['live_subdomains'] = live_assets

        # Step 2: Nmap — works with or without subdomain discovery
        if do_nmap:
            targets = resolve_nmap_targets(
                domain,
                live_assets,
                focus_host=focus_host,
                nmap_targets=nmap_targets,
            )
            print(f"[*] Running Nmap on: {targets}", flush=True)
            cmd = f"nmap -T5 --open {targets}"
            proc = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            if proc.stderr:
                print(f"[nmap stderr] {proc.stderr[:500]}", flush=True)
            results["scan_data"] = parse_nmap_to_dict(proc.stdout or "")

        # Step 3: Shodan
        if do_shodan:
            cmd = f"shodan search {domain} --fields ip_str,port"
            res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            results['shodan_intel'] = res.stdout.strip() if res.stdout else "No data"

        return results

    except Exception as e:
        print(f"[ERROR] {str(e)}", flush=True)
        return {"error": str(e)}
