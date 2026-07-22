// ================= KONFIGURASI TOKO =================
const OWNER_WA_NUMBER = "62881026726398"; // Ganti dengan Nomor WA Toko Anda (Format 62...)
const SECRET_PASSWORD = "admin2026";      // Password Login Admin

// Tabel Nilai Tukar Kurs Mata Uang (Dapat Diubah Kapan Saja)
const exchangeRates = {
  IDR: { symbol: 'Rp ', rate: 1, decimals: 0 },
  USD: { symbol: '$ ', rate: 0.000062, decimals: 2 },  // 1 USD ≈ 16.000 IDR
  EUR: { symbol: '€ ', rate: 0.000057, decimals: 2 },  // 1 EUR ≈ 17.500 IDR
  SGD: { symbol: 'S$ ', rate: 0.000083, decimals: 2 }, // 1 SGD ≈ 12.000 IDR
  MYR: { symbol: 'RM ', rate: 0.00027, decimals: 2 },  // 1 MYR ≈ 3.700 IDR
  JPY: { symbol: '¥ ', rate: 0.0097, decimals: 0 }     // 1 JPY ≈ 103 IDR
};

// Produk Default saat pertama kali aplikasi dibuka
const defaultProducts = [
];

// Inisialisasi State Data
let products = JSON.parse(localStorage.getItem('products')) || defaultProducts;
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let selectedCurrency = localStorage.getItem('selectedCurrency') || 'IDR';
let currentCategory = 'semua';

// Inisialisasi Saat Halaman Selesai Dimuat
document.addEventListener('DOMContentLoaded', () => {
  const selectElem = document.getElementById('currency-select');
  if (selectElem) selectElem.value = selectedCurrency;

  if (sessionStorage.getItem('isAdminLoggedIn') === 'true') {
    showAdminView();
  } else {
    showShopView();
  }

  renderProducts();
  updateCartUI();
});

// ================= SISTEM KONVERSI MATA UANG =================
function formatPrice(amountInIDR, currency = selectedCurrency) {
  const config = exchangeRates[currency] || exchangeRates['IDR'];
  const converted = amountInIDR * config.rate;
  
  return config.symbol + converted.toLocaleString('en-US', {
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals
  });
}

function changeCurrency(newCurrency) {
  selectedCurrency = newCurrency;
  localStorage.setItem('selectedCurrency', newCurrency);
  renderProducts();
  updateCartUI();
}

// ================= RENDER KATALOG & TABEL ADMIN =================
function renderProducts() {
  const grid = document.getElementById('product-grid');
  const adminTable = document.getElementById('admin-table-body');
  const searchKeyword = document.getElementById('search-input').value.toLowerCase();

  grid.innerHTML = '';
  adminTable.innerHTML = '';

  // Filter Kategori & Kata Kunci Pencarian
  const filteredProducts = products.filter(p => {
    const matchCategory = currentCategory === 'semua' || p.category === currentCategory;
    const matchSearch = p.name.toLowerCase().includes(searchKeyword);
    return matchCategory && matchSearch;
  });

  if (filteredProducts.length === 0) {
    grid.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color:#64748b; padding:30px;">Produk tidak ditemukan.</p>';
  } else {
    filteredProducts.forEach(p => {
      grid.innerHTML += `
        <div class="product-card">
          <img src="${p.image}" class="product-img" alt="${p.name}" onerror="this.src='https://via.placeholder.com/200?text=Gambar+Error'">
          <div class="product-info">
            <div>
              <div class="product-title">${p.name}</div>
              <div class="product-price">${formatPrice(p.price)}</div>
              <div class="product-stock">Stok: ${p.stock}</div>
            </div>
            <button class="btn-add-cart" ${p.stock <= 0 ? 'disabled' : ''} onclick="addToCart(${p.id})">
              ${p.stock > 0 ? '+ Keranjang' : 'Stok Habis'}
            </button>
          </div>
        </div>
      `;
    });
  }

  // Render Tabel Kelola Barang Admin
  products.forEach(p => {
    adminTable.innerHTML += `
      <tr>
        <td><img src="${p.image}" width="40" height="40" style="object-fit:cover; border-radius:4px;"></td>
        <td><strong>${p.name}</strong></td>
        <td>${p.category}</td>
        <td>${formatPrice(p.price, 'IDR')}</td>
        <td>${p.stock}</td>
        <td><button class="btn-delete" onclick="deleteProduct(${p.id})">Hapus</button></td>
      </tr>
    `;
  });
}

