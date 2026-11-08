/* ================= PRODUCT LISTING + ADVANCED FILTERS =================
   Each page sets window.PAGE_CATEGORY:
     - a single category name (e.g. "Jewelry") to lock that page to it, or
     - "all" to let the sidebar's category checkboxes control it (shop.html) */

let __filters = {
  categories: [],   // only used when PAGE_CATEGORY === "all"
  search: "",
  minPrice: "",
  maxPrice: "",
  sort: ""
};

async function fetchProducts(){
  const params = new URLSearchParams();

  if (window.PAGE_CATEGORY && window.PAGE_CATEGORY !== "all") {
    params.set("category", window.PAGE_CATEGORY);
  } else if (__filters.categories.length > 0) {
    params.set("category", __filters.categories.join(","));
  }
  if (__filters.search) params.set("search", __filters.search);
  if (__filters.minPrice !== "") params.set("min_price", __filters.minPrice);
  if (__filters.maxPrice !== "") params.set("max_price", __filters.maxPrice);
  if (__filters.sort) params.set("sort", __filters.sort);

  const res = await fetch("api/get_products.php?" + params.toString());
  if(!res.ok) throw new Error("Failed to load products");
  return await res.json();
}

function renderProductGrid(products, containerId){
  const grid = document.getElementById(containerId || "productGrid");
  if(!grid) return;
  const countEl = document.getElementById("resultsCount");
  if(countEl) countEl.textContent = products.length + (products.length===1 ? " product" : " products");

  if(!products || products.length===0){
    grid.innerHTML = `<div class="empty-note">No products match — try widening your filters.</div>`;
    return;
  }
  grid.innerHTML = products.map(p=>{
    const stock = parseInt(p.stock);
    const outOfStock = stock<=0;
    const lowStock = stock>0 && stock<=3;
    return `
    <div class="product-card">
      <img src="${p.image}" alt="${escapeHtml(p.name)}" loading="lazy">
      <div class="product-body">
        <div class="product-cat">${escapeHtml(p.category)}</div>
        <h3>${escapeHtml(p.name)}</h3>
        <div class="price-tag">Rs ${parseFloat(p.price).toFixed(2)}</div>
        <div class="stock-note ${lowStock?'low':''}">${outOfStock ? 'Out of stock' : (lowStock ? 'Only '+stock+' left' : stock+' in stock')}</div>
        <button class="add-btn" ${outOfStock?'disabled':''} data-id="${p.id}">${outOfStock?'Sold Out':'Add to Cart'}</button>
      </div>
    </div>`;
  }).join("");

  grid.querySelectorAll(".add-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-id");
      const product = products.find(p=>String(p.id)===String(id));
      if(product) addToCart(product, 1);
    });
  });
}

async function loadAndRenderProducts(){
  const grid = document.getElementById("productGrid");
  if(!grid) return;
  grid.innerHTML = `<div class="empty-note">Loading products…</div>`;
  try{
    const products = await fetchProducts();
    renderProductGrid(products, "productGrid");
  }catch(e){
    grid.innerHTML = `<div class="empty-note">Couldn't load products. Check that api/config.php has the correct database details.</div>`;
  }
}

/* ---------- sidebar wiring (shared by category pages + shop.html) ---------- */
function initFilterSidebar(){
  const searchInput = document.getElementById("searchInput");
  if(searchInput){
    let debounce;
    searchInput.addEventListener("input", (e)=>{
      __filters.search = e.target.value;
      clearTimeout(debounce);
      debounce = setTimeout(loadAndRenderProducts, 250);
    });
  }

  const sortSelect = document.getElementById("sortSelect");
  if(sortSelect){
    sortSelect.addEventListener("change", ()=>{
      __filters.sort = sortSelect.value;
      loadAndRenderProducts();
    });
  }

  const applyBtn = document.getElementById("applyFiltersBtn");
  if(applyBtn){
    applyBtn.addEventListener("click", ()=>{
      document.querySelectorAll(".category-checkbox:checked").forEach(()=>{});
      __filters.categories = Array.from(document.querySelectorAll(".category-checkbox:checked")).map(cb=>cb.value);
      __filters.minPrice = document.getElementById("minPriceInput") ? document.getElementById("minPriceInput").value : "";
      __filters.maxPrice = document.getElementById("maxPriceInput") ? document.getElementById("maxPriceInput").value : "";
      loadAndRenderProducts();
      const sidebar = document.getElementById("filterSidebar");
      if(sidebar) sidebar.classList.remove("open");
    });
  }

  const clearBtn = document.getElementById("clearFiltersBtn");
  if(clearBtn){
    clearBtn.addEventListener("click", ()=>{
      document.querySelectorAll(".category-checkbox").forEach(cb=>cb.checked=false);
      if(document.getElementById("minPriceInput")) document.getElementById("minPriceInput").value = "";
      if(document.getElementById("maxPriceInput")) document.getElementById("maxPriceInput").value = "";
      if(sortSelect) sortSelect.value = "";
      __filters = {categories:[], search: __filters.search, minPrice:"", maxPrice:"", sort:""};
      loadAndRenderProducts();
    });
  }

  const mobileToggle = document.getElementById("mobileFilterToggle");
  if(mobileToggle){
    mobileToggle.addEventListener("click", ()=>{
      document.getElementById("filterSidebar").classList.toggle("open");
    });
  }
}

async function loadCategoryCheckboxes(){
  const container = document.getElementById("categoryCheckboxList");
  if(!container) return; // only present on shop.html
  try{
    const res = await fetch("api/get_categories.php");
    const categories = await res.json();
    container.innerHTML = categories.map(c=>`
      <label class="filter-checkbox"><input type="checkbox" class="category-checkbox" value="${escapeHtml(c)}"> ${escapeHtml(c)}</label>
    `).join("") || `<div class="empty-note" style="padding:10px 0;">No categories yet.</div>`;
  }catch(e){
    container.innerHTML = `<div class="empty-note" style="padding:10px 0;">Couldn't load categories.</div>`;
  }
}

document.addEventListener("DOMContentLoaded", ()=>{
  initFilterSidebar();
  loadCategoryCheckboxes();
  loadAndRenderProducts();
});
