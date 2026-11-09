<?php
require_once "config.php";

// Limit to 5 messages per IP per hour — deters contact-form spam
if (!check_rate_limit($pdo, "send_message", 5, 3600)) {
    http_response_code(429);
    echo json_encode(["error" => "Too many messages sent. Please try again later."]);
    exit;
}

$data = read_json_body();

// Honeypot: a hidden field real users never fill in. Bots that auto-fill every
// field will trip this, and we quietly pretend to succeed instead of telling
// them what stopped it.
if (!empty($data["website"] ?? "")) {
    echo json_encode(["success" => true]);
    exit;
}

$name = clean_text($data["name"] ?? "", 150);
$email = clean_text($data["email"] ?? "", 150);
$subject = clean_text($data["subject"] ?? "", 200);
$body = clean_text($data["body"] ?? "", 3000);

if ($name === "" || $email === "" || $body === "") {
    http_response_code(400);
    echo json_encode(["error" => "Name, email, and message are required."]);
    exit;
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(["error" => "Please enter a valid email address."]);
    exit;
}

$stmt = $pdo->prepare("INSERT INTO messages (name, email, subject, body) VALUES (:name, :email, :subject, :body)");
$stmt->execute([":name" => $name, ":email" => $email, ":subject" => $subject, ":body" => $body]);

// Best-effort email notification — safe to ignore if the host doesn't support mail()
if (!empty($STORE_EMAIL)) {
    $mailSubject = "New message from " . $name . ($subject !== "" ? ": " . $subject : "");
    $mailBody = "From: {$name} <{$email}>\n\n{$body}";
    @mail($STORE_EMAIL, $mailSubject, $mailBody, "From: {$STORE_EMAIL}\r\nReply-To: {$email}");
}

echo json_encode(["success" => true]);
