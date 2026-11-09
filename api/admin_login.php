<?php
require_once "config.php";

// Block brute-force attempts: max 6 tries per IP per 15 minutes
if (!check_rate_limit($pdo, "admin_login", 6, 900)) {
    http_response_code(429);
    echo json_encode(["error" => "Too many login attempts. Please wait 15 minutes and try again."]);
    exit;
}

$data = read_json_body();
$password = (string) ($data["password"] ?? "");

if ($password !== "" && password_verify($password, $ADMIN_PASSWORD_HASH)) {
    // Regenerate the session ID on privilege escalation — blocks session fixation attacks
    session_regenerate_id(true);
    $_SESSION["is_admin"] = true;
    $_SESSION["last_activity"] = time();
    $_SESSION["csrf_token"] = bin2hex(random_bytes(32));
    echo json_encode(["success" => true, "csrf_token" => $_SESSION["csrf_token"]]);
} else {
    http_response_code(401);
    echo json_encode(["success" => false, "error" => "Incorrect password."]);
}
