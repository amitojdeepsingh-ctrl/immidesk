"""
LMIA Lead Scraper — ADS Immigration Services
=============================================
Two-pass scraper:
  Pass 1: Yellow Pages Canada -> company name, phone, website URL
  Pass 2: Visit each company website -> extract email from contact/about page

Usage:
  # Scrape new leads from Yellow Pages
  python scripts/scrape_lmia_leads.py --industry agriculture --province BC --max 30

  # Enrich existing leads that have a website but no email
  python scripts/scrape_lmia_leads.py --enrich --max 50

  # Both in one go
  python scripts/scrape_lmia_leads.py --industry construction --province AB --max 20 --enrich

Industries: agriculture, construction, food, hospitality, transport, cleaning, caregiving, landscaping, manufacturing
Provinces:  BC, AB, ON, QC, MB, SK, NS, NB, NL, PE
"""

import argparse
import os
import sys
import time
import re

from dotenv import load_dotenv

for env_path in [
    os.path.join(os.path.dirname(__file__), "..", ".env.local"),
    os.path.join(os.path.dirname(__file__), "..", ".env"),
    os.path.expanduser("~/.env"),
]:
    if os.path.exists(env_path):
        load_dotenv(env_path, override=False)

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("[ERR] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    sys.exit(1)

from supabase import create_client
sb = create_client(SUPABASE_URL, SUPABASE_KEY)

# ── Industry map ──────────────────────────────────────────────────────────────
INDUSTRY_MAP = {
    "agriculture":   ["farms", "greenhouses", "nurseries", "orchards"],
    "construction":  ["general contractors", "construction companies"],
    "food":          ["food processing", "food manufacturers"],
    "hospitality":   ["hotels", "restaurants", "resorts"],
    "transport":     ["trucking companies", "freight carriers"],
    "cleaning":      ["commercial cleaning", "janitorial services"],
    "caregiving":    ["home care agencies", "assisted living"],
    "landscaping":   ["landscaping companies", "lawn care"],
    "manufacturing": ["manufacturers", "factories"],
}

PROVINCE_MAP = {
    "BC": "british+columbia", "AB": "alberta", "ON": "ontario",
    "QC": "quebec", "MB": "manitoba", "SK": "saskatchewan",
    "NS": "nova+scotia", "NB": "new+brunswick", "NL": "newfoundland",
    "PE": "prince+edward+island",
}

# Emails to ignore (generic/spam traps)
EMAIL_BLACKLIST = {
    "example.com", "test.com", "domain.com", "email.com",
    "yourcompany.com", "sentry.io", "w3.org", "schema.org",
}


# ── Playwright fetch ──────────────────────────────────────────────────────────

def fetch_html(url: str, timeout_ms: int = 20000) -> str:
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(user_agent=(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        ))
        page = ctx.new_page()
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=timeout_ms)
            page.wait_for_timeout(1500)
            html = page.content()
        except Exception as e:
            print(f"    [WARN] fetch error: {e}")
            html = ""
        finally:
            browser.close()
    return html


# ── Pass 1: Yellow Pages scraper ──────────────────────────────────────────────

def parse_yellowpages(html: str) -> list[dict]:
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, "lxml")
    results = []

    cards = (
        soup.select("article.listing__item") or
        soup.select("div.listing__item") or
        soup.select("[class*='listing__content']") or
        soup.select("div.resultLayout") or
        soup.select("li.result")
    )

    for card in cards:
        name_el = (
            card.select_one("a.listing__name") or
            card.select_one("[class*='listing__name']") or
            card.select_one("h3 a") or
            card.select_one("h2 a")
        )
        name = name_el.get_text(strip=True) if name_el else None
        if not name or len(name) < 2:
            continue

        phone_el = card.select_one("[class*='phone']") or card.select_one("a[href^='tel:']")
        phone = None
        if phone_el:
            raw = phone_el.get_text(strip=True) or phone_el.get("href", "").replace("tel:", "")
            phone = normalize_phone(raw)

        # Website link — Yellow Pages wraps it in a tracking redirect
        website_el = (
            card.select_one("a[class*='website']") or
            card.select_one("a[href*='yellowpages.ca/click']") or
            card.select_one("a[data-analytics*='website']")
        )
        website = website_el.get("href") if website_el else None
        # Some cards embed the real URL in data-url
        if not website:
            website = card.get("data-url") or None

        addr_el = card.select_one("[class*='address']") or card.select_one("address")
        address = addr_el.get_text(strip=True) if addr_el else None

        results.append({
            "name": name,
            "phone": phone,
            "website": website,
            "address": address,
        })

    return results


