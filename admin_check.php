<?php
require_once "config.php";

$isAdmin = !empty($_SESSION["is_admin"]);
$response = ["isAdmin" => $isAdmin];

if ($isAdmin) {
    if (empty($_SESSION["csrf_token"])) {
        $_SESSION["csrf_token"] = bin2hex(random_bytes(32));
    }
    $response["csrf_token"] = $_SESSION["csrf_token"];
}

echo json_encode($response);
