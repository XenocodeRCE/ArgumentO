<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$action = $_GET['action'] ?? '';
$dataDir = __DIR__ . DIRECTORY_SEPARATOR . 'data';
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0775, true);
}

function json_error($message, $code = 400) {
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

function generate_uid() {
    return bin2hex(random_bytes(16));
}

if ($action === 'save') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        json_error('Method not allowed', 405);
    }

    $raw = file_get_contents('php://input');
    $payload = json_decode($raw, true);

    if (!is_array($payload) || !isset($payload['tree'])) {
        json_error('Invalid payload: missing tree');
    }

    if (!is_array($payload['tree'])) {
        json_error('Invalid tree format');
    }

    $uid = generate_uid();
    $path = $dataDir . DIRECTORY_SEPARATOR . $uid . '.json';

    $record = [
        'uid' => $uid,
        'createdAt' => gmdate('c'),
        'tree' => $payload['tree'],
    ];

    $encoded = json_encode($record, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    if ($encoded === false) {
        json_error('Failed to encode JSON', 500);
    }

    $written = file_put_contents($path, $encoded, LOCK_EX);
    if ($written === false) {
        json_error('Failed to save map', 500);
    }

    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $basePath = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/\\');
    $shareUrl = $scheme . '://' . $host . ($basePath ? $basePath : '') . '/view.html?uid=' . urlencode($uid);

    echo json_encode([
        'ok' => true,
        'uid' => $uid,
        'url' => $shareUrl,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'get') {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        json_error('Method not allowed', 405);
    }

    $uid = $_GET['uid'] ?? '';
    if (!preg_match('/^[a-f0-9]{32}$/', $uid)) {
        json_error('Invalid UID');
    }

    $path = $dataDir . DIRECTORY_SEPARATOR . $uid . '.json';
    if (!is_file($path)) {
        json_error('Map not found', 404);
    }

    $content = file_get_contents($path);
    if ($content === false) {
        json_error('Failed to read map', 500);
    }

    $decoded = json_decode($content, true);
    if (!is_array($decoded) || !isset($decoded['tree'])) {
        json_error('Corrupted map data', 500);
    }

    echo json_encode([
        'ok' => true,
        'uid' => $decoded['uid'] ?? $uid,
        'createdAt' => $decoded['createdAt'] ?? null,
        'tree' => $decoded['tree'],
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

json_error('Unknown action', 404);
