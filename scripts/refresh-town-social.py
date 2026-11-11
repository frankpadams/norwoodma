#!/usr/bin/env python3
"""Read the Town's public social embeds and render its dated post archive."""
import argparse
from datetime import datetime, timedelta, timezone
from html import escape
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.parse import urlparse
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data/town-social.json'
STATUS = ROOT / 'data/town-social-status.json'
PAGE = ROOT / 'town-updates.html'
HOME = 'https://www.norwoodma.gov/'
TZ = ZoneInfo('America/New_York')
START = '<!-- BEGIN TOWN SOCIAL POSTS -->'
END = '<!-- END TOWN SOCIAL POSTS -->'


class PostText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []

    def handle_starttag(self, tag, attrs):
        if tag in ('br', 'p', 'div'):
            self.parts.append('\n')

    def handle_data(self, data):
        self.parts.append(data)


def plain_text(value):
    parser = PostText()
    parser.feed(str(value or ''))
    lines = [' '.join(line.split()) for line in ''.join(parser.parts).splitlines()]
    return '\n'.join(line for line in lines if line).strip()


def https_url(value, domains=None):
    value = str(value or '')
    parsed = urlparse(value)
    host = (parsed.hostname or '').lower()
    if parsed.scheme != 'https' or not host or parsed.username or parsed.password:
        return ''
    if domains and not any(host == domain or host.endswith('.' + domain) for domain in domains):
        return ''
    return value


def fetch(url):
    request = Request(url, headers={'User-Agent': 'Norwood.ma official social feed reader (+https://www.norwood.ma)'})
    with urlopen(request, timeout=25) as response:
        return response.read().decode('utf-8')


def date_value(value):
    parsed = datetime.fromisoformat(str(value).replace('Z', '+00:00'))
    if parsed.tzinfo is None:
        raise ValueError('Post has no timezone')
    return parsed


def normalize_post(post, feed_id):
    url = https_url(post.get('url'), ('facebook.com', 'instagram.com'))
    timestamp = post.get('source_created_at')
    date_value(timestamp)
    if not url or post.get('flagged') or post.get('status') != 1:
        return None
    text = plain_text(post.get('text'))
    if re.search(r'\b(?:paid advertisement|sponsored content|advertorial)\b', text, re.I):
        return None
    image = https_url(post.get('image_large') or post.get('image'))
    network = 'Instagram' if post.get('network_id') == 2 else 'Facebook'
    return {'id': str(post['id']), 'feed_id': feed_id, 'date': timestamp, 'text': text,
            'image': image, 'links': [{'network': network, 'url': url}]}


def merge_posts(previous, incoming, now):
    # Keep stable post IDs so edits replace earlier text and a failed source retains its last snapshot.
    records = {post['id']: post for post in previous}
    records.update({post['id']: post for post in incoming})
    groups = {}
    for post in sorted(records.values(), key=lambda item: item['date'], reverse=True):
        try:
            published = date_value(post['date'])
        except (KeyError, TypeError, ValueError):
            continue
        if not now - timedelta(days=60) <= published <= now + timedelta(days=1):
            continue
        key = re.sub(r'\W+', '', post['text'].casefold()) if post['text'] else post['id']
        if key in groups:
            existing = groups[key]
            for link in post['links']:
                if link not in existing['links']:
                    existing['links'].append(link)
        else:
            groups[key] = dict(post, links=list(post['links']))
    return list(groups.values())[:200]


def render(posts, status):
    checked = date_value(status['checked_at']).astimezone(TZ).strftime('%b %-d, %Y at %-I:%M%p').lower()
    warnings = [source for source in status['sources'] if not source['ok']]
    warning = '<p class="town-social-warning">Some feeds are temporarily unavailable. Showing the last available posts.</p>' if warnings else ''
    cards = []
    for post in posts[:30]:
        published = date_value(post['date']).astimezone(TZ)
        title = post['text'].split('\n')[0] if post['text'] else 'Town of Norwood social update'
        if len(title) > 150:
            title = title[:147].rstrip() + '…'
        links = ' · '.join('<a href="' + escape(link['url'], quote=True) + '" target="_blank" rel="noopener">View on ' + escape(link['network']) + ' ↗</a>' for link in post['links'])
        image = '<a href="' + escape(post['links'][0]['url'], quote=True) + '" target="_blank" rel="noopener"><img src="' + escape(post['image'], quote=True) + '" alt="Town of Norwood post image" loading="lazy" decoding="async" width="180"/></a>' if post['image'] else ''
        cards.append('<article class="town-social-post"><details><summary><time datetime="' + escape(post['date'], quote=True) + '">' + published.strftime('%b %-d, %Y') + '</time><strong>' + escape(title) + '</strong></summary><div class="town-social-body">' + image + '<p>' + escape(post['text']) + '</p><div class="town-social-links">' + links + '</div></div></details></article>')
    return START + '<section class="town-social" aria-labelledby="town-social-title"><h2 id="town-social-title">From the Town’s social accounts</h2><p>Recent official posts, newest first. Select a post for details and its original source.</p><p class="muted small">Last checked ' + escape(checked) + ' Eastern.</p>' + warning + ''.join(cards) + '</section>' + END


def write_json(path, value):
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    temporary.replace(path)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--offline', action='store_true', help='Render the saved posts without network access')
    args = parser.parse_args()
    now = datetime.now(timezone.utc)
    previous = json.loads(DATA.read_text()) if DATA.exists() else []
    incoming, sources = [], []
    if args.offline:
        status = json.loads(STATUS.read_text())
        posts = previous
    else:
        try:
            homepage = fetch(HOME)
            embeds = list(dict.fromkeys(re.findall(r'https://cdn\.curator\.io/published/([a-f0-9-]{36})\.js', homepage)))
            if len(embeds) < 2:
                raise ValueError('Expected both Facebook and Instagram embeds on the Town homepage')
        except Exception as error:
            embeds = []
            sources.append({'url': HOME, 'ok': False, 'error': str(error)[:250]})
        for feed_id in embeds:
            url = 'https://api.curator.io/restricted/feeds/' + feed_id + '/posts?limit=100'
            try:
                payload = json.loads(fetch(url))
                if payload.get('success') is not True or not isinstance(payload.get('posts'), list):
                    raise ValueError('Unexpected public feed response')
                rows = []
                for post in payload['posts']:
                    normalized = normalize_post(post, feed_id)
                    if normalized:
                        rows.append(normalized)
                incoming.extend(rows)
                sources.append({'url': url, 'ok': True, 'posts_received': len(payload['posts']), 'posts_kept': len(rows)})
            except Exception as error:
                sources.append({'url': url, 'ok': False, 'error': str(error)[:250]})
        posts = merge_posts(previous, incoming, now)
        status = {'checked_at': now.isoformat(), 'ok': bool(sources) and all(source['ok'] for source in sources), 'sources': sources, 'posts_retained': len(posts)}
        write_json(DATA, posts)
        write_json(STATUS, status)
    html = PAGE.read_text()
    if START not in html or END not in html:
        raise ValueError('Town social page markers are missing')
    before, rest = html.split(START, 1)
    _, after = rest.split(END, 1)
    PAGE.write_text(before + render(posts, status) + after)
    print(json.dumps(status, indent=2))
    if not status['ok'] and not args.offline:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
