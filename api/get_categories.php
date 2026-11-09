<?php
require_once "config.php";

$categories = $pdo->query("SELECT DISTINCT category FROM products ORDER BY category")->fetchAll(PDO::FETCH_COLUMN);
echo json_encode($categories);
