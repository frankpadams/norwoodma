import importlib.util
import unittest
from datetime import datetime
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location('refresh', Path(__file__).resolve().parents[1] / 'scripts/refresh_content.py')
refresh = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(refresh)


class CalendarSourcesTest(unittest.TestCase):
    def health(self, source=None, **row):
        source = source or {'health_policy': {'empty_result_is_failure': False}}
        status = {'source_id': 'test', 'ok': True, 'found': 0, **row}
        result = refresh.calendar_source_health(source, status, {'consecutive_failures': 41, 'last_successful_update': '2026-01-01T00:00:00-05:00'}, '2026-10-03T02:00:00-04:00')
        self.assertEqual(result['ok'], status['ok'])
        return result

    def test_quiet_source_does_not_age_into_stale(self):
        result = self.health()
        self.assertTrue(result['ok'])
        self.assertFalse(result['stale'])
        self.assertEqual(result['consecutive_failures'], 0)

    def test_expected_calendar_zero_is_parser_gap(self):
        result = self.health({'health_policy': {'empty_result_is_failure': True}})
        self.assertFalse(result['ok'])
        self.assertEqual(result['outcome'], 'parser_gap')

    def test_blocked_fetch_is_not_a_healthy_empty(self):
        result = self.health(ok=False, note='405 Client Error: Not Allowed')
        self.assertEqual(result['outcome'], 'blocked')
        self.assertTrue(result['access_limited'])
        self.assertFalse(result['ok'])

    def test_manual_adapter_is_not_healthy(self):
        self.assertEqual(self.health(note='method community_org_events requires discovery/manual adapter')['outcome'], 'unsupported')

    def test_offseason_empty_is_healthy_but_transport_failure_is_not(self):
        source = {'health_policy': {'empty_result_is_failure': True, 'offseason_empty_is_healthy': True}, 'seasonality': {'seasons': ['spring']}}
        self.assertTrue(self.health(source)['ok'])
        self.assertFalse(self.health(source, ok=False, note='403 Forbidden')['ok'])

    def test_nys_tries_independent_bays_after_all_nys_pages_fail(self):
        source = {'id': 'resource-norwood-youth-soccer', 'ingestion': {'travel_league_url': 'https://bays.org/club/NYS'}}
        event = {'title': 'Norwood Rockets vs Canton', 'start': {'date': '2026-10-10', 'time': '13:00'}, 'venue': 'Oldham'}
        with patch.object(refresh, 'request', side_effect=RuntimeError('403 Forbidden')), patch.object(refresh, 'events_from_league_schedule', return_value=[event]) as fallback:
            rows = refresh.events_from_nys_multi_schedule(source)
        fallback.assert_called_once()
        self.assertTrue(rows[0]['calendar_only'])
        self.assertFalse(rows[0]['publish_candidate'])
        with patch.object(refresh, 'now_local', return_value=datetime(2026, 10, 3, tzinfo=refresh.TZ)):
            self.assertEqual(len(refresh.current_events(rows)), 1)
        self.assertFalse(refresh.event_is_curated_default(rows[0]))

    def test_practice_pdf_uses_current_season_and_afternoon_clock(self):
        text = 'TRAVEL Practice Schedule - FALL 2026 BOYS\n3 Blaze Tuesday 4:30 - 6:00 Oldham'
        reader = SimpleNamespace(pages=[SimpleNamespace(extract_text=lambda: text)])
        with patch.object(refresh, 'PdfReader', return_value=reader), patch.object(refresh, 'request', return_value=SimpleNamespace(content=b'pdf')), patch.object(refresh, 'now_local', return_value=datetime(2026, 10, 3, tzinfo=refresh.TZ)):
            rows = refresh.events_from_nys_practice_pdf('https://example.org/practice.pdf', {'id':'soccer'}, 'boys')
        self.assertEqual(rows[0]['start']['time'], '16:30')
        self.assertEqual(rows[0]['end']['time'], '18:00')
        self.assertEqual(rows[0]['public_access'], 'team_only')
        with patch.object(refresh, 'PdfReader', return_value=reader), patch.object(refresh, 'request', return_value=SimpleNamespace(content=b'pdf')), patch.object(refresh, 'now_local', return_value=datetime(2027, 10, 3, tzinfo=refresh.TZ)):
            self.assertEqual(refresh.events_from_nys_practice_pdf('https://example.org/practice.pdf', {'id':'soccer'}), [])

    def test_memory_cafe_configuration_generates_third_thursday(self):
        import json
        source = next(s for s in json.loads((refresh.DATA/'source-registry.json').read_text()) if s['id']=='norwood-memory-cafe')
        with patch.object(refresh, '_verified_recurrence_page_check', return_value=True), patch.object(refresh, 'now_local', return_value=datetime(2026, 10, 3, tzinfo=refresh.TZ)):
            events = refresh.events_from_verified_recurrence(source, months=1)
        self.assertEqual(events[0]['start'], {'date': '2026-10-15', 'time': '13:30'})
        self.assertEqual(events[0]['end']['time'], '15:00')

    def test_newsletter_extracts_ranges_and_rejects_enrollment_and_unknown_offsite(self):
        text = ('Medicare Open Enrollment runs from October 15 through December 7, 2026\n'
                'Coffee Chat – Tuesday, October 20th, 9:00-10:00am\n'
                'Mass Save Clinic - Monday, October 19th, 11:00am - 1:00pm\n'
                'Fundraiser to be held at Texas Roadhouse\nNovember 5th! 3-10 PM')
        reader = SimpleNamespace(pages=[SimpleNamespace(extract_text=lambda: text)])
        with patch.object(refresh, 'PdfReader', return_value=reader), patch.object(refresh, 'now_local', return_value=datetime(2026, 10, 3, tzinfo=refresh.TZ)):
            events = refresh._events_from_newsletter_pdf(b'pdf', {'id':'senior'}, 'https://example.org/current.pdf')
        by_title = {e['title']:e for e in events}
        self.assertEqual(set(by_title), {'Coffee Chat','Mass Save Clinic'})
        self.assertEqual(by_title['Coffee Chat']['start']['time'], '09:00')
        self.assertEqual(by_title['Mass Save Clinic']['end']['time'], '13:00')

    def test_toastmasters_blocked_host_uses_only_dated_guest_cards(self):
        html='<article><span>Tue, Oct 13, 2026 · 7:00 PM</span><a href="/events/meeting"><h3>Norwood Toastmasters</h3></a><p>Norwood Civic Center - Lydon Suite</p><p>Guests welcome</p></article>'
        source={'id':'norwood-toastmasters','url':'https://club.example.org/','ingestion':{'dated_fallback_url':'https://paper.example.org/events','start_time':'19:00'}}
        def request(url):
            if 'club.example' in url: raise RuntimeError('connection timeout')
            return SimpleNamespace(text=html)
        with patch.object(refresh,'request',side_effect=request):
            rows=refresh.events_from_toastmasters(source)
        self.assertEqual(len(rows),1)
        self.assertEqual(rows[0]['start'],{'date':'2026-10-13','time':'19:00'})
        self.assertEqual(rows[0]['source_url'],'https://paper.example.org/events/meeting')
        self.assertEqual(rows[0]['end']['time'],None)

    def test_eventbrite_ticket_identity_deduplicates_different_titles(self):
        url='https://www.eventbrite.com/e/dog-party-tickets-2002212173509'
        raw={'title':'Make A Dog’s Day Halloween Celebration','start':{'date':'2026-10-24'},'source_url':url,'verification_status':'auto_primary_source'}
        curated={'title':'Subaru Make A Dogs Day','start':{'date':'2026-10-24'},'registration_url':url+'?aff=share','verification_status':'web_verified_2026-10-03'}
        self.assertEqual(refresh.dedupe_events([raw,curated]),[curated])
        other=dict(raw,start={'date':'2026-10-25'})
        self.assertEqual(len(refresh.dedupe_events([raw,curated,other])),2)

    def test_discovery_cards_cannot_bypass_explicit_venue_gate(self):
        html='<article><h2>Norwood party</h2><time datetime="2026-10-24T13:00:00-04:00">October 24</time></article>'
        self.assertEqual(refresh.extract_html_event_cards(html,{'id':'eventbrite-norwood-discovery'}),[])

    def test_locable_uses_occurrence_date_and_explicit_massachusetts_venue(self):
        listing = '<a href="/events/1/sale"><p class="h5">Sale</p>Oct 23, 2026 09:00 AM – 01:00 PM</a><a href="/events/1/sale"><p class="h5">Sale</p>Oct 24, 2026 09:00 AM – 01:00 PM</a>'
        detail = '<h1><span itemprop="name">Sale</span></h1><span itemprop="location"><strong itemprop="name">Emmanuel</strong><span itemprop="address">24 Berwick Street Norwood 02062 MA US</span></span>'
        source = {'id':'town-news','url':'https://example.org/calendar','filters':{'require_norwood_relevance':True}}
        def response(url): return SimpleNamespace(text=listing if url.endswith('/calendar') else detail)
        with patch.object(refresh, 'request', side_effect=response):
            events = refresh.events_from_local_town_pages(source)
        self.assertEqual([e['start']['date'] for e in events], ['2026-10-23','2026-10-24'])
        self.assertEqual(events[0]['end']['time'], '13:00')
        with patch.object(refresh, 'request', side_effect=lambda u: SimpleNamespace(text=listing if u.endswith('/calendar') else detail.replace('Norwood 02062 MA', 'Norwood OH'))):
            self.assertEqual(refresh.events_from_local_town_pages(source), [])


if __name__ == '__main__':
    unittest.main()