def scrape_yellowpages(search_term: str, province: str, max_leads: int, org_id: str, industry: str) -> int:
    prov_slug = PROVINCE_MAP.get(province.upper(), province.lower())
    term_slug = search_term.lower().replace(" ", "+")
    total = 0

    for page_num in range(1, 5):
        if total >= max_leads:
            break
        url = f"https://www.yellowpages.ca/search/si/{page_num}/{term_slug}/{prov_slug}"
        print(f"  [YP] {url}")
        html = fetch_html(url)
        raw = parse_yellowpages(html)
        print(f"       parsed {len(raw)} listings")
        if not raw:
            break

        unique = dedupe(raw, org_id)
        inserted = insert_leads(unique[:max_leads - total], org_id, industry, province, url)
        total += inserted
        print(f"       inserted {inserted} (running total: {total})")
        time.sleep(1.5)

    return total


# ── Pass 2: Email enrichment ──────────────────────────────────────────────────

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")

CONTACT_PATHS = ["/contact", "/contact-us", "/contact_us", "/about", "/about-us", "/reach-us", "/get-in-touch", "/"]


def extract_emails_from_html(html: str) -> list[str]:
    """Find all valid, non-blacklisted emails in raw HTML."""
    found = EMAIL_RE.findall(html)
    clean = []
    seen = set()
    for e in found:
        e = e.lower().strip(".")
        domain = e.split("@")[-1]
        if domain in EMAIL_BLACKLIST:
            continue
        # Skip image/asset filenames that match email pattern
        if any(e.endswith(ext) for ext in [".png", ".jpg", ".svg", ".gif", ".css", ".js"]):
            continue
        if e not in seen:
            seen.add(e)
            clean.append(e)
    return clean


def resolve_real_url(url: str) -> str:
    """Extract the real company URL from a Yellow Pages redirect link."""
    if not url:
        return url
    # YP redirect: /gourl/...?redirect=https%3A%2F%2Fwww.company.com
    import urllib.parse
    parsed = urllib.parse.urlparse(url)
    qs = urllib.parse.parse_qs(parsed.query)
    if "redirect" in qs:
        return urllib.parse.unquote(qs["redirect"][0])
    # If it's a relative YP path, it's not usable for email lookup
    if url.startswith("/gourl") or url.startswith("/click"):
        return ""
    return url


def find_email_for_website(website_url: str) -> str | None:
    """Visit a company website and try to find a contact email."""
    website_url = resolve_real_url(website_url)
    if not website_url or not website_url.startswith("http"):
        return None

    # Normalize base URL
    base = website_url.rstrip("/")
    if "?" in base:
        base = base[:base.index("?")]

    # Try contact page first, then home
    for path in CONTACT_PATHS:
        url = base + path if path != "/" else base
        try:
            html = fetch_html(url, timeout_ms=12000)
            if not html:
                continue
            emails = extract_emails_from_html(html)
            if emails:
                # Prefer hr@, info@, contact@, admin@ over generic ones
                priority = [e for e in emails if any(
                    e.startswith(p) for p in ["hr@", "info@", "contact@", "admin@", "hiring@", "jobs@", "recruit"]
                )]
                return priority[0] if priority else emails[0]
        except Exception:
            continue
        time.sleep(0.8)

    return None


def enrich_leads(org_id: str, max_enrich: int) -> int:
    """Find leads with a real website URL but no email, and try to fill in the email."""
    resp = sb.table("LmiaLead") \
        .select("id, companyName, sourceUrl") \
        .eq("organizationId", org_id) \
        .is_("email", "null") \
        .not_.is_("sourceUrl", "null") \
        .limit(max_enrich) \
        .execute()

    # Deduplicate by sourceUrl within this batch
    seen_urls: set[str] = set()
    unique_leads = []
    for lead in (resp.data or []):
        url = resolve_real_url(lead.get("sourceUrl") or "")
        if not url or url in seen_urls:
            continue
        seen_urls.add(url)
        lead["_resolved_url"] = url
        unique_leads.append(lead)

    leads = unique_leads
    print(f"\n[ENRICH] Checking {len(leads)} leads for email addresses")

    enriched = 0
    for lead in leads:
        site = lead.get("_resolved_url") or resolve_real_url(lead.get("sourceUrl", ""))
        name = lead.get("companyName", "")

        # Skip directory URLs — we need the actual company website
        if not site or any(d in site for d in ["yellowpages.ca", "jobbank.gc.ca", "indeed.com", "linkedin.com"]):
            print(f"  [SKIP] {name} — no direct website URL")
            continue

        print(f"  [EMAIL] {name}")
        print(f"          {site}")
        email = find_email_for_website(site)

        if email:
            sb.table("LmiaLead") \
                .update({"email": email}) \
                .eq("id", lead["id"]) \
                .execute()
            print(f"           -> {email}")
            enriched += 1
        else:
            print(f"           -> no email found")

    return enriched


