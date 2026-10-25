import importlib.util
from datetime import date
from pathlib import Path
import unittest
spec = importlib.util.spec_from_file_location('fundraisers', Path(__file__).resolve().parents[1] / 'scripts/refresh_fundraisers.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

class FundraisersTest(unittest.TestCase):
    def event(self, **updates):
        e = dict(id='test', title='School Pie Sale', organizer='Norwood School PTO', category='fundraiser', public_access='public', verification_status='organizer_verified', source_url='https://example.org/pies', start={'date':'2026-10-23'}, end={'date':'2026-10-24'})
        e.update(updates)
        return e

    def test_empty_events_file_is_a_valid_empty_calendar(self):
        from tempfile import TemporaryDirectory
        with TemporaryDirectory() as temp:
            path = Path(temp) / 'events.json'
            path.write_text('  \\n')
            self.assertEqual(m.load_events(path), [])
            path.write_text('[]')
            self.assertEqual(m.load_events(path), [])

    def test_expiration_and_local_scope(self):
        events = [self.event(), self.event(id='old', end={'date':'2026-10-22'}), self.event(id='away', organizer='Other Town PTO')]
        self.assertEqual([r['id'] for r in m.collect([], events, date(2026,10,23))], ['test'])

    def test_tagged_boilerplate_is_not_a_campaign(self):
        e = self.event(title='Latest', category='community', calendar_ids=['norwood-fundraisers'], notes='unrelated headline includes fundraiser')
        self.assertEqual(m.collect([], [e], date(2026,10,23)), [])

    def test_curated_retained_deduplicated_and_escaped(self):
        c = dict(id='curated',title='School Pie Sale', organizer='PTO',url='https://example.org/pies',end_date=None,description='<script>')
        rows=m.collect([c],[self.event()],date(2026,10,23))
        self.assertEqual(len(rows),1)
        self.assertNotIn('<script>',m.render(rows,date(2026,10,23)))

    def test_rejects_unsafe_and_excluded_sources(self):
        self.assertEqual(m.collect([], [self.event(source_url='javascript:alert(1)'),self.event(source_url='https://cbnma.com/events')], date(2026,10,23)), [])

    def test_closed_ordering_keeps_pickup(self):
        row=dict(title='Pies',organizer='PMA',url='https://example.org',order_deadline='2026-11-12',end_date='2026-11-24')
        self.assertIn('Ordering has closed',m.render([row],date(2026,11,13)))
        self.assertEqual(m.collect([row],[],date(2026,11,25)),[])
