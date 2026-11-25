(() => {
  const map = window.norwoodTrailMap;
  const toggle = document.getElementById('aircraftToggle');
  const status = document.getElementById('aircraftStatus');
  if (!map || !window.L || !toggle || !status) return;

  const layer = L.layerGroup();
  const refreshMs = 30000;
  const dateFormat = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit'
  });
  let timer;
  let request;
  let renderedAt;

  function popup(aircraft, snapshotTime) {
    const content = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = aircraft.flight?.trim() || 'Aircraft';
    content.append(title);

    const details = [
      aircraft.alt_baro === 'ground' ? 'On ground' :
        Number.isFinite(aircraft.alt_baro) ? `Altitude ${aircraft.alt_baro.toLocaleString()} ft` : '',
      Number.isFinite(aircraft.gs) ? `Ground speed ${Math.round(aircraft.gs)} kt` : '',
      `Position at ${dateFormat.format(snapshotTime - (aircraft.seen_pos || 0) * 1000)} ET`
    ];
    for (const detail of details.filter(Boolean)) {
      const row = document.createElement('div');
      row.textContent = detail;
      content.append(row);
    }
    return content;
  }

  async function refresh() {
    const pending = new AbortController();
    request = pending;
    const timeout = setTimeout(() => pending.abort(), 12000);
    try {
      const response = await fetch('live-aircraft.php', { signal: pending.signal });
      if (!response.ok) throw new Error(`Aircraft feed HTTP ${response.status}`);
      const { ac, fetchedAt } = await response.json();
      if (!Array.isArray(ac) || !Number.isFinite(fetchedAt)) throw new Error('Invalid aircraft feed');
      if (request !== pending) return;
      const snapshotTime = fetchedAt * 1000;
      if (renderedAt !== fetchedAt) {
        layer.clearLayers();
        for (const aircraft of ac) {
          if (!Number.isFinite(aircraft?.lat) || !Number.isFinite(aircraft.lon)) continue;
          if (aircraft.seen_pos > 60) continue;
          const direction = Number.isFinite(aircraft.track) ? aircraft.track : 0;
          const icon = L.divIcon({
            className: 'map-aircraft-marker',
            html: `<span aria-hidden="true" style="display:block;text-align:center;font-size:23px;line-height:28px;color:#123e65;text-shadow:0 0 3px white,0 0 3px white;transform:rotate(${direction}deg)">✈︎</span>`,
            iconSize: [28, 28]
          });
          L.marker([aircraft.lat, aircraft.lon], { icon, title: 'Aircraft', alt: 'Aircraft' })
            .bindPopup(popup(aircraft, snapshotTime)).addTo(layer);
        }
        renderedAt = fetchedAt;
      }
      const count = layer.getLayers().length;
      const timestamp = dateFormat.format(snapshotTime);
      status.textContent = count
        ? `${count} aircraft reported · snapshot ${timestamp} ET`
        : `No aircraft with recent positions · snapshot ${timestamp} ET`;
    } catch {
      if (request !== pending) return;
      layer.clearLayers();
      renderedAt = undefined;
      status.textContent = 'Live aircraft positions are temporarily unavailable.';
    } finally {
      clearTimeout(timeout);
      if (request === pending) {
        request = undefined;
        timer = setTimeout(refresh, refreshMs);
      }
    }
  }

  function update() {
    clearTimeout(timer);
    request?.abort();
    request = undefined;
    status.hidden = !toggle.checked;
    if (!toggle.checked) {
      layer.remove();
      layer.clearLayers();
      renderedAt = undefined;
      return;
    }
    if (document.hidden) return;
    layer.addTo(map);
    if (renderedAt === undefined) status.textContent = 'Loading aircraft positions…';
    refresh();
  }

  toggle.addEventListener('change', update);
  document.addEventListener('visibilitychange', update);
  update();
})();
