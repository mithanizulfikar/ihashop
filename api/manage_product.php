<?php
require_once "config.php";
require_admin();
require_csrf();

// Categories are open-ended (the admin can create new ones), but still
// validated: reasonable length, letters/numbers/spaces/basic punctuation only.
function valid_category($category) {
    return $category !== "" && mb_strlen($category) <= 50 && preg_match('/^[\p{L}0-9 &\'\-]+$/u', $category);
}

function valid_image_url($url) {
    // Allow same-site relative paths (assets/images/...) or http(s) links only —
    // blocks javascript:, data:, and other schemes that could be abused.
    if ($url === "") return true;
    if (preg_match('#^assets/images/#', $url)) return true;
    if (preg_match('#^https?://#i', $url)) return true;
    return false;
}

$data = read_json_body();
$action = $data["action"] ?? "";

if ($action === "add") {
    $name = clean_text($data["name"] ?? "", 150);
    $category = clean_text($data["category"] ?? "", 50);
    $price = max(0, floatval($data["price"] ?? 0));
    $stock = max(0, intval($data["stock"] ?? 0));
    $image = trim($data["image"] ?? "");

    if ($name === "" || !valid_category($category)) {
        http_response_code(400);
        echo json_encode(["error" => "A valid name and category are required (letters, numbers, spaces, and & ' - only)."]);
        exit;
    }
    if (!valid_image_url($image)) {
        http_response_code(400);
        echo json_encode(["error" => "Image must be a relative assets/images/... path or an http(s) URL."]);
        exit;
    }

    $stmt = $pdo->prepare("INSERT INTO products (name, category, price, stock, image) VALUES (:name, :category, :price, :stock, :image)");
    $stmt->execute([
        ":name" => $name, ":category" => $category, ":price" => $price, ":stock" => $stock, ":image" => $image
    ]);
    echo json_encode(["success" => true, "id" => $pdo->lastInsertId()]);

} elseif ($action === "update") {
    $id = intval($data["id"] ?? 0);
    if ($id <= 0) { http_response_code(400); echo json_encode(["error" => "Invalid product id."]); exit; }

    $name = clean_text($data["name"] ?? "", 150);
    $category = clean_text($data["category"] ?? "", 50);
    $image = trim($data["image"] ?? "");

    if ($name === "" || !valid_category($category)) {
        http_response_code(400);
        echo json_encode(["error" => "A valid name and category are required (letters, numbers, spaces, and & ' - only)."]);
        exit;
    }
    if (!valid_image_url($image)) {
        http_response_code(400);
        echo json_encode(["error" => "Image must be a relative assets/images/... path or an http(s) URL."]);
        exit;
    }

    $stmt = $pdo->prepare("UPDATE products SET name=:name, category=:category, price=:price, stock=:stock, image=:image WHERE id=:id");
    $stmt->execute([
        ":name" => $name,
        ":category" => $category,
        ":price" => max(0, floatval($data["price"] ?? 0)),
        ":stock" => max(0, intval($data["stock"] ?? 0)),
        ":image" => $image,
        ":id" => $id
    ]);
    echo json_encode(["success" => true]);

} elseif ($action === "delete") {
    $id = intval($data["id"] ?? 0);
    if ($id <= 0) { http_response_code(400); echo json_encode(["error" => "Invalid product id."]); exit; }

    $stmt = $pdo->prepare("DELETE FROM products WHERE id=:id");
    $stmt->execute([":id" => $id]);
    echo json_encode(["success" => true]);

} else {
    http_response_code(400);
    echo json_encode(["error" => "Unknown action."]);
}
