<?php
require_once "config.php";
require_admin();

$orders = $pdo->query("SELECT * FROM orders ORDER BY created_at DESC")->fetchAll();

$itemsStmt = $pdo->prepare("SELECT name, price, qty FROM order_items WHERE order_id = :id");
foreach ($orders as &$order) {
    $itemsStmt->execute([":id" => $order["id"]]);
    $order["items"] = $itemsStmt->fetchAll();
}

echo json_encode($orders);
