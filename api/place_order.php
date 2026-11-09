<?php
require_once "config.php";

// Limit to 8 orders per IP per 10 minutes — stops automated spam/stock-griefing
if (!check_rate_limit($pdo, "place_order", 8, 600)) {
    http_response_code(429);
    echo json_encode(["error" => "Too many orders placed too quickly. Please wait a few minutes and try again."]);
    exit;
}

$data = read_json_body();
$items = $data["items"] ?? [];
$customer = $data["customer"] ?? [];

$name = clean_text($customer["name"] ?? "", 150);
$phone = clean_text($customer["phone"] ?? "", 50);
$address = clean_text($customer["address"] ?? "", 500);
$email = clean_text($customer["email"] ?? "", 150);
if ($email !== "" && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(["error" => "Please enter a valid email address."]);
    exit;
}

$allowedPaymentMethods = ["easypaisa", "jazzcash", "bank", "cod"];
$paymentMethod = strtolower(trim($data["payment_method"] ?? "cod"));
$paymentReference = clean_text($data["payment_reference"] ?? "", 100);
if (!in_array($paymentMethod, $allowedPaymentMethods, true)) {
    $paymentMethod = "cod";
}
// Cash on Delivery is settled on arrival; wallet/bank payments start as Unpaid until confirmed by the admin.
$paymentStatus = ($paymentMethod === "cod") ? "Unpaid" : "Pending Confirmation";

if ($name === "" || $phone === "" || $address === "") {
    http_response_code(400);
    echo json_encode(["error" => "Name, phone and address are required."]);
    exit;
}
if (!is_array($items) || count($items) === 0) {
    http_response_code(400);
    echo json_encode(["error" => "Your cart is empty."]);
    exit;
}

try {
    $pdo->beginTransaction();

    $orderItems = [];
    $total = 0;

    foreach ($items as $item) {
        $productId = intval($item["product_id"] ?? 0);
        $qty = intval($item["qty"] ?? 0);
        if ($productId <= 0 || $qty <= 0) continue;

        // lock the row so concurrent checkouts can't oversell
        $stmt = $pdo->prepare("SELECT * FROM products WHERE id = :id FOR UPDATE");
        $stmt->execute([":id" => $productId]);
        $product = $stmt->fetch();

        if (!$product) {
            throw new Exception("A product in your cart no longer exists.");
        }
        if ($product["stock"] < $qty) {
            throw new Exception("Not enough stock for \"{$product['name']}\" (only {$product['stock']} left).");
        }

        $pdo->prepare("UPDATE products SET stock = stock - :qty WHERE id = :id")
            ->execute([":qty" => $qty, ":id" => $productId]);

        $lineTotal = $product["price"] * $qty;
        $total += $lineTotal;
        $orderItems[] = [
            "product_id" => $productId,
            "name" => $product["name"],
            "price" => $product["price"],
            "qty" => $qty
        ];
    }

    if (count($orderItems) === 0) {
        throw new Exception("No valid items in cart.");
    }

    $orderId = "IHA-" . strtoupper(substr(base_convert((string) round(microtime(true) * 1000), 10, 36), -6));

    $stmt = $pdo->prepare("INSERT INTO orders (id, customer_name, customer_phone, customer_address, customer_email, total, status, payment_method, payment_reference, payment_status)
                            VALUES (:id, :name, :phone, :address, :email, :total, 'Pending', :payment_method, :payment_reference, :payment_status)");
    $stmt->execute([
        ":id" => $orderId, ":name" => $name, ":phone" => $phone,
        ":address" => $address, ":email" => $email, ":total" => $total,
        ":payment_method" => $paymentMethod, ":payment_reference" => $paymentReference, ":payment_status" => $paymentStatus
    ]);

    $itemStmt = $pdo->prepare("INSERT INTO order_items (order_id, product_id, name, price, qty) VALUES (:order_id, :product_id, :name, :price, :qty)");
    foreach ($orderItems as $oi) {
        $itemStmt->execute([
            ":order_id" => $orderId, ":product_id" => $oi["product_id"],
            ":name" => $oi["name"], ":price" => $oi["price"], ":qty" => $oi["qty"]
        ]);
    }

    $pdo->commit();

    // No-op unless $WHATSAPP_ENABLED is true in config.php — see that file to set it up
    send_whatsapp_order_confirmation(["id" => $orderId, "total" => $total], $phone);

    echo json_encode(["success" => true, "order_id" => $orderId]);

} catch (Exception $e) {
    $pdo->rollBack();
    http_response_code(400);
    echo json_encode(["error" => $e->getMessage()]);
}