# ── Helpers ───────────────────────────────────────────────────────────────────

def normalize_phone(raw: str | None) -> str | None:
    if not raw:
        return None
    digits = re.sub(r"\D", "", raw)
    if len(digits) == 10:
        return f"{digits[:3]}-{digits[3:6]}-{digits[6:]}"
    if len(digits) == 11 and digits[0] == "1":
        return f"{digits[1:4]}-{digits[4:7]}-{digits[7:]}"
    return raw.strip() or None


def dedupe(leads: list[dict], org_id: str) -> list[dict]:
    resp = sb.table("LmiaLead").select("companyName").eq("organizationId", org_id).execute()
    existing = {r["companyName"].lower().strip() for r in (resp.data or [])}
    seen = set()
    result = []
    for l in leads:
        key = l.get("name", "").lower().strip()
        if key and key not in existing and key not in seen:
            seen.add(key)
            result.append(l)
    return result


def insert_leads(leads: list[dict], org_id: str, industry: str, province: str, source_url: str) -> int:
    rows = []
    for l in leads:
        name = (l.get("name") or "").strip()
        if not name:
            continue
        raw_site = l.get("website") or ""
        real_site = resolve_real_url(raw_site) if raw_site else None
        rows.append({
            "organizationId": org_id,
            "companyName": name,
            "contactName": None,
            "email": None,
            "phone": l.get("phone"),
            "industry": industry.title(),
            "province": province.upper(),
            "jobTitle": None,
            "nocCode": None,
            "source": "SCRAPED",
            "sourceUrl": real_site or source_url,
            "status": "NEW",
            "notes": l.get("address"),
        })
    if not rows:
        return 0
    resp = sb.table("LmiaLead").insert(rows).execute()
    return len(resp.data or [])


def get_org_id() -> str:
    resp = sb.table("Organization").select("id").limit(1).execute()
    if not resp.data:
        print("[ERR] No organizations found.")
        sys.exit(1)
    return resp.data[0]["id"]


# ── Government LMIA decisions database ───────────────────────────────────────
# Canada.ca publishes all LMIA application decisions as open data (CSV)
# These are employers who have ALREADY applied for LMIA — perfect warm leads
LMIA_OPEN_DATA_URL = "https://open.canada.ca/data/en/datastore/dump/97c97ce4-dc73-4f3e-a212-f8da98685ef6?format=csv"

