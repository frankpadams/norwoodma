#!/usr/bin/env python3
"""Verify Google station addresses and retain per-station lookup diagnostics."""
import json
import os
import urllib.request
import urllib.error
from gas_price_common import (STATIONS, OUT, STATUS, address_matches, google_address, norm,
                              read, write, merge, now, iso, usable_price)

KEY=os.environ.get('GOOGLE_PLACES_API_KEY','').strip()

KNOWN_NAMES={
    'Gulf — Broadway':{'gulf'},
    "Mr. Frank's Food Mart":{'mr franks food mart','mr franks gas and food mart'},
    'Route 1 Auto Services':{'route 1 auto services'},
}

def request(url,body=None,fields=None):
    headers={'X-Goog-Api-Key':KEY,'Content-Type':'application/json','X-Goog-FieldMask':fields}
    req=urllib.request.Request(url,data=json.dumps(body).encode() if body else None,
                               headers=headers,method='POST' if body else 'GET')
    try:
        with urllib.request.urlopen(req,timeout=20) as response:
            return json.load(response)
    except urllib.error.HTTPError as exc:
        raise RuntimeError('Google HTTP '+str(exc.code)) from None

def normalize(place):
    out={}
    for fuel in place.get('fuelOptions',{}).get('fuelPrices',[]):
        key={'REGULAR_UNLEADED':'regular','MIDGRADE':'midgrade','PREMIUM':'premium','DIESEL':'diesel'}.get(fuel.get('type'))
        money=fuel.get('price',{})
        if not key or money.get('currencyCode')!='USD':continue
        try:value=round(float(money['units'])+float(money.get('nanos',0))/1e9,3)
        except (KeyError,TypeError,ValueError):continue
        date=fuel.get('updateTime')
        if not usable_price(value,date):continue
        report=dict(price=value,updated=date,source='Google Places API (New)',place_id=place.get('id'))
        if key not in out or date>out[key]['updated']:out[key]=report
    return out

def lookup(spec,fetch=request):
    attempts,verified,seen=[],[],set()
    found={}
    address=f"{spec['numbers'][0]} {spec['street']}, {spec['city']}, MA {spec['zip']}"
    for query in (spec['name']+', '+address,'gas station '+address):
        response=fetch('https://places.googleapis.com/v1/places:searchText',
                       {'textQuery':query,'pageSize':5},
                       'places.id,places.displayName,places.formattedAddress,places.addressComponents,places.types')
        for candidate in response.get('places',[]):
            pid=candidate.get('id')
            if not pid or pid in seen:continue
            seen.add(pid)
            parsed=google_address(candidate)
            address_verified=address_matches(spec,*parsed)
            name=candidate.get('displayName',{}).get('text','')
            station_verified=('gas_station' in candidate.get('types',[]) or norm(name) in KNOWN_NAMES.get(spec['name'],set()))
            matched=address_verified and station_verified
            record={'place_id':pid,'name':candidate.get('displayName',{}).get('text'),
                    'address':candidate.get('formattedAddress'),'address_verified':address_verified,
                    'station_verified':station_verified,'types':candidate.get('types',[]),'parsed_address':list(parsed)}
            attempts.append(record)
            if not matched:
                record['outcome']='address_or_station_type_mismatch'
                continue
            verified.append(pid)
            details=fetch('https://places.googleapis.com/v1/places/'+pid,fields='id,fuelOptions')
            prices=normalize(details)
            record['outcome']='usable_prices' if prices else 'no_usable_fuel_prices'
            for fuel,report in prices.items():
                if fuel not in found or report['updated']>found[fuel]['updated']:found[fuel]=report
            if 'regular' in found:
                return found,{'outcome':'prices_returned','candidates':attempts}
    return found,{'outcome':'partial_prices' if found else 'no_usable_fuel_prices' if verified else 'no_verified_station','candidates':attempts}

def main():
    payload=read(OUT,{'stations':{}})
    rows=payload.setdefault('stations',{})
    status={'generated_at':iso(now()),'stations':{}}
    updates=0
    for spec in STATIONS:
        label=spec['name']
        try:
            if KEY:
                prices,diagnostic=lookup(spec)
                result,accepted=merge(rows.get(label,{}),prices)
                if accepted:rows[label]=result
                diagnostic['accepted_grades']=accepted
                updates+=len(accepted)
            else:diagnostic={'outcome':'api_key_not_configured'}
        except Exception as exc:
            diagnostic={'outcome':'lookup_error','error':str(exc) if isinstance(exc,RuntimeError) else type(exc).__name__}
        status['stations'][label]={'google':diagnostic}
        print(label+': '+diagnostic['outcome'])
    if updates:
        payload['generated_at']=iso(now())
        payload['source']='Station-specific fuel reports; see per-fuel provenance'
        write(OUT,payload)
    write(STATUS,status)
    print(f'Accepted {updates} newer fuel reports; preserved other prices and dates.')

if __name__=='__main__':main()
