document.getElementById("trackBtn").addEventListener("click", async ()=>{
  const id = document.getElementById("trackInput").value.trim();
  const resultDiv = document.getElementById("trackResult");
  if(!id){ resultDiv.innerHTML = `<p class="form-note">Enter an order ID above.</p>`; return; }
  resultDiv.innerHTML = `<p class="form-note">Looking up order…</p>`;
  try{
    const res = await fetch("api/track_order.php?id=" + encodeURIComponent(id));
    const data = await res.json();
    if(!res.ok || data.error){
      resultDiv.innerHTML = `<p class="form-note">${data.error || "No order found with that ID."}</p>`;
      return;
    }
    const order = data;
    const methodLabels = {easypaisa:"EasyPaisa", jazzcash:"JazzCash", bank:"Bank Transfer", cod:"Cash on Delivery"};
    resultDiv.innerHTML = `
      <div class="order-row">
        <div class="order-row-top"><span>${escapeHtml(order.id)}</span><span class="status-badge">${escapeHtml(order.status)}</span></div>
        <div style="font-size:12px;color:var(--ink-soft);margin-bottom:8px;">${new Date(order.created_at).toLocaleString()}</div>
        <div style="font-size:12px;margin-bottom:8px;">
          Payment: <strong>${escapeHtml(methodLabels[order.payment_method] || order.payment_method)}</strong>
          · <span class="status-badge">${escapeHtml(order.payment_status)}</span>
        </div>
        ${order.items.map(i=>`<div style="font-size:13px;">${i.qty} × ${escapeHtml(i.name)} — Rs ${(i.price*i.qty).toFixed(2)}</div>`).join("")}
        <div class="mono" style="margin-top:8px;font-weight:700;">Total: Rs ${parseFloat(order.total).toFixed(2)}</div>
      </div>`;
  }catch(e){
    resultDiv.innerHTML = `<p class="form-note">Couldn't reach the server.</p>`;
  }
});

document.getElementById("trackInput").addEventListener("keydown", (e)=>{
  if(e.key === "Enter") document.getElementById("trackBtn").click();
});
