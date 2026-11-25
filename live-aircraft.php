<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    http_response_code(405);
    header('Allow: GET');
    exit;
}

function unavailable(): void
{
    http_response_code(503);
    echo '{"error":"Live aircraft positions are temporarily unavailable."}';
}

function aircraftSnapshot(): ?array
{
    $url = 'https://api.adsb.lol/v2/lat/42.195/lon/-71.200/dist/15';
    if (function_exists('curl_init')) {
        $curl = curl_init($url);
        curl_setopt_array($curl, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 3,
            CURLOPT_TIMEOUT => 7,
        ]);
        $body = curl_exec($curl);
        $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
        curl_close($curl);
        if ($status !== 200) {
            return null;
        }
    } else {
        $context = stream_context_create(['http' => ['timeout' => 7, 'follow_location' => 0]]);
        $body = @file_get_contents($url, false, $context);
    }

    $data = is_string($body) ? json_decode($body, true) : null;
    if (!is_array($data['ac'] ?? null)) {
        return null;
    }
    return ['ac' => $data['ac'], 'fetchedAt' => time()];
}

// Share one upstream request per three minutes across all active visitors.
$cache = @fopen(sys_get_temp_dir() . '/norwoodma-aircraft-' . hash('sha256', __DIR__) . '.json', 'c+');
if ($cache === false || !flock($cache, LOCK_EX)) {
    unavailable();
    exit;
}

$state = json_decode(stream_get_contents($cache), true);
$now = time();
if (!isset($state['attemptedAt']) || $now - $state['attemptedAt'] >= 180) {
    $state = ['attemptedAt' => $now, 'snapshot' => aircraftSnapshot()];
    $encoded = json_encode($state);
    if ($encoded !== false) {
        rewind($cache);
        fwrite($cache, $encoded);
        ftruncate($cache, strlen($encoded));
        fflush($cache);
    }
}
flock($cache, LOCK_UN);
fclose($cache);

if (!isset($state['snapshot'])) {
    unavailable();
    exit;
}
echo json_encode($state['snapshot']);
