import importlib.util
from datetime import datetime, timezone
from pathlib import Path
import unittest

SPEC = importlib.util.spec_from_file_location('town_social', Path(__file__).resolve().parents[1] / 'scripts/refresh-town-social.py')
social = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(social)


class TownSocialTest(unittest.TestCase):
    def post(self, post_id='1', text='Town Hall closed<br>Trash unchanged', network=3):
        return social.normalize_post({'id': post_id, 'status': 1, 'flagged': 0,
            'network_id': network, 'source_created_at': '2026-11-10T12:00:00Z',
            'text': text, 'url': 'https://www.facebook.com/TownofNorwoodMA/posts/' + post_id}, 'feed')

    def test_cross_network_duplicates_combine_source_links(self):
        first = self.post()
        second = self.post('2', 'Town Hall closed\nTrash unchanged', 2)
        rows = social.merge_posts([], [first, second], datetime(2026, 11, 11, tzinfo=timezone.utc))
        self.assertEqual(len(rows), 1)
        self.assertEqual(len(rows[0]['links']), 2)

    def test_failure_retains_snapshot_and_edits_replace_text(self):
        before = self.post()
        now = datetime(2026, 11, 11, tzinfo=timezone.utc)
        self.assertEqual(social.merge_posts([before], [], now), [before])
        edited = self.post(text='Town Hall reopens')
        rows = social.merge_posts([before], [edited], now)
        self.assertEqual([row['text'] for row in rows], ['Town Hall reopens'])

    def test_video_only_post_keeps_original_link(self):
        self.assertIsNotNone(self.post(text=''))

    def test_markup_is_escaped_and_failure_is_visible(self):
        post = self.post(text='&lt;script&gt;alert(1)&lt;/script&gt;')
        status = {'checked_at': '2026-11-11T12:00:00Z', 'sources': [{'ok': False}]}
        html = social.render([post], status)
        self.assertNotIn('<script>', html)
        self.assertIn('temporarily unavailable', html)
        self.assertIn('View on Facebook', html)
        self.assertEqual(social.https_url('javascript:alert(1)'), '')

    def test_old_and_future_posts_are_excluded(self):
        now = datetime(2027, 2, 11, tzinfo=timezone.utc)
        self.assertEqual(social.merge_posts([self.post()], [], now), [])


if __name__ == '__main__':
    unittest.main()
