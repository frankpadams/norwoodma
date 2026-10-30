import importlib.util
import sys
import unittest
from pathlib import Path
from datetime import timedelta

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from gas_price_common import STATIONS,address_matches,merge,iso,now,needs_fallback

def load(name,filename):
    spec=importlib.util.spec_from_file_location(name,Path(__file__).resolve().parents[1]/'scripts'/filename)
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

google=load('google_gas','update-gas-prices.py')
fallback=load('free_gas','update-free-gas-prices.py')

class GasPriceTests(unittest.TestCase):
    def test_route_alias_keeps_number_and_town(self):
        spec=STATIONS[3]
        self.assertTrue(address_matches(spec,'515 Boston-Providence Turnpike','NORWOOD','MA'))
        self.assertFalse(address_matches(spec,'5150 Providence Hwy','Norwood','MA'))
        self.assertFalse(address_matches(spec,'515 Providence Hwy','Walpole','MA'))
        self.assertFalse(address_matches(spec,'515 Providence Hwy','Norwood','OH'))

    def test_wrong_google_top_result_is_not_used(self):
        def candidate(pid,number):
            return {'id':pid,'types':['gas_station'],'displayName':{'text':'Shell'},'addressComponents':[
                {'types':['street_number'],'shortText':number},
                {'types':['route'],'shortText':'Walpole St'},
                {'types':['locality'],'shortText':'Norwood'},
                {'types':['administrative_area_level_1'],'shortText':'MA'}]}
        details=[]
        def fetch(url,body=None,fields=None):
            if body:return {'places':[candidate('wrong','49'),candidate('correct','491')]}
            details.append(url)
            return {'id':'correct','fuelOptions':{'fuelPrices':[{'type':'REGULAR_UNLEADED','updateTime':iso(now()),'price':{'currencyCode':'USD','units':'4','nanos':99000000}}]}}
        prices,status=google.lookup(STATIONS[9],fetch)
        self.assertEqual(details,['https://places.googleapis.com/v1/places/correct'])
        self.assertEqual(prices['regular']['price'],4.099)
        self.assertFalse(status['candidates'][0]['address_verified'])

    def test_empty_google_result_retries_address_query(self):
        calls=[]
        def fetch(url,body=None,fields=None):
            calls.append(body['textQuery'])
            return {'places':[]}
        prices,status=google.lookup(STATIONS[0],fetch)
        self.assertEqual(len(calls),2)
        self.assertEqual(status['outcome'],'no_verified_station')

    def test_failed_lookup_keeps_prices_and_dates_identical(self):
        old={'regular':4.259,'checked':'2026-10-07T03:42:00Z'}
        result,changed=merge(old,{})
        self.assertEqual(result,old)
        self.assertEqual(changed,[])

    def test_new_regular_does_not_refresh_older_premium(self):
        old_date=iso(now()-timedelta(days=5))
        old={'regular':4.1,'premium':4.8,'updated':old_date,'source':'Original'}
        result,changed=merge(old,{'regular':{'price':4.0,'updated':iso(now()),'source':'Backup'}})
        self.assertEqual(changed,['regular'])
        self.assertEqual(result['fuel_reports']['premium']['updated'],old_date)
        self.assertEqual(result['premium'],4.8)

    def test_older_backup_cannot_replace_newer_price(self):
        old={'regular':4.1,'updated':iso(now()-timedelta(hours=1))}
        result,changed=merge(old,{'regular':{'price':3.1,'updated':iso(now()-timedelta(hours=2))}})
        self.assertEqual(result,old)

    def test_future_or_missing_timestamp_is_rejected(self):
        for date in [None,'not-a-date',iso(now()+timedelta(days=1))]:
            result,changed=merge({}, {'regular':{'price':4.0,'updated':date}})
            self.assertEqual(result,{})

    def test_gasbuddy_uses_credit_price_and_report_timestamp(self):
        row={'station_id':'123','currency':'USD','unit_of_measure':'gallons',
             'address':{'line1':'491 Walpole St','locality':'Norwood','region':'MA'},
             'regular_gas':{'price':4.039,'cash_price':3.939,'deal_price':3.5,'last_updated':iso(now())}}
        prices,count=fallback.community_prices(STATIONS[9],[row])
        self.assertEqual(count,1)
        self.assertEqual(prices['regular']['price'],4.039)
        self.assertEqual(prices['regular']['payment'],'credit')
        row['address']['locality']='Walpole'
        self.assertEqual(fallback.community_prices(STATIONS[9],[row]),({},0))

    def test_gasbuddy_undated_cash_only_prices_are_not_used(self):
        row={'station_id':'123','currency':'USD','unit_of_measure':'gallons',
             'address':{'line1':'491 Walpole St','locality':'Norwood','region':'MA'},
             'regular_gas':{'price':None,'cash_price':3.939,'last_updated':iso(now())}}
        self.assertEqual(fallback.community_prices(STATIONS[9],[row])[0],{})

    def test_costco_observation_is_not_a_report_date(self):
        html='Dedham Warehouse 200 LEGACY BLVD <span class="gas-type">Regular</span><br><span class="h3-style-guide">$3.83<sup>9</sup></span>'
        prices=fallback.costco_prices(STATIONS[12],html,'https://www.costco.com/warehouse-locations-319.html',iso(now()))
        self.assertEqual(prices['regular']['price'],3.839)
        self.assertNotIn('updated',prices['regular'])
        result,_=merge({'regular':4.0,'updated':iso(now()-timedelta(days=5))},prices)
        self.assertNotIn('updated',result)
        self.assertIn('observed_at',result)
        self.assertFalse(needs_fallback(result))
        self.assertEqual(fallback.costco_prices(STATIONS[12],html.replace('200 LEGACY','201 LEGACY'),'url',iso(now())),{})

if __name__=='__main__':unittest.main()
