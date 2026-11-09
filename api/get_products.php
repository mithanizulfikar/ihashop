<?php
require_once "config.php";

// category can be a single value or comma-separated list, e.g. "Jewelry,Dresses"
$categoryParam = isset($_GET["category"]) ? trim($_GET["category"]) : "";
$search = isset($_GET["search"]) ? trim($_GET["search"]) : "";
$minPrice = isset($_GET["min_price"]) && $_GET["min_price"] !== "" ? floatval($_GET["min_price"]) : null;
$maxPrice = isset($_GET["max_price"]) && $_GET["max_price"] !== "" ? floatval($_GET["max_price"]) : null;
$sort = isset($_GET["sort"]) ? trim($_GET["sort"]) : "";
$limit = isset($_GET["limit"]) ? max(1, min(50, intval($_GET["limit"]))) : null;

$sql = "SELECT id, name, category, price, stock, image FROM products WHERE 1=1";
$params = [];

if ($categoryParam !== "" && strtolower($categoryParam) !== "all") {
    $categories = array_filter(array_map("trim", explode(",", $categoryParam)));
    if (count($categories) > 0) {
        $placeholders = [];
        foreach ($categories as $i => $cat) {
            $key = ":cat{$i}";
            $placeholders[] = $key;
            $params[$key] = $cat;
        }
        $sql .= " AND category IN (" . implode(",", $placeholders) . ")";
    }
}
if ($search !== "") {
    $sql .= " AND name LIKE :search";
    $params[":search"] = "%" . $search . "%";
}
if ($minPrice !== null) {
    $sql .= " AND price >= :min_price";
    $params[":min_price"] = $minPrice;
}
if ($maxPrice !== null) {
    $sql .= " AND price <= :max_price";
    $params[":max_price"] = $maxPrice;
}

switch ($sort) {
    case "price_asc":
        $sql .= " ORDER BY price ASC";
        break;
    case "price_desc":
        $sql .= " ORDER BY price DESC";
        break;
    case "name_asc":
        $sql .= " ORDER BY name ASC";
        break;
    case "name_desc":
        $sql .= " ORDER BY name DESC";
        break;
    case "newest":
        $sql .= " ORDER BY created_at DESC";
        break;
    default:
        $sql .= " ORDER BY category, name";
}

if ($limit !== null) {
    $sql .= " LIMIT " . $limit; // safe: $limit is cast to int and clamped above
}

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$products = $stmt->fetchAll();

echo json_encode($products);
