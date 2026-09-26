<?php
declare(strict_types=1);
session_start();
header('X-Robots-Tag: noindex, nofollow', true);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit('Method not allowed'); }
function respond(string $msg, int $code=400): never {
 http_response_code($code);
 echo '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Norwood.ma</title><link rel="stylesheet" href="styles.css"><main class="detail"><section class="page-hero"><h1>'.htmlspecialchars($msg,ENT_QUOTES,'UTF-8').'</h1><p><a class="button" href="support.html#contact">Back to Support &amp; Contact</a></p></section></main>'; exit;
}
if (!empty($_POST['website'] ?? '')) respond('Thanks.',200);
$started=(int)($_POST['form_started'] ?? 0);
if ($started<1 || (int)(microtime(true)*1000)-$started<2500) respond('Please wait a moment and try again.',429);
if (!isset($_SESSION['contact_last'])) $_SESSION['contact_last']=0;
if (time()-(int)$_SESSION['contact_last']<30) respond('Please wait before sending another message.',429);
$name=trim((string)($_POST['name']??''));
$email=filter_var(trim((string)($_POST['email']??'')),FILTER_VALIDATE_EMAIL);
$topic=trim((string)($_POST['topic']??''));
$message=trim((string)($_POST['message']??''));
$allowed=['correction','calendar-feed','resource','event','advertising','technical','other'];
if ($name===''||!$email||!in_array($topic,$allowed,true)||$message==='') respond('Please complete all required fields.');
if (mb_strlen($name)>120||mb_strlen($message)>5000) respond('That message is too long.');
$to='frankpadams@gmail.com';
$subject='Norwood.ma contact: '.$topic;
$body="Name: $name\nEmail: $email\nTopic: $topic\n\n$message";
$headers="From: Norwood.ma Website <no-reply@norwood.ma>\r\nReply-To: $email\r\nContent-Type: text/plain; charset=UTF-8\r\n";
if (!mail($to,$subject,$body,$headers)) respond('Your message could not be sent right now. Please try again later.',500);
$_SESSION['contact_last']=time();
respond('Thanks — your message was sent.',200);
?>