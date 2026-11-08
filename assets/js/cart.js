/* ================= CART (localStorage) =================
   Cart lives in the visitor's browser (localStorage) since each page
   is a separate load. Product & order data lives in the MySQL database
   via the api/ endpoints — that part IS shared across everyone. */

const CART_KEY = "iha_cart";

function getCart(){
  try{
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  }catch(e){ return []; }
}
function saveCart(cart){
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  renderCartCount();
}
function cartItemCount(){
  return getCart().reduce((sum,i)=>sum+i.qty,0);
}
function renderCartCount(){
  const el = document.getElementById("cartCount");
  if(el) el.textContent = cartItemCount();
}
function addToCart(product, qty){
  qty = qty || 1;
  const cart = getCart();
  const existing = cart.find(i=>i.product_id===product.id);
  if(existing){ existing.qty += qty; }
  else{
    cart.push({
      product_id: product.id,
      name: product.name,
      price: parseFloat(product.price),
      image: product.image,
      qty: qty
    });
  }
  saveCart(cart);
  showToast(product.name + " added to cart");
}
function removeFromCart(productId){
  let cart = getCart();
  cart = cart.filter(i=>i.product_id!==productId);
  saveCart(cart);
}
function changeCartQty(productId, delta){
  const cart = getCart();
  const item = cart.find(i=>i.product_id===productId);
  if(!item) return;
  item.qty += delta;
  const updated = item.qty > 0 ? cart : cart.filter(i=>i.product_id!==productId);
  saveCart(updated);
  return updated;
}
function clearCart(){
  localStorage.removeItem(CART_KEY);
  renderCartCount();
}
function cartSubtotal(){
  return getCart().reduce((sum,i)=>sum + i.price*i.qty, 0);
}

/* ---------- toast ---------- */
function showToast(msg){
  let t = document.getElementById("toast");
  if(!t){
    t = document.createElement("div");
    t.id = "toast";
    t.className = "toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(()=>t.classList.remove("show"), 2200);
}

document.addEventListener("DOMContentLoaded", renderCartCount);

/* Builds the category links in the nav bar dynamically from whatever
   categories currently exist in the database — so a brand new category
   shows up in every page's navigation automatically, no manual edits. */
async function loadCategoryNav(){
  const anchor = document.getElementById("navAllProducts");
  if(!anchor) return; // page doesn't have the nav (e.g. some standalone pages)
  try{
    // Derive the right relative prefix (e.g. "" at root, "../" inside /help/)
    // by reusing whatever prefix the All Products link already uses.
    const allProductsHref = anchor.querySelector("a").getAttribute("href") || "shop.html";
    const prefix = allProductsHref.replace(/shop\.html$/, "");

    const res = await fetch(prefix + "api/get_categories.php");
    const categories = await res.json();
    const currentParams = new URLSearchParams(window.location.search);
    const activeCategory = window.location.pathname.endsWith("category.html") ? currentParams.get("cat") : null;

    const html = categories.map(c=>{
      const isActive = activeCategory === c;
      return `<li><a href="${prefix}category.html?cat=${encodeURIComponent(c)}" ${isActive ? 'class="active"' : ''}>${escapeHtml(c)}</a></li>`;
    }).join("");
    anchor.insertAdjacentHTML("afterend", html);
  }catch(e){
    // fails quietly — worst case, the nav just shows Home/All Products/Track Order
  }
}
document.addEventListener("DOMContentLoaded", loadCategoryNav);

/* Shows the "Admin" footer link only to someone with an active, logged-in
   admin session — regular visitors never see it at all. */
async function loadAdminFooterLink(){
  const el = document.getElementById("adminFooterLink");
  if(!el) return;
  const anchor = document.getElementById("navAllProducts");
  const allProductsHref = anchor ? (anchor.querySelector("a").getAttribute("href") || "shop.html") : "shop.html";
  const prefix = allProductsHref.replace(/shop\.html$/, "");
  try{
    const res = await fetch(prefix + "api/admin_check.php");
    const data = await res.json();
    if(data.isAdmin){
      el.innerHTML = ` · <a href="${prefix}admin.html">Admin</a>`;
    }
  }catch(e){
    // fails quietly — link just stays hidden
  }
}
document.addEventListener("DOMContentLoaded", loadAdminFooterLink);

/* Escapes text before it's inserted into innerHTML (including inside
   attribute values like value="...") to prevent stored/reflected XSS
   from product names, customer names, order data, etc. */
function escapeHtml(str){
  if(str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
