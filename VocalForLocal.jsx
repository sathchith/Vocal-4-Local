import { useState, useEffect, useMemo } from "react";
import {
  Search, MapPin, Phone, Plus, ArrowLeft, Truck, X, Check,
  Navigation, Store, Trash2, ShoppingBag, ChevronRight, Minus, Settings, Pencil, ShoppingCart, Clock,
  Copy, RotateCcw, Lock, KeyRound, LogOut, Eye, User
} from "lucide-react";

// ---------- Seed data ----------
const SEED_SHOPS = [
  {
    id: "s1",
    name: "Krishna Kirana Store",
    area: "Jayanagar 4th Block",
    address: "12, 1st Main Road, Jayanagar 4th Block",
    phone: "9844011223",
    pin: "1111",
    items: [
      { id: "i1", name: "Toor Dal (1kg)", price: 145 },
      { id: "i2", name: "Sunflower Oil (1L)", price: 168 },
      { id: "i3", name: "Basmati Rice (1kg)", price: 98 },
      { id: "i4", name: "Atta (5kg)", price: 245 },
    ],
  },
  {
    id: "s2",
    name: "Anand Fresh Vegetables",
    area: "Jayanagar 4th Block",
    address: "Opp. Bus Stand, Jayanagar 4th Block",
    phone: "9844055667",
    pin: "2222",
    items: [
      { id: "i5", name: "Tomato (1kg)", price: 32 },
      { id: "i6", name: "Onion (1kg)", price: 28 },
      { id: "i7", name: "Toor Dal (1kg)", price: 152 },
      { id: "i8", name: "Potato (1kg)", price: 24 },
    ],
  },
  {
    id: "s3",
    name: "Sri Ganesh Stationery",
    area: "Banashankari",
    address: "3rd Cross, Banashankari 2nd Stage",
    phone: "9900112233",
    pin: "3333",
    items: [
      { id: "i9", name: "A4 Notebook", price: 45 },
      { id: "i10", name: "Blue Ballpoint Pen", price: 10 },
      { id: "i11", name: "Sunflower Oil (1L)", price: 175 },
    ],
  },
  {
    id: "s4",
    name: "Lakshmi General Store",
    area: "Banashankari",
    address: "Main Road, Banashankari 1st Stage",
    phone: "9900445566",
    pin: "4444",
    items: [
      { id: "i12", name: "Basmati Rice (1kg)", price: 92 },
      { id: "i13", name: "Toor Dal (1kg)", price: 140 },
      { id: "i14", name: "Atta (5kg)", price: 238 },
      { id: "i15", name: "Tomato (1kg)", price: 30 },
    ],
  },
];

const AREAS = (shops) => Array.from(new Set(shops.map((s) => s.area)));

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;700&display=swap');`;

// ---------- Storage helpers ----------
// All of these are defensive: if window.storage is missing, slow, or errors
// in any way, they fall back to safe in-memory defaults instead of ever
// throwing — so the app can never get stuck on the loading screen.
function hasStorage() {
  return typeof window !== "undefined" && window.storage && typeof window.storage.get === "function";
}

async function loadShops() {
  if (!hasStorage()) return SEED_SHOPS;
  const attempts = 3;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await window.storage.get("vfl:shops");
      if (res && res.value) {
        const parsed = JSON.parse(res.value);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
      // A clean response with no data means the key genuinely doesn't exist
      // yet (first run) — no need to keep retrying that case.
      break;
    } catch (e) {
      // Read error — could be a transient/startup race rather than missing
      // data, so retry briefly before giving up. We NEVER write seed data
      // back here; only explicit add/edit/delete actions are allowed to write.
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 400));
    }
  }
  return SEED_SHOPS;
}

async function saveShops(shops) {
  if (!hasStorage()) return;
  const attempts = 2;
  for (let i = 0; i < attempts; i++) {
    try {
      await window.storage.set("vfl:shops", JSON.stringify(shops));
      return;
    } catch (e) {
      console.error("Could not save shops (attempt " + (i + 1) + ")", e);
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 350));
    }
  }
}

async function loadLog() {
  if (!hasStorage()) return [];
  try {
    const res = await window.storage.get("vfl:log");
    if (res && res.value) {
      const parsed = JSON.parse(res.value);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    /* key not found or read error -> default to empty log */
  }
  return [];
}

async function saveLog(log) {
  if (!hasStorage()) return;
  try {
    await window.storage.set("vfl:log", JSON.stringify(log));
  } catch (e) {
    console.error("Could not save log", e);
  }
}

async function loadCustomer() {
  if (!hasStorage()) return null;
  try {
    const res = await window.storage.get("vfl:customer");
    if (res && res.value) {
      const parsed = JSON.parse(res.value);
      if (parsed && parsed.name && parsed.phone) return parsed;
    }
  } catch (e) {
    /* not logged in yet */
  }
  return null;
}

async function saveCustomer(customer) {
  if (!hasStorage()) return;
  try {
    await window.storage.set("vfl:customer", JSON.stringify(customer));
  } catch (e) {
    console.error("Could not save customer", e);
  }
}

function PriceTag({ value }) {
  return (
    <span className="price-tag">
      <span className="price-tag-hole" />
      ₹{value}
    </span>
  );
}

// ---------- Checkout sheet: porter vs pickup choice at order time ----------
function CheckoutSheet({ shop, lines, total, customer, onConfirm, onClose, showToast }) {
  const [fulfillment, setFulfillment] = useState("pickup");
  const [deliveryAddress, setDeliveryAddress] = useState(customer ? customer.address || "" : "");

  function handleConfirm() {
    if (fulfillment === "porter" && !deliveryAddress.trim()) {
      showToast("Please enter a delivery address for porter delivery.", "error");
      return;
    }
    onConfirm({ fulfillment, deliveryAddress: fulfillment === "porter" ? deliveryAddress.trim() : null });
  }

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <p>Confirm your order</p>
          <button type="button" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <p className="log-shop">{shop.name}</p>
        <p className="log-detail">{lines.map((l) => `${l.name} ×${l.qty}`).join(", ")}</p>
        <p className="log-total" style={{ marginBottom: 14 }}>₹{total}</p>

        <p className="form-sub-label">How would you like to receive it?</p>
        <div className="fulfillment-toggle" style={{ marginBottom: 12 }}>
          <button
            type="button"
            className={fulfillment === "pickup" ? "fulfillment-btn-active" : "fulfillment-btn"}
            onClick={() => setFulfillment("pickup")}
          >
            <MapPin size={14} /> I'll collect it
          </button>
          <button
            type="button"
            className={fulfillment === "porter" ? "fulfillment-btn-active" : "fulfillment-btn"}
            onClick={() => setFulfillment("porter")}
          >
            <Truck size={14} /> Porter delivery
          </button>
        </div>

        {fulfillment === "porter" && (
          <label>Delivery address
            <textarea
              rows={2}
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Street, landmark, locality"
            />
          </label>
        )}

        <button type="button" className="primary-btn full-width" style={{ marginTop: 14 }} onClick={handleConfirm}>
          <ShoppingBag size={16} /> Place order
        </button>
      </div>
    </div>
  );
}

// ---------- Customer login ----------
function CustomerLoginSheet({ onSubmit, onClose, showToast }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  function handleContinue() {
    if (!name.trim() || !phone.trim()) {
      showToast("Please enter your name and phone number to continue.", "error");
      return;
    }
    onSubmit({ name: name.trim(), phone: phone.trim(), address: address.trim() });
  }

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <p>Log in to place your order</p>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <p className="empty-sub backup-hint">
          Your details are saved so you only need to fill this in once.
        </p>
        <label>Your name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Asha Rao" />
        </label>
        <label>Phone number
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit number" inputMode="tel" />
        </label>
        <label>Delivery address <span style={{fontWeight:400,color:"#ABA08E"}}>(optional)</span>
          <textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, landmark, locality" />
        </label>
        <button type="button" className="primary-btn" onClick={handleContinue}>
          <User size={16} /> Continue
        </button>
      </div>
    </div>
  );
}