def scrape_lmia_decisions(province: str, max_leads: int, org_id: str) -> int:
    """Download Government of Canada LMIA decisions open data.
    These are real employers who have applied for LMIAs — the best possible leads."""
    import csv
    import io
    import urllib.request

    print(f"  Downloading LMIA decisions from open.canada.ca ...")
    try:
        req = urllib.request.Request(
            LMIA_OPEN_DATA_URL,
            headers={"User-Agent": "Mozilla/5.0", "Accept": "text/csv"}
        )
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read().decode("utf-8-sig", errors="replace")
    except Exception as e:
        print(f"  [WARN] Could not download LMIA data: {e}")
        # Fallback URL
        try:
            fallback = "https://www.canada.ca/content/dam/esdc-edsc/documents/services/foreign-workers/reports/lmia-decisions.csv"
            req2 = urllib.request.Request(fallback, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req2, timeout=20) as r2:
                raw = r2.read().decode("utf-8-sig", errors="replace")
        except Exception as e2:
            print(f"  [WARN] Fallback also failed: {e2}")
            return 0

    resp = sb.table("LmiaLead").select("companyName").eq("organizationId", org_id).execute()
    existing = {r["companyName"].lower().strip() for r in (resp.data or [])}

    rows = []
    seen: set[str] = set()
    reader = csv.DictReader(io.StringIO(raw))

    for row in reader:
        if len(rows) >= max_leads:
            break

        # Column names vary — try multiple
        company = (
            row.get("Employer Trade Name") or row.get("employer_trade_name") or
            row.get("Employer Name") or row.get("employer_name") or
            row.get("Business Name") or row.get("business_name") or ""
        ).strip()

        prov = (
            row.get("Province/Territory") or row.get("province_territory") or
            row.get("Province") or row.get("province") or ""
        ).strip()

        if province and prov and province.upper() not in prov.upper():
            continue

        if not company or len(company) < 2:
            continue

        key = company.lower()
        if key in existing or key in seen:
            continue
        seen.add(key)

        noc = (row.get("NOC") or row.get("noc_code") or "").strip()
        job_title = (row.get("Job Title") or row.get("job_title") or row.get("Occupation") or "").strip()
        city = (row.get("City") or row.get("city") or "").strip()

        rows.append({
            "organizationId": org_id,
            "companyName": company,
            "contactName": None,
            "email": None, "phone": None,
            "industry": "LMIA Applicant",
            "province": prov[:2].upper() if prov else province or None,
            "jobTitle": job_title or None,
            "nocCode": noc or None,
            "source": "GOV_LMIA_DATA",
            "sourceUrl": "https://open.canada.ca/data/en/dataset/90175891-d18a-4fd7-97c5-b943e4c7d8a8",
            "status": "NEW",
            "notes": f"Previous LMIA applicant. Location: {city}".strip(". ") or None,
        })

    if not rows:
        print("  [INFO] No matching records in LMIA dataset for this province")
        return 0

    resp2 = sb.table("LmiaLead").insert(rows).execute()
    return len(resp2.data or [])


# ── Reddit scraper (via Playwright — handles JS) ───────────────────────────────

REDDIT_QUERIES = [
    "LMIA employer Canada hiring",
    "hire foreign workers Canada farm",
    "TFWP employer Canada",
]

PROVINCE_REDDIT_QUERIES = {
    "BC": ["farm workers BC LMIA", "agriculture workers British Columbia foreign"],
    "AB": ["farm workers Alberta LMIA", "construction Alberta foreign workers"],
    "ON": ["farm workers Ontario LMIA", "food processing Ontario foreign workers"],
}


def scrape_reddit(province: str, max_leads: int, org_id: str) -> int:
    """Search Reddit using Playwright (handles JS/bot protection) for LMIA employer threads."""
    import json as _json
    from bs4 import BeautifulSoup

    queries = PROVINCE_REDDIT_QUERIES.get(province.upper(), []) + REDDIT_QUERIES
    queries = queries[:4]

    resp = sb.table("LmiaLead").select("companyName").eq("organizationId", org_id).execute()
    existing = {r["companyName"].lower().strip() for r in (resp.data or [])}

    company_re = re.compile(
        r'([A-Z][A-Za-z0-9\s&\'.,-]{3,45}(?:Ltd|Inc|Corp|Co\.|Limited|Farms?|Ranch|Restaurant|Hotel|Services|Industries|Group))',
        re.IGNORECASE,
    )

    def industry_from_text(text: str) -> str:
        t = text.lower()
        if any(w in t for w in ["farm", "agricult", "greenhouse", "harvest"]): return "Agriculture"
        if any(w in t for w in ["restaurant", "hotel", "hospitality", "resort"]): return "Hospitality"
        if any(w in t for w in ["construct", "contractor", "trades"]): return "Construction"
        if any(w in t for w in ["truck", "transport", "driver"]): return "Transport"
        if any(w in t for w in ["food processing", "meat", "packing"]): return "Food Processing"
        return "General"

    rows = []
    seen_names: set[str] = set()

    for query in queries:
        if len(rows) >= max_leads:
            break
        url = f"https://old.reddit.com/search?q={query.replace(' ', '+')}&sort=new&t=month"
        print(f"  [REDDIT] {url}")
        html = fetch_html(url, timeout_ms=20000)
        if not html:
            continue

        soup = BeautifulSoup(html, "lxml")
        posts = soup.select("div.search-result-link, div[data-type='link']")
        print(f"           found {len(posts)} posts")

        for post in posts:
            if len(rows) >= max_leads:
                break
            title_el = post.select_one("a.search-title, p.title a")
            title = title_el.get_text(strip=True) if title_el else ""
            link = title_el.get("href", "") if title_el else ""
            if not title:
                continue

            company_matches = company_re.findall(title)
            company = company_matches[0].strip() if company_matches else f"[Reddit] {title[:60]}"
            key = company.lower().strip()
            if key in existing or key in seen_names or len(key) < 4:
                continue
            seen_names.add(key)

            rows.append({
                "organizationId": org_id,
                "companyName": company,
                "contactName": None,
                "email": None, "phone": None,
                "industry": industry_from_text(title),
                "province": province or None,
                "jobTitle": None, "nocCode": None,
                "source": "REDDIT",
                "sourceUrl": link if link.startswith("http") else f"https://reddit.com{link}",
                "status": "NEW",
                "notes": title[:200],
            })
        time.sleep(2)

    if not rows:
        return 0
    resp2 = sb.table("LmiaLead").insert(rows).execute()
    return len(resp2.data or [])


