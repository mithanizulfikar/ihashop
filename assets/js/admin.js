let CATEGORIES = []; // loaded dynamically from the database — see loadCategories()
let adminProducts = [];
let adminOrders = [];
let csrfToken = "";

async function loadCategories(){
  try{
    const res = await fetch("api/get_categories.php");
    CATEGORIES = await res.json();
  }catch(e){ CATEGORIES = []; }
}

async function checkAdminSession(){
  try{
    const res = await fetch("api/admin_check.php");
    const data = await res.json();
    if(data.isAdmin) csrfToken = data.csrf_token || "";
    return !!data.isAdmin;
  }catch(e){ return false; }
}

async function showDashboard(){
  document.getElementById("loginPanel").style.display = "none";
  document.getElementById("dashboardPanel").style.display = "block";
  await loadCategories();
  await loadAdminProducts();
  switchAdminTab("products");
}

document.getElementById("loginBtn").addEventListener("click", async ()=>{
  const password = document.getElementById("adminPassInput").value;
  const btn = document.getElementById("loginBtn");
  btn.disabled = true;
  try{
    const res = await fetch("api/admin_login.php", {
      method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({password})
    });
    const data = await res.json();
    if(data.success){ csrfToken = data.csrf_token || ""; await showDashboard(); }
    else{ showToast(data.error || "Incorrect password."); }
  }catch(e){ showToast("Couldn't reach the server."); }
  btn.disabled = false;
});

document.getElementById("adminPassInput").addEventListener("keydown", (e)=>{
  if(e.key === "Enter") document.getElementById("loginBtn").click();
});

document.getElementById("logoutBtn").addEventListener("click", async ()=>{
  await fetch("api/admin_logout.php", {method:"POST"});
  document.getElementById("dashboardPanel").style.display = "none";
  document.getElementById("loginPanel").style.display = "block";
});

document.getElementById("tabProductsBtn").addEventListener("click", ()=>switchAdminTab("products"));
document.getElementById("tabOrdersBtn").addEventListener("click", ()=>switchAdminTab("orders"));

function switchAdminTab(tab){
  document.getElementById("tabProductsBtn").classList.toggle("active", tab==="products");
  document.getElementById("tabOrdersBtn").classList.toggle("active", tab==="orders");
  document.getElementById("adminProductsView").style.display = tab==="products" ? "block" : "none";
  document.getElementById("adminOrdersView").style.display = tab==="orders" ? "block" : "none";
  if(tab==="orders") loadAdminOrders();
}

/* ---------- products ---------- */
async function loadAdminProducts(){
  const res = await fetch("api/get_products.php");
  adminProducts = await res.json();
  renderAdminProducts();
}
function renderAdminProducts(){
  const view = document.getElementById("adminProductsView");
  const categoryOptions = c => `${CATEGORIES.map(cat=>`<option value="${cat}" ${cat===c?'selected':''}>${cat}</option>`).join("")}<option value="__new__">+ Add new category</option>`;

  const productRow = p => `
    <div class="admin-row" data-id="${p.id}">
      <input value="${escapeHtml(p.name)}" data-field="name" placeholder="Name">
      <select data-field="category" class="category-select">
        ${categoryOptions(p.category)}
      </select>
      <input type="number" step="0.01" value="${escapeHtml(p.price)}" data-field="price" placeholder="Price">
      <input type="number" value="${escapeHtml(p.stock)}" data-field="stock" placeholder="Stock">
      <input class="full" value="${escapeHtml(p.image)}" data-field="image" placeholder="Image URL">
      <input type="text" class="full new-category-input" placeholder="Type the new category name" style="display:none;">
      <div class="admin-row-actions">
        <button class="small-btn save-btn" data-action="save">Save</button>
        <button class="small-btn del-btn" data-action="delete">Delete</button>
      </div>
    </div>`;

  // Group products by category so it's easy to scan and delete within one category
  const grouped = {};
  adminProducts.forEach(p=>{
    const key = p.category || "Uncategorized";
    if(!grouped[key]) grouped[key] = [];
    grouped[key].push(p);
  });
  const sortedCategoryNames = Object.keys(grouped).sort((a,b)=>a.localeCompare(b));

  const groupedHtml = sortedCategoryNames.map(cat => `
    <div class="admin-category-group">
      <h4 class="admin-category-heading">${escapeHtml(cat)} <span class="admin-category-count">(${grouped[cat].length})</span></h4>
      ${grouped[cat].map(productRow).join("")}
    </div>`).join("");

  view.innerHTML = groupedHtml + `
    <h4 style="margin:16px 0 8px;font-size:14px;">Add New Product</h4>
    <div class="admin-row" id="newProductRow">
      <input id="newName" placeholder="Name">
      <select id="newCategory" class="category-select">${categoryOptions()}</select>
      <input id="newPrice" type="number" step="0.01" placeholder="Price">
      <input id="newStock" type="number" placeholder="Stock">
      <input id="newImage" class="full" placeholder="Image URL (e.g. https://picsum.photos/seed/name/400/400)">
      <input type="text" id="newCategoryInput" class="full new-category-input" placeholder="Type the new category name" style="display:none;">
      <div class="admin-row-actions"><button class="small-btn save-btn" id="addProductBtn">Add Product</button></div>
    </div>`;

  // Show/hide the "type new category" input next to whichever select triggered it
  view.querySelectorAll(".category-select").forEach(select=>{
    select.addEventListener("change", ()=>{
      const newInput = select.parentElement.querySelector(".new-category-input");
      if(!newInput) return;
      if(select.value === "__new__"){
        newInput.style.display = "block";
        newInput.focus();
      } else {
        newInput.style.display = "none";
      }
    });
  });

  view.querySelectorAll(".admin-row[data-id]").forEach(row=>{
    const id = row.getAttribute("data-id");
    row.querySelector('[data-action="save"]').addEventListener("click", ()=>saveProduct(id, row));
    row.querySelector('[data-action="delete"]').addEventListener("click", ()=>deleteProduct(id));
  });
  document.getElementById("addProductBtn").addEventListener("click", addProduct);
}

