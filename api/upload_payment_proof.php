<?php
require_once "config.php";

// Limit to 10 upload attempts per IP per 10 minutes — plenty for real use, stops abuse
if (!check_rate_limit($pdo, "upload_payment_proof", 10, 600)) {
    http_response_code(429);
    echo json_encode(["error" => "Too many upload attempts. Please wait a few minutes and try again."]);
    exit;
}

$orderId = trim($_POST["order_id"] ?? "");
if ($orderId === "") {
    http_response_code(400);
    echo json_encode(["error" => "Missing order ID."]);
    exit;
}

// Confirm this order actually exists and doesn't already have a screenshot attached
$stmt = $pdo->prepare("SELECT id, payment_screenshot FROM orders WHERE id = :id");
$stmt->execute([":id" => $orderId]);
$order = $stmt->fetch();
if (!$order) {
    http_response_code(404);
    echo json_encode(["error" => "Order not found."]);
    exit;
}
if (!empty($order["payment_screenshot"])) {
    http_response_code(400);
    echo json_encode(["error" => "A screenshot has already been attached to this order."]);
    exit;
}

if (empty($_FILES["screenshot"]) || $_FILES["screenshot"]["error"] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(["error" => "No valid file was uploaded."]);
    exit;
}

$file = $_FILES["screenshot"];
$maxBytes = 5 * 1024 * 1024; // 5MB
if ($file["size"] > $maxBytes) {
    http_response_code(400);
    echo json_encode(["error" => "File is too large (max 5MB)."]);
    exit;
}

// Verify it's a real image (not just a renamed file with a fake extension)
$imageInfo = @getimagesize($file["tmp_name"]);
if ($imageInfo === false) {
    http_response_code(400);
    echo json_encode(["error" => "That file doesn't look like a valid image."]);
    exit;
}
$allowedMime = ["image/jpeg" => "jpg", "image/png" => "png", "image/webp" => "webp"];
$mime = $imageInfo["mime"];
if (!isset($allowedMime[$mime])) {
    http_response_code(400);
    echo json_encode(["error" => "Only JPG, PNG, or WEBP images are accepted."]);
    exit;
}

// Generate a random filename — never trust the uploaded filename
$extension = $allowedMime[$mime];
$safeName = bin2hex(random_bytes(16)) . "." . $extension;
$uploadDir = __DIR__ . "/../uploads/payment_proofs/";
$destination = $uploadDir . $safeName;

if (!move_uploaded_file($file["tmp_name"], $destination)) {
    http_response_code(500);
    echo json_encode(["error" => "Couldn't save the uploaded file. Check that uploads/payment_proofs/ is writable."]);
    exit;
}

$relativePath = "uploads/payment_proofs/" . $safeName;
$pdo->prepare("UPDATE orders SET payment_screenshot = :path WHERE id = :id")
    ->execute([":path" => $relativePath, ":id" => $orderId]);

echo json_encode(["success" => true, "path" => $relativePath]);