# ── Indeed scraper ────────────────────────────────────────────────────────────

INDEED_LMIA_TERMS = [
    "farm worker", "greenhouse worker", "general labourer",
    "food processing worker", "truck driver", "hotel housekeeper",
]

def scrape_indeed(province: str, max_leads: int, org_id: str) -> int:
    """Scrape Indeed Canada for employers posting LMIA-eligible job titles."""
    from bs4 import BeautifulSoup

    prov_code = province.upper() if province else "BC"
    prov_name_map = {
        "BC": "British+Columbia", "AB": "Alberta", "ON": "Ontario",
        "QC": "Quebec", "MB": "Manitoba", "SK": "Saskatchewan",
    }
    prov_name = prov_name_map.get(prov_code, prov_code)

    resp = sb.table("LmiaLead").select("companyName").eq("organizationId", org_id).execute()
    existing = {r["companyName"].lower().strip() for r in (resp.data or [])}

    rows = []
    seen: set[str] = set()

    for term in INDEED_LMIA_TERMS[:4]:
        if len(rows) >= max_leads:
            break
        encoded = term.replace(" ", "+")
        url = f"https://ca.indeed.com/jobs?q={encoded}&l={prov_name}&sort=date"
        print(f"  [INDEED] {url}")
        html = fetch_html(url, timeout_ms=20000)
        if not html:
            continue

        soup = BeautifulSoup(html, "lxml")
        # Indeed job cards
        cards = soup.select("div.job_seen_beacon, div[class*='jobCard'], li[class*='result']")
        print(f"           parsed {len(cards)} job cards")

        for card in cards:
            if len(rows) >= max_leads:
                break
            # Company name
            company_el = (
                card.select_one("[data-testid='company-name']") or
                card.select_one("span.companyName") or
                card.select_one("[class*='companyName']") or
                card.select_one("span[class*='company']")
            )
            company = company_el.get_text(strip=True) if company_el else None
            if not company or len(company) < 2:
                continue

            key = company.lower().strip()
            if key in existing or key in seen:
                continue
            seen.add(key)

            # Job title
            title_el = card.select_one("h2 a, [data-testid='jobTitle'] a, [class*='jobTitle']")
            job_title = title_el.get_text(strip=True) if title_el else term.title()

            # Location
            loc_el = card.select_one("[data-testid='text-location'], [class*='companyLocation']")
            location = loc_el.get_text(strip=True) if loc_el else None

            # Link to job
            link_el = card.select_one("h2 a, a[id^='job_']")
            job_url = None
            if link_el:
                href = link_el.get("href", "")
                job_url = f"https://ca.indeed.com{href}" if href.startswith("/") else href

            rows.append({
                "organizationId": org_id,
                "companyName": company,
                "contactName": None,
                "email": None,
                "phone": None,
                "industry": _indeed_industry(term),
                "province": prov_code,
                "jobTitle": job_title,
                "nocCode": None,
                "source": "INDEED",
                "sourceUrl": job_url,
                "status": "NEW",
                "notes": location,
            })

        time.sleep(2)

    if not rows:
        return 0
    resp2 = sb.table("LmiaLead").insert(rows).execute()
    return len(resp2.data or [])


def _indeed_industry(term: str) -> str:
    t = term.lower()
    if "farm" in t or "greenhouse" in t: return "Agriculture"
    if "food" in t: return "Food Processing"
    if "truck" in t or "driver" in t: return "Transport"
    if "hotel" in t or "housekeep" in t: return "Hospitality"
    return "General"


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="LMIA Lead Scraper — Yellow Pages + Reddit + Indeed + Gov LMIA Data",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Sources:
  --industry    Yellow Pages Canada (best for company names + phones + websites)
  --reddit      Reddit Canada threads mentioning LMIA / foreign worker hiring
  --indeed      Indeed Canada job postings (employers actively hiring)
  --lmia-data   Gov of Canada open data — employers who ALREADY applied for LMIA (best source!)
  --enrich      Visit company websites to find email addresses (run after scraping)

