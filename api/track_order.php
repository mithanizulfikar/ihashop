<?php
require_once "config.php";

// Limit to 20 lookups per IP per 10 minutes — makes brute-forcing order IDs impractical
if (!check_rate_limit($pdo, "track_order", 20, 600)) {
    http_response_code(429);
    echo json_encode(["error" => "Too many lookups. Please wait a few minutes and try again."]);
    exit;
}

$id = trim($_GET["id"] ?? "");
if ($id === "") {
    http_response_code(400);
    echo json_encode(["error" => "Please provide an order ID."]);
    exit;
}

$stmt = $pdo->prepare("SELECT * FROM orders WHERE id = :id");
$stmt->execute([":id" => $id]);
$order = $stmt->fetch();

if (!$order) {
    http_response_code(404);
    echo json_encode(["error" => "No order found with that ID."]);
    exit;
}

$itemsStmt = $pdo->prepare("SELECT name, price, qty FROM order_items WHERE order_id = :id");
$itemsStmt->execute([":id" => $id]);
$order["items"] = $itemsStmt->fetchAll();

echo json_encode($order);
