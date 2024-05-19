let db;

function initDB() {
    let request = window.indexedDB.open("loginDB", 1);

    request.onerror = function(event) {
        showError("無法打開資料庫：" + event.target.errorCode);
    };

    request.onsuccess = function(event) {
        db = event.target.result;
        console.log("資料庫初始化成功。");
    };

    request.onupgradeneeded = function(event) {
        db = event.target.result;
        let objectStore = db.createObjectStore("users", { keyPath: "username" });
        objectStore.createIndex("password", "password", { unique: false });
        objectStore.createIndex("regTime", "regTime", { unique: false });
        objectStore.createIndex("loginHistory", "loginHistory", { unique: false });
        console.log("資料庫升級完成。");
    };
}

function showError(message) {
    let errorDiv = document.getElementById("error");
    errorDiv.textContent = message;
    errorDiv.classList.remove("hidden");
}

function hideError() {
    let errorDiv = document.getElementById("error");
    errorDiv.textContent = "";
    errorDiv.classList.add("hidden");
}

function hashPassword(password) {
    // 使用SHA-256哈希函數進行密碼加密
    const encoder = new TextEncoder();
    return crypto.subtle.digest('SHA-256', encoder.encode(password))
        .then(hash => {
            // 將哈希值轉換為十六進制字符串
            return Array.from(new Uint8Array(hash))
                .map(byte => byte.toString(16).padStart(2, '0'))
                .join('');
        });
}

function register() {
    hideError();

    if (!db) {
        showError("資料庫未初始化，請稍後再試。");
        return;
    }

    let username = document.getElementById("regUsername").value;
    let password = document.getElementById("regPassword").value;

    if (username.trim() === '' || password.trim() === '') {
        showError("用戶名和密碼不能為空。");
        return;
    }

    let regTime = new Date().toLocaleString();

    hashPassword(password).then(hashedPassword => {
        let transaction = db.transaction(["users"], "readwrite");
        let objectStore = transaction.objectStore("users");

        let request = objectStore.add({ username: username, password: hashedPassword, regTime: regTime, loginHistory: [] });

        request.onsuccess = function(event) {
            console.log("註冊成功！");
            window.location.href = "login.html"; // 導向登入頁面
        };

        request.onerror = function(event) {
            showError("註冊失敗：用戶名可能已被使用。");
        };
    }).catch(error => {
        showError("加密密碼時出錯。");
    });
}

function login() {
    hideError();

    if (!db) {
        showError("資料庫未初始化，請稍後再試。");
        return;
    }

    let username = document.getElementById("logUsername").value;
    let password = document.getElementById("logPassword").value;

    if (username.trim() === '' || password.trim() === '') {
        showError("用戶名和密碼不能為空。");
        return;
    }

    hashPassword(password).then(hashedPassword => {
        let transaction = db.transaction(["users"], "readonly");
        let objectStore = transaction.objectStore("users");
        let request = objectStore.get(username);

        request.onsuccess = function(event) {
            let user = event.target.result;
            if (user && user.password === hashedPassword) {
                console.log("登錄成功！");
                getIP().then(ip => {
                    updateLoginHistory(user, ip);
                    sessionStorage.setItem("currentUser", JSON.stringify(user)); // 存儲當前用戶信息
                    window.location.href = "welcome.html"; // 導向歡迎頁面
                }).catch(error => {
                    showError("無法獲取IP地址，請稍後再試。");
                });
            } else {
                showError("登錄失敗：用戶名或密碼錯誤。");
            }
        };

        request.onerror = function(event) {
            showError("登錄失敗，請稍後再試。");
        };
    }).catch(error => {
        showError("加密密碼時出錯。");
    });
}

function getIP() {
    return fetch('https://api.ipify.org?format=json')
        .then(response => response.json())
        .then(data => data.ip)
        .catch(() => {
            throw new Error("無法獲取IP地址");
        });
}

function logout() {
    sessionStorage.removeItem("currentUser"); // 移除當前用戶信息
    window.location.href = "index.html"; // 導向首頁
}

function updateLoginHistory(user, ip) {
    let transaction = db.transaction(["users"], "readwrite");
    let objectStore = transaction.objectStore("users");

    // 添加新的登入記錄
    let newLoginRecord = { time: new Date().toLocaleString(), ip: ip };
    user.loginHistory.push(newLoginRecord);

    // 將更新後的用戶對象保存到IndexedDB中
    let updateRequest = objectStore.put(user);

    updateRequest.onsuccess = function(event) {
        console.log("登錄歷史更新成功。");
    };

    updateRequest.onerror = function(event) {
        showError("更新登錄歷史失敗，請稍後再試。");
    };
}

window.onload = function() {
    initDB();
};

