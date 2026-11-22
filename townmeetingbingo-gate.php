<?php
declare(strict_types=1);
// Town Meeting Bingo: restricted casual-access page. Keep the password itself out of source.
session_set_cookie_params([
  'lifetime' => 0, 'path' => '/', 'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
  'httponly' => true, 'samesite' => 'Lax'
]);
session_start();
header('Cache-Control: private, no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('X-Robots-Tag: noindex, nofollow, noarchive');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
if (!empty($_SESSION['bingo_authorized'])) {
  header('Content-Type: text/html; charset=utf-8');
  readfile(__DIR__ . '/townmeetingbingo.html');
  exit;
}
$hash = '2eaceb5891bbd08d3188154d17f116cab7ca536749579cc1ff04b14e2fc70387';
$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $now = time();
  if (!isset($_SESSION['bingo_try_start']) || $now - (int)$_SESSION['bingo_try_start'] >= 900) {
    $_SESSION['bingo_try_start'] = $now;
    $_SESSION['bingo_tries'] = 0;
  }
  if ((int)($_SESSION['bingo_tries'] ?? 0) >= 8) {
    http_response_code(429);
    $error = 'Too many attempts. Please try again in 15 minutes.';
  } else {
    ++$_SESSION['bingo_tries'];
    $supplied = (string)($_POST['password'] ?? '');
    if (hash_equals($hash, hash('sha256', $supplied))) {
      session_regenerate_id(true);
      $_SESSION['bingo_authorized'] = true;
      unset($_SESSION['bingo_tries'], $_SESSION['bingo_try_start']);
      header('Location: /townmeetingbingo-gate.php', true, 303);
      exit;
    }
    $error = 'Incorrect password.';
  }
}
header('Content-Type: text/html; charset=utf-8');
?><!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive">
<title>Private Town Meeting Bingo | Norwood.ma</title>
<style>
:root{color-scheme:light}*{box-sizing:border-box}
body{margin:0;min-height:100vh;background:#f3f6fa;color:#17384d;display:grid;place-items:center;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:22px}
main{max-width:430px;width:100%;background:#fff;padding:30px;border:1px solid #d5e0e6;border-radius:14px;box-shadow:0 10px 32px #003b711c}
img{max-width:220px;display:block;margin-bottom:23px}h1{margin:0 0 11px;font:700 28px Georgia,serif;color:#003b71}
p{line-height:1.5;margin:0 0 16px}label{display:block;font-weight:700;margin-bottom:7px}
input{font:inherit;width:100%;padding:12px;border:1px solid #8da2b2;border-radius:8px;margin-bottom:14px}
button{font:inherit;font-weight:800;cursor:pointer;background:#003b71;color:white;border:0;border-radius:8px;padding:12px 20px;width:100%}
button:hover{background:#12558c}.error{color:#8d221b;margin:0 0 14px;font-weight:700}
</style></head><body><main><a href="/"><img src="/assets/logo-dark-approved.png" alt="Norwood.ma"></a>
<h1>Town Meeting Bingo</h1><p>This activity is shared with a limited group. Enter the password to continue.</p>
<?php if ($error !== ''): ?><p class="error" role="alert"><?= htmlspecialchars($error, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></p><?php endif; ?>
<form method="post" action="/townmeetingbingo-gate.php"><label for="password">Password</label><input type="password" id="password" name="password" autocomplete="current-password" required autofocus><button type="submit">Open Bingo</button></form>
</main></body></html>
