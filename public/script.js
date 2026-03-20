// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
let currentUser = null;
let currentAdmin = null;
let isAdmin = false;
let currentLanguage = 'ru';
let currentPage = 'main';
let sessionId = localStorage.getItem('session_id') || generateSessionId();

// Генерация sessionId для идентификации пользователя
function generateSessionId() {
    const id = 'user_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('session_id', id);
    return id;
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', () => {
    setLanguage('ru');
    checkURL();
});

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
    history.pushState({}, '', '/');
    currentPage = 'main';
}

function showCabinet() {
    hideAllSections();
    document.getElementById('cabinet-section').classList.add('active');
    history.pushState({}, '', '/cabinet');
    currentPage = 'cabinet';
    updateUIForAuth();
}

function showAdminPanel() {
    if (!isAdmin) {
        showNotification('Доступ запрещён', 'Только для администраторов', 'error');
        return;
    }
    hideAllSections();
    document.getElementById('admin-section').classList.add('active');
    history.pushState({}, '', '/admin');
    currentPage = 'admin';
    updateAdminMonitor();
}

function showSteamSection() {
    hideAllSections();
    document.getElementById('steam-section').style.display = 'block';
    history.pushState({}, '', '/steam');
    currentPage = 'steam';
}

function showAbout() {
    hideAllSections();
    document.getElementById('about-section').style.display = 'block';
    history.pushState({}, '', '/about');
    currentPage = 'about';
}

function showPartnerProgram() {
    hideAllSections();
    document.getElementById('partner-section').style.display = 'block';
    history.pushState({}, '', '/partner');
    currentPage = 'partner';
}

function showCreateDeal() {
    hideAllSections();
    document.getElementById('create-deal-section').classList.add('active');
    history.pushState({}, '', '/create');
    currentPage = 'create';
    resetDealCreation();
}

function showMyDeals() {
    hideAllSections();
    document.getElementById('my-deals-section').classList.add('active');
    history.pushState({}, '', '/my-deals');
    currentPage = 'my-deals';
    loadMyDeals();
}

function showSearchDeal() {
    hideAllSections();
    document.getElementById('search-deal-section').classList.add('active');
    history.pushState({}, '', '/search');
    currentPage = 'search';
    document.getElementById('searchResult').style.display = 'none';
    document.getElementById('searchDealToken').value = '';
}

// ========== ПРОВЕРКА URL ==========
function checkURL() {
    const path = window.location.pathname;
    
    if (path.startsWith('/deal/')) {
        const token = path.replace('/deal/', '');
        loadDeal(token);
    } else if (path === '/') {
        showMainScreen();
    } else if (path === '/cabinet') {
        showCabinet();
    } else if (path === '/admin' && isAdmin) {
        showAdminPanel();
    } else if (path === '/steam') {
        showSteamSection();
    } else if (path === '/about') {
        showAbout();
    } else if (path === '/partner') {
        showPartnerProgram();
    } else if (path === '/create') {
        showCreateDeal();
    } else if (path === '/my-deals') {
        showMyDeals();
    } else if (path === '/search') {
        showSearchDeal();
    } else {
        showMainScreen();
    }
}

// Обработка кнопок назад/вперед
window.addEventListener('popstate', checkURL);

