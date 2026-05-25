// ==========================================
// 1. DATABASE & STORAGE
// ==========================================
const defaultProducts = [
    { id: 1, name: "Everyday Canvas Tote Bag", price: 588, prevPrice: 750, img: "img/shop/1.jpg", brand: "Fashion", stock: 15 },
    { id: 2, name: "Wireless Bluetooth Earbuds", price: 400, prevPrice: 400, img: "img/shop/2.jpg", brand: "Electronics", stock: 10 },
    { id: 3, name: "Ceramic Coffee Mug Set", price: 3299, prevPrice: 3800, img: "img/shop/3.jpg", brand: "Home", stock: 5 },
    { id: 4, name: "Daily Comfort Running Shoes", price: 400, prevPrice: 550, img: "img/shoes/1.jpg", brand: "Sports", stock: 20 },
    { id: 5, name: "Minimal Smart Watch", price: 24812, prevPrice: 24812, img: "img/watches/1.jpg", brand: "Electronics", stock: 2 },
    { id: 6, name: "Reusable Self-Care Gift Set", price: 5500, prevPrice: 6200, img: "img/new/1.jpg", brand: "Beauty", stock: 8 }
];

const API_BASE = "https://freshcart-90sw.onrender.com/api";
const currentSeller = JSON.parse(localStorage.getItem('currentUser'));

const sellerKey = currentSeller
    ? `sellerProducts_${currentSeller.email}`
    : 'sellerProducts_guest';

let sellerProducts = JSON.parse(localStorage.getItem(sellerKey)) || [];
let userBudget = parseFloat(localStorage.getItem('userBudget')) || 0;
let apiProducts = [];
let marketplaceSellers = [];
let marketplaceOrders = [];

function normalizeProduct(product) {
    const storeName = product.sellerName || product.storeName || product.sellerStoreName || product.sellerEmail || "FreshCart";

    return {
        ...product,
        id: product._id || product.id,
        price: Number(product.price),
        prevPrice: Number(product.prevPrice || product.price),
        stock: Number(product.stock || 0),
        sellerName: storeName,
        storeName
    };
}

async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        },
        ...options
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || "Request failed.");
    }

    return data;
}

async function loadMarketplaceData() {
    try {
        const [products, sellers, orders] = await Promise.all([
            apiRequest("/products"),
            apiRequest("/sellers"),
            apiRequest("/orders")
        ]);

       apiProducts = Array.isArray(products) ? products.map(normalizeProduct) : [];
        marketplaceSellers = sellers;
        marketplaceOrders = orders;

        if (currentSeller?.role === "seller") {
            const remoteSellerProducts = apiProducts.filter(p => p.sellerEmail === currentSeller.email);
            const localSellerProducts = (JSON.parse(localStorage.getItem(sellerKey)) || [])
                .map(normalizeProduct)
                .filter(p => !p._id);

            sellerProducts = [
                ...remoteSellerProducts,
                ...localSellerProducts.filter(localProduct =>
                    !remoteSellerProducts.some(remoteProduct =>
                        remoteProduct.id === localProduct.id ||
                        (remoteProduct.name === localProduct.name && remoteProduct.img === localProduct.img)
                    )
                )
            ];
        }

        // --- HETO YUNG DINAGDAG NATIN SA DULO ---
        if (currentSeller && currentSeller.email) {
            try {
                const remoteCart = await apiRequest(`/cart/${currentSeller.email}`);
                if (remoteCart && remoteCart.items) {
                    localStorage.setItem('freshCart', JSON.stringify(remoteCart.items));
                }
            } catch (cartErr) {
                console.warn("Failed to sync remote cart on load:", cartErr.message);
            }
        }

    } catch (error) {
        console.warn("Using local marketplace fallback:", error.message);
    }
}
async function saveCartAndSync(cart) {
    localStorage.setItem('freshCart', JSON.stringify(cart));
    
    // Kung may naka-login na user, ipadala agad sa backend database
    if (currentSeller && currentSeller.email) {
        try {
            await apiRequest("/cart/sync", {
                method: "POST",
                body: JSON.stringify({
                    userEmail: currentSeller.email,
                    items: cart
                })
            });
        } catch (error) {
            console.error("Database cart sync failed:", error.message);
        }
    }
}



// ==========================================
// 2. GET ALL SELLER PRODUCTS
// ==========================================
function getAllSellerProducts() {
    let products = [];

    for (let i = 0; i < localStorage.length; i++) {
        let key = localStorage.key(i);

        if (key.startsWith('sellerProducts_')) {
            let sellerItems = JSON.parse(localStorage.getItem(key)) || [];
            products = products.concat(sellerItems);
        }
    }

    if (apiProducts.length === 0) {
        return products;
    }

    const localOnlyProducts = products
        .map(normalizeProduct)
        .filter(localProduct =>
            !apiProducts.some(apiProduct =>
                apiProduct.id === localProduct.id ||
                (apiProduct.name === localProduct.name && apiProduct.img === localProduct.img)
            )
        );

    return [...apiProducts, ...localOnlyProducts];
}

function getAllProducts() {
    return [...defaultProducts, ...getAllSellerProducts()];
}