function filterCategory(category) {
  currentCategory = category;
  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
  if (event && event.target) event.target.classList.add('active');
  renderProducts();
}

function filterProducts() {
  renderProducts();
}

// ================= LOGIKA KERANJANG BELANJA =================
function addToCart(productId) {
  const product = products.find(p => p.id === productId);
  if (!product || product.stock <= 0) return;

  const cartItem = cart.find(item => item.id === productId);
  if (cartItem) {
    if (cartItem.qty < product.stock) {
      cartItem.qty++;
    } else {
      alert('Jumlah di keranjang sudah mencapai batas stok yang tersedia.');
      return;
    }
  } else {
    cart.push({ id: product.id, name: product.name, price: product.price, qty: 1, image: product.image });
  }

  saveCart();
  updateCartUI();
  openCartModal();
}

function updateQty(id, change) {
  const cartItem = cart.find(item => item.id === id);
  const product = products.find(p => p.id === id);

  if (cartItem) {
    cartItem.qty += change;
    if (cartItem.qty > product.stock) {
      cartItem.qty = product.stock;
      alert('Mencapai batas stok.');
    }
    if (cartItem.qty <= 0) {
      cart = cart.filter(item => item.id !== id);
    }
  }
  saveCart();
  updateCartUI();
}

function saveCart() {
  localStorage.setItem('cart', JSON.stringify(cart));
}

function updateCartUI() {
  const cartList = document.getElementById('cart-items-list');
  const cartCount = document.getElementById('cart-count');
  const cartTotal = document.getElementById('cart-total-price');
  const btnCheckout = document.getElementById('btn-to-checkout');

  cartList.innerHTML = '';
  let totalIDR = 0;
  let totalItems = 0;

  if (cart.length === 0) {
    cartList.innerHTML = '<p style="text-align:center; color:#64748b; padding:20px;">Keranjang belanja masih kosong.</p>';
    btnCheckout.disabled = true;
    btnCheckout.style.opacity = '0.5';
  } else {
    btnCheckout.disabled = false;
    btnCheckout.style.opacity = '1';

    cart.forEach(item => {
      const subtotalIDR = item.price * item.qty;
      totalIDR += subtotalIDR;
      totalItems += item.qty;

      cartList.innerHTML += `
        <div class="cart-item">
          <div class="cart-item-info">
            <div class="cart-item-title">${item.name}</div>
            <div class="cart-item-price">${formatPrice(item.price)} x ${item.qty} = <strong>${formatPrice(subtotalIDR)}</strong></div>
          </div>
          <div class="cart-qty-controls">
            <button onclick="updateQty(${item.id}, -1)">-</button>
            <span>${item.qty}</span>
            <button onclick="updateQty(${item.id}, 1)">+</button>
          </div>
        </div>
      `;
    });
  }

  cartCount.innerText = totalItems;
  cartTotal.innerText = formatPrice(totalIDR);
}

// ================= MODAL & CHECKOUT WHATSAPP =================
function openCartModal() { document.getElementById('cart-modal').classList.remove('hidden'); }
function closeCartModal() { document.getElementById('cart-modal').classList.add('hidden'); }
function openCheckoutModal() { closeCartModal(); document.getElementById('checkout-modal').classList.remove('hidden'); }
function closeCheckoutModal() { document.getElementById('checkout-modal').classList.add('hidden'); }

