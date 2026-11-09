<?php
/* =======================================================
   IHA ONLINE SHOP — DATABASE + SECURITY CONFIG
   Fill in the values below, then upload this whole /api
   folder alongside the rest of the site.
   ======================================================= */

$DB_HOST = "localhost";
$DB_NAME = "db";
$DB_USER = "root";
$DB_PASS = "";

// ---------- ADMIN PASSWORD (hashed, not plain text) ----------
// IMPORTANT: the value below is a PLACEHOLDER, not a real password hash.
// Admin login will NOT work until you replace it. To do that:
//   1. Visit api/tools/generate_hash.php in your browser (e.g.
//      http://localhost/iha-project/api/tools/generate_hash.php).
//   2. Type the password you want to use, click Generate Hash.
//   3. Copy the long string it gives you and paste it below,
//      replacing the whole placeholder value (keep the quotes).
//   4. Save this file. Delete generate_hash.php once you're done with it.
$ADMIN_PASSWORD_HASH = '$2y$10$g1InffEEYglPhGOfDJCYCe3/9ylub6VMoOo5ILjbXitmnjTkCEVyC';

// Where contact-form messages get emailed (in addition to being saved in the database)
$STORE_EMAIL = "support@ihashop.example";

// Payment account details shown to customers at checkout — edit these to your real accounts
$PAYMENT_DETAILS = [
    "easypaisa" => ["label" => "EasyPaisa", "number" => "0335-2900483", "account_title" => "IHA Online Shop"],
    "jazzcash"  => ["label" => "JazzCash",  "number" => "0335-2900483", "account_title" => "IHA Online Shop"],
    "bank"      => ["label" => "Bank Transfer", "bank_name" => "Meezan Bank", "account_title" => "IHA Online Shop", "account_number" => "PK00MEZN0000000123456789"],
    "cod"       => ["label" => "Cash on Delivery"]
];

// ---------- WHATSAPP AUTO-SEND (optional, off by default) ----------
// Right now, order confirmations go out via the "Notify on WhatsApp" button
// in the admin panel — one click, no signup, no cost. That's enough for
// most small shops.
//
// If you later sign up for the official WhatsApp Business Cloud API
// (business.facebook.com — has a genuine free tier) and get a phone
// number ID + access token + an APPROVED message template (WhatsApp
// requires an approved template for the first message to someone who
// hasn't messaged you), fill these in and set $WHATSAPP_ENABLED to true.
// See the README for the full setup walkthrough.
$WHATSAPP_ENABLED = false;
$WHATSAPP_PHONE_NUMBER_ID = "";     // from your WhatsApp Business API app
$WHATSAPP_ACCESS_TOKEN = "";        // permanent access token
$WHATSAPP_TEMPLATE_NAME = "order_confirmation"; // must match your approved template name
$WHATSAPP_TEMPLATE_LANG = "en_US";

/* ------------------------------------------------------------------
   SECURITY HARDENING — session, headers, error handling
   ------------------------------------------------------------------ */
date_default_timezone_set("UTC");

// Never show raw PHP errors/stack traces to visitors; log them instead
ini_set("display_errors", "0");
ini_set("log_errors", "1");
error_reporting(E_ALL);

// Lock down session cookie behavior before starting the session
$isHttps = (!empty($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] !== "off")
    || (!empty($_SERVER["HTTP_X_FORWARDED_PROTO"]) && $_SERVER["HTTP_X_FORWARDED_PROTO"] === "https");
ini_set("session.use_strict_mode", "1");
session_set_cookie_params([
    "lifetime" => 0,
    "path" => "/",
    "httponly" => true,      // JS can't read the session cookie (blocks a common XSS→session-theft path)
    "secure" => $isHttps,    // cookie only sent over HTTPS once you have SSL on
    "samesite" => "Lax"      // blocks most cross-site request forgery from other domains
]);
session_start();

// Auto-expire admin sessions after 30 minutes of inactivity
if (!empty($_SESSION["is_admin"])) {
    if (!empty($_SESSION["last_activity"]) && (time() - $_SESSION["last_activity"] > 1800)) {
        $_SESSION = [];
        session_destroy();
        session_start();
    }
    $_SESSION["last_activity"] = time();
}

header("Content-Type: application/json");
// Defense-in-depth headers on every API response
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: DENY");
header("Referrer-Policy: strict-origin-when-cross-origin");

