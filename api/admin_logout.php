<?php
require_once "config.php";
$_SESSION["is_admin"] = false;
session_destroy();
echo json_encode(["success" => true]);