// Resolves the real category name for a row: if "+ Add new category" was picked,
// use whatever was typed into the accompanying text input instead.
function resolveCategory(selectEl, newInputEl){
  if(selectEl.value === "__new__"){
    return (newInputEl ? newInputEl.value : "").trim();
  }
  return selectEl.value;
}

async function saveProduct(id, row){
  const payload = {action:"update", id};
  row.querySelectorAll("[data-field]").forEach(el=>{
    if(el.getAttribute("data-field") === "category"){
      payload.category = resolveCategory(el, row.querySelector(".new-category-input"));
    } else {
      payload[el.getAttribute("data-field")] = el.value;
    }
  });
  const res = await fetch("api/manage_product.php", {
    method:"POST", headers:{"Content-Type":"application/json", "X-CSRF-Token": csrfToken}, body: JSON.stringify(payload)
  });
  const data = await res.json();
  if(data.error){ showToast(data.error); return; }
  showToast("Product updated");
  loadCategories();
  loadAdminProducts();
}
async function deleteProduct(id){
  if(!confirm("Delete this product?")) return;
  const res = await fetch("api/manage_product.php", {
    method:"POST", headers:{"Content-Type":"application/json", "X-CSRF-Token": csrfToken}, body: JSON.stringify({action:"delete", id})
  });
  const data = await res.json();
  if(data.error){ showToast(data.error); return; }
  showToast("Product deleted");
  await loadCategories();
  loadAdminProducts();
}
async function addProduct(){
  const categorySelect = document.getElementById("newCategory");
  const category = resolveCategory(categorySelect, document.getElementById("newCategoryInput"));
  const payload = {
    action:"add",
    name: document.getElementById("newName").value.trim(),
    category: category,
    price: document.getElementById("newPrice").value,
    stock: document.getElementById("newStock").value,
    image: document.getElementById("newImage").value.trim() || ("https://picsum.photos/seed/"+Date.now()+"/400/400")
  };
  if(!payload.name){ showToast("Please enter a product name."); return; }
  if(!payload.category){ showToast("Please choose or type a category."); return; }
  const res = await fetch("api/manage_product.php", {
    method:"POST", headers:{"Content-Type":"application/json", "X-CSRF-Token": csrfToken}, body: JSON.stringify(payload)
  });
  const data = await res.json();
  if(data.error){ showToast(data.error); return; }
  showToast("Product added");
  await loadCategories();
  loadAdminProducts();
}

