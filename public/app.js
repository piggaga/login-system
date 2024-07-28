document.getElementById('logout').addEventListener('click', async () => {
    const response = await fetch('/logout', { method: 'POST' });
    const result = await response.json();
    if (response.ok) {
        alert(result.message);
        window.location.href = '/';
    } else {
        alert(result.message);
    }
});

document.getElementById('changePassword').addEventListener('click', async () => {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;

    const response = await fetch('/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
    });
    const result = await response.json();
    alert(result.message);
});

document.getElementById('queryUidButton').addEventListener('click', async () => {
    const uid = document.getElementById('queryUid').value;

    const response = await fetch(`/query-uid?uid=${uid}`);
    const result = await response.json();
    if (response.ok) {
        document.getElementById('queryResult').textContent = `使用者: ${result.username}, 電子郵件: ${result.email}, 登入方式: ${result.loginMethod}`;
    } else {
        document.getElementById('queryResult').textContent = result.message;
    }
});

document.getElementById('deleteAccount').addEventListener('click', async () => {
    const password = document.getElementById('deletePassword').value;

    const response = await fetch('/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
    });
    const result = await response.json();
    alert(result.message);
    if (response.ok) {
        window.location.href = '/';
    }
});
