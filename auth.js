let isLoginMode = true;
const API_BASE = (!window.location.hostname || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? "http://localhost:5000/api"
    : "https://freshcart-90sw.onrender.com/api";

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
    const buyerFields = document.getElementById('buyerFields');
    const buyerName = document.getElementById('buyerName');

    if (buyerFields && buyerName) {
        const showBuyerSignup = !isLoginMode && role === 'buyer';
        buyerFields.style.display = showBuyerSignup ? 'block' : 'none';
        buyerName.required = showBuyerSignup;
    }

    if (sellerFields && storeName) {
        const showSellerSignup = !isLoginMode && role === 'seller';
        sellerFields.style.display = showSellerSignup ? 'block' : 'none';
        storeName.required = showSellerSignup;
    }
}

function getPasswordIssues(password) {
    const issues = [];

    if (password.length < 8) issues.push('at least 8 characters');
    if (!/[a-z]/.test(password)) issues.push('one lowercase letter');
    if (!/[A-Z]/.test(password)) issues.push('one uppercase letter');
    if (!/[0-9]/.test(password)) issues.push('one number');
    if (!/[^A-Za-z0-9]/.test(password)) issues.push('one special character');

    return issues;
}

// 3. GO BACK
window.goBack = function() {
    document.getElementById('role-selection').style.display = 'flex';
    document.getElementById('auth-box').style.display = 'none';
};

window.forgotPassword = async function() {
    try {
        const emailResult = await Swal.fire({
            title: 'Forgot Password',
            input: 'email',
            inputPlaceholder: 'Enter your account email',
            showCancelButton: true,
            confirmButtonColor: '#a531ab',
            inputValidator: value => {
                if (!value || !value.trim()) {
                    return 'Please enter your email.';
                }
            }
        });

        if (!emailResult.isConfirmed) return;

        const passwordResult = await Swal.fire({
            title: 'Create New Password',
            input: 'password',
            inputPlaceholder: 'Enter a strong password',
            showCancelButton: true,
            confirmButtonColor: '#a531ab',
            inputValidator: value => {
                const passwordIssues = getPasswordIssues((value || '').trim());

                if (passwordIssues.length > 0) {
                    return `Password needs ${passwordIssues.join(', ')}.`;
                }
            }
        });

        if (!passwordResult.isConfirmed) return;

        const response = await fetch(`${API_BASE}/auth/forgot-password`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: emailResult.value.trim().toLowerCase(),
                newPassword: passwordResult.value.trim()
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return Swal.fire('Error', data.message || 'Password reset failed.', 'error');
        }

        Swal.fire('Updated!', 'You can now login with your new password.', 'success');
    } catch (error) {
        Swal.fire('Error', 'Password reset failed. Make sure the backend is running.', 'error');
        console.error(error);
    }
};

// 4. AUTHENTICATION LOGIC USING MONGODB API
document.getElementById('authForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value.trim();
    const role = document.getElementById('selectedRole').value;
    const name = document.getElementById('buyerName')?.value.trim();
    const storeName = document.getElementById('storeName')?.value.trim();

    if (!isLoginMode) {
        const passwordIssues = getPasswordIssues(password);

        if (passwordIssues.length > 0) {
            return Swal.fire({
                icon: 'warning',
                title: 'Use a stronger password',
                html: `Password must include:<br><strong>${passwordIssues.join('<br>')}</strong>`,
                confirmButtonColor: '#a531ab'
            });
        }
    }

   const endpoint = isLoginMode
  ? `${API_BASE}/auth/login`
  : `${API_BASE}/auth/signup`;

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
                name,
                storeName
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return Swal.fire('Error', data.message || 'Something went wrong.', 'error');
        }

        if (isLoginMode) {
    localStorage.setItem('userToken', data.token || 'logged-in'); 
    localStorage.setItem('currentUser', JSON.stringify(data.user)); 

 

            Swal.fire({
                icon: 'success',
                title: 'Login Successful!',
                text: `Welcome, ${data.user.role}!`,
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                if (data.user.role === 'admin') {
                    window.location.href = 'admin.html';
                    return;
                }

                window.location.href = (data.user.role === 'seller') ? 'seller.html' : 'index.html';
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