/* ---------- orders ---------- */
async function loadAdminOrders(){
  const view = document.getElementById("adminOrdersView");
  view.innerHTML = `<div class="empty-note">Loading orders…</div>`;
  try{
    const res = await fetch("api/admin_orders.php");
    adminOrders = await res.json();
    renderAdminOrders();
  }catch(e){
    view.innerHTML = `<div class="empty-note">Couldn't load orders.</div>`;
  }
}
// Builds a wa.me link with the order details pre-filled, so clicking it opens
// WhatsApp with a message ready to send to the customer — one click, no API,
// no signup needed. (True automatic sending needs the official WhatsApp
// Business API — see the README for that path if you want it later.)
function buildWhatsAppLink(order){
  const methodLabels = {easypaisa:"EasyPaisa", jazzcash:"JazzCash", bank:"Bank Transfer", cod:"Cash on Delivery"};
  const digitsOnly = (order.customer_phone || "").replace(/\D/g, "");
  const itemsList = order.items.map(i => `- ${i.qty} x ${i.name}`).join("\n");
  const message =
    `Hi ${order.customer_name}, this is the IHA Online Shop team!\n\n` +
    `Your order ${order.id} has been received.\n\n` +
    `${itemsList}\n\n` +
    `Total: Rs ${parseFloat(order.total).toFixed(2)}\n` +
    `Payment: ${methodLabels[order.payment_method] || order.payment_method}\n` +
    `Status: ${order.status}\n\n` +
    `Track it anytime at: [your site link]/track-order.html\n` +
    `Thank you for shopping with us!`;
  return `https://wa.me/${digitsOnly}?text=${encodeURIComponent(message)}`;
}

function renderAdminOrders(){
  const view = document.getElementById("adminOrdersView");
  if(!adminOrders || adminOrders.length===0){
    view.innerHTML = `<div class="empty-note">No orders yet.</div>`;
    return;
  }
  const statuses = ["Pending","Processing","Shipped","Delivered","Cancelled"];
  const paymentStatuses = ["Unpaid","Pending Confirmation","Paid","Refunded"];
  const methodLabels = {easypaisa:"EasyPaisa", jazzcash:"JazzCash", bank:"Bank Transfer", cod:"Cash on Delivery"};
  view.innerHTML = adminOrders.map(o=>`
    <div class="order-row">
      <div class="order-row-top">
        <span>${escapeHtml(o.id)} · ${escapeHtml(o.customer_name)}</span>
        <select data-order-id="${o.id}" class="order-status-select">
          ${statuses.map(s=>`<option value="${s}" ${s===o.status?'selected':''}>${s}</option>`).join("")}
        </select>
      </div>
      <div style="font-size:12px;color:var(--ink-soft);margin-bottom:6px;">${escapeHtml(o.customer_phone)} · ${new Date(o.created_at).toLocaleString()}</div>
      <div style="font-size:12px;margin-bottom:8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <span class="status-badge">${escapeHtml(methodLabels[o.payment_method] || o.payment_method)}</span>
        ${o.payment_reference ? `<span class="mono" style="font-size:11px;">Ref: ${escapeHtml(o.payment_reference)}</span>` : ""}
        ${o.payment_screenshot
          ? `<a href="${escapeHtml(o.payment_screenshot)}" target="_blank" rel="noopener" class="small-btn save-btn" style="text-decoration:none;">🖼️ View Screenshot</a>`
          : (o.payment_method !== "cod" ? `<span class="mono" style="font-size:11px;color:var(--rose-deep);">No screenshot</span>` : "")}
        <select data-order-id="${o.id}" class="payment-status-select">
          ${paymentStatuses.map(s=>`<option value="${s}" ${s===o.payment_status?'selected':''}>${s}</option>`).join("")}
        </select>
      </div>
      ${o.items.map(i=>`<div style="font-size:12px;">${i.qty} × ${escapeHtml(i.name)}</div>`).join("")}
      <div class="mono" style="margin-top:6px;font-weight:700;">Total: Rs ${parseFloat(o.total).toFixed(2)}</div>
      <a href="${buildWhatsAppLink(o)}" target="_blank" rel="noopener" class="whatsapp-btn">💬 Notify on WhatsApp</a>
    </div>`).join("");

  view.querySelectorAll(".order-status-select").forEach(sel=>{
    sel.addEventListener("change", async ()=>{
      const orderId = sel.getAttribute("data-order-id");
      const res = await fetch("api/update_order_status.php", {
        method:"POST", headers:{"Content-Type":"application/json", "X-CSRF-Token": csrfToken},
        body: JSON.stringify({order_id: orderId, status: sel.value})
      });
      const data = await res.json();
      if(data.error) showToast(data.error);
      else showToast("Order status updated");
    });
  });
  view.querySelectorAll(".payment-status-select").forEach(sel=>{
    sel.addEventListener("change", async ()=>{
      const orderId = sel.getAttribute("data-order-id");
      const res = await fetch("api/update_order_status.php", {
        method:"POST", headers:{"Content-Type":"application/json", "X-CSRF-Token": csrfToken},
        body: JSON.stringify({order_id: orderId, payment_status: sel.value})
      });
      const data = await res.json();
      if(data.error) showToast(data.error);
      else showToast("Payment status updated");
    });
  });
}

document.addEventListener("DOMContentLoaded", async ()=>{
  const isAdmin = await checkAdminSession();
  if(isAdmin) showDashboard();
});