document.getElementById('checkout-form').addEventListener('submit', function(e) {
  e.preventDefault();

  const name = document.getElementById('cust-name').value;
  const phone = document.getElementById('cust-phone').value;
  const address = document.getElementById('cust-address').value;
  const payment = document.getElementById('cust-payment').value;

  // 1. Potong Stok Produk Otomatis
  cart.forEach(cartItem => {
    const p = products.find(prod => prod.id === cartItem.id);
    if (p) {
      p.stock -= cartItem.qty;
    }
  });
  localStorage.setItem('products', JSON.stringify(products));

  // 2. Susun Rincian Pesanan ke Teks WhatsApp
  let orderDetails = `*PESANAN BARU - ABRIELLSTORE*\n----------------------------------\n`;
  orderDetails += `*Mata Uang Pembeli:* ${selectedCurrency}\n`;
  orderDetails += `*Nama:* ${name}\n*No. HP:* ${phone}\n*Alamat:* ${address}\n*Metode Bayar:* ${payment}\n----------------------------------\n*Rincian Barang:*\n`;

  let grandTotalIDR = 0;
  cart.forEach((item, index) => {
    const subtotalIDR = item.price * item.qty;
    grandTotalIDR += subtotalIDR;
    orderDetails += `${index + 1}. ${item.name} (${item.qty}x) = ${formatPrice(subtotalIDR)}\n`;
  });

  orderDetails += `----------------------------------\n`;
  orderDetails += `*TOTAL PESANAN: ${formatPrice(grandTotalIDR)}*\n`;
  if (selectedCurrency !== 'IDR') {
    orderDetails += `*(Setara dengan IDR: ${formatPrice(grandTotalIDR, 'IDR')})*\n`;
  }
  orderDetails += `----------------------------------\nMohon segera diproses ya, terima kasih!`;

  // 3. Reset Keranjang & Tampilan
  cart = [];
  saveCart();
  updateCartUI();
  renderProducts();
  closeCheckoutModal();

  // 4. Buka WhatsApp Otomatis
  const waUrl = `https://wa.me/${OWNER_WA_NUMBER}?text=${encodeURIComponent(orderDetails)}`;
  window.open(waUrl, '_blank');
});

// ================= LOGIKA PANEL ADMIN =================
function openLoginModal() { document.getElementById('login-modal').classList.remove('hidden'); }
function closeLoginModal() { document.getElementById('login-modal').classList.add('hidden'); }

function processLogin() {
  const pass = document.getElementById('admin-pass-input').value;
  if (pass === SECRET_PASSWORD) {
    sessionStorage.setItem('isAdminLoggedIn', 'true');
    closeLoginModal();
    showAdminView();
  } else {
    alert('Kata sandi salah!');
  }
}

function logoutAdmin() {
  sessionStorage.removeItem('isAdminLoggedIn');
  showShopView();
  alert('Berhasil keluar dari mode admin.');
}

function showAdminView() {
  document.getElementById('admin-view').classList.remove('hidden');
  document.getElementById('shop-view').classList.add('hidden');
  document.getElementById('admin-bar').classList.remove('hidden');
}

function showShopView() {
  document.getElementById('admin-view').classList.add('hidden');
  document.getElementById('shop-view').classList.remove('hidden');
  document.getElementById('admin-bar').classList.add('hidden');
}

// Handler Form Tambah Produk Baru
document.getElementById('add-product-form').addEventListener('submit', function(e) {
  e.preventDefault();
  const name = document.getElementById('p-name').value;
  const price = Number(document.getElementById('p-price').value);
  const stock = Number(document.getElementById('p-stock').value);
  const category = document.getElementById('p-category').value;
  const fileInput = document.getElementById('p-file');
  const urlInput = document.getElementById('p-url').value;

  if (fileInput.files && fileInput.files[0]) {
    const reader = new FileReader();
    reader.onload = function(e) { saveNewProduct(name, price, stock, category, e.target.result); };
    reader.readAsDataURL(fileInput.files[0]);
  } else if (urlInput) {
    saveNewProduct(name, price, stock, category, urlInput);
  } else {
    saveNewProduct(name, price, stock, category, 'https://via.placeholder.com/200?text=No+Image');
  }
});

function saveNewProduct(name, price, stock, category, image) {
  products.push({ id: Date.now(), name, price, stock, category, image });
  localStorage.setItem('products', JSON.stringify(products));
  document.getElementById('add-product-form').reset();
  renderProducts();
  alert('Produk berhasil ditambahkan!');
}

function deleteProduct(id) {
  if (confirm('Hapus produk ini dari katalog toko?')) {
    products = products.filter(p => p.id !== id);
    localStorage.setItem('products', JSON.stringify(products));
    renderProducts();
  }
}