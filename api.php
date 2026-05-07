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
    $flags = JSON_UNESCAPED_UNICODE;
    if (defined('JSON_INVALID_UTF8_SUBSTITUTE')) {
        $flags |= JSON_INVALID_UTF8_SUBSTITUTE;
    }
    $out = json_encode(['ok' => false, 'error' => $message], $flags);
    if ($out === false) {
        $out = '{"ok":false,"error":"JSON encoding failure"}';
    }
    echo $out;
    exit;
}

function json_ok($data, $code = 200) {
    http_response_code($code);
    $flags = JSON_UNESCAPED_UNICODE;
    if (defined('JSON_INVALID_UTF8_SUBSTITUTE')) {
        $flags |= JSON_INVALID_UTF8_SUBSTITUTE;
    }
    $out = json_encode($data, $flags);
    if ($out === false) {
        json_error('JSON encoding failure', 500);
    }
    echo $out;
    exit;
}

function generate_uid() {
    return bin2hex(random_bytes(16));
}

function normalize_text($text) {
    if (!is_string($text)) {
        return '';
    }
    $t = strtolower($text);
    $iconv = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $t);
    if ($iconv !== false) {
        $t = $iconv;
    }
    $t = preg_replace('/[^a-z0-9\s]/', ' ', $t);
    return trim(preg_replace('/\s+/', ' ', $t));
}

function token_set($text) {
    $norm = normalize_text($text);
    if ($norm === '') {
        return [];
    }
    $parts = preg_split('/\s+/', $norm);
    $set = [];
    foreach ($parts as $p) {
        if (strlen($p) > 2) {
            $set[$p] = true;
        }
    }
    return $set;
}

function jaccard_similarity($a, $b) {
    $setA = token_set($a);
    $setB = token_set($b);
    if (count($setA) === 0 || count($setB) === 0) {
        return 0.0;
    }
    $intersection = 0;
    foreach ($setA as $token => $v) {
        if (isset($setB[$token])) {
            $intersection++;
        }
    }
    $union = count($setA + $setB);
    if ($union === 0) {
        return 0.0;
    }
    return $intersection / $union;
}

function has_word($text, $word) {
    $t = normalize_text($text);
    $w = normalize_text($word);
    return preg_match('/\b' . preg_quote($w, '/') . '\b/', $t) === 1;
}

function flatten_tree($node, $path = '1', $parentId = null, &$out = []) {
    if (!is_array($node)) {
        return;
    }
    $out[] = [
        'id' => $node['id'] ?? '',
        'type' => $node['type'] ?? 'pro',
        'path' => $path,
        'parentId' => $parentId,
        'claim' => (string)($node['claim'] ?? ''),
        'data' => (string)($node['data'] ?? ''),
        'warrant' => (string)($node['warrant'] ?? ''),
        'backing' => (string)($node['backing'] ?? ''),
        'qualifier' => (string)($node['qualifier'] ?? ''),
        'source' => (string)($node['source'] ?? ''),
    ];
    $children = $node['children'] ?? [];
    if (!is_array($children)) {
        $children = [];
    }
    foreach ($children as $i => $child) {
        flatten_tree($child, $path . '.' . ($i + 1), $node['id'] ?? null, $out);
    }
}

function utf8_truncate($text, $maxChars = 80) {
    if (!is_string($text)) {
        return '';
    }
    if ($maxChars <= 0) {
        return '';
    }
    if (!preg_match('/^.{0,' . (int)$maxChars . '}$/us', $text)) {
        if (preg_match('/^(.{0,' . (int)$maxChars . '})/us', $text, $m)) {
            return $m[1];
        }
    }
    return $text;
}