// ==========================================
// 3. NAVIGATION
// ==========================================
const bar = document.getElementById('bar');
const close = document.getElementById('close');
const nav = document.getElementById('navbar');

function renderAuthNavLink() {
    if (!nav) return;

    const isLoggedIn = Boolean(localStorage.getItem("userToken"));
    const links = Array.from(nav.querySelectorAll('a'));
    const authLinks = links.filter(link => {
        const text = link.textContent.trim().toLowerCase();
        const href = link.getAttribute('href') || '';

        return text === 'logout' || text === 'sign in' || href === 'login.html';
    });

    authLinks.forEach((link, index) => {
        const listItem = link.closest('li');

        if (index > 0 && listItem) {
            listItem.remove();
        }
    });

    let authLink = authLinks[0];
    let authItem = authLink?.closest('li');

    if (!authLink || !authItem || !nav.contains(authItem)) {
        authItem = document.createElement('li');
        authItem.className = 'auth-nav-item';
        authLink = document.createElement('a');
        authItem.appendChild(authLink);

        const bagItem = document.getElementById('lg-bag');
        const closeLink = document.getElementById('close');

        nav.insertBefore(authItem, bagItem || closeLink || null);
    }

    authItem.classList.add('auth-nav-item');
    authLink.classList.toggle('logout-btn', isLoggedIn);
    authLink.textContent = isLoggedIn ? 'Logout' : 'Sign In';
    authLink.href = isLoggedIn ? 'javascript:void(0)' : 'login.html';
    authLink.onclick = isLoggedIn
        ? event => {
            event.preventDefault();
            window.logoutUser();
        }
        : null;
}

if (bar) {
    bar.addEventListener('click', () => {
        nav.classList.add('active');
    });
}

if (close) {
    close.addEventListener('click', () => {
        nav.classList.remove('active');
    });
}

window.chooseRole = function(role) {
    if (role === 'buyer') {
        window.location.href = 'index.html';
    } else if (role === 'seller') {
        window.location.href = 'seller.html';
    }
};

function renderUserGreeting() {
    const greeting = document.getElementById('user-greeting');

    if (!greeting || !currentSeller || currentSeller.role !== 'buyer') return;

    const displayName = currentSeller.name || currentSeller.email?.split('@')[0] || 'there';
    greeting.innerText = `Hello, ${displayName}!`;
}


// ==========================================
// 4. RENDER SHOP
// ==========================================
function renderShop() {
    const shopContainers = document.querySelectorAll('#product-container');

    if (shopContainers.length === 0) return;

    const allProducts = getAllProducts();

    const productHTML = allProducts.map(p => {
        let badgeHTML = '';
        let priceColor = '';

        let stockDisplay = p.stock > 0
            ? `<span style="color:#28a745; font-size:12px;">Stock: ${p.stock}</span>`
            : `<span style="color:#ff4d4d; font-size:12px; font-weight:bold;">OUT OF STOCK</span>`;

        if (p.price < p.prevPrice) {
            badgeHTML = `
                <span style="
                    position:absolute;
                    background:#28a745;
                    color:white;
                    padding:4px 8px;
                    border-radius:4px;
                    font-size:11px;
                    margin:10px;
                    z-index:1;
                ">PRICE DROP</span>`;
        }

        else if (p.price > p.prevPrice) {
            badgeHTML = `
                <span style="
                    position:absolute;
                    background:#ff4d4d;
                    color:white;
                    padding:4px 8px;
                    border-radius:4px;
                    font-size:11px;
                    margin:10px;
                    z-index:1;
                ">PRICE UP</span>`;

            priceColor = 'color:#ff4d4d;';
        }

        const productId = JSON.stringify(p.id);

        return `
        <div class="pro" style="${p.stock <= 0 ? 'opacity:0.6;' : ''}">
            ${badgeHTML}

            <img src="${p.img}" alt="" onclick="window.location.href='sproduct.html?id=${encodeURIComponent(p.id)}'">

            <div class="des">
                <span>${p.brand}</span>
                <h5>${p.name}</h5>
                <p style="color:#b8b8b8; font-size:12px; margin:4px 0;">
                    Store: ${p.storeName || p.sellerName || "FreshCart"}
                </p>

                <div class="star">
                    <i class="fas fa-star"></i>
                    <i class="fas fa-star"></i>
                    <i class="fas fa-star"></i>
                    <i class="fas fa-star"></i>
                    <i class="fas fa-star"></i>
                </div>

                <div style="display:flex; align-items:center; gap:10px;">
                    <h4 style="margin:0; ${priceColor}">₱${p.price.toLocaleString()}</h4>

                    ${p.price !== p.prevPrice
                        ? `<span style="text-decoration:line-through; color:#999; font-size:12px;">
                            ₱${p.prevPrice.toLocaleString()}
                           </span>`
                        : ''}
                </div>

                ${stockDisplay}
            </div>

            <a href="javascript:void(0)" onclick='addToCart(${productId})'>
                <i class="fa-solid fa-cart-shopping cart"></i>
            </a>
        </div>`;
    }).join('');

    shopContainers.forEach(container => {
        container.innerHTML = productHTML;
    });
}