try {
    $pdo = new PDO(
        "mysql:host={$DB_HOST};dbname={$DB_NAME};charset=utf8mb4",
        $DB_USER,
        $DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
    );
} catch (PDOException $e) {
    error_log("DB connection failed: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["error" => "Database connection failed. Check the values in api/config.php."]);
    exit;
}

function require_admin() {
    if (empty($_SESSION["is_admin"])) {
        http_response_code(401);
        echo json_encode(["error" => "Admin login required."]);
        exit;
    }
}

// CSRF protection for admin actions that change data. The token is handed to
// the browser via api/csrf_token.php and must be echoed back in the
// X-CSRF-Token header on every product/order-editing request.
function require_csrf() {
    $sent = $_SERVER["HTTP_X_CSRF_TOKEN"] ?? "";
    if (empty($_SESSION["csrf_token"]) || !hash_equals($_SESSION["csrf_token"], $sent)) {
        http_response_code(403);
        echo json_encode(["error" => "Security check failed. Please refresh the admin page and try again."]);
        exit;
    }
}

function get_client_ip() {
    // Deliberately only trusts REMOTE_ADDR — headers like X-Forwarded-For
    // can be spoofed by the client and would let someone fake a different IP.
    return $_SERVER["REMOTE_ADDR"] ?? "unknown";
}

// Generic rate limiter backed by the rate_limit_log table. Returns true if
// the action is currently allowed, false if the caller should be blocked.
function check_rate_limit($pdo, $action, $maxAttempts, $windowSeconds) {
    $ip = get_client_ip();
    $stmt = $pdo->prepare("SELECT COUNT(*) AS c FROM rate_limit_log WHERE action = :action AND identifier = :ip AND created_at > (NOW() - INTERVAL :window SECOND)");
    $stmt->execute([":action" => $action, ":ip" => $ip, ":window" => $windowSeconds]);
    $count = (int) $stmt->fetch()["c"];

    if ($count >= $maxAttempts) {
        return false;
    }
    $pdo->prepare("INSERT INTO rate_limit_log (action, identifier) VALUES (:action, :ip)")
        ->execute([":action" => $action, ":ip" => $ip]);
    return true;
}

function read_json_body() {
    $raw = file_get_contents("php://input");
    // Guard against absurdly large payloads tying up the server
    if (strlen($raw) > 200000) {
        http_response_code(413);
        echo json_encode(["error" => "Request too large."]);
        exit;
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

// Strips tags and trims — use on any free-text field before storing/displaying it
function clean_text($value, $maxLength = 1000) {
    $value = trim(strip_tags((string) $value));
    return mb_substr($value, 0, $maxLength);
}

// Sends an order-confirmation WhatsApp message via the official Cloud API,
// but only if $WHATSAPP_ENABLED is true and credentials are filled in.
// Fails silently — a WhatsApp hiccup should never block an order from completing.
function send_whatsapp_order_confirmation($order, $customerPhone) {
    global $WHATSAPP_ENABLED, $WHATSAPP_PHONE_NUMBER_ID, $WHATSAPP_ACCESS_TOKEN, $WHATSAPP_TEMPLATE_NAME, $WHATSAPP_TEMPLATE_LANG;

    if (empty($WHATSAPP_ENABLED) || empty($WHATSAPP_PHONE_NUMBER_ID) || empty($WHATSAPP_ACCESS_TOKEN)) {
        return; // not configured — the admin-panel WhatsApp button is the fallback
    }

    $digitsOnly = preg_replace('/\D/', '', $customerPhone);
    if ($digitsOnly === "") return;

    $payload = [
        "messaging_product" => "whatsapp",
        "to" => $digitsOnly,
        "type" => "template",
        "template" => [
            "name" => $WHATSAPP_TEMPLATE_NAME,
            "language" => ["code" => $WHATSAPP_TEMPLATE_LANG],
            // Adjust these parameters to match however your approved template
            // is structured (e.g. {{1}} = order ID, {{2}} = total).
            "components" => [[
                "type" => "body",
                "parameters" => [
                    ["type" => "text", "text" => $order["id"]],
                    ["type" => "text", "text" => "Rs " . number_format($order["total"], 2)]
                ]
            ]]
        ]
    ];

    $ch = curl_init("https://graph.facebook.com/v19.0/{$WHATSAPP_PHONE_NUMBER_ID}/messages");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_HTTPHEADER => [
            "Authorization: Bearer {$WHATSAPP_ACCESS_TOKEN}",
            "Content-Type: application/json"
        ],
        CURLOPT_TIMEOUT => 5 // never let a slow WhatsApp API hold up checkout
    ]);
    $response = curl_exec($ch);
    if (curl_errno($ch)) {
        error_log("WhatsApp send failed: " . curl_error($ch));
    }
    curl_close($ch);
}
