let selectedPaymentMethod = "cod";
let paymentInfo = {};

async function loadPaymentInfo(){
  try{
    const res = await fetch("api/payment_info.php");
    paymentInfo = await res.json();
  }catch(e){ paymentInfo = {}; }
}

function renderPaymentDetails(method){
  const box = document.getElementById("paymentDetailsBox");
  const refField = document.getElementById("paymentRefField");
  const screenshotField = document.getElementById("paymentScreenshotField");
  const info = paymentInfo[method];
  if(!info || method === "cod"){
    box.classList.remove("show");
    box.innerHTML = "";
    refField.style.display = "none";
    screenshotField.style.display = "none";
    return;
  }
  refField.style.display = "block";
  screenshotField.style.display = "block";
  if(method === "bank"){
    box.innerHTML = `
      <div><strong>${info.bank_name || "Bank"}</strong></div>
      <div>Account Title: ${info.account_title || ""}</div>
      <div>Account Number: <span class="mono">${info.account_number || ""}</span></div>`;
  } else {
    box.innerHTML = `
      <div><strong>${info.label}</strong></div>
      <div>Send to: <span class="mono">${info.number || ""}</span></div>
      <div>Account Title: ${info.account_title || ""}</div>`;
  }
  box.classList.add("show");
}

document.getElementById("paymentOptions").addEventListener("click", (e)=>{
  const option = e.target.closest(".payment-option");
  if(!option) return;
  document.querySelectorAll(".payment-option").forEach(o=>o.classList.remove("selected"));
  option.classList.add("selected");
  selectedPaymentMethod = option.getAttribute("data-method");
  renderPaymentDetails(selectedPaymentMethod);
});

function renderCartPage(){
  const cart = getCart();
  const container = document.getElementById("cartItems");
  if(cart.length===0){
    container.innerHTML = `<div class="empty-note">Your cart is empty. <a href="index.html">Go find something lovely.</a></div>`;
  } else {
    container.innerHTML = cart.map(item=>`
      <div class="cart-item">
        <img src="${item.image}" alt="${escapeHtml(item.name)}">
        <div class="cart-item-info">
          <h4>${escapeHtml(item.name)}</h4>
          <div class="mono" style="font-size:12px;">Rs ${item.price.toFixed(2)}</div>
          <div class="qty-row">
            <button data-action="dec" data-id="${item.product_id}">−</button>
            <span>${item.qty}</span>
            <button data-action="inc" data-id="${item.product_id}">+</button>
          </div>
          <button class="remove-link" data-action="remove" data-id="${item.product_id}">Remove</button>
        </div>
      </div>`).join("");

    container.querySelectorAll("button[data-action]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id = btn.getAttribute("data-id");
        const action = btn.getAttribute("data-action");
        if(action==="inc") changeCartQty(id, 1);
        else if(action==="dec") changeCartQty(id, -1);
        else if(action==="remove") removeFromCart(id);
        renderCartPage();
      });
    });
  }
  const subtotal = cartSubtotal();
  document.getElementById("cartSubtotal").textContent = "Rs "+subtotal.toFixed(2);
  document.getElementById("checkoutToggleBtn").disabled = cart.length===0;
}

document.getElementById("checkoutToggleBtn").addEventListener("click", ()=>{
  if(getCart().length===0) return;
  document.getElementById("checkoutTotal").textContent = "Rs "+cartSubtotal().toFixed(2);
  document.getElementById("checkoutPanel").style.display = "block";
  document.getElementById("checkoutPanel").scrollIntoView({behavior:"smooth"});
});

document.getElementById("placeOrderBtn").addEventListener("click", async ()=>{
  const name = document.getElementById("custName").value.trim();
  const phone = document.getElementById("custPhone").value.trim();
  const address = document.getElementById("custAddress").value.trim();
  const email = document.getElementById("custEmail").value.trim();
  if(!name || !phone || !address){ showToast("Please fill in name, phone and address."); return; }
  const cart = getCart();
  if(cart.length===0){ showToast("Your cart is empty."); return; }

  // Screenshot is mandatory for EasyPaisa/JazzCash/Bank — not for Cash on Delivery
  const screenshotInput = document.getElementById("paymentScreenshot");
  const screenshotFile = screenshotInput.files[0] || null;
  if(selectedPaymentMethod !== "cod" && !screenshotFile){
    showToast("Please attach a screenshot of your payment before placing the order.");
    screenshotInput.focus();
    return;
  }

  const btn = document.getElementById("placeOrderBtn");
  btn.disabled = true; btn.textContent = "Placing order…";

  try{
    const res = await fetch("api/place_order.php", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        items: cart.map(i=>({product_id:i.product_id, qty:i.qty})),
        customer: {name, phone, address, email},
        payment_method: selectedPaymentMethod,
        payment_reference: document.getElementById("paymentReference").value.trim()
      })
    });
    const data = await res.json();
    if(!res.ok || data.error){
      showToast(data.error || "Something went wrong. Please review your cart.");
      btn.disabled = false; btn.textContent = "Place Order";
      return;
    }

    // Order is placed — now upload the screenshot if one was required/provided.
    // If this upload fails for any reason, the order itself is still valid;
    // we just let the customer know to send it another way as a fallback.
    if(screenshotFile){
      try{
        const formData = new FormData();
        formData.append("order_id", data.order_id);
        formData.append("screenshot", screenshotFile);
        const uploadRes = await fetch("api/upload_payment_proof.php", { method: "POST", body: formData });
        const uploadData = await uploadRes.json();
        if(!uploadRes.ok || uploadData.error){
          showToast("Order placed, but the screenshot upload failed — please send it to us on WhatsApp instead.");
        }
      }catch(e){
        showToast("Order placed, but the screenshot upload failed — please send it to us on WhatsApp instead.");
      }
    }

    clearCart();
    document.getElementById("confirmOrderId").textContent = data.order_id;
    document.getElementById("checkoutPanel").style.display = "none";
    document.querySelector(".panel").style.display = "none"; // hide cart panel too
    document.getElementById("confirmPanel").style.display = "block";
    document.getElementById("confirmPanel").scrollIntoView({behavior:"smooth"});
  }catch(e){
    showToast("Couldn't reach the server. Check your database connection.");
    btn.disabled = false; btn.textContent = "Place Order";
  }
});

document.addEventListener("DOMContentLoaded", ()=>{
  renderCartPage();
  loadPaymentInfo();
});