// ==========================================
// 5. SEARCH PRODUCT
// ==========================================
window.searchProduct = function() {
    const input = document.getElementById('searchInput')?.value.toUpperCase() || "";
    const selectedCategory = document.getElementById('categorySelect')?.value || "All";
    const products = document.getElementsByClassName('pro');

    for (let i = 0; i < products.length; i++) {
        let name = products[i].getElementsByTagName('h5')[0].innerText.toUpperCase();
        let category = products[i].getElementsByTagName('span')[0].innerText;

        products[i].style.display =
            name.includes(input) &&
            (selectedCategory === "All" || category === selectedCategory)
                ? ""
                : "none";
    }
};


// ==========================================
// 6. ADD TO CART
// ==========================================
window.addToCart = async function(productId) {
    if (!currentSeller || !localStorage.getItem("userToken")) {
        return Swal.fire({
            icon: 'info',
            title: 'Login Required',
            text: 'Please log in before adding items to your cart.',
            confirmButtonText: 'Login',
            confirmButtonColor: '#a531ab'
        }).then(result => {
            if (result.isConfirmed) {
                window.location.href = 'login.html';
            }
        });
    }

    let cart = JSON.parse(localStorage.getItem('freshCart')) || [];

    const product = getAllProducts().find(p => p.id == productId);

    if (!product) {
        return Swal.fire('Error', 'Product not found.', 'error');
    }

    if (product.stock <= 0) {
        return Swal.fire('Out of Stock', 'This item is unavailable.', 'error');
    }

    const existing = cart.find(item => item.id == productId);

    if (existing) {
        if (existing.quantity >= product.stock) {
            return Swal.fire('Limit Reached', `Only ${product.stock} units available.`, 'warning');
        }

        existing.quantity += 1;
    } else {
        cart.push({
            ...product,
            quantity: 1
        });
    }

    await saveCartAndSync(cart); 
    
    updateCartCount();

    Swal.fire({
        icon: 'success',
        title: 'Added to cart!',
        timer: 1000,
        showConfirmButton: false
    });
};


