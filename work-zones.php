<?php
declare(strict_types=1);

header('Content-Type: application/geo+json; charset=utf-8');
header('Cache-Control: public, max-age=30, stale-while-revalidate=60');
header('X-Robots-Tag: noindex, nofollow');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    http_response_code(405);
    header('Allow: GET');
    exit;
}

$url = 'https://feed.massdot-swzm.com/massdot_wzdx_v4.1_work_zone_feed.geojson';
$body = false;
$status = 0;

if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 3,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 12,
        CURLOPT_HTTPHEADER => ['Accept: application/geo+json, application/json'],
        CURLOPT_USERAGENT => 'Norwood.ma public work-zone map',
    ]);
    $body = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
} else {
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'timeout' => 12,
            'ignore_errors' => true,
            'header' => "Accept: application/geo+json, application/json\r\nUser-Agent: Norwood.ma public work-zone map\r\n",
        ],
    ]);
    $body = @file_get_contents($url, false, $context);
    foreach ($http_response_header ?? [] as $header) {
        if (preg_match('/^HTTP\/\S+\s+(\d{3})/', $header, $match)) {
            $status = (int) $match[1];
        }
    }
}

$decoded = is_string($body) ? json_decode($body, true) : null;
if ($status < 200 || $status >= 300 || !is_array($decoded) || !isset($decoded['features']) || !is_array($decoded['features'])) {
    http_response_code(502);
    header('Cache-Control: no-store');
    echo json_encode(['error' => 'MassDOT work-zone feed is temporarily unavailable.']);
    exit;
}

echo $body;
