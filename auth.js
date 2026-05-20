let isLoginMode = true;

// 1. SHOW FORM
window.showAuthForm = function(role) {
    document.getElementById('role-selection').style.display = 'none';
    document.getElementById('auth-box').style.display = 'block';
    document.getElementById('selectedRole').value = role;

    updateFormUI();
};

// 2. TOGGLE LOGIN / SIGNUP
window.toggleMode = function() {
    isLoginMode = !isLoginMode;
    updateFormUI();
};

function updateFormUI() {
    const role = document.getElementById('selectedRole').value;
    const roleUpper = role.toUpperCase();

    document.getElementById('form-title').innerText = isLoginMode ? `Login as ${roleUpper}` : `Signup as ${roleUpper}`;
    document.getElementById('submitBtn').innerText = isLoginMode ? "Login" : "Sign Up";
    document.getElementById('toggleText').innerText = isLoginMode ? "Don't have an account?" : "Already have an account?";
    document.getElementById('toggleLink').innerText = isLoginMode ? "Sign Up" : "Login";

    const sellerFields = document.getElementById('sellerFields');
    const storeName = document.getElementById('storeName');

    if (sellerFields && storeName) {
        const showSellerSignup = !isLoginMode && role === 'seller';
        sellerFields.style.display = showSellerSignup ? 'block' : 'none';
        storeName.required = showSellerSignup;
    }
}

// 3. GO BACK
window.goBack = function() {
    document.getElementById('role-selection').style.display = 'flex';
    document.getElementById('auth-box').style.display = 'none';
};

// 4. AUTHENTICATION LOGIC USING MONGODB API
document.getElementById('authForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const role = document.getElementById('selectedRole').value;
    const storeName = document.getElementById('storeName')?.value.trim();
    const sellerStatus = document.getElementById('sellerStatus')?.value || 'active';

   const endpoint = isLoginMode
  ? "https://freshcart-api-8yqt.onrender.com/api/auth/login"
  : "https://freshcart-api-8yqt.onrender.com/api/auth/signup";

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                password,
                role,
                storeName,
                sellerStatus
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return Swal.fire('Error', data.message || 'Something went wrong.', 'error');
        }

        if (isLoginMode) {
            localStorage.setItem('currentUser', JSON.stringify(data.user));

            Swal.fire({
                icon: 'success',
                title: 'Login Successful!',
                text: `Welcome, ${role}!`,
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                window.location.href = (role === 'seller') ? 'seller.html' : 'index.html';
            });

        } else {
            Swal.fire({
                icon: 'success',
                title: 'Account Created!',
                text: 'You can now login with your account.',
                confirmButtonColor: '#a531ab'
            }).then(() => {
                toggleMode();
            });
        }

    } catch (error) {
        Swal.fire('Error', 'Cannot connect to server. Make sure backend is running.', 'error');
        console.error(error);
    }
});
