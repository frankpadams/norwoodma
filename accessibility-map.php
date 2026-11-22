<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=900, s-maxage=1800, stale-while-revalidate=21600');
header('X-Robots-Tag: noindex, nofollow');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    http_response_code(405);
    header('Allow: GET');
    exit;
}

$layer = (string)($_GET['layer'] ?? '');
$bbox = '42.14,-71.26,42.23,-71.15';
$queries = [
    'places' => '[out:json][timeout:20];(nwr["wheelchair"]["amenity"](' . $bbox . ');nwr["wheelchair"]["shop"](' . $bbox . ');nwr["wheelchair"]["tourism"](' . $bbox . ');nwr["wheelchair"]["leisure"](' . $bbox . ');nwr["wheelchair"]["healthcare"](' . $bbox . ');nwr["wheelchair"]["office"](' . $bbox . '););out center;',
    'paths' => '[out:json][timeout:20];(way["highway"~"^(footway|pedestrian|path)$"]["wheelchair"~"^(yes|designated|limited)$"](' . $bbox . ');nwr["kerb"~"^(lowered|flush|rolled|raised|no)$"](' . $bbox . ');nwr["tactile_paving"="yes"](' . $bbox . '););out center geom;',
];

if (!isset($queries[$layer])) {
    http_response_code(400);
    header('Cache-Control: no-store');
    echo json_encode(['error' => 'Choose a supported accessibility map layer.']);
    exit;
}

$body = false;
$status = 0;
$endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
];

foreach ($endpoints as $url) {
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => 2,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT => 12,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => http_build_query(['data' => $queries[$layer]]),
            CURLOPT_HTTPHEADER => ['Accept: application/json', 'Content-Type: application/x-www-form-urlencoded'],
            CURLOPT_USERAGENT => 'Norwood.ma public accessibility map',
        ]);
        $body = curl_exec($ch);
        $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);
    } else {
        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'timeout' => 12,
                'ignore_errors' => true,
                'header' => "Accept: application/json\r\nContent-Type: application/x-www-form-urlencoded\r\nUser-Agent: Norwood.ma public accessibility map\r\n",
                'content' => http_build_query(['data' => $queries[$layer]]),
            ],
        ]);
        $body = @file_get_contents($url, false, $context);
        $status = 0;
        foreach ($http_response_header ?? [] as $header) {
            if (preg_match('/^HTTP\/\S+\s+(\d{3})/', $header, $match)) {
                $status = (int)$match[1];
            }
        }
    }

    $decoded = is_string($body) && strlen($body) <= 12000000 ? json_decode($body, true) : null;
    if ($status >= 200 && $status < 300 && is_array($decoded) && isset($decoded['elements']) && is_array($decoded['elements'])) {
        echo $body;
        exit;
    }
}

http_response_code(502);
header('Cache-Control: no-store');
echo json_encode(['error' => 'OpenStreetMap accessibility data is temporarily unavailable.']);
?>
