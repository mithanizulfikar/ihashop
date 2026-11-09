<?php
require_once "config.php";
require_admin();
require_csrf();

$data = read_json_body();
$orderId = trim($data["order_id"] ?? "");
$status = trim($data["status"] ?? "");
$paymentStatus = trim($data["payment_status"] ?? "");

$allowedStatus = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];
$allowedPaymentStatus = ["Unpaid", "Pending Confirmation", "Paid", "Refunded"];

if ($orderId === "") {
    http_response_code(400);
    echo json_encode(["error" => "Invalid order id."]);
    exit;
}

if ($status !== "") {
    if (!in_array($status, $allowedStatus, true)) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid status."]);
        exit;
    }
    $pdo->prepare("UPDATE orders SET status = :status WHERE id = :id")
        ->execute([":status" => $status, ":id" => $orderId]);
}

if ($paymentStatus !== "") {
    if (!in_array($paymentStatus, $allowedPaymentStatus, true)) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid payment status."]);
        exit;
    }
    $pdo->prepare("UPDATE orders SET payment_status = :payment_status WHERE id = :id")
        ->execute([":payment_status" => $paymentStatus, ":id" => $orderId]);
}

echo json_encode(["success" => true]);