Examples:
  python scripts/scrape_lmia_leads.py --lmia-data --province BC --max 100
  python scripts/scrape_lmia_leads.py --industry agriculture --province BC --max 30 --enrich
  python scripts/scrape_lmia_leads.py --indeed --province BC --max 40 --enrich
  python scripts/scrape_lmia_leads.py --reddit --province AB --max 30
  python scripts/scrape_lmia_leads.py --all-industries --province BC --max 10
  python scripts/scrape_lmia_leads.py --enrich --max 100
        """
    )
    parser.add_argument("--industry", help=f"Yellow Pages industry: {', '.join(INDUSTRY_MAP)}")
    parser.add_argument("--reddit", action="store_true", help="Scrape Reddit for LMIA employer leads")
    parser.add_argument("--indeed", action="store_true", help="Scrape Indeed Canada job postings")
    parser.add_argument("--lmia-data", action="store_true", help="Gov of Canada open data - employers who applied for LMIA")
    parser.add_argument("--all-industries", action="store_true", help="Scrape all Yellow Pages industries")
    parser.add_argument("--province", default="BC", help="Province code (default: BC)")
    parser.add_argument("--max", type=int, default=20, help="Max leads per source (default: 20)")
    parser.add_argument("--enrich", action="store_true", help="Visit company websites to find emails")
    args = parser.parse_args()

    print("\nLMIA Lead Scraper -- ADS Immigration Services")
    print("=" * 52)

    org_id = get_org_id()
    print(f"[OK] Org ID : {org_id}")
    print(f"[OK] Province: {args.province}")
    print(f"[OK] Max     : {args.max}\n")

    total = 0
    ran_something = False

    # Yellow Pages
    if args.industry:
        ran_something = True
        terms = INDUSTRY_MAP.get(args.industry.lower())
        if not terms:
            print(f"[ERR] Unknown industry. Options: {', '.join(INDUSTRY_MAP)}")
            sys.exit(1)
        print(f"[SOURCE] Yellow Pages — {args.industry.upper()}")
        for term in terms[:2]:
            if total >= args.max:
                break
            total += scrape_yellowpages(term, args.province, args.max - total, org_id, args.industry)
        print(f"         -> {total} leads scraped")

    if args.all_industries:
        ran_something = True
        per = max(3, args.max // len(INDUSTRY_MAP))
        for ind in INDUSTRY_MAP:
            print(f"[SOURCE] Yellow Pages — {ind.upper()}")
            n = scrape_yellowpages(INDUSTRY_MAP[ind][0], args.province, per, org_id, ind)
            total += n
        print(f"         -> {total} total leads")

    # Reddit
    if args.reddit:
        ran_something = True
        print(f"[SOURCE] Reddit — searching LMIA employer threads")
        n = scrape_reddit(args.province, args.max, org_id)
        total += n
        print(f"         -> {n} leads from Reddit")

    # Indeed
    if args.indeed:
        ran_something = True
        print(f"[SOURCE] Indeed Canada — {args.province}")
        n = scrape_indeed(args.province, args.max, org_id)
        total += n
        print(f"         -> {n} leads from Indeed")

    # Government of Canada LMIA open data
    if args.lmia_data:
        ran_something = True
        print(f"[SOURCE] Gov of Canada LMIA decisions (open data)")
        n = scrape_lmia_decisions(args.province, args.max, org_id)
        total += n
        print(f"         -> {n} leads from Gov LMIA data")

    if not ran_something and not args.enrich:
        parser.print_help()
        sys.exit(1)

    if total > 0:
        print(f"\n[DONE] Total new leads scraped: {total}")

    # Email enrichment pass
    if args.enrich:
        print(f"\n[ENRICH] Visiting company websites to find email addresses...")
        enriched = enrich_leads(org_id, args.max * 3)
        print(f"[DONE] Enriched {enriched} leads with email addresses")

    print(f"\n[->] View leads: https://mqh56s7s-47hx.vercel.app/lmia/leads\n")


if __name__ == "__main__":
    main()