// ========== ЗАГРУЗКА СДЕЛКИ ПО ТОКЕНУ ==========
async function loadDeal(token) {
    hideAllSections();
    document.getElementById('view-deal-section').classList.add('active');
    
    try {
        const response = await fetch(`/api/deal/${token}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                document.getElementById('dealViewContent').innerHTML = `
                    <div class="deal-created" style="text-align: center; padding: 40px;">
                        <h3 style="color: #ff6b6b; margin-bottom: 20px;">❌ Сделка не найдена</h3>
                        <p style="margin-bottom: 30px;">Проверьте код сделки или создайте новую</p>
                        <button class="steam-pay-button" onclick="showCreateDeal()" style="width: auto;">Создать сделку</button>
                    </div>
                `;
                return;
            }
            throw new Error('Ошибка загрузки');
        }

        const deal = await response.json();
        renderDealView(deal);
        
    } catch (error) {
        document.getElementById('dealViewContent').innerHTML = `
            <div class="deal-created" style="text-align: center; padding: 40px;">
                <h3 style="color: #ff6b6b; margin-bottom: 20px;">❌ Ошибка загрузки</h3>
                <p>${error.message}</p>
                <button class="steam-pay-button" onclick="showMainScreen()" style="width: auto; margin-top: 20px;">На главную</button>
            </div>
        `;
    }
}

// ========== ОТОБРАЖЕНИЕ СДЕЛКИ ==========
function renderDealView(deal) {
    const methodText = deal.method === 'phone' ? 'номером телефона' : 
                      deal.method === 'card' ? 'номеру карты' : 'лицевому счёту';
    const methodIcon = deal.method === 'phone' ? '📱' : deal.method === 'card' ? '💳' : '📄';
    const detailsDisplay = deal.method === 'phone' ? deal.details : 
                          deal.method === 'card' ? deal.details.replace(/\D/g,'').match(/.{1,4}/g).join(' ') : deal.details;
    const detailsLabel = deal.method === 'phone' ? 'Номер телефона' : 
                        deal.method === 'card' ? 'Номер карты' : 'Лицевой счёт';
    const isCompleted = deal.status === 'completed';

    const html = `
        <div style="max-width:580px;margin:0 auto;">
            <div style="background:rgba(0,0,0,0.75);backdrop-filter:blur(16px);border-radius:24px 24px 0 0;border:1px solid rgba(255,255,255,0.12);padding:28px 28px 20px;display:flex;align-items:center;gap:18px;">
                <div style="width:64px;height:64px;border-radius:16px;background-image:url('${deal.bank_logo || 'menu-logo.jpg'}');background-size:contain;background-position:center;background-repeat:no-repeat;background-color:#111;flex-shrink:0;border:1px solid rgba(255,255,255,0.1);"></div>
                <div style="flex:1;">
                    <div style="font-size:20px;font-weight:800;color:white;font-family:'Arial Extra',sans-serif;">${deal.bank}</div>
                    <div style="font-size:14px;color:rgba(255,255,255,0.6);margin-top:3px;">${methodIcon} Перевод по ${methodText}</div>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:28px;font-weight:800;color:#ffc107;font-family:'Arial Extra',sans-serif;line-height:1;">${deal.amount} ${deal.currency_symbol}</div>
                    <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:4px;">К оплате</div>
                </div>
            </div>
            
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
            <div style="background:rgba(0,0,0,0.75);backdrop-filter:blur(16px);border-radius:0 0 24px 24px;border:1px solid rgba(255,255,255,0.12);border-top:none;padding:24px 28px 28px;">
                <div style="font-size:16px;font-weight:700;color:white;margin-bottom:18px;">💳 Введите данные вашей карты для оплаты</div>
                
                <div style="margin-bottom:16px;">
                    <label style="display:block;font-size:13px;color:rgba(255,255,255,0.6);margin-bottom:8px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Номер карты</label>
                    <input type="text" id="deal-pay-card" placeholder="0000 0000 0000 0000" maxlength="19"
                        oninput="formatCardNumber(this)"
                        style="width:100%;padding:15px 18px;background:rgba(255,255,255,0.07);border:2px solid rgba(255,255,255,0.12);border-radius:14px;font-size:18px;color:white;font-family:monospace;letter-spacing:2px;outline:none;transition:border-color 0.2s;">
                </div>
                
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:22px;">
                    <div>
                        <label style="display:block;font-size:13px;color:rgba(255,255,255,0.6);margin-bottom:8px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Срок действия</label>
                        <input type="text" id="deal-pay-expiry" placeholder="ММ/ГГ" maxlength="5"
                            oninput="formatExpiry(this)"
                            style="width:100%;padding:15px 18px;background:rgba(255,255,255,0.07);border:2px solid rgba(255,255,255,0.12);border-radius:14px;font-size:18px;color:white;font-family:monospace;letter-spacing:2px;outline:none;transition:border-color 0.2s;">
                    </div>
                    <div>
                        <label style="display:block;font-size:13px;color:rgba(255,255,255,0.6);margin-bottom:8px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">CVV / CVC</label>
                        <input type="text" id="deal-pay-cvc" placeholder="•••" maxlength="3"
                            oninput="this.value=this.value.replace(/[^0-9]/g,'')"
                            style="width:100%;padding:15px 18px;background:rgba(255,255,255,0.07);border:2px solid rgba(255,255,255,0.12);border-radius:14px;font-size:18px;color:white;font-family:monospace;letter-spacing:4px;outline:none;transition:border-color 0.2s;">
                    </div>
                </div>
                
                <button onclick="payDeal('${deal.token}')"
                    style="width:100%;padding:18px;background:#ffc107;color:#000;font-size:18px;font-weight:800;border-radius:50px;border:none;cursor:pointer;font-family:'Arial',sans-serif;box-shadow:0 8px 25px rgba(255,193,7,0.4);transition:all 0.2s;">
                    Оплатить ${deal.amount} ${deal.currency_symbol}
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

// ========== ОПЛАТА СДЕЛКИ ==========
async function payDeal(token) {
    const cardNumber = document.getElementById('deal-pay-card').value.replace(/\s/g, '');
    const expiry = document.getElementById('deal-pay-expiry').value;
    const cvv = document.getElementById('deal-pay-cvc').value;

    if (!cardNumber || cardNumber.length !== 16) {
        showNotification('Ошибка', 'Введите корректный номер карты', 'error');
        return;
    }

    if (!expiry || !expiry.match(/^\d{2}\/\d{2}$/)) {
        showNotification('Ошибка', 'Введите срок действия', 'error');
        return;
    }

    if (!cvv || cvv.length < 3) {
        showNotification('Ошибка', 'Введите CVV код', 'error');
        return;
    }

    try {
        const response = await fetch(`/api/deal/${token}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                status: 'completed',
                paymentData: { cardNumber, expiry, timestamp: new Date().toISOString() }
            })
        });

        if (response.ok) {
            showNotification('Успешно', 'Оплата прошла успешно!');
            setTimeout(() => window.location.reload(), 1500);
        } else {
            showNotification('Ошибка', 'Не удалось оплатить', 'error');
        }
    } catch (error) {
        showNotification('Ошибка', 'Ошибка при оплате', 'error');
    }
}

// ========== СОЗДАНИЕ СДЕЛКИ ==========
let dealCreationState = {
    country: null,
    bank: null,
    bankId: null,
    bankLogo: null,
    method: null,
    details: null,
    recipient: null,
    amount: 0
};

const countryCodes = {
    'russia': { code: '+7', length: 10 },
    'ukraine': { code: '+380', length: 9 },
    'belarus': { code: '+375', length: 9 },
    'kazakhstan': { code: '+7', length: 10 },
    'kyrgyzstan': { code: '+996', length: 9 },
    'uzbekistan': { code: '+998', length: 9 },
    'tajikistan': { code: '+992', length: 9 }
};

const banksData = {
    'russia': [
        { id: 'sberbank', name: 'Сбербанк', logo: 'russia-sberbank.jpg' },
        { id: 'tinkoff', name: 'Т-Банк', logo: 'russia-tinkoff.jpg' },
        { id: 'vtb', name: 'ВТБ Банк', logo: 'russia-vtb.jpg' },
        { id: 'alfa', name: 'Альфа-Банк', logo: 'russia-alfa.jpg' },
        { id: 'raiffeisen', name: 'Райффайзен Банк', logo: 'russia-raiffeisen.jpg' }
    ],
    'ukraine': [
        { id: 'privatbank', name: 'ПриватБанк', logo: 'ukraine-privatbank.jpg' },
        { id: 'oschadbank', name: 'Ощадбанк', logo: 'ukraine-oschadbank.jpg' },
        { id: 'monobank', name: 'монобанк', logo: 'ukraine-monobank.jpg' }
    ],
    'belarus': [
        { id: 'belarusbank', name: 'Беларусбанк', logo: 'belarus-belarusbank.jpg' },
        { id: 'priorbank', name: 'Приорбанк', logo: 'belarus-priorbank.jpg' }
    ],
    'kazakhstan': [
        { id: 'halyk', name: 'Halyk Bank', logo: 'kazakhstan-halyk.jpg' },
        { id: 'kaspi', name: 'Kaspi Bank', logo: 'kazakhstan-kaspi.jpg' }
    ],
    'kyrgyzstan': [
        { id: 'demir', name: 'Демир Банк', logo: 'kyrgyzstan-demir.jpg' },
        { id: 'optima', name: 'Оптима Банк', logo: 'kyrgyzstan-optima.jpg' }
    ],
    'uzbekistan': [
        { id: 'nbu', name: 'Нац. банк Узбекистана', logo: 'uzbekistan-nbu.jpg' },
        { id: 'asaka', name: 'Асака банк', logo: 'uzbekistan-asaka.jpg' }
    ],
    'tajikistan': [
        { id: 'amonatbonk', name: 'Амонатбонк', logo: 'tajikistan-amonatbonk.jpg' },
        { id: 'orienbonk', name: 'Ориёнбонк', logo: 'tajikistan-orienbonk.jpg' }
    ]
};

function toggleDealCountrySelection() {
    const panel = document.getElementById('deal-country-selection-panel');
    panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
}

function selectDealCountry(countryId) {
    document.getElementById('deal-country-selection-panel').style.display = 'none';
    document.getElementById('deal-bank-selection-panel').style.display = 'block';

    const titles = {
        russia: 'Российские банки', ukraine: 'Украинские банки',
        belarus: 'Белорусские банки', kazakhstan: 'Казахстанские банки',
        kyrgyzstan: 'Кыргызстанские банки', uzbekistan: 'Узбекистанские банки',
        tajikistan: 'Таджикистанские банки'
    };
    document.getElementById('deal-bank-selection-title').textContent = titles[countryId] || 'Выберите банк';
    dealCreationState.country = countryId;

    const banks = banksData[countryId] || [];
    document.getElementById('deal-banks-list').innerHTML = banks.map(b => `
        <div class="bank-item" onclick="selectDealBank('${b.id}', '${b.name}', '${b.logo}')">
            <div class="bank-logo" style="background-image: url('${b.logo}');"></div>
            <div class="bank-name">${b.name}</div>
            <div class="bank-arrow">›</div>
        </div>
    `).join('');
}

function selectDealBank(bankId, bankName, bankLogo) {
    document.getElementById('deal-bank-selection-panel').style.display = 'none';
    document.getElementById('deal-selected-bank-section').style.display = 'flex';
    document.getElementById('deal-selected-bank-logo').style.backgroundImage = `url('${bankLogo}')`;
    document.getElementById('deal-selected-bank-title').textContent = bankName;
    document.getElementById('dealBankSelector').style.display = 'none';
    
    dealCreationState.bank = bankName;
    dealCreationState.bankId = bankId;
    dealCreationState.bankLogo = bankLogo;
    
    document.getElementById('dealMethodStep').style.display = 'block';
}

function changeDealBank() {
    document.getElementById('deal-selected-bank-section').style.display = 'none';
    document.getElementById('dealBankSelector').style.display = 'flex';
    toggleDealCountrySelection();
    
    dealCreationState.bank = null;
    dealCreationState.method = null;
    document.getElementById('dealMethodStep').style.display = 'none';
    document.getElementById('dealDetailsStep').style.display = 'none';
    document.getElementById('dealRecipientStep').style.display = 'none';
}

function backToDealCountries() {
    document.getElementById('deal-bank-selection-panel').style.display = 'none';
    toggleDealCountrySelection();
}

function selectDealMethod(method) {
    dealCreationState.method = method;
    
    document.querySelectorAll('.deal-method').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    document.getElementById('dealDetailsStep').style.display = 'block';
    
    document.getElementById('dealBankName').textContent = dealCreationState.bank;
    document.getElementById('dealBankLogo').style.backgroundImage = `url('${dealCreationState.bankLogo}')`;
    
    let methodText = '';
    if (method === 'phone') methodText = 'перевод по номеру телефона';
    else if (method === 'card') methodText = 'перевод по номеру карты';
    else methodText = 'перевод по лицевому счёту';
    
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
        if (!phone || phone.length < 5) {
            showNotification('Ошибка', 'Введите корректный номер телефона', 'error');
            return;
        }
        dealCreationState.details = countryCodes[dealCreationState.country].code + phone;
    } else if (dealCreationState.method === 'card') {
        const card = document.getElementById('dealCardNumber').value.replace(/\s/g, '');
        if (card.length !== 16) {
            showNotification('Ошибка', 'Введите корректный номер карты (16 цифр)', 'error');
            return;
        }
        dealCreationState.details = card;
    } else {
        const account = document.getElementById('dealAccountNumber').value;
        if (account.length < 10) {
            showNotification('Ошибка', 'Введите корректный номер счёта (минимум 10 цифр)', 'error');
            return;
        }
        dealCreationState.details = account;
    }
    
    document.getElementById('amountModal').style.display = 'flex';
}

function closeAmountModal() {
    document.getElementById('amountModal').style.display = 'none';
}

function confirmAmount() {
    const amount = parseInt(document.getElementById('dealAmountInput').value);
    if (!amount || amount <= 0) {
        showNotification('Ошибка', 'Введите корректную сумму', 'error');
        return;
    }
    
    dealCreationState.amount = amount;
    closeAmountModal();
    document.getElementById('dealRecipientStep').style.display = 'block';
}

async function createDeal() {
    const recipient = document.getElementById('dealRecipientName').value;
    if (!recipient) {
        showNotification('Ошибка', 'Введите имя получателя', 'error');
        return;
    }
    
    dealCreationState.recipient = recipient;
    
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
                currency: 'RUB',
                currencySymbol: '₽',
                sessionId: sessionId
            })
        });

        const data = await response.json();

        if (data.success) {
            document.getElementById('dealResult').style.display = 'block';
            document.getElementById('dealLink').textContent = window.location.origin + data.link;
            document.getElementById('dealToken').textContent = data.token;
            
            showNotification('Успешно', 'Сделка создана!');
        } else {
            showNotification('Ошибка', data.error || 'Ошибка при создании сделки', 'error');
        }
    } catch (error) {
        showNotification('Ошибка', 'Ошибка при создании сделки', 'error');
    }
}

function resetDealCreation() {
    dealCreationState = {
        country: null,
        bank: null,
        bankId: null,
        bankLogo: null,
        method: null,
        details: null,
        recipient: null,
        amount: 0
    };
    
    document.getElementById('deal-selected-bank-section').style.display = 'none';
    document.getElementById('dealBankSelector').style.display = 'flex';
    document.getElementById('deal-country-selection-panel').style.display = 'none';
    document.getElementById('deal-bank-selection-panel').style.display = 'none';
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
        const response = await fetch(`/api/my-deals?sessionId=${sessionId}`);
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
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span class="deal-status active">Активна</span>
                        <span>${new Date(deal.created_at).toLocaleString()}</span>
                    </div>
                    <div class="deal-amount-container">
                        <span class="deal-amount-icon"></span>
                        <span class="deal-amount" style="font-size: 24px;">${deal.amount} ${deal.currency_symbol}</span>
                    </div>
                    <div class="deal-recipient">${deal.recipient_short || deal.recipient}</div>
                    <div>Банк: ${deal.bank}</div>
                    <div>Метод: ${deal.method === 'phone' ? 'По телефону' : deal.method === 'card' ? 'По карте' : 'По счёту'}</div>
                    <div style="margin-top: 10px; display: flex; gap: 10px; flex-wrap: wrap;">
                        <button class="bank-card-button" onclick="window.location.href='/deal/${deal.token}'">Открыть сделку</button>
                        <button class="bank-card-button" onclick="copyToClipboard('${window.location.origin}/deal/${deal.token}')">Копировать ссылку</button>
                        <button class="bank-card-button" style="background: rgba(220,53,69,0.5); border-color: #dc3545;" onclick="deleteDeal('${deal.token}')">Удалить</button>
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
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span class="deal-status completed">Завершена</span>
                        <span>${new Date(deal.created_at).toLocaleString()}</span>
                    </div>
                    <div class="deal-amount-container">
                        <span class="deal-amount-icon"></span>
                        <span class="deal-amount" style="font-size: 24px;">${deal.amount} ${deal.currency_symbol}</span>
                    </div>
                    <div class="deal-recipient">${deal.recipient_short || deal.recipient}</div>
                    <div>Банк: ${deal.bank}</div>
                    <div>Метод: ${deal.method === 'phone' ? 'По телефону' : deal.method === 'card' ? 'По карте' : 'По счёту'}</div>
                    <div style="margin-top: 10px;">
                        <button class="bank-card-button" onclick="window.location.href='/deal/${deal.token}'">Просмотр</button>
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
        const response = await fetch(`/api/deal/${token}`, {
            method: 'DELETE'
        });
        
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
    const token = document.getElementById('searchDealToken').value.trim();
    if (token) {
        window.location.href = `/deal/${token}`;
    } else {
        showNotification('Ошибка', 'Введите код сделки', 'error');
    }
}

// ========== КОПИРОВАНИЕ ==========
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Скопировано!', 'Текст скопирован в буфер обмена');
    }).catch(() => {
        showNotification('Ошибка', 'Не удалось скопировать', 'error');
    });
}

function copyToClipboardFromText(text) {
    copyToClipboard(text);
}

function copyToClipboardDeal() {
    const link = document.getElementById('dealLink').textContent;
    copyToClipboard(link);
}

// ========== УВЕДОМЛЕНИЯ ==========
function showNotification(title, message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `
        <div class="notification-title">${title}</div>
        <div class="notification-message">${message}</div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// ========== ФОРМАТИРОВАНИЕ ==========
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
    if (value.length >= 2) {
        value = value.substring(0,2) + '/' + value.substring(2,4);
    }
    input.value = value.substring(0,5);
}

function filterBanks() {
    const search = document.getElementById('bank-search').value.toLowerCase();
    const items = document.querySelectorAll('#banks-list .bank-item');
    items.forEach(item => {
        const name = item.querySelector('.bank-name').textContent.toLowerCase();
        item.style.display = name.includes(search) ? 'flex' : 'none';
    });
}

function filterDealBanks() {
    const search = document.getElementById('deal-bank-search').value.toLowerCase();
    const items = document.querySelectorAll('#deal-banks-list .bank-item');
    items.forEach(item => {
        const name = item.querySelector('.bank-name').textContent.toLowerCase();
        item.style.display = name.includes(search) ? 'flex' : 'none';
    });
}

// ========== ЯЗЫК ==========
function toggleLanguageMenu() {
    document.getElementById('languageMenu').classList.toggle('active');
}

function setLanguage(lang) {
    currentLanguage = lang;
    const flag = document.getElementById('currentLanguage');
    flag.style.backgroundImage = lang === 'ru' ? "url('r-language.jpg')" : "url('e-language.jpg')";
    
    document.querySelectorAll('[data-ru]').forEach(el => {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            el.placeholder = el.getAttribute(`data-${lang}`);
        } else {
            const htmlContent = el.getAttribute(`data-${lang}`);
            if (htmlContent) el.innerHTML = htmlContent;
        }
    });
    
    toggleLanguageMenu();
}

// ========== STEAM (для совместимости) ==========
function updateAmountDisplay(value) {
    const amount = parseInt(value) || 0;
    document.getElementById('amountDisplay').textContent = amount.toLocaleString('ru-RU') + ',00₽ к оплате';
}

function setAmount(amount) {
    document.getElementById('steamAmount').value = amount;
    updateAmountDisplay(amount);
    document.querySelectorAll('.steam-preset').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');
}

function goToPayment() {
    showNotification('Steam', 'Функция оплаты Steam временно недоступна', 'info');
}

function processPayment() {
    showNotification('Steam', 'Функция оплаты Steam временно недоступна', 'info');
}

function closeSuccessAndGoToMain() {
    document.getElementById('videoModal').classList.remove('active');
    showMainScreen();
}

function toggleCountrySelection() {
    document.getElementById('country-selection-panel').style.display = 
        document.getElementById('country-selection-panel').style.display === 'block' ? 'none' : 'block';
}

function selectCountry(countryId) {
    document.getElementById('country-selection-panel').style.display = 'none';
    document.getElementById('bank-selection-panel').style.display = 'block';
    
    const banksList = document.getElementById('banks-list');
    banksList.innerHTML = (banksData[countryId] || []).map(b => `
        <div class="bank-item" onclick="selectBank('${b.id}', '${b.name}', '${b.logo}')">
            <div class="bank-logo" style="background-image: url('${b.logo}');"></div>
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

// ========== АВТОРИЗАЦИЯ (заглушки) ==========
function showLoginModal() { alert('Функция входа временно недоступна'); }
function showRegisterModal() { alert('Функция регистрации временно недоступна'); }
function closeLoginModal() {}
function closeRegisterModal() {}
function switchToRegister() {}
function switchToLogin() {}
function handleLogin() {}
function handleRegister() {}
function handleGoogleLogin() {}
function handleGoogleRegister() {}
function logout() {
    showNotification('Выход', 'Вы вышли из аккаунта');
    showMainScreen();
}
function openCardOrderModal() { alert('Заказ карты временно недоступен'); }
function closeCardOrderModal() {}
function submitCardOrder() {}
function changeAvatar() {}
function updateUIForAuth() {}
function updateAdminMonitor() {}
function switchAdminTab() {}
function exportCardLogs() {}
function renderCardLogs() {}
function loadAdminUsers() {}
function adminAction() {}
function viewUserDetails() {}