function analyze_tree_flags($tree) {
    $nodes = [];
    flatten_tree($tree, '1', null, $nodes);
    $thesisClaim = (string)($tree['claim'] ?? '');
    $thesisChildren = is_array($tree['children'] ?? null) ? $tree['children'] : [];
    $hasProAtRoot = false;
    foreach ($thesisChildren as $c) {
        if (($c['type'] ?? '') === 'pro') {
            $hasProAtRoot = true;
            break;
        }
    }

    $results = [];
    foreach ($nodes as $n) {
        $flags = [];

        $sim = jaccard_similarity($n['data'], $n['warrant']);
        if ($sim > 0.6) {
            $flags[] = [
                'type' => 'high_similarity',
                'fields' => ['data', 'warrant'],
                'severity' => $sim > 0.8 ? 'high' : 'medium',
                'score' => round($sim, 2),
                'detail' => 'Les champs data et warrant se recouvrent fortement.',
                'hint' => 'Le warrant ressemble fortement au data sans raisonnement intermediaire.'
            ];
        }

        $claim = normalize_text($n['claim']);
        $qualifier = normalize_text($n['qualifier']);
        $absoluteMarkers = ['tout','tous','toutes','toujours','jamais','rien','aucun','aucune','personne','absolument','impossible','obligatoirement','necessairement','certainement'];
        $moderateMarkers = ['certains','parfois','souvent','la plupart','generalement','en partie','quelques'];
        $weakQualifiers = ['probable','probablement','possible','parfois','peut etre','vraisemblable','plausible'];
        $strongQualifiers = ['certain','certainement','assurement','necessaire','necessairement','garanti','toujours'];

        $hasAbsolute = false;
        foreach ($absoluteMarkers as $m) {
            if (has_word($claim, $m)) {
                $hasAbsolute = true;
                break;
            }
        }
        $hasModerate = false;
        foreach ($moderateMarkers as $m) {
            if (strpos($claim, $m) !== false) {
                $hasModerate = true;
                break;
            }
        }
        $isWeak = in_array($qualifier, $weakQualifiers, true);
        $isStrong = in_array($qualifier, $strongQualifiers, true);

        if ($hasAbsolute && $isWeak) {
            $matchedMarker = '';
            foreach ($absoluteMarkers as $m) {
                if (has_word($claim, $m)) {
                    $matchedMarker = $m;
                    break;
                }
            }
            $flags[] = [
                'type' => 'qualifier_claim_mismatch',
                'severity' => 'high',
                'detail' => 'Le claim contient un quantificateur fort ("' . $matchedMarker . '") mais le qualifier est "' . ($n['qualifier'] ?: 'absent') . '".',
                'hint' => 'Claim absolu avec un qualifier faible: incoherence possible.'
            ];
        }
        if ($hasModerate && $isStrong) {
            $flags[] = [
                'type' => 'qualifier_claim_mismatch',
                'severity' => 'medium',
                'detail' => 'Le claim est nuance mais le qualifier est tres fort ("' . ($n['qualifier'] ?: 'absent') . '").',
                'hint' => 'Claim nuance avec un qualifier tres fort: certitude excessive.'
            ];
        }

        $minLengths = ['claim' => 5, 'data' => 10, 'warrant' => 10, 'backing' => 5];
        foreach ($minLengths as $field => $minLen) {
            $value = trim((string)$n[$field]);
            if ($value === '') {
                $flags[] = [
                    'type' => 'missing_field',
                    'field' => $field,
                    'severity' => $field === 'backing' ? 'medium' : 'high',
                    'hint' => 'Champ "' . $field . '" vide.'
                ];
            } elseif (strlen($value) < $minLen) {
                $flags[] = [
                    'type' => 'short_field',
                    'field' => $field,
                    'severity' => 'low',
                    'hint' => 'Champ "' . $field . '" tres court.'
                ];
            }
        }

        $hasBacking = trim((string)$n['backing']) !== '';
        $hasSource = trim((string)$n['source']) !== '';
        if ($hasBacking && !$hasSource) {
            $flags[] = [
                'type' => 'vague_backing',
                'severity' => 'medium',
                'hint' => 'Backing possiblement vague (autorite sans source precise).'
            ];
        }

        if (($n['type'] ?? '') !== 'thesis') {
            $dup = jaccard_similarity($n['claim'], $thesisClaim);
            if ($dup > 0.7) {
                $flags[] = [
                    'type' => 'claim_thesis_duplication',
                    'severity' => $dup > 0.9 ? 'high' : 'medium',
                    'score' => round($dup, 2),
                    'hint' => 'Claim tres proche de la these (reformulation possible).'
                ];
            }
        }

        if (trim((string)$n['qualifier']) === '') {
            $flags[] = [
                'type' => 'missing_qualifier',
                'severity' => 'low',
                'hint' => 'Qualifier absent.'
            ];
        }

        if ($isStrong && trim((string)$n['backing']) === '') {
            $flags[] = [
                'type' => 'strong_qualifier_no_backing',
                'severity' => 'high',
                'hint' => 'Qualifier fort sans backing.'
            ];
        }

        if (($n['type'] ?? '') === 'contra' && ($n['parentId'] ?? null) === ($tree['id'] ?? null) && $hasProAtRoot) {
            $flags[] = [
                'type' => 'generic_rebuttal',
                'severity' => 'low',
                'hint' => 'Ce contre-argument cible la these directement; une refutation ciblee d\'un argument POUR peut etre plus precise.'
            ];
        }

        $results[] = [
            'id' => $n['id'],
            'path' => $n['path'],
            'type' => $n['type'],
            'claimPreview' => utf8_truncate((string)$n['claim'], 80),
            'flags' => $flags,
        ];
    }

    return $results;
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

    json_ok([
        'ok' => true,
        'uid' => $uid,
        'url' => $shareUrl,
    ]);
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

    json_ok([
        'ok' => true,
        'uid' => $decoded['uid'] ?? $uid,
        'createdAt' => $decoded['createdAt'] ?? null,
        'tree' => $decoded['tree'],
    ]);
}

if ($action === 'verify') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        json_error('Method not allowed', 405);
    }

    $raw = file_get_contents('php://input');
    $payload = json_decode($raw, true);
    if (!is_array($payload) || !isset($payload['tree']) || !is_array($payload['tree'])) {
        json_error('Invalid payload: missing tree');
    }

    $analysis = analyze_tree_flags($payload['tree']);
    $withFlags = array_values(array_filter($analysis, function ($n) {
        return isset($n['flags']) && count($n['flags']) > 0;
    }));

    $high = 0;
    $medium = 0;
    $low = 0;
    $totalFlags = 0;
    foreach ($withFlags as $n) {
        foreach ($n['flags'] as $f) {
            $totalFlags++;
            if (($f['severity'] ?? '') === 'high') $high++;
            else if (($f['severity'] ?? '') === 'medium') $medium++;
            else $low++;
        }
    }

    json_ok([
        'ok' => true,
        'summary' => [
            'totalNodes' => count($analysis),
            'nodesWithFlags' => count($withFlags),
            'totalFlags' => $totalFlags,
            'high' => $high,
            'medium' => $medium,
            'low' => $low,
        ],
        'nodes' => $withFlags,
        'generatedAt' => gmdate('c'),
    ]);
}

json_error('Unknown action', 404);
