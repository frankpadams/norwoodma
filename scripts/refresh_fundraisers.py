"""Render current fundraisers from curated campaigns and the shared calendar.

No AI service, credentials, social scraper, or flyer storage is required.
"""
import argparse
from datetime import date, datetime
from html import escape
import json
from pathlib import Path
import re
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
START = '<!-- BEGIN GENERATED CURRENT FUNDRAISERS -->'
END = '<!-- END GENERATED CURRENT FUNDRAISERS -->'
TERMS = re.compile(r'fundrais|benefit|raffle|pie sale|cookie sale|car wash|food drive|toy drive|donation drive', re.I)


def safe_url(value):
    try:
        p = urlparse(value or '')
        return p.scheme in ('https', 'http') and bool(p.hostname) and not p.username
    except ValueError:
        return False


def active(row, today):
    end = row.get('end_date')
    return not end or date.fromisoformat(end) >= today


def collect(curated, events, today):
    rows = [dict(r) for r in curated if active(r, today) and safe_url(r.get('url'))]
    seen_urls = {r['url'].rstrip('/') for r in rows}
    seen_titles = {re.sub(r'\W+', '', r['title'].lower()) for r in rows}
    for e in events:
        title = e.get('title', '')
        # Calendar tags alone are insufficient: scraped page boilerplate can
        # accidentally tag unrelated articles as fundraisers.
        if not TERMS.search(title):
            continue
        if e.get('publish_candidate') is False or e.get('public_access') not in ('public', 'ticketed_public'):
            continue
        if e.get('verification_status') in (None, 'unverified', 'rejected'):
            continue
        url = e.get('registration_url') or e.get('ticket_url') or e.get('source_url')
        if not safe_url(url) or 'cbnma.com' in urlparse(url).netloc.lower() or 'citizens-better-norwood' in e.get('source_id', ''):
            continue
        location = ' '.join(str(e.get(k) or '') for k in ('town', 'address', 'venue', 'organizer'))
        if not (re.search(r'\bnorwood\b', location, re.I) and not re.search(r'\bnorwood\s*,?\s*(NJ|OH|PA|NY)\b', location, re.I)):
            continue
        start = (e.get('start') or {}).get('date')
        end = (e.get('end') or {}).get('date') or start
        try:
            if not start or date.fromisoformat(end) < today:
                continue
        except (ValueError, TypeError):
            continue
        key = re.sub(r'\W+', '', title.lower())
        if url.rstrip('/') in seen_urls or key in seen_titles:
            continue
        organizer = e.get('organizer') or e.get('venue')
        if not organizer:
            continue
        row = dict(id=e['id'], title=title, organizer=organizer,
                   date_label=start if start == end else f'{start} – {end}',
                   description=e.get('notes') or '', url=url, end_date=end,
                   venue=e.get('venue'), time=(e.get('start') or {}).get('time'),
                   origin='calendar')
        rows.append(row)
        seen_urls.add(url.rstrip('/'))
        seen_titles.add(key)
    return rows


def render(rows, today):
    parts = ['<h2>Current Fundraisers</h2><div class="list">']
    for r in rows:
        esc = lambda key: escape(str(r.get(key) or ''))
        text = r.get('description') or ''
        if r.get('order_deadline') and date.fromisoformat(r['order_deadline']) < today:
            text = 'Ordering has closed. ' + text
        parts.append(f'<article class="item"><div class="date">{esc("date_label")}</div>'
                     f'<h3>{esc("title")}</h3><p class="fundraiser-organizer">{esc("organizer")}</p>'
                     f'<p>{escape(text)}</p><p><a class="action" href="{esc("url")}" '
                     'target="_blank" rel="noopener">Details &amp; participation ↗</a></p></article>')
    if not rows:
        parts.append('<article class="item"><p>No current campaigns are listed. See the organizations below for ongoing ways to help.</p></article>')
    parts.append('</div><p class="small"><a href="contact.html">Contact us to suggest a Norwood fundraiser →</a></p>')
    return START + '\n' + ''.join(parts) + '\n' + END


def load_events(path=None):
    """Load calendar events, treating a blank seed file as an empty calendar."""
    path = Path(path) if path is not None else ROOT / 'data/events.json'
    raw = path.read_text(encoding='utf-8').strip()
    if not raw:
        return []
    data = json.loads(raw)
    if not isinstance(data, list):
        raise ValueError(f'{path} must contain a JSON array')
    return data


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--today', type=date.fromisoformat)
    args = parser.parse_args()
    today = args.today or datetime.now(ZoneInfo('America/New_York')).date()
    curated = json.loads((ROOT / 'data/fundraisers-curated.json').read_text())
    events = load_events()
    rows = collect(curated, events, today)
    page = ROOT / 'fundraising.html'
    content = page.read_text()
    replacement = render(rows, today)
    if START in content and END in content:
        content = content[:content.index(START)] + replacement + content[content.index(END) + len(END):]
    else:
        begin = content.index('<h2>Current Fundraisers</h2>')
        end = content.index('<h2>Organizations', begin)
        content = content[:begin] + replacement + content[end:]
    page.write_text(content)
    (ROOT / 'data/fundraisers.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2) + '\n')
    print(f'Published {len(rows)} active fundraisers for {today}.')


if __name__ == '__main__':
    main()