function BottomNav({ view, setView, cartCount }) {
  const items = [
    { key: "search", label: "Search", icon: Search },
    { key: "cart", label: "Cart", icon: ShoppingCart },
    { key: "owner", label: "Owner", icon: KeyRound },
    { key: "admin", label: "Admin", icon: Settings },
    { key: "log", label: "Activity", icon: ShoppingBag },
  ];
  return (
    <nav className="bottom-nav">
      {items.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          onClick={() => setView(key)}
          className={`nav-btn ${view === key ? "nav-btn-active" : ""}`}
        >
          <span className="nav-icon-wrap">
            <Icon size={20} strokeWidth={2.2} />
            {key === "cart" && cartCount > 0 && (
              <span className="nav-badge">{cartCount > 9 ? "9+" : cartCount}</span>
            )}
          </span>
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

function Header({ title, subtitle, onBack }) {
  return (
    <div className="header">
      {onBack && (
        <button onClick={onBack} className="back-btn" aria-label="Go back">
          <ArrowLeft size={20} />
        </button>
      )}
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
    </div>
  );
}

// ---------- Search view ----------
function SearchView({ shops, onOpenShop }) {
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("All areas");
  const areas = ["All areas", ...AREAS(shops)];

  const results = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.trim().toLowerCase();
    const rows = [];
    shops.forEach((shop) => {
      if (area !== "All areas" && shop.area !== area) return;
      shop.items.forEach((item) => {
        if (item.name.toLowerCase().includes(q)) {
          rows.push({ shop, item });
        }
      });
    });
    rows.sort((a, b) => a.item.price - b.item.price);
    return rows;
  }, [query, shops, area]);

  return (
    <div className="screen">
      <div className="hero">
        <p className="eyebrow">Vocal for Local</p>
        <h1 className="hero-title">Find it near you,<br />buy it from next door.</h1>
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for an item — e.g. Toor Dal"
            className="search-input"
          />
          {query && (
            <button onClick={() => setQuery("")} className="clear-btn" aria-label="Clear search">
              <X size={16} />
            </button>
          )}
        </div>
        <select value={area} onChange={(e) => setArea(e.target.value)} className="area-select">
          {areas.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      {results === null && (
        <>
          <p className="section-label">Shops near you</p>
          <div className="shop-list">
            {shops
              .filter((s) => area === "All areas" || s.area === area)
              .map((shop) => (
                <button key={shop.id} className="shop-card" onClick={() => onOpenShop(shop.id)}>
                  <div className="shop-card-icon"><Store size={18} /></div>
                  <div className="shop-card-body">
                    <p className="shop-card-name">{shop.name}</p>
                    <p className="shop-card-area">{shop.area} · {shop.items.length} items listed</p>
                  </div>
                  <ChevronRight size={18} className="chevron" />
                </button>
              ))}
          </div>
        </>
      )}

      {results !== null && (
        <>
          <p className="section-label">
            {results.length} {results.length === 1 ? "result" : "results"} for "{query}"
          </p>
          {results.length === 0 && (
            <div className="empty-state">
              <p>No shop nearby has listed this yet.</p>
              <p className="empty-sub">Try a different item, or check another area.</p>
            </div>
          )}
          <div className="result-list">
            {results.map(({ shop, item }, idx) => (
              <button key={shop.id + item.id} className="result-card" onClick={() => onOpenShop(shop.id)}>
                <div className="result-rank">{idx === 0 ? "Best price" : `#${idx + 1}`}</div>
                <div className="result-main">
                  <p className="result-item">{item.name}</p>
                  <p className="result-shop">{shop.name} · {shop.area}</p>
                </div>
                <PriceTag value={item.price} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------- Shop detail view ----------
function ShopDetailView({ shop, onBack, cart, setCart, onPlaceOrder, onRequestPorter, showToast }) {
  const [porterOpen, setPorterOpen] = useState(false);
  const [porterForm, setPorterForm] = useState({ name: "", address: "", phone: "" });

  const shopCart = cart[shop.id] || {};
  const cartCount = Object.values(shopCart).reduce((a, b) => a + b, 0);
  const cartTotal = shop.items.reduce(
    (sum, item) => sum + (shopCart[item.id] || 0) * item.price,
    0
  );

  function changeQty(itemId, delta) {
    setCart((prev) => {
      const current = { ...(prev[shop.id] || {}) };
      const next = Math.max(0, (current[itemId] || 0) + delta);
      if (next === 0) delete current[itemId];
      else current[itemId] = next;
      return { ...prev, [shop.id]: current };
    });
  }

  function handlePlaceOrder() {
    if (cartCount === 0) return;
    const lines = shop.items
      .filter((i) => shopCart[i.id])
      .map((i) => ({ id: i.id, name: i.name, qty: shopCart[i.id], price: i.price }));
    onPlaceOrder(shop, lines, cartTotal);
  }

  function handlePorterSubmit() {
    const missing = [];
    if (!porterForm.name.trim()) missing.push("name");
    if (!porterForm.address.trim()) missing.push("address");
    if (!porterForm.phone.trim()) missing.push("phone number");
    if (missing.length) {
      showToast("Please fill in your " + missing.join(", "), "error");
      return;
    }
    onRequestPorter(shop, porterForm);
    setPorterOpen(false);
    setPorterForm({ name: "", address: "", phone: "" });
    showToast("Porter requested — your delivery will be arranged from " + shop.name + ".", "success");
  }

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    shop.address + ", " + shop.area
  )}`;

  return (
    <div className="screen">
      <Header title={shop.name} subtitle={shop.area} onBack={onBack} />

      <div className="info-card">
        <div className="info-row">
          <MapPin size={16} className="info-icon" />
          <span>{shop.address}</span>
        </div>
        <div className="info-actions">
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="action-chip">
            <Navigation size={15} /> Directions
          </a>
          <a href={`tel:${shop.phone}`} className="action-chip">
            <Phone size={15} /> Call shop
          </a>
        </div>
      </div>

      <p className="section-label">Items &amp; prices</p>
      <div className="item-list">
        {shop.items.map((item) => (
          <div key={item.id} className="item-row">
            <div className="item-row-main">
              <p className="item-name">{item.name}</p>
              <PriceTag value={item.price} />
            </div>
            <div className="qty-control">
              <button onClick={() => changeQty(item.id, -1)} disabled={!shopCart[item.id]} aria-label="Decrease quantity">
                <Minus size={14} />
              </button>
              <span>{shopCart[item.id] || 0}</span>
              <button onClick={() => changeQty(item.id, 1)} aria-label="Increase quantity">
                <Plus size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button className="porter-btn" onClick={() => setPorterOpen(true)}>
        <Truck size={17} /> Request a porter for home delivery
      </button>

      {porterOpen && (
        <div className="sheet-overlay" onClick={() => setPorterOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head">
              <p>Home delivery details</p>
              <button type="button" onClick={() => setPorterOpen(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <label>Your name
              <input value={porterForm.name} onChange={(e) => setPorterForm({ ...porterForm, name: e.target.value })} />
            </label>
            <label>Delivery address
              <textarea rows={2} value={porterForm.address} onChange={(e) => setPorterForm({ ...porterForm, address: e.target.value })} />
            </label>
            <label>Phone number
              <input value={porterForm.phone} onChange={(e) => setPorterForm({ ...porterForm, phone: e.target.value })} />
            </label>
            <button type="button" className="primary-btn" onClick={handlePorterSubmit}>
              <Truck size={16} /> Send porter request
            </button>
          </div>
        </div>
      )}

      {cartCount > 0 && (
        <div className="cart-bar">
          <div>
            <p className="cart-count">{cartCount} item{cartCount > 1 ? "s" : ""}</p>
            <p className="cart-total">₹{cartTotal}</p>
          </div>
          <button className="primary-btn" onClick={handlePlaceOrder}>
            <ShoppingBag size={16} /> Place online order
          </button>
        </div>
      )}
    </div>
  );
}

// ---------- Cart view (dashboard) ----------
function CartView({ shops, cart, setCart, onPlaceOrder, showToast, onOpenShop }) {
  const groups = shops
    .map((shop) => {
      const shopCart = cart[shop.id] || {};
      const lines = shop.items
        .filter((item) => shopCart[item.id])
        .map((item) => ({ ...item, qty: shopCart[item.id] }));
      const total = lines.reduce((sum, l) => sum + l.qty * l.price, 0);
      return { shop, lines, total };
    })
    .filter((g) => g.lines.length > 0);

  const grandTotal = groups.reduce((sum, g) => sum + g.total, 0);
  const totalItems = groups.reduce((sum, g) => sum + g.lines.reduce((s, l) => s + l.qty, 0), 0);

  function changeQty(shopId, itemId, delta) {
    setCart((prev) => {
      const current = { ...(prev[shopId] || {}) };
      const next = Math.max(0, (current[itemId] || 0) + delta);
      if (next === 0) delete current[itemId];
      else current[itemId] = next;
      return { ...prev, [shopId]: current };
    });
  }

  function handlePlaceOrder(group) {
    const lines = group.lines.map((l) => ({ id: l.id, name: l.name, qty: l.qty, price: l.price }));
    onPlaceOrder(group.shop, lines, group.total);
  }

  return (
    <div className="screen">
      <Header
        title="Your cart"
        subtitle={
          totalItems > 0
            ? `${totalItems} item${totalItems > 1 ? "s" : ""} across ${groups.length} shop${groups.length > 1 ? "s" : ""}`
            : "Nothing added yet"
        }
      />

      {groups.length === 0 && (
        <div className="empty-state">
          <p>Your cart is empty.</p>
          <p className="empty-sub">Search for an item and add it from a shop's page.</p>
        </div>
      )}

      <div className="cart-groups">
        {groups.map((group) => (
          <div key={group.shop.id} className="cart-group">
            <button className="cart-group-head" onClick={() => onOpenShop(group.shop.id, "cart")}>
              <Store size={16} />
              <span>{group.shop.name}</span>
              <ChevronRight size={15} className="chevron" />
            </button>
            <div className="item-list">
              {group.lines.map((line) => (
                <div key={line.id} className="item-row">
                  <div className="item-row-main">
                    <p className="item-name">{line.name}</p>
                    <PriceTag value={line.price * line.qty} />
                  </div>
                  <div className="qty-control">
                    <button onClick={() => changeQty(group.shop.id, line.id, -1)} aria-label="Decrease quantity">
                      <Minus size={14} />
                    </button>
                    <span>{line.qty}</span>
                    <button onClick={() => changeQty(group.shop.id, line.id, 1)} aria-label="Increase quantity">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="cart-group-footer">
              <span className="cart-group-total">Subtotal: ₹{group.total}</span>
              <button className="primary-btn" onClick={() => handlePlaceOrder(group)}>
                <ShoppingBag size={15} /> Place order
              </button>
            </div>
          </div>
        ))}
      </div>

      {groups.length > 0 && (
        <div className="cart-grand-total">
          <span>Grand total</span>
          <span>₹{grandTotal}</span>
        </div>
      )}
    </div>
  );
}

// ---------- Admin: orders & porter requests (shop-owner side) ----------
function AdminOrdersView({ log }) {
  const sorted = log.slice().sort((a, b) => b.time - a.time);

  return (
    <>
      <p className="section-label">Orders &amp; porter requests</p>
      <p className="empty-sub backup-hint">
        View-only here. Shop owners update order status from the Shop Owner tab.
      </p>
      {sorted.length === 0 && (
        <div className="empty-state">
          <p>No orders yet.</p>
          <p className="empty-sub">Orders customers place will show up here.</p>
        </div>
      )}
      <div className="log-list">
        {sorted.map((entry) => {
          const StatusIcon = statusIcon(entry);
          return (
            <div key={entry.id} className="log-card">
              <div className={`log-tag ${entry.type === "order" ? "log-tag-order" : "log-tag-porter"}`}>
                {entry.type === "order" ? <ShoppingBag size={13} /> : <Truck size={13} />}
                {entry.type === "order" ? "Online order" : "Porter request"}
              </div>
              <p className="log-shop">{entry.shopName}</p>
              {entry.type === "order" ? (
                <>
                  <p className="log-detail">{entry.lines.map((l) => `${l.name} ×${l.qty}`).join(", ")}</p>
                  <p className="log-total">₹{entry.total}</p>
                  {entry.fulfillment && (
                    <p className="log-detail">
                      Customer wants: {entry.fulfillment === "porter" ? "Porter delivery" : "Self collection"}
                    </p>
                  )}
                </>
              ) : (
                <p className="log-detail">Deliver to {entry.address} · {entry.phone}</p>
              )}
              <div className={`status-row status-row-${entry.status === "completed" ? "done" : entry.status === "ready" ? "ready" : "pending"}`}>
                <StatusIcon size={13} />
                <span>{statusLabel(entry)}</span>
              </div>
              <p className="log-time">{new Date(entry.time).toLocaleString()}</p>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ---------- Admin: backup & restore (manual safety net) ----------
function AdminBackupView({ shops, onRestore, onReloadFromStorage, showToast }) {
  const [importText, setImportText] = useState("");
  const [reloading, setReloading] = useState(false);
  const exportText = JSON.stringify(shops, null, 2);

  function handleCopy() {
    try {
      navigator.clipboard.writeText(exportText);
      showToast("Backup copied to clipboard.", "success");
    } catch (e) {
      showToast("Couldn't copy automatically — tap the box above and copy manually.", "error");
    }
  }

  function handleRestore() {
    try {
      const parsed = JSON.parse(importText);
      if (!Array.isArray(parsed) || !parsed.every((s) => s && s.id && s.name)) {
        throw new Error("not a valid shop list");
      }
      onRestore(parsed);
      showToast("Shops restored from backup.", "success");
      setImportText("");
    } catch (e) {
      showToast("That doesn't look like a valid backup. Paste the exact text you copied earlier.", "error");
    }
  }

  async function handleReload() {
    setReloading(true);
    const found = await onReloadFromStorage();
    setReloading(false);
    if (found > shops.length) {
      showToast(`Found ${found} shops in storage — restored.`, "success");
    } else {
      showToast("Storage check complete — no newer data found there.", "success");
    }
  }

  return (
    <>
      <p className="section-label">Shop data seems off?</p>
      <p className="empty-sub backup-hint">
        Tap this to re-check storage directly — useful if shops vanished after an app update but might still be saved.
      </p>
      <button className="status-btn full-width" onClick={handleReload} disabled={reloading} style={{ marginBottom: 22 }}>
        <RotateCcw size={15} /> {reloading ? "Checking storage…" : "Re-check storage for saved shops"}
      </button>

      <p className="section-label">Export current shops</p>
      <p className="empty-sub backup-hint">
        Copy this somewhere safe (Notes, email to yourself) every so often. If shop data is ever lost after an
        app update, paste it back below to restore everything.
      </p>
      <textarea
        readOnly
        rows={7}
        value={exportText}
        className="backup-textarea"
        onFocus={(e) => e.target.select()}
      />
      <button className="primary-btn full-width" onClick={handleCopy} style={{ marginTop: 10 }}>
        <Copy size={15} /> Copy backup to clipboard
      </button>

      <p className="section-label" style={{ marginTop: 22 }}>Restore from backup</p>
      <textarea
        rows={7}
        value={importText}
        onChange={(e) => setImportText(e.target.value)}
        placeholder="Paste your saved backup JSON here"
        className="backup-textarea"
      />
      <button className="delete-btn full-width" onClick={handleRestore} style={{ marginTop: 10 }}>
        <RotateCcw size={15} /> Restore shops from this backup
      </button>
    </>
  );
}

// ---------- Shop owner view: login + manage own shop's orders ----------
function ShopOwnerView({ shops, log, ownerShopId, onLogin, onLogout, onUpdateEntry, showToast }) {
  const [selectedShopId, setSelectedShopId] = useState(shops[0] ? shops[0].id : "");
  const [pinInput, setPinInput] = useState("");
  const [showPin, setShowPin] = useState(false);

  const ownedShop = shops.find((s) => s.id === ownerShopId);

  if (!ownedShop) {
    function handleLogin() {
      const shop = shops.find((s) => s.id === selectedShopId);
      if (!shop) { showToast("Select a shop first.", "error"); return; }
      if (!pinInput.trim()) { showToast("Enter your shop's PIN.", "error"); return; }
      if (String(shop.pin || "") !== pinInput.trim()) {
        showToast("Incorrect PIN for " + shop.name + ".", "error"); return;
      }
      onLogin(shop.id);
      setPinInput("");
      showToast("Logged in as " + shop.name + ".", "success");
    }

    return (
      <div className="screen">
        <div className="owner-login-hero">
          <div className="owner-login-icon"><KeyRound size={32} /></div>
          <h2 className="owner-login-title">Shop Owner Portal</h2>
          <p className="owner-login-sub">Log in to manage your orders and update their status</p>
        </div>

        <div className="owner-login-card">
          <label className="owner-label">Select your shop
            <select
              value={selectedShopId}
              onChange={(e) => setSelectedShopId(e.target.value)}
              className="owner-select"
            >
              {shops.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>

          <label className="owner-label">Your PIN
            <div className="pin-input-row">
              <input
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Enter 4-digit PIN"
                type={showPin ? "text" : "password"}
                inputMode="numeric"
                className="owner-input"
              />
              <button type="button" onClick={() => setShowPin((p) => !p)} aria-label="Toggle PIN visibility">
                <Eye size={18} />
              </button>
            </div>
          </label>

          <button type="button" className="owner-login-btn" onClick={handleLogin}>
            <KeyRound size={18} /> Log in to my shop
          </button>

          <p className="owner-hint">PINs are set in Admin → Shops when a shop is added or edited.</p>
        </div>
      </div>
    );
  }

  const myOrders = log
    .filter((e) => e.shopId === ownerShopId)
    .slice()
    .sort((a, b) => b.time - a.time);

  const pending = myOrders.filter((e) => e.status === "placed");
  const ready   = myOrders.filter((e) => e.status === "ready");
  const done    = myOrders.filter((e) => e.status === "completed");

  function OrderCard({ entry }) {
    const isPorterFulfilled = entry.type === "porter" || entry.fulfillment === "porter";
    const StatusIcon = statusIcon(entry);

    return (
      <div className="owner-order-card">
        {/* Header row: type tag + time */}
        <div className="owner-order-head">
          <div className={`owner-order-tag ${entry.type === "order" ? "owner-tag-order" : "owner-tag-porter"}`}>
            {entry.type === "order" ? <ShoppingBag size={14} /> : <Truck size={14} />}
            {entry.type === "order" ? "Online order" : "Porter request"}
          </div>
          <span className="owner-order-time">{new Date(entry.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        </div>

        {/* Customer block */}
        <div className="owner-customer-block">
          <p className="owner-customer-name">{entry.customerName || "Unknown customer"}</p>
          <a href={`tel:${entry.customerPhone || ""}`} className="owner-customer-phone">
            <Phone size={15} /> {entry.customerPhone || "—"}
          </a>
          {(entry.customerAddress || (entry.type === "porter" && entry.address)) && (
            <div className="owner-customer-address">
              <MapPin size={14} />
              <span>{entry.customerAddress || entry.address}</span>
            </div>
          )}
        </div>

        <div className="owner-divider" />

        {/* Order items */}
        {entry.type === "order" ? (
          <div className="owner-items-block">
            {entry.lines.map((l) => (
              <div key={l.id} className="owner-item-row">
                <span className="owner-item-name">{l.name}</span>
                <span className="owner-item-right">
                  <span className="owner-item-qty">×{l.qty}</span>
                  <span className="owner-item-price">₹{l.price * l.qty}</span>
                </span>
              </div>
            ))}
            <div className="owner-total-row">
              <span>Total</span>
              <span className="owner-total-amt">₹{entry.total}</span>
            </div>
          </div>
        ) : (
          <p className="owner-porter-note">Porter pickup requested from this shop</p>
        )}

        {/* Delivery type pill */}
        {entry.type === "order" && (
          <div className={`owner-fulfillment-pill ${entry.fulfillment === "porter" ? "owner-pill-porter" : "owner-pill-pickup"}`}>
            {entry.fulfillment === "porter" ? <Truck size={13} /> : <MapPin size={13} />}
            {entry.fulfillment === "porter" ? "Porter delivery" : "Customer will collect"}
          </div>
        )}

        {/* Status row */}
        <div className={`owner-status-row owner-status-${entry.status === "completed" ? "done" : entry.status === "ready" ? "ready" : "pending"}`}>
          <StatusIcon size={14} />
          <span>{statusLabel(entry)}</span>
        </div>

        {/* Action buttons */}
        <div className="owner-actions">
          {entry.type === "order" && entry.status === "placed" && (
            <button className="owner-action-btn owner-action-primary" onClick={() => {
              onUpdateEntry(entry.id, { status: "ready" });
              showToast("Order marked ready — customer notified.", "success");
            }}>
              <Check size={16} /> Mark order ready
            </button>
          )}
          {entry.status !== "completed" && (entry.type === "porter" || entry.status === "ready") && (
            <button className="owner-action-btn owner-action-primary" onClick={() => {
              onUpdateEntry(entry.id, { status: "completed" });
              showToast(isPorterFulfilled ? "Marked collected by porter." : "Marked picked up.", "success");
            }}>
              <Check size={16} /> {isPorterFulfilled ? "Mark collected by porter" : "Mark picked up"}
            </button>
          )}
          {entry.status === "completed" && (
            <button className="owner-action-btn owner-action-secondary" onClick={() =>
              onUpdateEntry(entry.id, { status: entry.type === "order" ? "placed" : "requested" })
            }>
              <RotateCcw size={15} /> Reopen
            </button>
          )}
        </div>
      </div>
    );
  }

  function Section({ title, color, orders }) {
    if (orders.length === 0) return null;
    return (
      <>
        <p className={`owner-section-label owner-section-${color}`}>{title} ({orders.length})</p>
        {orders.map((e) => <OrderCard key={e.id} entry={e} />)}
      </>
    );
  }

  return (
    <div className="screen">
      {/* Shop header */}
      <div className="owner-shop-banner">
        <div className="owner-shop-icon"><Store size={22} /></div>
        <div>
          <p className="owner-shop-name">{ownedShop.name}</p>
          <p className="owner-shop-area">{ownedShop.area}</p>
        </div>
        <button className="owner-logout" onClick={onLogout}>
          <LogOut size={15} /> Log out
        </button>
      </div>

      {/* Stats bar */}
      <div className="owner-stats-bar">
        <div className="owner-stat">
          <span className="owner-stat-num owner-stat-pending">{pending.length}</span>
          <span className="owner-stat-label">New</span>
        </div>
        <div className="owner-stat-divider" />
        <div className="owner-stat">
          <span className="owner-stat-num owner-stat-ready">{ready.length}</span>
          <span className="owner-stat-label">Ready</span>
        </div>
        <div className="owner-stat-divider" />
        <div className="owner-stat">
          <span className="owner-stat-num owner-stat-done">{done.length}</span>
          <span className="owner-stat-label">Completed</span>
        </div>
      </div>

      {myOrders.length === 0 && (
        <div className="empty-state" style={{ marginTop: 40 }}>
          <p>No orders yet.</p>
          <p className="empty-sub">Orders customers place for {ownedShop.name} will appear here.</p>
        </div>
      )}

      <Section title="New orders" color="pending" orders={pending} />
      <Section title="Ready for collection / delivery" color="ready" orders={ready} />
      <Section title="Completed" color="done" orders={done} />
    </div>
  );
}

// ---------- Admin view: shops / orders / backup ----------
function AdminView({ shops, onAddShop, onUpdateShop, onDeleteShop, onRestoreShops, onReloadFromStorage, log, onUpdateEntry, showToast }) {
  const [section, setSection] = useState("shops"); // 'shops' | 'orders' | 'backup'
  const [mode, setMode] = useState("list"); // 'list' | 'form'
  const [editingId, setEditingId] = useState(null); // null = adding a new shop

  function openNew() {
    setEditingId(null);
    setMode("form");
  }
  function openEdit(id) {
    setEditingId(id);
    setMode("form");
  }
  function closeForm() {
    setMode("list");
    setEditingId(null);
  }

  if (mode === "form") {
    const editingShop = shops.find((s) => s.id === editingId) || null;
    return (
      <ShopForm
        key={editingId || "new"}
        existingShop={editingShop}
        onCancel={closeForm}
        showToast={showToast}
        onSave={(shopData, finalPin) => {
          if (editingShop) {
            onUpdateShop(shopData);
            showToast(shopData.name + " updated.", "success");
          } else {
            onAddShop(shopData);
            showToast(shopData.name + ` added — owner login PIN is ${finalPin}. Share this with them.`, "success");
          }
          closeForm();
        }}
        onDelete={
          editingShop
            ? () => {
                onDeleteShop(editingShop.id);
                showToast(editingShop.name + " removed.", "success");
                closeForm();
              }
            : null
        }
      />
    );
  }

  return (
    <div className="screen">
      <Header title="Admin" subtitle="Shops, orders & backups" />

      <div className="admin-tabs">
        <button className={section === "shops" ? "admin-tab-active" : "admin-tab"} onClick={() => setSection("shops")}>
          Shops
        </button>
        <button className={section === "orders" ? "admin-tab-active" : "admin-tab"} onClick={() => setSection("orders")}>
          Orders
        </button>
        <button className={section === "backup" ? "admin-tab-active" : "admin-tab"} onClick={() => setSection("backup")}>
          Backup
        </button>
      </div>

      {section === "shops" && (
        <>
          <button className="primary-btn full-width" onClick={openNew} style={{ marginBottom: 16 }}>
            <Plus size={16} /> Add a new shop
          </button>
          <p className="section-label">Existing shops</p>
          <div className="shop-list">
            {shops.map((shop) => (
              <button key={shop.id} className="shop-card" onClick={() => openEdit(shop.id)}>
                <div className="shop-card-icon">
                  <Store size={18} />
                </div>
                <div className="shop-card-body">
                  <p className="shop-card-name">{shop.name}</p>
                  <p className="shop-card-area">{shop.area} · {shop.items.length} items listed</p>
                </div>
                <Pencil size={16} className="chevron" />
              </button>
            ))}
            {shops.length === 0 && (
              <div className="empty-state">
                <p>No shops yet.</p>
                <p className="empty-sub">Tap "Add a new shop" to get started.</p>
              </div>
            )}
          </div>
        </>
      )}

      {section === "orders" && <AdminOrdersView log={log} />}

      {section === "backup" && (
        <AdminBackupView
          shops={shops}
          onRestore={onRestoreShops}
          onReloadFromStorage={onReloadFromStorage}
          showToast={showToast}
        />
      )}
    </div>
  );
}

// ---------- Shared shop add/edit form ----------
function ShopForm({ existingShop, onCancel, onSave, onDelete, showToast }) {
  const [name, setName] = useState(existingShop ? existingShop.name : "");
  const [area, setArea] = useState(existingShop ? existingShop.area : "");
  const [address, setAddress] = useState(existingShop ? existingShop.address : "");
  const [phone, setPhone] = useState(existingShop ? existingShop.phone : "");
  const [pin, setPin] = useState(existingShop ? existingShop.pin || "" : "");
  const [showPin, setShowPin] = useState(false);
  const [items, setItems] = useState(
    existingShop && existingShop.items.length
      ? existingShop.items.map((it) => ({ id: it.id, name: it.name, price: String(it.price) }))
      : [{ id: null, name: "", price: "" }]
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  function updateItem(idx, field, value) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  }
  function addItemRow() {
    setItems((prev) => [...prev, { id: null, name: "", price: "" }]);
  }
  function removeItemRow(idx) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleSave() {
    const missing = [];
    if (!name.trim()) missing.push("Shop name");
    if (!area.trim()) missing.push("Area / locality");
    if (!address.trim()) missing.push("Full address");
    if (!phone.trim()) missing.push("Phone number");
    if (missing.length) {
      showToast("Please fill in: " + missing.join(", "), "error");
      return;
    }
    const cleanItems = items
      .filter((it) => it.name.trim() && it.price !== "")
      .map((it, i) => ({
        id: it.id || `item-${Date.now()}-${i}`,
        name: it.name.trim(),
        price: Number(it.price),
      }));
    const finalPin = pin.trim() || String(Math.floor(1000 + Math.random() * 9000));
    onSave({
      id: existingShop ? existingShop.id : `shop-${Date.now()}`,
      name: name.trim(),
      area: area.trim(),
      address: address.trim(),
      phone: phone.trim(),
      pin: finalPin,
      items: cleanItems,
    }, finalPin);
  }

  function handleDeleteClick() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      showToast("Tap delete once more to confirm.", "error");
      return;
    }
    onDelete();
  }

  return (
    <div className="screen">
      <Header
        title={existingShop ? "Edit shop" : "Add a shop"}
        subtitle={existingShop ? existingShop.name : "Bring a local shop onto Vocal for Local"}
        onBack={onCancel}
      />
      <div className="form">
        <label>Shop name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Krishna Kirana Store" />
        </label>
        <label>Area / locality
          <input value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Jayanagar 4th Block" />
        </label>
        <label>Full address
          <textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, landmark, locality" />
        </label>
        <label>Phone number
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit number" />
        </label>
        <label>Shop owner login PIN
          <div className="pin-input-row">
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="4-digit PIN (leave blank to auto-generate)"
              type={showPin ? "text" : "password"}
              inputMode="numeric"
            />
            <button type="button" onClick={() => setShowPin((p) => !p)} aria-label="Toggle PIN visibility">
              <Eye size={16} />
            </button>
          </div>
        </label>

        <p className="form-sub-label">Items sold (name &amp; price)</p>
        {items.map((it, idx) => (
          <div key={idx} className="item-input-row">
            <input
              value={it.name}
              onChange={(e) => updateItem(idx, "name", e.target.value)}
              placeholder="Item name"
            />
            <input
              value={it.price}
              onChange={(e) => updateItem(idx, "price", e.target.value)}
              placeholder="₹"
              type="number"
              min="0"
            />
            <button type="button" onClick={() => removeItemRow(idx)} aria-label="Remove item">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <button type="button" className="add-item-btn" onClick={addItemRow}>
          <Plus size={15} /> Add another item
        </button>

        <button type="button" className="primary-btn full-width" onClick={handleSave}>
          <Store size={16} /> {existingShop ? "Save changes" : "Add shop"}
        </button>

        {existingShop && (
          <button type="button" className="delete-btn full-width" onClick={handleDeleteClick}>
            <Trash2 size={16} /> {confirmDelete ? "Tap again to confirm delete" : "Delete this shop"}
          </button>
        )}
      </div>
    </div>
  );
}

// ---------- Activity log view (customer side) ----------
function statusIcon(entry) {
  if (entry.status === "completed") return Check;
  if (entry.status === "ready") return entry.fulfillment === "porter" ? Truck : Store;
  return Clock;
}

function statusLabel(entry) {
  if (entry.type === "porter") {
    return entry.status === "completed" ? "Collected by porter" : "Porter requested — awaiting pickup";
  }
  if (entry.status === "completed") {
    return entry.fulfillment === "porter" ? "Collected by porter & out for delivery" : "Picked up by you";
  }
  if (entry.status === "ready") {
    return entry.fulfillment === "porter" ? "Order ready — waiting for porter pickup" : "Order ready for collection";
  }
  return "Waiting for the shop to prepare your order";
}

function LogView({ log, shops, onUpdateEntry, onDeleteEntry, showToast }) {
  const [editingId, setEditingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  function toggleEdit(id) {
    setConfirmDeleteId(null);
    setEditingId((prev) => (prev === id ? null : id));
  }

  function updateOrderLines(entry, newLines) {
    const total = newLines.reduce((sum, l) => sum + l.qty * l.price, 0);
    if (newLines.length === 0) {
      onDeleteEntry(entry.id);
      setEditingId(null);
      showToast("Order cancelled — no items left.", "success");
      return;
    }
    onUpdateEntry(entry.id, { lines: newLines, total });
  }

  function changeLineQty(entry, itemId, delta) {
    const newLines = entry.lines
      .map((l) => (l.id === itemId ? { ...l, qty: l.qty + delta } : l))
      .filter((l) => l.qty > 0);
    updateOrderLines(entry, newLines);
  }

  function addItemToOrder(entry, item) {
    const existing = entry.lines.find((l) => l.id === item.id);
    const newLines = existing
      ? entry.lines.map((l) => (l.id === item.id ? { ...l, qty: l.qty + 1 } : l))
      : [...entry.lines, { id: item.id, name: item.name, price: item.price, qty: 1 }];
    updateOrderLines(entry, newLines);
  }

  return (
    <div className="screen">
      <Header title="Activity" subtitle="Your orders and porter requests" />
      {log.length === 0 && (
        <div className="empty-state">
          <p>Nothing here yet.</p>
          <p className="empty-sub">Orders and delivery requests will show up here.</p>
        </div>
      )}
      <div className="log-list">
        {log.slice().reverse().map((entry) => {
          const isEditing = editingId === entry.id;
          const StatusIcon = statusIcon(entry);
          const canEdit = entry.type === "order" ? entry.status === "placed" : entry.status === "requested";
          const catalog = entry.type === "order" ? (entry.shopCatalog && entry.shopCatalog.length ? entry.shopCatalog : (shops.find((s) => s.id === entry.shopId) || {}).items || []) : [];
          const availableItems = catalog.filter((it) => !entry.lines.some((l) => l.id === it.id));

          return (
            <div key={entry.id} className="log-card">
              <div className="log-card-top">
                <div className={`log-tag ${entry.type === "order" ? "log-tag-order" : "log-tag-porter"}`}>
                  {entry.type === "order" ? <ShoppingBag size={13} /> : <Truck size={13} />}
                  {entry.type === "order" ? "Online order" : "Porter request"}
                </div>
                {canEdit ? (
                  <button className="edit-icon-btn" onClick={() => toggleEdit(entry.id)} aria-label="Edit entry">
                    <Pencil size={14} />
                  </button>
                ) : (
                  <span className="edit-icon-btn edit-icon-locked" aria-label="Editing closed">
                    <Lock size={13} />
                  </span>
                )}
              </div>

              <p className="log-shop">{entry.shopName}</p>
              {entry.type === "order" ? (
                <>
                  <p className="log-detail">{entry.lines.map((l) => `${l.name} ×${l.qty}`).join(", ")}</p>
                  <p className="log-total">₹{entry.total}</p>
                </>
              ) : (
                <p className="log-detail">Deliver to {entry.address} · {entry.phone}</p>
              )}

              <div className={`status-row status-row-${entry.status === "completed" ? "done" : entry.status === "ready" ? "ready" : "pending"}`}>
                <StatusIcon size={13} />
                <span>{statusLabel(entry)}</span>
              </div>
              <p className="log-time">{new Date(entry.time).toLocaleString()}</p>
              {!canEdit && entry.status !== "completed" && (
                <p className="locked-note">Editing is closed — the shop is already preparing this.</p>
              )}

              {isEditing && canEdit && (
                <div className="log-edit-panel">
                  {entry.type === "order" && (
                    <>
                      <p className="form-sub-label">How will this be collected?</p>
                      <div className="fulfillment-toggle">
                        <button
                          className={entry.fulfillment === "porter" ? "fulfillment-btn-active" : "fulfillment-btn"}
                          onClick={() => onUpdateEntry(entry.id, { fulfillment: "porter" })}
                        >
                          <Truck size={14} /> Porter delivery
                        </button>
                        <button
                          className={entry.fulfillment === "pickup" ? "fulfillment-btn-active" : "fulfillment-btn"}
                          onClick={() => onUpdateEntry(entry.id, { fulfillment: "pickup" })}
                        >
                          <MapPin size={14} /> I'll collect it
                        </button>
                      </div>

                      <p className="form-sub-label">Items in this order</p>
                      <div className="item-list">
                        {entry.lines.map((line) => (
                          <div key={line.id} className="item-row">
                            <div className="item-row-main">
                              <p className="item-name">{line.name}</p>
                              <PriceTag value={line.price * line.qty} />
                            </div>
                            <div className="qty-control">
                              <button onClick={() => changeLineQty(entry, line.id, -1)} aria-label="Decrease quantity">
                                <Minus size={14} />
                              </button>
                              <span>{line.qty}</span>
                              <button onClick={() => changeLineQty(entry, line.id, 1)} aria-label="Increase quantity">
                                <Plus size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {availableItems.length > 0 && (
                        <>
                          <p className="form-sub-label">Add more from {entry.shopName}</p>
                          <div className="add-item-list">
                            {availableItems.map((item) => (
                              <button key={item.id} className="add-item-row" onClick={() => addItemToOrder(entry, item)}>
                                <span>{item.name}</span>
                                <span className="add-item-row-right">
                                  <PriceTag value={item.price} />
                                  <Plus size={14} />
                                </span>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {entry.type === "porter" && (
                    <>
                      <p className="form-sub-label">Delivery address</p>
                      <textarea
                        rows={2}
                        value={entry.address}
                        onChange={(e) => onUpdateEntry(entry.id, { address: e.target.value })}
                      />
                      <p className="form-sub-label">Phone number</p>
                      <input
                        value={entry.phone}
                        onChange={(e) => onUpdateEntry(entry.id, { phone: e.target.value })}
                      />
                    </>
                  )}

                  <div className="log-edit-actions">
                    <button
                      className="update-btn"
                      onClick={() => {
                        setEditingId(null);
                        setConfirmDeleteId(null);
                        showToast((entry.type === "order" ? "Order" : "Request") + " updated.", "success");
                      }}
                    >
                      <Check size={14} /> Update
                    </button>
                    <button
                      className="cancel-btn"
                      onClick={() => {
                        if (confirmDeleteId === entry.id) {
                          onDeleteEntry(entry.id);
                          setConfirmDeleteId(null);
                          setEditingId(null);
                          showToast((entry.type === "order" ? "Order" : "Request") + " cancelled.", "success");
                        } else {
                          setConfirmDeleteId(entry.id);
                          showToast("Tap Cancel once more to confirm — this can't be undone.", "error");
                        }
                      }}
                    >
                      <Trash2 size={14} /> {confirmDeleteId === entry.id ? "Tap to confirm" : "Cancel"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Root app ----------
export default function App() {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("search");
  const [selectedShopId, setSelectedShopId] = useState(null);
  const [returnView, setReturnView] = useState("search");
  const [cart, setCart] = useState({});
  const [log, setLog] = useState([]);
  const [toast, setToast] = useState(null);
  const [ownerShopId, setOwnerShopId] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [pendingOrder, setPendingOrder] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  function showToast(message, kind) {
    setToast({ message, kind: kind || "success", id: Date.now() });
  }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    (async () => {
      try {
        const [s, l, c] = await Promise.all([loadShops(), loadLog(), loadCustomer()]);
        setShops(s && s.length ? s : SEED_SHOPS);
        setLog(l || []);
        setCustomer(c || null);
      } catch (e) {
        console.error("Falling back to seed data:", e);
        setShops(SEED_SHOPS);
        setLog([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function handleAddShop(shop) {
    setShops((prev) => {
      const next = [...prev, shop];
      saveShops(next);
      return next;
    });
  }

  function handleUpdateShop(updatedShop) {
    setShops((prev) => {
      const next = prev.map((s) => (s.id === updatedShop.id ? updatedShop : s));
      saveShops(next);
      return next;
    });
  }

  function handleDeleteShop(shopId) {
    setShops((prev) => {
      const next = prev.filter((s) => s.id !== shopId);
      saveShops(next);
      return next;
    });
    setCart((prev) => {
      const next = { ...prev };
      delete next[shopId];
      return next;
    });
  }

  function handleRestoreShops(restoredShops) {
    setShops(restoredShops);
    saveShops(restoredShops);
  }

  async function handleReloadShopsFromStorage() {
    const found = await loadShops();
    if (Array.isArray(found) && found.length > shops.length) {
      setShops(found);
    }
    return Array.isArray(found) ? found.length : 0;
  }

  function handleOwnerLogin(shopId) {
    setOwnerShopId(shopId);
  }

  function handleOwnerLogout() {
    setOwnerShopId(null);
  }

  function handleOpenShop(id, from) {
    setSelectedShopId(id);
    setReturnView(from || "search");
    setView("shopDetail");
  }

  function placeOrderNow(shop, lines, total, customerInfo, fulfillment, deliveryAddress) {
    const who = customerInfo || customer;
    setLog((prev) => {
      const next = [
        ...prev,
        {
          id: `o-${Date.now()}`,
          type: "order",
          shopId: shop.id,
          shopName: shop.name,
          shopCatalog: shop.items,
          lines,
          total,
          time: Date.now(),
          customerName: who ? who.name : null,
          customerPhone: who ? who.phone : null,
          customerAddress: deliveryAddress || (who ? who.address || null : null),
          fulfillment: fulfillment || "pickup",
          status: "placed",
        },
      ];
      saveLog(next);
      return next;
    });
    setCart((prev) => ({ ...prev, [shop.id]: {} }));
    showToast("Order placed! " + shop.name + " will call you shortly to confirm.", "success");
  }

  function handlePlaceOrder(shop, lines, total) {
    if (!customer) {
      setPendingOrder({ shop, lines, total });
      setLoginOpen(true);
      return;
    }
    // Customer already logged in — go straight to checkout sheet
    setPendingOrder({ shop, lines, total });
    setCheckoutOpen(true);
  }

  function handleCustomerLogin(info) {
    setCustomer(info);
    saveCustomer(info);
    setLoginOpen(false);
    // After login, open checkout sheet (don't place yet — let them choose porter/pickup)
    if (pendingOrder) {
      setCheckoutOpen(true);
    }
  }

  function handleCheckoutConfirm({ fulfillment, deliveryAddress }, customerInfo) {
    const who = customerInfo || customer;
    if (pendingOrder) {
      placeOrderNow(pendingOrder.shop, pendingOrder.lines, pendingOrder.total, who, fulfillment, deliveryAddress);
      setPendingOrder(null);
    }
    setCheckoutOpen(false);
  }

  function handleRequestPorter(shop, form) {
    setLog((prev) => {
      const next = [
        ...prev,
        {
          id: `p-${Date.now()}`,
          type: "porter",
          shopId: shop.id,
          shopName: shop.name,
          ...form,
          time: Date.now(),
          status: "requested", // 'requested' | 'completed'
        },
      ];
      saveLog(next);
      return next;
    });
  }

  function handleUpdateLogEntry(id, updates) {
    setLog((prev) => {
      const next = prev.map((e) => (e.id === id ? { ...e, ...updates } : e));
      saveLog(next);
      return next;
    });
  }

  function handleDeleteLogEntry(id) {
    setLog((prev) => {
      const entry = prev.find((e) => e.id === id);
      const next = prev.filter((e) => e.id !== id);
      saveLog(next);
      if (entry && entry.shopId) {
        setCart((prevCart) => {
          if (!prevCart[entry.shopId]) return prevCart;
          const nextCart = { ...prevCart };
          delete nextCart[entry.shopId];
          return nextCart;
        });
      }
      return next;
    });
  }

  const selectedShop = shops.find((s) => s.id === selectedShopId);
  const cartItemCount = Object.values(cart).reduce(
    (sum, shopCart) => sum + Object.values(shopCart).reduce((s, q) => s + q, 0),
    0
  );

  return (
    <div className="app-root">
      <style>{`
        ${FONT_IMPORT}
        * { box-sizing: border-box; }
        .app-root {
          font-family: 'Inter', sans-serif;
          background: #FFF8ED;
          color: #241C15;
          min-height: 100vh;
          max-width: 480px;
          margin: 0 auto;
          position: relative;
          padding-bottom: 84px;
        }
        .screen { padding: 20px 18px 12px; animation: fadeIn 0.25s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

        .hero { padding: 6px 0 18px; }
        .eyebrow {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #E8650A;
          font-weight: 700;
          margin: 0 0 6px;
        }
        .hero-title {
          font-family: 'Poppins', sans-serif;
          font-weight: 700;
          font-size: 26px;
          line-height: 1.2;
          margin: 0 0 18px;
          color: #241C15;
        }
        .search-box {
          display: flex; align-items: center; gap: 8px;
          background: #FFFFFF;
          border: 2px solid #241C15;
          border-radius: 14px;
          padding: 13px 14px;
          box-shadow: 3px 3px 0 #241C15;
        }
        .search-icon { color: #8A7B68; flex-shrink: 0; }
        .search-input {
          border: none; outline: none; background: transparent;
          font-family: 'Inter', sans-serif; font-size: 15px; flex: 1; color: #241C15;
        }
        .clear-btn { background: #F4EADB; border: none; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #8A7B68; flex-shrink: 0; }
        .area-select {
          margin-top: 10px; width: 100%;
          font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500;
          padding: 9px 12px; border-radius: 10px; border: 1.5px solid #E4D8C3;
          background: #FFFCF6; color: #5C4F3E;
        }

        .section-label {
          font-family: 'Poppins', sans-serif; font-weight: 600; font-size: 13px;
          color: #5C4F3E; margin: 18px 0 10px;
        }

        .shop-list { display: flex; flex-direction: column; gap: 10px; }
        .shop-card {
          display: flex; align-items: center; gap: 12px;
          background: #FFFFFF; border: 1.5px solid #EFE3D0; border-radius: 14px;
          padding: 13px 14px; cursor: pointer; text-align: left; width: 100%;
        }
        .shop-card-icon {
          width: 38px; height: 38px; border-radius: 10px; background: #FCEFD9;
          color: #B5790A; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .shop-card-body { flex: 1; min-width: 0; }
        .shop-card-name { font-family: 'Poppins', sans-serif; font-weight: 600; font-size: 14.5px; margin: 0; color: #241C15; }
        .shop-card-area { font-size: 12.5px; color: #8A7B68; margin: 2px 0 0; }
        .chevron { color: #C9B89A; flex-shrink: 0; }

        .result-list { display: flex; flex-direction: column; gap: 10px; }
        .result-card {
          display: flex; align-items: center; gap: 12px;
          background: #FFFFFF; border: 1.5px solid #EFE3D0; border-radius: 14px;
          padding: 13px 14px; cursor: pointer; text-align: left; width: 100%;
        }
        .result-rank {
          font-family: 'JetBrains Mono', monospace; font-size: 10.5px; font-weight: 700;
          color: #2F6B4F; background: #E4F0E8; padding: 4px 7px; border-radius: 7px; flex-shrink: 0;
        }
        .result-main { flex: 1; min-width: 0; }
        .result-item { font-family: 'Poppins', sans-serif; font-weight: 600; font-size: 14px; margin: 0; color: #241C15; }
        .result-shop { font-size: 12px; color: #8A7B68; margin: 2px 0 0; }

        .price-tag {
          position: relative;
          font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 13px;
          background: #F4B400; color: #241C15;
          padding: 6px 12px 6px 16px;
          clip-path: polygon(10px 0, 100% 0, 100% 100%, 10px 100%, 0 50%);
          flex-shrink: 0;
        }
        .price-tag-hole { position: absolute; left: 4px; top: 50%; transform: translateY(-50%); width: 4px; height: 4px; border-radius: 50%; background: #FFF8ED; }

        .empty-state { text-align: center; padding: 36px 12px; color: #8A7B68; }
        .empty-state p { margin: 0; font-family: 'Poppins', sans-serif; font-weight: 600; font-size: 14px; color: #5C4F3E; }
        .empty-sub { font-family: 'Inter', sans-serif !important; font-weight: 400 !important; font-size: 12.5px !important; color: #ABA08E !important; margin-top: 4px !important; }

        .header { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 6px; }
        .back-btn { background: #FFFFFF; border: 1.5px solid #EFE3D0; border-radius: 10px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; color: #241C15; }
        .header h1 { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 20px; margin: 0; color: #241C15; }
        .header p { font-size: 13px; color: #8A7B68; margin: 2px 0 0; }

        .info-card { background: #FFFFFF; border: 1.5px solid #EFE3D0; border-radius: 14px; padding: 14px; margin: 14px 0; }
        .info-row { display: flex; align-items: flex-start; gap: 8px; font-size: 13.5px; color: #4A4030; }
        .info-icon { color: #E8650A; margin-top: 1px; flex-shrink: 0; }
        .info-actions { display: flex; gap: 8px; margin-top: 12px; }
        .action-chip {
          display: flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 600;
          background: #FCEFD9; color: #B5790A; padding: 8px 12px; border-radius: 10px;
          text-decoration: none; flex: 1; justify-content: center;
        }

        .confirm-banner {
          display: flex; align-items: center; gap: 8px;
          background: #E4F0E8; color: #2F6B4F; font-size: 13px; font-weight: 600;
          padding: 10px 12px; border-radius: 10px; margin: 12px 0;
        }
        .error-banner {
          background: #FCE7E0; color: #C24A1E; font-size: 13px; font-weight: 600;
          padding: 10px 12px; border-radius: 10px; margin: 12px 0;
        }

        .item-list { display: flex; flex-direction: column; gap: 8px; }
        .item-row { background: #FFFFFF; border: 1.5px solid #EFE3D0; border-radius: 12px; padding: 11px 12px; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .item-row-main { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
        .item-name { font-size: 13.5px; font-weight: 500; color: #241C15; margin: 0; flex: 1; }
        .qty-control { display: flex; align-items: center; gap: 8px; background: #FFF8ED; border-radius: 9px; padding: 4px 8px; flex-shrink: 0; }
        .qty-control button { background: #FFFFFF; border: 1px solid #E4D8C3; border-radius: 6px; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #241C15; }
        .qty-control button:disabled { opacity: 0.35; cursor: default; }
        .qty-control span { font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 600; min-width: 14px; text-align: center; }

        .porter-btn {
          display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%;
          background: #2F6B4F; color: #FFFFFF; font-family: 'Poppins', sans-serif; font-weight: 600; font-size: 14px;
          padding: 13px; border-radius: 13px; border: none; margin-top: 18px; cursor: pointer;
        }

        .sheet-overlay { position: fixed; inset: 0; background: rgba(36,28,21,0.45); display: flex; align-items: flex-end; justify-content: center; z-index: 50; }
        .sheet { background: #FFF8ED; width: 100%; max-width: 480px; border-radius: 20px 20px 0 0; padding: 18px; display: flex; flex-direction: column; gap: 12px; }
        .sheet-head { display: flex; align-items: center; justify-content: space-between; }
        .sheet-head p { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 16px; margin: 0; }
        .sheet-head button { background: none; border: none; cursor: pointer; color: #8A7B68; }

        label { display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; font-weight: 600; color: #5C4F3E; }
        label input, label textarea {
          font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 400; color: #241C15;
          border: 1.5px solid #E4D8C3; border-radius: 10px; padding: 10px 12px; background: #FFFFFF; outline: none; resize: none;
        }
        label input:focus, label textarea:focus { border-color: #E8650A; }

        .primary-btn {
          display: flex; align-items: center; justify-content: center; gap: 7px;
          background: #E8650A; color: #FFFFFF; font-family: 'Poppins', sans-serif; font-weight: 600; font-size: 14px;
          padding: 12px 16px; border-radius: 12px; border: none; cursor: pointer; white-space: nowrap;
        }
        .full-width { width: 100%; margin-top: 6px; }
        .delete-btn {
          display: flex; align-items: center; justify-content: center; gap: 7px;
          background: #FFFFFF; color: #C24A1E; font-family: 'Poppins', sans-serif; font-weight: 600; font-size: 13.5px;
          padding: 11px 16px; border-radius: 12px; border: 1.5px solid #F1C9B9; cursor: pointer; margin-top: 4px;
        }

        .log-edit-actions { display: flex; gap: 10px; margin-top: 4px; }
        .update-btn, .cancel-btn {
          flex: 1; display: flex; align-items: center; justify-content: center; gap: 7px;
          font-family: 'Poppins', sans-serif; font-weight: 600; font-size: 13.5px;
          padding: 11px 14px; border-radius: 12px; cursor: pointer;
        }
        .update-btn { background: #2F6B4F; color: #FFFFFF; border: none; }
        .cancel-btn { background: #FFFFFF; color: #C24A1E; border: 1.5px solid #F1C9B9; }

        .form { display: flex; flex-direction: column; gap: 14px; margin-top: 14px; }
        .form-sub-label { font-family: 'Poppins', sans-serif; font-weight: 600; font-size: 13px; color: #5C4F3E; margin: 4px 0 -4px; }
        .item-input-row { display: flex; gap: 8px; align-items: center; }
        .item-input-row input:first-child { flex: 2; }
        .item-input-row input:last-child { flex: 1; }
        .item-input-row button { background: #FCE7E0; border: none; border-radius: 8px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; color: #C24A1E; cursor: pointer; flex-shrink: 0; }
        .add-item-btn {
          display: flex; align-items: center; gap: 6px; justify-content: center;
          background: none; border: 1.5px dashed #E4D8C3; color: #B5790A; font-weight: 600; font-size: 13px;
          padding: 9px; border-radius: 10px; cursor: pointer;
        }

        .pin-input-row { display: flex; gap: 8px; align-items: center; }
        .pin-input-row input { flex: 1; }
        .pin-input-row button { background: #FFF8ED; border: 1.5px solid #E4D8C3; border-radius: 8px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; color: #5C4F3E; cursor: pointer; flex-shrink: 0; }

        .logout-btn {
          display: flex; align-items: center; gap: 6px; font-family: 'Poppins', sans-serif; font-weight: 600; font-size: 12.5px;
          background: #FFFFFF; border: 1.5px solid #EFE3D0; color: #C24A1E; padding: 8px 14px; border-radius: 10px;
          cursor: pointer; margin: 10px 0 18px;
        }

        .cart-bar {
          position: fixed; bottom: 76px; left: 50%; transform: translateX(-50%);
          width: calc(100% - 36px); max-width: 444px;
          background: #241C15; color: #FFFFFF; border-radius: 16px;
          padding: 12px 16px; display: flex; align-items: center; justify-content: space-between;
          box-shadow: 0 8px 24px rgba(36,28,21,0.3); z-index: 40;
        }
        .cart-count { font-size: 11.5px; color: #C9B89A; margin: 0; }
        .cart-total { font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 16px; margin: 1px 0 0; }
        .cart-bar .primary-btn { background: #E8650A; }

        .log-list { display: flex; flex-direction: column; gap: 10px; margin-top: 14px; }
        .log-card { background: #FFFFFF; border: 1.5px solid #EFE3D0; border-radius: 14px; padding: 13px 14px; }
        .log-card-top { display: flex; align-items: center; justify-content: space-between; }
        .log-tag { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; padding: 4px 9px; border-radius: 7px; margin-bottom: 8px; }
        .log-tag-order { background: #FCEFD9; color: #B5790A; }
        .log-tag-porter { background: #E4F0E8; color: #2F6B4F; }
        .edit-icon-btn { background: #FFF8ED; border: 1.5px solid #EFE3D0; border-radius: 8px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #5C4F3E; flex-shrink: 0; }
        .edit-icon-locked { cursor: default; color: #C9B89A; }
        .locked-note { font-size: 11.5px; color: #ABA08E; margin: 6px 0 0; font-style: italic; }

        .owner-customer-row { display: flex; align-items: flex-start; gap: 7px; font-size: 13px; color: #4A4030; margin-top: 5px; }
        .owner-phone { color: #2F6B4F; font-weight: 600; text-decoration: none; }
        .fulfillment-pill {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 11.5px; font-weight: 700; padding: 4px 9px; border-radius: 99px; margin-top: 6px;
        }
        .pill-porter { background: #E4F0E8; color: #2F6B4F; }
        .pill-pickup { background: #FCEFD9; color: #B5790A; }

        /* ---- Owner login screen ---- */
        .owner-login-hero { text-align: center; padding: 36px 0 24px; }
        .owner-login-icon {
          width: 64px; height: 64px; background: #FCEFD9; color: #B5790A;
          border-radius: 18px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;
        }
        .owner-login-title { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 22px; margin: 0 0 8px; color: #241C15; }
        .owner-login-sub { font-size: 14px; color: #8A7B68; margin: 0; }
        .owner-login-card { background: #FFFFFF; border: 1.5px solid #EFE3D0; border-radius: 18px; padding: 22px 18px; display: flex; flex-direction: column; gap: 18px; }
        .owner-label { display: flex; flex-direction: column; gap: 8px; font-family: 'Poppins', sans-serif; font-weight: 600; font-size: 14px; color: #241C15; }
        .owner-select, .owner-input {
          font-family: 'Inter', sans-serif; font-size: 15px; color: #241C15;
          border: 1.5px solid #E4D8C3; border-radius: 12px; padding: 13px 14px; background: #FFFFFF; outline: none;
        }
        .owner-select:focus, .owner-input:focus { border-color: #E8650A; }
        .owner-login-btn {
          display: flex; align-items: center; justify-content: center; gap: 9px;
          background: #E8650A; color: #FFFFFF; font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 16px;
          padding: 15px; border-radius: 14px; border: none; cursor: pointer;
        }
        .owner-hint { font-size: 12.5px; color: #ABA08E; text-align: center; margin: 0; }

        /* ---- Owner dashboard ---- */
        .owner-shop-banner {
          display: flex; align-items: center; gap: 14px;
          background: #241C15; border-radius: 18px; padding: 16px 18px; margin-bottom: 16px;
        }
        .owner-shop-icon {
          width: 48px; height: 48px; background: #FCEFD9; color: #B5790A;
          border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .owner-shop-name { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 17px; margin: 0; color: #FFFFFF; }
        .owner-shop-area { font-size: 12.5px; color: #C9B89A; margin: 2px 0 0; }
        .owner-logout {
          margin-left: auto; display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.2); color: #FFFFFF; border-radius: 10px; padding: 7px 12px;
          font-size: 12.5px; font-weight: 600; cursor: pointer; flex-shrink: 0;
        }

        .owner-stats-bar {
          display: flex; align-items: center; background: #FFFFFF; border: 1.5px solid #EFE3D0;
          border-radius: 14px; padding: 14px 0; margin-bottom: 20px;
        }
        .owner-stat { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; }
        .owner-stat-num { font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 28px; line-height: 1; }
        .owner-stat-label { font-size: 12px; font-weight: 600; color: #8A7B68; }
        .owner-stat-pending { color: #B5790A; }
        .owner-stat-ready { color: #C24A1E; }
        .owner-stat-done { color: #2F6B4F; }
        .owner-stat-divider { width: 1px; background: #EFE3D0; height: 36px; }

        .owner-section-label {
          font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 14px;
          margin: 20px 0 10px; padding: 8px 12px; border-radius: 10px;
        }
        .owner-section-pending { background: #FCEFD9; color: #B5790A; }
        .owner-section-ready { background: #FCE7E0; color: #C24A1E; }
        .owner-section-done { background: #E4F0E8; color: #2F6B4F; }

        .owner-order-card {
          background: #FFFFFF; border: 1.5px solid #EFE3D0; border-radius: 18px;
          padding: 18px; margin-bottom: 14px;
        }
        .owner-order-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
        .owner-order-tag {
          display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700;
          padding: 5px 11px; border-radius: 99px;
        }
        .owner-tag-order { background: #FCEFD9; color: #B5790A; }
        .owner-tag-porter { background: #E4F0E8; color: #2F6B4F; }
        .owner-order-time { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #ABA08E; }

        .owner-customer-block { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
        .owner-customer-name { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 18px; color: #241C15; margin: 0; }
        .owner-customer-phone {
          display: inline-flex; align-items: center; gap: 7px;
          font-size: 16px; font-weight: 600; color: #2F6B4F; text-decoration: none;
        }
        .owner-customer-address { display: flex; align-items: flex-start; gap: 7px; font-size: 14px; color: #5C4F3E; }
        .owner-customer-address svg { flex-shrink: 0; margin-top: 1px; color: #E8650A; }

        .owner-divider { height: 1.5px; background: #F4EADB; margin: 14px 0; }

        .owner-items-block { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
        .owner-item-row { display: flex; align-items: center; justify-content: space-between; }
        .owner-item-name { font-size: 15px; color: #241C15; font-weight: 500; }
        .owner-item-right { display: flex; align-items: center; gap: 10px; }
        .owner-item-qty { font-size: 13px; color: #8A7B68; background: #F4EADB; padding: 2px 8px; border-radius: 6px; }
        .owner-item-price { font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 14px; color: #241C15; }
        .owner-total-row {
          display: flex; justify-content: space-between; align-items: center;
          border-top: 1.5px dashed #EFE3D0; padding-top: 10px; margin-top: 4px;
          font-family: 'Poppins', sans-serif; font-weight: 600; font-size: 15px; color: #5C4F3E;
        }
        .owner-total-amt { font-family: 'JetBrains Mono', monospace; font-size: 18px; font-weight: 700; color: #E8650A; }

        .owner-porter-note { font-size: 14px; color: #5C4F3E; margin: 0 0 12px; }

        .owner-fulfillment-pill {
          display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700;
          padding: 7px 13px; border-radius: 99px; margin-bottom: 12px;
        }
        .owner-pill-porter { background: #E4F0E8; color: #2F6B4F; }
        .owner-pill-pickup { background: #FCEFD9; color: #B5790A; }

        .owner-status-row {
          display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600;
          padding: 10px 13px; border-radius: 10px; margin-bottom: 14px;
        }
        .owner-status-pending { background: #FCEFD9; color: #B5790A; }
        .owner-status-ready { background: #FCE7E0; color: #C24A1E; }
        .owner-status-done { background: #E4F0E8; color: #2F6B4F; }

        .owner-actions { display: flex; flex-direction: column; gap: 10px; }
        .owner-action-btn {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 15px;
          padding: 14px; border-radius: 13px; border: none; cursor: pointer;
        }
        .owner-action-primary { background: #2F6B4F; color: #FFFFFF; }
        .owner-action-secondary { background: #FFFFFF; border: 1.5px solid #E4D8C3; color: #5C4F3E; }

        .admin-tabs { display: flex; gap: 8px; margin: 14px 0 18px; }
        .admin-tab, .admin-tab-active {
          flex: 1; text-align: center; font-family: 'Poppins', sans-serif; font-weight: 600; font-size: 13px;
          padding: 9px 6px; border-radius: 10px; cursor: pointer;
        }
        .admin-tab { background: #FFFFFF; border: 1.5px solid #EFE3D0; color: #8A7B68; }
        .admin-tab-active { background: #241C15; border: 1.5px solid #241C15; color: #FFFFFF; }

        .backup-hint { margin-bottom: 10px !important; }
        .backup-textarea {
          width: 100%; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #4A4030;
          border: 1.5px solid #E4D8C3; border-radius: 10px; padding: 10px; background: #FFFFFF; resize: vertical;
        }

        .add-item-list { display: flex; flex-direction: column; gap: 8px; }
        .add-item-row {
          display: flex; align-items: center; justify-content: space-between; width: 100%;
          background: #FFF8ED; border: 1.5px dashed #E4D8C3; border-radius: 10px; padding: 9px 11px;
          font-size: 13px; font-weight: 500; color: #5C4F3E; cursor: pointer;
        }
        .add-item-row-right { display: flex; align-items: center; gap: 8px; color: #B5790A; }
        .log-shop { font-family: 'Poppins', sans-serif; font-weight: 600; font-size: 14px; margin: 0; color: #241C15; }
        .log-detail { font-size: 12.5px; color: #5C4F3E; margin: 4px 0 0; }
        .log-total { font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 13.5px; color: #E8650A; margin: 4px 0 0; }
        .log-time { font-size: 11px; color: #ABA08E; margin: 8px 0 0; }

        .status-row {
          display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600;
          padding: 7px 10px; border-radius: 9px; margin-top: 9px;
        }
        .status-row-pending { background: #FCEFD9; color: #B5790A; }
        .status-row-ready { background: #FCE7E0; color: #C24A1E; }
        .status-row-done { background: #E4F0E8; color: #2F6B4F; }

        .log-edit-panel { margin-top: 12px; padding-top: 12px; border-top: 1.5px dashed #EFE3D0; display: flex; flex-direction: column; gap: 10px; }
        .fulfillment-toggle { display: flex; gap: 8px; }
        .fulfillment-btn, .fulfillment-btn-active {
          flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
          font-size: 12.5px; font-weight: 600; padding: 9px 8px; border-radius: 10px; cursor: pointer;
        }
        .fulfillment-btn { background: #FFFFFF; border: 1.5px solid #E4D8C3; color: #5C4F3E; }
        .fulfillment-btn-active { background: #241C15; border: 1.5px solid #241C15; color: #FFFFFF; }
        .status-actions { display: flex; flex-direction: column; gap: 8px; }
        .status-btn {
          background: #2F6B4F; color: #FFFFFF; font-family: 'Poppins', sans-serif; font-weight: 600; font-size: 13px;
          padding: 10px; border-radius: 10px; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 7px;
        }
        .status-btn:disabled { opacity: 0.6; cursor: default; }

        .bottom-nav {
          position: fixed; bottom: 0; left: 50%; transform: translateX(-50%);
          width: 100%; max-width: 480px;
          background: #FFFFFF; border-top: 1.5px solid #EFE3D0;
          display: flex; justify-content: space-around; padding: 9px 2px 13px;
          z-index: 30;
        }
        .nav-btn { display: flex; flex-direction: column; align-items: center; gap: 2px; background: none; border: none; cursor: pointer; color: #ABA08E; font-size: 10px; font-weight: 600; flex: 1; min-width: 0; }
        .nav-btn-active { color: #E8650A; }
        .nav-icon-wrap { position: relative; display: inline-flex; }
        .nav-badge {
          position: absolute; top: -5px; right: -9px;
          background: #E8650A; color: #FFFFFF; font-family: 'JetBrains Mono', monospace;
          font-size: 10px; font-weight: 700; border-radius: 999px; min-width: 15px; height: 15px;
          display: flex; align-items: center; justify-content: center; padding: 0 3px; line-height: 1;
        }

        .cart-groups { display: flex; flex-direction: column; gap: 14px; margin-top: 6px; }
        .cart-group { background: #FFFFFF; border: 1.5px solid #EFE3D0; border-radius: 14px; padding: 12px; }
        .cart-group-head {
          display: flex; align-items: center; gap: 8px; width: 100%; background: none; border: none; cursor: pointer;
          font-family: 'Poppins', sans-serif; font-weight: 600; font-size: 14px; color: #241C15; padding: 0 0 10px;
          text-align: left;
        }
        .cart-group-head span:not(.chevron) { flex: 1; }
        .cart-group-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; }
        .cart-group-total { font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 700; color: #5C4F3E; }
        .cart-grand-total {
          display: flex; align-items: center; justify-content: space-between;
          background: #241C15; color: #FFFFFF; border-radius: 14px; padding: 14px 16px; margin-top: 16px;
          font-family: 'Poppins', sans-serif; font-weight: 600; font-size: 14px;
        }
        .cart-grand-total span:last-child { font-family: 'JetBrains Mono', monospace; font-size: 17px; font-weight: 700; color: #F4B400; }

        .toast {
          position: fixed; bottom: 78px; left: 50%; transform: translateX(-50%);
          width: calc(100% - 36px); max-width: 444px;
          display: flex; align-items: center; gap: 8px;
          font-family: 'Inter', sans-serif; font-weight: 600; font-size: 13px;
          padding: 12px 16px; border-radius: 13px;
          box-shadow: 0 8px 24px rgba(36,28,21,0.28); z-index: 60;
          animation: toastIn 0.2s ease;
        }
        @keyframes toastIn { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }
        .toast-success { background: #2F6B4F; color: #FFFFFF; }
        .toast-error { background: #C24A1E; color: #FFFFFF; }
      `}</style>

      {loading ? (
        <div className="screen" style={{ textAlign: "center", paddingTop: 80, color: "#8A7B68" }}>
          Loading shops near you…
        </div>
      ) : view === "search" ? (
        <SearchView shops={shops} onOpenShop={handleOpenShop} />
      ) : view === "cart" ? (
        <CartView
          shops={shops}
          cart={cart}
          setCart={setCart}
          onPlaceOrder={handlePlaceOrder}
          showToast={showToast}
          onOpenShop={handleOpenShop}
        />
      ) : view === "shopDetail" && selectedShop ? (
        <ShopDetailView
          shop={selectedShop}
          onBack={() => setView(returnView)}
          cart={cart}
          setCart={setCart}
          onPlaceOrder={handlePlaceOrder}
          onRequestPorter={handleRequestPorter}
          showToast={showToast}
        />
      ) : view === "owner" ? (
        <ShopOwnerView
          shops={shops}
          log={log}
          ownerShopId={ownerShopId}
          onLogin={handleOwnerLogin}
          onLogout={handleOwnerLogout}
          onUpdateEntry={handleUpdateLogEntry}
          showToast={showToast}
        />
      ) : view === "admin" ? (
        <AdminView
          shops={shops}
          onAddShop={handleAddShop}
          onUpdateShop={handleUpdateShop}
          onDeleteShop={handleDeleteShop}
          onRestoreShops={handleRestoreShops}
          onReloadFromStorage={handleReloadShopsFromStorage}
          log={log}
          onUpdateEntry={handleUpdateLogEntry}
          showToast={showToast}
        />
      ) : (
        <LogView log={log} shops={shops} onUpdateEntry={handleUpdateLogEntry} onDeleteEntry={handleDeleteLogEntry} showToast={showToast} />
      )}

      {loginOpen && (
        <CustomerLoginSheet
          onSubmit={handleCustomerLogin}
          onClose={() => {
            setLoginOpen(false);
            setPendingOrder(null);
          }}
          showToast={showToast}
        />
      )}

      {checkoutOpen && pendingOrder && (
        <CheckoutSheet
          shop={pendingOrder.shop}
          lines={pendingOrder.lines}
          total={pendingOrder.total}
          customer={customer}
          onConfirm={handleCheckoutConfirm}
          onClose={() => {
            setCheckoutOpen(false);
            setPendingOrder(null);
          }}
          showToast={showToast}
        />
      )}

      {toast && (
        <div key={toast.id} className={`toast ${toast.kind === "error" ? "toast-error" : "toast-success"}`}>
          {toast.kind === "error" ? <X size={16} /> : <Check size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      <BottomNav
        view={view === "shopDetail" ? returnView : view}
        setView={(v) => { setView(v); }}
        cartCount={cartItemCount}
      />
    </div>
  );
}
