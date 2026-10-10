/**
 * Norwood.ma first-party analytics receiver (Google Apps Script).
 * Deploy under norwooddotma@gmail.com as a Web App, execute as owner.
 * Set Script Property ANALYTICS_SHEET_ID to a private spreadsheet ID.
 * Public ingestion is untrusted: never use this endpoint for admin writes.
 * Daily aggregated counts only; no IPs, cookies, fingerprints, or raw user records.
 */
const EVENT_TYPES = ['page_view','ad_impression','ad_click','search','calendar_click','outbound_click'];
const MAX_BODY = 1800;
function doPost(e) {
  try {
    const raw = (e && e.postData && e.postData.contents) || '';
    if (raw.length > MAX_BODY) return reply_('ignored');
    const data = JSON.parse(raw);
    if (!EVENT_TYPES.includes(data.type)) return reply_('ignored');
    const path = String(data.path || '/').slice(0,120);
    if (!/^\/[a-zA-Z0-9/_-]*([.]html)?$/.test(path)) return reply_('ignored');
    const slot = String(data.slot || '').slice(0,50);
    const sponsor = String(data.sponsor || '').slice(0,70);
    if (!/^[a-zA-Z0-9_-]*$/.test(slot) || !/^[a-zA-Z0-9_-]*$/.test(sponsor)) return reply_('ignored');
    const id = PropertiesService.getScriptProperties().getProperty('ANALYTICS_SHEET_ID');
    if (!id) return reply_('not_configured');
    const book = SpreadsheetApp.openById(id);
    const sheet = book.getSheetByName('DailyCounts') || book.insertSheet('DailyCounts');
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(3000)) return reply_('busy');
    try {
      if (sheet.getLastRow() === 0) sheet.appendRow(['Date UTC','Type','Path','Slot','Sponsor','Count']);
      const date = Utilities.formatDate(new Date(), 'UTC', 'yyyy-MM-dd');
      const last = sheet.getLastRow();
      const rows = last > 1 ? sheet.getRange(2,1,last-1,6).getValues() : [];
      const idx = rows.findIndex(r => r[0] === date && r[1] === data.type && r[2] === path && r[3] === slot && r[4] === sponsor);
      if (idx >= 0) sheet.getRange(idx+2,6).setValue(Number(rows[idx][5] || 0)+1);
      else sheet.appendRow([date,data.type,path,slot,sponsor,1]);
    } finally { lock.releaseLock(); }
    return reply_('ok');
  } catch (_) { return reply_('ignored'); }
}
function reply_(status) { return ContentService.createTextOutput(JSON.stringify({status})).setMimeType(ContentService.MimeType.JSON); }
