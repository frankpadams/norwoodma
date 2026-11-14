#!/usr/bin/env python3
"""One-time browser-based discovery. Records URLs and response SHAPES, not raw customer data."""
import asyncio, json, re, datetime
from urllib.parse import urlsplit, urlunsplit
from playwright.async_api import async_playwright

URL="https://norwood.datacapable.com/map/?location=eyJ2aWV3Ijp7ImxhdGl0dWRlIjo0Mi4xODIsImxvbmdpdHVkZSI6LTcxLjE5Nywiem9vbSI6MTIsImV2ZW50SWQiOm51bGx9fQ%3D%3D"
results=[]
async def main():
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True)
        page=await browser.new_page(viewport={"width":1280,"height":800})
        tasks=[]
        async def inspect(response):
            url=response.url
            typ=response.headers.get("content-type","")
            if not any(x in url.lower() for x in ("datacapable","utilisocial","outage","arcgis","mapserver","featureserver","event")):
                return
            item={"url":urlsplit(url)._replace(query="").geturl(),"status":response.status,"content_type":typ[:100]}
            if "json" in typ.lower() or "geojson" in typ.lower():
                try:
                    body=await response.body()
                    if len(body)<5_000_000:
                        data=json.loads(body)
                        item["shape"]=type(data).__name__
                        if isinstance(data,dict):
                            item["keys"]=list(data)[:25]
                            for key in ("events","features","data","results"):
                                if isinstance(data.get(key),list):
                                    item[key+"_count"]=len(data[key])
                                    if data[key] and isinstance(data[key][0],dict):
                                        item[key+"_keys"]=list(data[key][0])[:30]
                        elif isinstance(data,list):
                            item["count"]=len(data)
                            if data and isinstance(data[0],dict):item["item_keys"]=list(data[0])[:30]
                except Exception as exc:item["parse_error"]=str(exc)[:120]
            results.append(item)
        page.on("response",lambda response:tasks.append(asyncio.create_task(inspect(response))))
        try:
            await page.goto(URL,wait_until="domcontentloaded",timeout=45000)
            await page.wait_for_timeout(15000)
            print("Map title:",await page.title())
        except Exception as exc:print("Navigation issue:",str(exc)[:250])
        await asyncio.gather(*tasks,return_exceptions=True)
        await browser.close()
    report={"checked_at":datetime.datetime.now(datetime.timezone.utc).isoformat(),"source":URL.split("?")[0],"requests":results}
    with open("outage-discovery.json","w") as f:json.dump(report,f,indent=2)
    print("Inspected",len(results),"matching responses")
    for r in results:print(r)
asyncio.run(main())
