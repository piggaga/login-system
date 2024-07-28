document.addEventListener('DOMContentLoaded', () => {
    const showProgressRing = () => {
        const progressContainer = document.getElementById('progress-container');
        const progressCircle = document.querySelector('.progress-ring__circle__progress');
        progressContainer.style.display = 'block';
        progressCircle.style.strokeDashoffset = '0';
    };

    const hideProgressRing = () => {
        const progressContainer = document.getElementById('progress-container');
        const progressCircle = document.querySelector('.progress-ring__circle__progress');
        progressContainer.style.display = 'none';
        progressCircle.style.strokeDashoffset = '126';
    };

    document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        showProgressRing();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (data.success) {
            window.location.href = 'dashboard.html';
        } else {
            alert(data.message);
            hideProgressRing();
        }
    });

    document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        showProgressRing();
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const response = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        const data = await response.json();
        if (data.success) {
            window.location.href = 'index.html';
        } else {
            alert(data.message);
            hideProgressRing();
        }
    });

    document.getElementById('forgotPasswordForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        showProgressRing();
        const email = document.getElementById('email').value;
        const response = await fetch('/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await response.json();
        alert(data.message);
        if (data.success) {
            window.location.href = 'index.html';
        } else {
            hideProgressRing();
        }
    });

    document.getElementById('resetPasswordForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        showProgressRing();
        const newPassword = document.getElementById('newPassword').value;
        const token = document.getElementById('token').value;
        const response = await fetch('/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newPassword, token })
        });
        const data = await response.json();
        alert(data.message);
        if (data.success) {
            window.location.href = 'index.html';
        } else {
            hideProgressRing();
        }
    });

    document.getElementById('logoutButton')?.addEventListener('click', async () => {
        showProgressRing();
        const response = await fetch('/logout', { method: 'POST' });
        const data = await response.json();
        if (data.success) {
            window.location.href = 'index.html';
        } else {
            alert(data.message);
            hideProgressRing();
        }
    });

    document.getElementById('deleteAccountButton')?.addEventListener('click', async () => {
        if (confirm('確定要註銷帳號嗎？')) {
            showProgressRing();
            const response = await fetch('/delete-account', { method: 'DELETE' });
            const data = await response.json();
            if (data.success) {
                window.location.href = 'index.html';
            } else {
                alert(data.message);
                hideProgressRing();
            }
        }
    });

    document.getElementById('changePasswordButton')?.addEventListener('click', () => {
        const newPassword = prompt('請輸入新密碼：');
        if (newPassword) {
            showProgressRing();
            fetch('/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newPassword })
            }).then(response => response.json()).then(data => {
                alert(data.message);
                if (!data.success) {
                    hideProgressRing();
                }
            });
        }
    });
});
