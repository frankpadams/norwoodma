#!/usr/bin/env python3
"""Free fallbacks: direct Costco prices and timestamped GasBuddy community reports."""
import asyncio
import logging
import re
import urllib.request
from html import unescape
from gas_price_common import (STATIONS,OUT,STATUS,read,write,merge,needs_fallback,
                              address_matches,usable_price,now,iso,stamp)

COSTCO={
    'Costco Gas — Dedham':{'url':'https://www.costco.com/warehouse-locations-319.html','address':'200 legacy blvd'},
    'Costco Gas — Sharon':{'url':'https://www.costco.com/warehouse-locations-1704.html','address':'160 old post road'},
}

def costco_prices(spec,html,url,observed_at):
    text=unescape(re.sub('<[^>]+>',' ',html))
    text=re.sub(r'\s+',' ',text).lower()
    # A curated warehouse URL still has to identify the expected warehouse/address.
    warehouse=COSTCO.get(spec['name'],{})
    if spec['city'].lower()+' warehouse' not in text or not re.search(r'\b'+re.escape(warehouse.get('address','INVALID'))+r'\b',text):
        return {}
    out={}
    pattern=r'class=["\']gas-type["\']\s*>\s*(Regular|Premium|Diesel)\s*</span>\s*<br\s*/?>\s*<span[^>]*>\s*\$(\d+\.\d{2})(?:\s*<sup>\s*(\d)\s*</sup>)?'
    for match in re.finditer(pattern,html,re.I):
        price=float(match[2]+(match[3] or ''))
        if usable_price(price,observed_at):
            out[match[1].lower()]={'price':price,'observed_at':observed_at,
                'source':'Costco official warehouse page','source_url':url,'payment':'membership'}
    return out

def community_prices(spec,items):
    out={}
    matches=[]
    for item in items:
        address=item.get('address') or {}
        if not isinstance(address,dict):continue
        if address_matches(spec,address.get('line1',''),address.get('locality',''),address.get('region','')):
            matches.append(item)
    for item in matches:
        # The library price field is credit pump price, not deal/cashback price.
        if item.get('currency')!='USD' or str(item.get('unit_of_measure','')).lower() not in ('gallon','gallons','gal'):
            continue
        for key,fuel in [('regular_gas','regular'),('midgrade_gas','midgrade'),('premium_gas','premium'),('diesel','diesel')]:
            node=item.get(key) or {}
            dt=stamp(node.get('last_updated'))
            price=node.get('price')
            if not usable_price(price,node.get('last_updated')):continue
            if fuel in out and stamp(out[fuel]['updated'])>=dt:continue
            out[fuel]={'price':round(price,3),'updated':iso(dt),'source':'GasBuddy community report',
                       'source_url':'https://www.gasbuddy.com/station/'+str(item['station_id']),'payment':'credit'}
    return out,len(matches)

async def gasbuddy_rows(zips):
    # Third-party debug/error logs can dump anti-bot HTML; retain only our safe outcome.
    logging.getLogger('py_gasbuddy').setLevel(logging.CRITICAL)
    from py_gasbuddy import GasBuddy
    client=GasBuddy(timeout=20000)
    rows=[]
    for zip_code in zips:
        cursor=None
        seen=set()
        for _ in range(3):
            response=await client.price_lookup_service(zipcode=int(zip_code),limit=100,cursor=cursor)
            rows.extend(response.get('results',[]))
            cursor=response.get('next_cursor')
            if not cursor or cursor in seen:break
            seen.add(cursor)
    return rows

def main():
    payload=read(OUT,{'stations':{}})
    rows=payload.setdefault('stations',{})
    status=read(STATUS,{'stations':{}})
    status['generated_at']=iso(now())
    count=0
    for spec in STATIONS:
        label=spec['name']
        if label not in COSTCO or not needs_fallback(rows.get(label,{})):continue
        diagnostic={}
        try:
            url=COSTCO[label]['url']
            request=urllib.request.Request(url,headers={'User-Agent':'Norwood.ma gas-price updater (+https://norwood.ma/about.html)'})
            with urllib.request.urlopen(request,timeout=20) as response:
                html=response.read().decode('utf-8')
            incoming=costco_prices(spec,html,url,iso(now()))
            result,accepted=merge(rows.get(label,{}),incoming)
            if accepted:rows[label]=result
            count+=len(accepted)
            diagnostic={'outcome':'prices_observed' if incoming else 'no_verified_prices','accepted_grades':accepted,'source_url':url}
        except Exception as exc:
            diagnostic={'outcome':'source_unavailable','error':type(exc).__name__}
        status.setdefault('stations',{}).setdefault(label,{})['costco']=diagnostic
        print(label+' Costco: '+diagnostic['outcome'])
    targets=[s for s in STATIONS if needs_fallback(rows.get(s['name'],{}))]
    if targets:
        try:
            items=asyncio.run(asyncio.wait_for(gasbuddy_rows(sorted({s['zip'] for s in targets})),timeout=120))
            for spec in targets:
                label=spec['name']
                incoming,matched=community_prices(spec,items)
                result,accepted=merge(rows.get(label,{}),incoming)
                if accepted:rows[label]=result
                count+=len(accepted)
                diagnostic={'outcome':'prices_returned' if incoming else 'no_timestamped_prices' if matched else 'no_address_match',
                            'matched_stations':matched,'accepted_grades':accepted}
                status.setdefault('stations',{}).setdefault(label,{})['gasbuddy']=diagnostic
                print(label+' GasBuddy: '+diagnostic['outcome'])
        except Exception as exc:
            for spec in targets:
                status.setdefault('stations',{}).setdefault(spec['name'],{})['gasbuddy']={'outcome':'source_unavailable','error':type(exc).__name__}
            print('::warning::GasBuddy unavailable ('+type(exc).__name__+'); preserved existing prices and dates. No bypass attempted.')
    if count:
        payload['generated_at']=iso(now())
        payload['source']='Station-specific fuel reports; see per-fuel provenance'
        write(OUT,payload)
    status['unresolved_stations']=[s['name'] for s in STATIONS if needs_fallback(rows.get(s['name'],{}))]
    write(STATUS,status)
    if status['unresolved_stations']:
        print('::warning::No recent regular price for: '+', '.join(status['unresolved_stations']))
    print(f'Accepted {count} newer fallback fuel reports.')

if __name__=='__main__':main()
