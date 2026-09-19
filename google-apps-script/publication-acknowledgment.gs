/**
 * Norwood.ma publication acknowledgment extension — v0.12.4
 *
 * Add these functions to the EXISTING production Apps Script project. Do not
 * replace the existing doGet(), sanitizer, setup, or form-submit trigger.
 * After adding this code, run createPublicationAckSecret() once, save the logged
 * value as the GitHub Actions repository secret NORWOOD_EVENT_ACK_SECRET, then
 * deploy a NEW VERSION of the existing Web App deployment.
 */

function createPublicationAckSecret() {
  var secret = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  PropertiesService.getScriptProperties().setProperty('NORWOOD_EVENT_ACK_SECRET', secret);
  console.log('NORWOOD_EVENT_ACK_SECRET=' + secret);
  return secret;
}

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.action !== 'ackPublished') {
      return norwoodJsonResponse_({ok:false, error:'Unsupported action'});
    }

    var expected = PropertiesService.getScriptProperties().getProperty('NORWOOD_EVENT_ACK_SECRET');
    if (!expected || !body.secret || body.secret !== expected) {
      return norwoodJsonResponse_({ok:false, error:'Unauthorized'});
    }

    var published = Array.isArray(body.events) ? body.events : [];
    var ss = SpreadsheetApp.openById('1gngkyJAoVhT37BuBW2J0JXR8ayVKkJdSpH_YC2foEn8');
    var sheet = ss.getSheets().find(function(s) { return /^Form Responses/i.test(s.getName()); });
    if (!sheet) throw new Error('Form Responses sheet not found');

    var values = sheet.getDataRange().getValues();
    if (values.length < 2) return norwoodJsonResponse_({ok:true, updated:0, unmatched:published.length});
    var headers = values[0].map(function(x) { return String(x).trim(); });
    var col = {};
    headers.forEach(function(h, i) { col[h] = i; });
    ['Event name','Event date','Status','Published Event ID','Last Verified','Import Status'].forEach(function(h) {
      if (col[h] === undefined) throw new Error('Missing required column: ' + h);
    });

    var byKey = {};
    published.forEach(function(item) {
      if (!item || !item.id || !item.title || !item.date) return;
      byKey[norwoodAckKey_(item.title, item.date, item.venue || '')] = item;
      // Venue-free key is a safe fallback for older rows or blank venues.
      byKey[norwoodAckKey_(item.title, item.date, '')] = item;
    });

    var updated = 0;
    var matchedIds = {};
    for (var r = 1; r < values.length; r++) {
      var status = String(values[r][col['Status']] || '').trim();
      if (status !== 'Approved' && status !== 'Published') continue;

      var existingId = String(values[r][col['Published Event ID']] || '').trim();
      var title = String(values[r][col['Event name']] || '').trim();
      var eventDate = norwoodAckDate_(values[r][col['Event date']]);
      var venue = col['Venue or location name'] === undefined ? '' : String(values[r][col['Venue or location name']] || '').trim();
      var item = null;

      if (existingId) {
        item = published.find(function(x) { return x && x.id === existingId; }) || null;
      }
      if (!item) item = byKey[norwoodAckKey_(title, eventDate, venue)] || byKey[norwoodAckKey_(title, eventDate, '')] || null;
      if (!item) continue;

      sheet.getRange(r + 1, col['Status'] + 1).setValue('Published');
      sheet.getRange(r + 1, col['Published Event ID'] + 1).setValue(item.id);
      sheet.getRange(r + 1, col['Last Verified'] + 1).setValue(new Date());
      sheet.getRange(r + 1, col['Import Status'] + 1).setValue('Published successfully');
      matchedIds[item.id] = true;
      updated++;
    }

    var unmatched = published.filter(function(x) { return x && x.id && !matchedIds[x.id]; }).map(function(x) { return x.id; });
    return norwoodJsonResponse_({ok:true, updated:updated, unmatched:unmatched});
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    return norwoodJsonResponse_({ok:false, error:String(err && err.message ? err.message : err)});
  }
}

function norwoodAckKey_(title, eventDate, venue) {
  return [title, eventDate, venue].map(function(x) { return String(x || '').trim().toLowerCase().replace(/\s+/g, ' '); }).join('|');
}

function norwoodAckDate_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) {
    return Utilities.formatDate(value, Session.getScriptTimeZone() || 'America/New_York', 'yyyy-MM-dd');
  }
  var s = String(value || '').trim();
  var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[1] + '-' + m[2] + '-' + m[3];
  try {
    var d = new Date(s);
    if (!isNaN(d)) return Utilities.formatDate(d, Session.getScriptTimeZone() || 'America/New_York', 'yyyy-MM-dd');
  } catch (_) {}
  return s;
}

function norwoodJsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