// ==========================================
// 7. CART DISPLAY
// ==========================================
function displayCart() {
    const cartTable = document.getElementById('cart-items');

    if (!cartTable) return;

    let cart = JSON.parse(localStorage.getItem('freshCart')) || [];
    let total = 0;

    if (cart.length === 0) {
        cartTable.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center; padding:40px;">
                    Your cart is empty.
                </td>
            </tr>
        `;
    } else {
        cartTable.innerHTML = cart.map((item, index) => {
            let subtotal = item.price * item.quantity;
            total += subtotal;

            return `
            <tr>
                <td>
                    <a href="javascript:void(0)" onclick="removeItem(${index})">
                        <i class="far fa-times-circle"></i>
                    </a>
                </td>

                <td>
                    <img src="${item.img}" style="width:70px;">
                </td>

                <td>${item.name}</td>

                <td>₱${item.price.toLocaleString()}</td>

                <td>
                    <input type="number"
                           value="${item.quantity}"
                           min="1"
                           onchange="updateQty(${index}, this.value)">
                </td>

                <td>₱${subtotal.toLocaleString()}</td>
            </tr>`;
        }).join('');
    }

    const totalPrice = document.getElementById('total-price');
    const finalTotal = document.getElementById('final-total');

    if (totalPrice) totalPrice.innerText = `₱${total.toLocaleString()}`;
    if (finalTotal) finalTotal.innerText = `₱${total.toLocaleString()}`;

    renderBudget();
}

window.removeItem = async function(index) {
    let cart = JSON.parse(localStorage.getItem('freshCart')) || [];

    cart.splice(index, 1);

    await saveCartAndSync(cart);

    displayCart();
    updateCartCount();
};

window.updateQty = async function(index, val) {
    let cart = JSON.parse(localStorage.getItem('freshCart')) || [];
    const allProducts = getAllProducts();

    let quantity = parseInt(val) || 1;
    const product = allProducts.find(p => p.id == cart[index].id);

    if (product && quantity > product.stock) {
        Swal.fire('Insufficient Stock', `Only ${product.stock} available.`, 'error');
        quantity = product.stock;
    }

    cart[index].quantity = quantity;
    await saveCartAndSync(cart);

    displayCart();
    updateCartCount();
};

// ==========================================
// 8. CART COUNT
// ==========================================
function updateCartCount() {
    let cart = JSON.parse(localStorage.getItem('freshCart')) || [];
    let totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    document.querySelectorAll('a[href="cart.html"]').forEach(link => {
        if (!link.querySelector('.fa-bag-shopping')) return;

        let badge = link.querySelector('.cart-count-badge, #cart-count');

        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'cart-count-badge';
            link.appendChild(badge);
        }

        badge.classList.add('cart-count-badge');
        badge.innerText = totalItems;
        badge.style.display = totalItems > 0 ? "grid" : "none";

        if (getComputedStyle(link).position === "static") {
            link.style.position = "relative";
        }
    });
}


// ==========================================
// 9. BUDGET
// ==========================================
window.setBudget = function() {
    Swal.fire({
        title: 'Set Spending Limit',
        input: 'number',
        inputValue: userBudget,
        showCancelButton: true,
        confirmButtonColor: '#a531ab',
    }).then((result) => {
        if (result.isConfirmed) {
            userBudget = parseFloat(result.value) || 0;

            localStorage.setItem('userBudget', userBudget);

            renderBudget();

            Swal.fire('Updated!', `Limit is now ₱${userBudget.toLocaleString()}`, 'success');
        }
    });
};

function renderBudget() {
    const budgetDisplay = document.getElementById('display-budget');
    const progressBar = document.getElementById('budget-progress');
    const warningText = document.getElementById('budget-warning');
    const percentText = document.getElementById('budget-percent');

    if (!budgetDisplay) return;

    let cart = JSON.parse(localStorage.getItem('freshCart')) || [];
    let totalSpent = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    budgetDisplay.innerText = `₱${userBudget.toLocaleString()}`;

    let percentage = userBudget > 0 ? (totalSpent / userBudget) * 100 : 0;

    if (percentage > 100) percentage = 100;

    if (progressBar) progressBar.style.width = percentage + "%";

    if (percentText) {
        percentText.innerText = `${Math.round(percentage)}% Used`;
    }

    if (warningText) {
        if (userBudget > 0 && totalSpent > userBudget) {
            warningText.innerText = `⚠️ Over Budget by ₱${(totalSpent - userBudget).toLocaleString()}!`;
            warningText.style.color = "#ff4d4d";
        } else {
            warningText.innerText = "✅ Within budget.";
            warningText.style.color = "#28a745";
        }
    }
}


// ==========================================
// 10. CHECKOUT
// ==========================================
window.processCheckout = async function() {
    if (!currentSeller || !localStorage.getItem("userToken")) {
        return Swal.fire({
            icon: 'info',
            title: 'Login Required',
            text: 'Please log in before checkout.',
            confirmButtonText: 'Login',
            confirmButtonColor: '#a531ab'
        }).then(result => {
            if (result.isConfirmed) {
                window.location.href = 'login.html';
            }
        });
    }

    let cart = JSON.parse(localStorage.getItem('freshCart')) || [];

    if (cart.length === 0) {
        return Swal.fire('Oops!', 'Cart is empty.', 'error');
    }

    let totalSpent = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    if (userBudget > 0 && totalSpent > userBudget) {
        return Swal.fire('Over Budget!', 'Reduce items or increase limit.', 'error');
    }

    window.location.href = 'checkout.html';
    return;

    const checkoutChoice = await Swal.fire({
        title: 'Complete Order?',
        text: `Total: â‚±${totalSpent.toLocaleString()}`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#a531ab'
    });

    if (!checkoutChoice.isConfirmed) return;

    try {
        const sellerCart = cart.filter(item => item._id || String(item.id).length === 24);
        const localCart = cart.filter(item => !sellerCart.includes(item));

        if (sellerCart.length > 0) {
            const orderItems = sellerCart.map(item => ({
                productId: item._id || item.id,
                productName: item.name,
                sellerEmail: item.sellerEmail,
                sellerName: item.sellerName || item.storeName || item.sellerEmail || "FreshCart Seller",
                quantity: item.quantity,
                price: item.price,
                total: item.price * item.quantity
            }));

            await apiRequest("/orders", {
                method: "POST",
                body: JSON.stringify({
                    buyerEmail: currentSeller?.email || "guest@freshcart.local",
                    items: orderItems,
                    totalAmount: orderItems.reduce((sum, item) => sum + item.total, 0)
                })
            });
        }

      if (localCart.length > 0) {
            let sales = JSON.parse(localStorage.getItem("sales")) || [];

            localCart.forEach(cartItem => {
                sales.push({
                    seller: cartItem.sellerEmail || "FreshCart",
                    buyer: currentSeller?.email || "Guest",
                    product: cartItem.name,
                    quantity: cartItem.quantity,
                    total: cartItem.price * cartItem.quantity,
                    date: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                });
            });

            localStorage.setItem("sales", JSON.stringify(sales));
        }

        // --- PALITAN AT DAGDAGAN ITONG PARTE NA ITO ---
        localStorage.removeItem('freshCart');
        await saveCartAndSync([]); // Linisin ang cart sa MongoDB database

        return Swal.fire('Success!', 'Order placed successfully.', 'success')
            .then(() => window.location.href = 'index.html');
    } catch (error) {
        return Swal.fire('Checkout Failed', error.message, 'error');
    }

    Swal.fire({
        title: 'Complete Order?',
        text: `Total: ₱${totalSpent.toLocaleString()}`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#a531ab'
    }).then(res => {
        if (res.isConfirmed) {

            let sales = JSON.parse(localStorage.getItem("sales")) || [];

            cart.forEach(cartItem => {
                    sales.push({
    seller: cartItem.sellerEmail || "unknown",
    buyer: currentSeller?.email || "Unknown",
    product: cartItem.name,
    quantity: cartItem.quantity,
    total: cartItem.price * cartItem.quantity,
    date: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
});

                for (let i = 0; i < localStorage.length; i++) {
                    let key = localStorage.key(i);

                    if (key.startsWith('sellerProducts_')) {
                        let items = JSON.parse(localStorage.getItem(key)) || [];
                        let index = items.findIndex(p => p.id == cartItem.id);

                        if (index !== -1) {
                            items[index].stock -= cartItem.quantity;

                            if (items[index].stock < 0) {
                                items[index].stock = 0;
                            }

                            localStorage.setItem(key, JSON.stringify(items));
                        }
                    }
                }
            });

            localStorage.setItem("sales", JSON.stringify(sales));
            localStorage.removeItem('freshCart');

            Swal.fire('Success!', 'Order placed successfully.', 'success')
                .then(() => window.location.href = 'index.html');
        }
    });
};

function renderDemoCheckout() {
    const itemsContainer = document.getElementById('checkout-items');
    const totalEl = document.getElementById('checkout-total');
    const countEl = document.getElementById('checkout-item-count');
    const payButton = document.getElementById('demo-pay-button');

    if (!itemsContainer) return;

    const cart = JSON.parse(localStorage.getItem('freshCart')) || [];
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    if (cart.length === 0) {
        itemsContainer.innerHTML = '<p class="empty-checkout">Your cart is empty.</p>';
        if (payButton) payButton.disabled = true;
    } else {
        itemsContainer.innerHTML = cart.map(item => `
            <div class="checkout-item">
                <img src="${item.img}" alt="${item.name}">
                <div>
                    <h4>${item.name}</h4>
                    <p>${item.quantity} x &#8369;${Number(item.price).toLocaleString()}</p>
                </div>
                <strong>&#8369;${Number(item.price * item.quantity).toLocaleString()}</strong>
            </div>
        `).join('');
    }

    if (totalEl) totalEl.innerHTML = `&#8369;${total.toLocaleString()}`;
    if (countEl) countEl.innerText = `${itemCount} item${itemCount === 1 ? '' : 's'}`;
}

async function completeDemoOrder() {
    const cart = JSON.parse(localStorage.getItem('freshCart')) || [];

    if (cart.length === 0) {
        throw new Error('Cart is empty.');
    }

    const sellerCart = cart.filter(item => item._id || String(item.id).length === 24);
    const localCart = cart.filter(item => !sellerCart.includes(item));

    if (sellerCart.length > 0) {
        const orderItems = sellerCart.map(item => ({
            productId: item._id || item.id,
            productName: item.name,
            sellerEmail: item.sellerEmail,
            sellerName: item.sellerName || item.storeName || item.sellerEmail || "FreshCart Seller",
            quantity: item.quantity,
            price: item.price,
            total: item.price * item.quantity
        }));

        try {
            await apiRequest("/orders", {
                method: "POST",
                body: JSON.stringify({
                    buyerEmail: currentSeller?.email || "guest@freshcart.local",
                    items: orderItems,
                    totalAmount: orderItems.reduce((sum, item) => sum + item.total, 0)
                })
            });
        } catch (error) {
            console.warn("Demo order saved locally because API order sync failed:", error.message);
        }
    }

    if (localCart.length > 0) {
        let sales = JSON.parse(localStorage.getItem("sales")) || [];

        localCart.forEach(cartItem => {
            sales.push({
                seller: cartItem.sellerEmail || "FreshCart",
                buyer: currentSeller?.email || "Guest",
                product: cartItem.name,
                quantity: cartItem.quantity,
                total: cartItem.price * cartItem.quantity,
                date: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });

            for (let i = 0; i < localStorage.length; i++) {
                let key = localStorage.key(i);

                if (key.startsWith('sellerProducts_')) {
                    let items = JSON.parse(localStorage.getItem(key)) || [];
                    let index = items.findIndex(p => p.id == cartItem.id);

                    if (index !== -1) {
                        items[index].stock -= cartItem.quantity;

                        if (items[index].stock < 0) {
                            items[index].stock = 0;
                        }

                        localStorage.setItem(key, JSON.stringify(items));
                    }
                }
            }
        });

        localStorage.setItem("sales", JSON.stringify(sales));
    }

    localStorage.removeItem('freshCart');
    await saveCartAndSync([]);
}

function setupDemoPaymentForm() {
    const form = document.getElementById('demo-payment-form');
    const cardNumber = document.getElementById('card-number');

    if (!form) return;

    if (cardNumber) {
        cardNumber.addEventListener('input', () => {
            const digits = cardNumber.value.replace(/\D/g, '').slice(0, 16);
            cardNumber.value = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
        });
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const cleanCard = cardNumber.value.replace(/\D/g, '');
        const expiry = document.getElementById('card-expiry').value.trim();
        const cvv = document.getElementById('card-cvv').value.trim();

        if (cleanCard.length < 12 || !/^\d{2}\/\d{2}$/.test(expiry) || !/^\d{3,4}$/.test(cvv)) {
            return Swal.fire('Check details', 'Enter a valid card, expiry, and CVV.', 'error');
        }

        if (cleanCard === '4000000000000002') {
            return Swal.fire('Payment declined', 'Please try another card.', 'error');
        }

        Swal.fire({
            title: 'Processing payment...',
            text: 'Please wait while we confirm your order.',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        try {
            await new Promise(resolve => setTimeout(resolve, 1200));
            await completeDemoOrder();
            window.location.href = 'payment-success.html';
        } catch (error) {
            Swal.fire('Payment Failed', error.message, 'error');
        }
    });
}


// ==========================================
// 11. SELLER INVENTORY
// ==========================================
function renderInventory() {
    const inventoryList = document.getElementById('inventoryList');

    if (!inventoryList) return;

    inventoryList.innerHTML = sellerProducts.length === 0
        ? `
            <tr>
                <td colspan="7" style="text-align:center; padding:20px;">
                    No items.
                </td>
            </tr>`
        : sellerProducts.map((p, i) => {
            let statusText = 'Normal';
            let statusColor = '#909090';

            if (p.price < p.prevPrice) {
                statusText = 'PRICE DROP';
                statusColor = '#28a745';
            }

            else if (p.price > p.prevPrice) {
                statusText = 'PRICE UP';
                statusColor = '#ff4d4d';
            }

            return `
            <tr style="border-bottom:1px solid #3d2b5d;">
                <td style="padding:10px;">
                    <img src="${p.img}" style="width:50px; height:50px; object-fit:cover; border-radius:5px;">
                </td>

                <td>${p.name}</td>

                <td style="font-weight:bold; color:${p.stock <= 2 ? '#ff4d4d' : '#fff'};">
                    ${p.stock}

                    <button onclick="addStock(${i})"
                        style="background:transparent; border:none; color:#a531ab; cursor:pointer; margin-left:5px;">
                        <i class="fa-solid fa-plus-circle"></i>
                    </button>
                </td>

                <td>₱${p.prevPrice.toLocaleString()}</td>

                <td>
                    <input type="number"
                           id="update-price-${i}"
                           placeholder="New Price"
                           style="width:70px; background:#0f0817; color:#fff; border:1px solid #3d2b5d; border-radius:4px; padding:5px;">

                    <button onclick="updateProductPrice(${i})"
                        style="background:#a531ab; border:none; color:white; padding:5px; border-radius:4px; cursor:pointer;">
                        <i class="fa-solid fa-check"></i>
                    </button>
                </td>

                <td style="color:${statusColor}; font-size:11px;">
                    ${statusText}
                </td>

                <td>
                    <button onclick="deleteProduct(${i})"
                        style="background:#ff4d4d; border:none; color:white; padding:8px; border-radius:5px; cursor:pointer;">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>`;
        }).join('');
}

window.updateProductPrice = function(index) {
    const newPrice = parseInt(document.getElementById(`update-price-${index}`).value);

    if (!newPrice || newPrice <= 0) {
        return Swal.fire('Error', 'Please enter a valid price.', 'error');
    }

    sellerProducts[index].prevPrice = sellerProducts[index].price;
    sellerProducts[index].price = newPrice;

    localStorage.setItem(sellerKey, JSON.stringify(sellerProducts));

    const saveRemote = sellerProducts[index]._id
        ? apiRequest(`/products/${sellerProducts[index]._id}`, {
            method: "PATCH",
            body: JSON.stringify({
                sellerEmail: currentSeller?.email,
                price: newPrice
            })
        })
        : Promise.resolve();

    saveRemote.then(() => Swal.fire({
        icon: 'success',
        title: 'Price Updated!',
        timer: 1000,
        showConfirmButton: false
    }).then(() => location.reload()))
    .catch(error => Swal.fire('Error', error.message, 'error'));
};

window.addStock = function(index) {
    Swal.fire({
        title: 'Add Stock',
        input: 'number',
        inputLabel: 'How many units to add?',
        showCancelButton: true,
        confirmButtonColor: '#a531ab',
    }).then((result) => {
        if (result.isConfirmed && result.value > 0) {
            sellerProducts[index].stock =
                (parseInt(sellerProducts[index].stock) || 0) + parseInt(result.value);

            localStorage.setItem(sellerKey, JSON.stringify(sellerProducts));

            const saveRemote = sellerProducts[index]._id
                ? apiRequest(`/products/${sellerProducts[index]._id}`, {
                    method: "PATCH",
                    body: JSON.stringify({
                        sellerEmail: currentSeller?.email,
                        stock: sellerProducts[index].stock
                    })
                })
                : Promise.resolve();

            saveRemote.then(() => location.reload())
                .catch(error => Swal.fire('Error', error.message, 'error'));
        }
    });
};

window.deleteProduct = function(index) {
    const product = sellerProducts[index];

    sellerProducts.splice(index, 1);

    localStorage.setItem(sellerKey, JSON.stringify(sellerProducts));

    const deleteRemote = product?._id
        ? fetch(`${API_BASE}/products/${product._id}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sellerEmail: currentSeller?.email })
        }).then(async response => {
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.message || "Delete failed.");
        })
        : Promise.resolve();

    deleteRemote.then(() => location.reload())
        .catch(error => Swal.fire('Error', error.message, 'error'));
};


// ==========================================
// 12. ADD PRODUCT FORM
// ==========================================
const addProductForm = document.getElementById('addProductForm');

if (addProductForm) {
    addProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!currentSeller || currentSeller.role !== "seller") {
            return Swal.fire('Seller Login Required', 'Please login with a seller account first.', 'error');
        }

        const imageFile = document.getElementById('pImg').files[0];

        if (!imageFile) {
            return Swal.fire('Error', 'Please select an image.', 'error');
        }

        const formData = new FormData();
        formData.append("image", imageFile);

        try {

            const uploadRes = await fetch(`${API_BASE}/upload`, {
                method: "POST",
                body: formData
            });

            const uploadData = await uploadRes.json();

            if (!uploadData.imageUrl) {
                return Swal.fire('Error', 'Image upload failed.', 'error');
            }

            const initialPrice = parseInt(document.getElementById('pPrice').value);
            const initialStock = parseInt(document.getElementById('pStock').value);

            const productPayload = {
                name: document.getElementById('pName').value,
                brand: document.getElementById('pCategory').value,
                price: initialPrice,
                stock: initialStock,
                img: uploadData.imageUrl,
                sellerEmail: currentSeller.email,
                sellerName: currentSeller.storeName || currentSeller.name || currentSeller.email,
                storeName: currentSeller.storeName || currentSeller.name || currentSeller.email
            };

            let newP;

            try {
                newP = normalizeProduct(await apiRequest("/products", {
                    method: "POST",
                    body: JSON.stringify(productPayload)
                }));
            } catch (apiError) {
                newP = {
                    id: Date.now(),
                    ...productPayload,
                    prevPrice: initialPrice,
                    sellerEmail: currentSeller.email,
                    sellerName: currentSeller.storeName || currentSeller.name || currentSeller.email,
                    storeName: currentSeller.storeName || currentSeller.name || currentSeller.email
                };
            }

            sellerProducts.push(newP);

            localStorage.setItem(sellerKey, JSON.stringify(sellerProducts));

            Swal.fire('Success!', 'Product added successfully!', 'success')
                .then(() => location.reload());

        } catch (error) {
            console.error(error);

            Swal.fire(
                'Error',
                'Cannot upload image. Make sure backend is running.',
                'error'
            );
        }
    });
}
// ==========================================
// 13. SINGLE PRODUCT DISPLAY
// ==========================================
function displaySingleProduct() {
    const mainImg = document.getElementById('MainImg');

    if (!mainImg) return;

    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    const product = getAllProducts().find(p => p.id == productId);

    if (!product) return;

    mainImg.src = product.img;

    const details = document.querySelector('.single-pro-details');

    if (details) {
        if (details.querySelector('h6')) {
            details.querySelector('h6').innerText = `Home / ${product.brand}`;
        }

        if (details.querySelector('h4')) {
            details.querySelector('h4').innerText = product.name;
        }

        if (details.querySelector('h2')) {
            details.querySelector('h2').innerText = `₱${product.price.toLocaleString()}`;
        }

        let storeMeta = details.querySelector('.product-store-name');

        if (!storeMeta) {
            storeMeta = document.createElement('p');
            storeMeta.className = 'product-store-name';
            details.querySelector('h2')?.insertAdjacentElement('afterend', storeMeta);
        }

        storeMeta.innerText = `Store: ${product.storeName || product.sellerName || "FreshCart"}`;

        if (details.querySelector('span')) {
            details.querySelector('span').innerText = `Available Stock: ${product.stock}`;
        }

        const cartBtn = details.querySelector('button');

        if (cartBtn) {
            cartBtn.onclick = () => addToCart(product.id);

            if (product.stock <= 0) {
                cartBtn.innerText = "Out of Stock";
                cartBtn.style.background = "#ccc";
                cartBtn.disabled = true;
            }
        }
    }
}


// ==========================================
// SALES DASHBOARD
// ==========================================
function renderSales() {
    const salesBox = document.getElementById("salesBox");

    if (!salesBox) return;

    let sales = marketplaceOrders.flatMap(order =>
        order.items.map(item => ({
            seller: item.sellerEmail,
            buyer: order.buyerEmail,
            product: item.productName,
            quantity: item.quantity,
            total: item.total,
            date: new Date(order.createdAt).toLocaleDateString() + " " + new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }))
    );

    if (sales.length === 0) {
        sales = JSON.parse(localStorage.getItem("sales")) || [];
    }

    let mySales = sales.filter(
        s => s.seller === currentSeller?.email
    );

    let totalRevenue = mySales.reduce(
        (sum, s) => sum + s.total,
        0
    );

    // =========================
    // ANALYTICS
    // =========================
    let totalOrders = mySales.length;

    let bestProduct = {};

    mySales.forEach(s => {
        bestProduct[s.product] =
            (bestProduct[s.product] || 0) + s.quantity;
    });

    let topProduct = Object.keys(bestProduct).length
        ? Object.entries(bestProduct)
              .sort((a, b) => b[1] - a[1])[0]
        : null;

    // =========================
    // DISPLAY
    // =========================
    salesBox.innerHTML = `
        <div style="
            background:#1a1129;
            padding:20px;
            border-radius:15px;
            margin-top:20px;
            color:white;
            border:1px solid #a531ab;
        ">

            <h2>Sales Dashboard</h2>

            <h3>
                Total Sales:
                ₱${totalRevenue.toLocaleString()}
            </h3>

            <p>
                Total Orders:
                ${totalOrders}
            </p>

            <p>
                Best Selling Product:
                ${
                    topProduct
                    ? `${topProduct[0]} (${topProduct[1]} sold)`
                    : "No data"
                }
            </p>

            ${
                mySales.length === 0
                ? `<p>No sales yet.</p>`

                : mySales.map(s => `
                    <div style="
                        margin-top:10px;
                        padding:10px;
                        background:#2d1b4d;
                        border-radius:10px;
                    ">

                        <strong>
                            ${s.product}
                        </strong>

                        x${s.quantity}

                        <br>

                        ₱${s.total.toLocaleString()}

                        <br><br>

                        <span style="color:#c084fc;">
                            Buyer:
                            ${s.buyer || "Unknown"}
                        </span>

                        <br>

                        <small style="color:#aaa;">
                            ${s.date}
                        </small>

                    </div>
                `).join("")
            }

        </div>
    `;
}


// ==========================================
// CATEGORY OPTIONS
// ==========================================
function renderCategoryOptions() {
    const categorySelect = document.getElementById("categorySelect");

    if (!categorySelect) return;

    const allProducts = getAllProducts();

    const categories = [
        ...new Set(allProducts.map(p => p.brand))
    ];

    categorySelect.innerHTML =
        `<option value="All">All Categories</option>`;

    categories.forEach(category => {
        categorySelect.innerHTML += `
            <option value="${category}">
                ${category}
            </option>
        `;
    });
}

function renderSellers() {
    const container = document.getElementById("sellerContainer");

    if (!container) return;

    if (marketplaceSellers.length === 0) {
        container.innerHTML = `
            <p style="color:#fff; width:100%; text-align:center;">
                No seller accounts yet.
            </p>`;
        return;
    }

    container.innerHTML = marketplaceSellers.map(seller => `
        <div class="pro" style="min-height:190px;">
            <div class="des" style="padding:20px;">
                <span>Registered seller</span>
                <h5>${seller.storeName}</h5>
                <p style="color:#b8b8b8; font-size:12px; word-break:break-word;">${seller.email}</p>
                <h4>${seller.productCount} product${seller.productCount === 1 ? "" : "s"}</h4>
            </div>
        </div>
    `).join("");
}
// ==========================================
// 14. INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    await loadMarketplaceData();
    renderAuthNavLink();
    renderShop();
    renderInventory();
    renderSales();
    displayCart();
    renderDemoCheckout();
    setupDemoPaymentForm();
    updateCartCount();
    renderBudget();
    displaySingleProduct();
    renderCategoryOptions();
    renderSellers();
    renderBestSellers();
    renderUserGreeting();
});

window.logoutUser = function() {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("userToken");
    window.location.href = "login.html";
};

window.showFeatureInfo = function(feature) {
    const featureDetails = {
        budget: {
            title: "Budget Tracker",
            text: "This feature helps buyers set a spending limit before checkout. It warns users if their cart total goes over their budget."
        },
        price: {
            title: "Price Alerts",
            text: "This feature shows price changes such as price drops and price increases, helping buyers find better deals across the marketplace."
        },
        stocks: {
            title: "Live Stocks",
            text: "This feature displays current available stock so buyers know if an item is still available."
        },
        sales: {
            title: "Sales Reports",
            text: "This feature allows sellers to view their total sales, orders, and best-selling products for better business planning."
        },
        secure: {
            title: "Secure Access",
            text: "This feature separates buyer and seller access using login and signup roles for better account protection."
        }
    };

    const selected = featureDetails[feature];

    Swal.fire({
        title: selected.title,
        text: selected.text,
        icon: "info",
        confirmButtonColor: "#a531ab"
    });
};

function renderBestSellers() {

    const container =
        document.getElementById("bestSellerContainer");

    if (!container) return;

    let sales =
        marketplaceOrders.flatMap(order =>
            order.items.map(item => ({
                product: item.productName,
                quantity: item.quantity
            }))
        );

    if (sales.length === 0) {
        sales = JSON.parse(localStorage.getItem("sales")) || [];
    }

    let soldMap = {};

    sales.forEach(s => {
        soldMap[s.product] =
            (soldMap[s.product] || 0) + s.quantity;
    });

    const allProducts = getAllProducts();

    let topProducts = allProducts
        .map(product => ({
            ...product,
            sold: soldMap[product.name] || 0
        }))
        .sort((a, b) => b.sold - a.sold)
        .slice(0, 4);

        container.innerHTML = topProducts.map(p => `
    <div class="pro">
        <img src="${p.img}" alt="${p.name}" onclick="window.location.href='sproduct.html?id=${encodeURIComponent(p.id)}'">

        <div class="des">
            <span>${p.brand}</span>
            <h5>${p.name}</h5>
            <p style="color:#b8b8b8; font-size:12px; margin:4px 0;">
                Store: ${p.storeName || p.sellerName || "FreshCart"}
            </p>
            <h4>₱${p.price.toLocaleString()}</h4>
            <p style="color:#28a745; font-weight:bold;">
                🔥 ${p.sold} sold
            </p>
        </div>

        <a href="javascript:void(0)" onclick='addToCart(${JSON.stringify(p.id)})'>
            <i class="fa-solid fa-cart-shopping cart"></i>
        </a>
    </div>
`).join("");
}
