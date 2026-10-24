import importlib.util
import unittest
from pathlib import Path

SPEC = importlib.util.spec_from_file_location('refresh_news', Path(__file__).resolve().parents[1] / 'scripts/refresh_content.py')
refresh = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(refresh)

class NewsPublicationDatesTest(unittest.TestCase):
    def test_headline_deadline_is_not_publication_date(self):
        headline = 'Guild Pond Feasibility Study: Seeking Public Comment Through October 22, 2026'
        html = '<article><h2><a href="/article/guild">' + headline + '</a></h2><p>October 15, 2026</p></article>'
        for parser in (refresh.news_from_visible_cards, refresh.news_from_link_dates):
            with self.subTest(parser=parser.__name__):
                rows = parser(html, 'The Norwood Record', 'https://www.norwoodrecord.com/news')
                self.assertEqual(len(rows), 1)
                self.assertTrue(rows[0]['date'].startswith('2026-10-15'))
                self.assertEqual(rows[0]['title'], headline)

    def test_headline_date_alone_does_not_establish_publication(self):
        html = '<article><h2><a href="/article/guild">Comment deadline October 22, 2026</a></h2></article>'
        for parser in (refresh.news_from_visible_cards, refresh.news_from_link_dates):
            with self.subTest(parser=parser.__name__):
                self.assertEqual(parser(html, 'Record', 'https://www.norwoodrecord.com/news'), [])

    def test_realtor_com_content_is_blocked(self):
        items = [
            {'source': 'Realtor.com', 'title': 'Local listing', 'url': 'https://news.google.com/rss/item'},
            {'source': 'Google News discovery', 'title': '37 Wheelock Ave - Realtor.com', 'url': 'https://news.google.com/rss/item'},
            {'source': 'Unknown', 'title': 'Local listing', 'url': 'https://www.realtor.com/realestateandhomes-detail/example'},
        ]
        for item in items:
            with self.subTest(item=item):
                self.assertTrue(refresh.news_item_blocked(item))

if __name__ == '__main__':
    unittest.main()
