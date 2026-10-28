// Mobile navigation (button toggle, Esc to close, focus returns to button)
document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('navToggle');
    const links = document.getElementById('navLinks');
    if (!toggle || !links) return;
    const setOpen = (open, returnFocus) => {
        links.classList.toggle('is-open', open);
        toggle.classList.toggle('is-active', open);
        toggle.setAttribute('aria-expanded', String(open));
        if (!open && returnFocus) toggle.focus();
    };
    toggle.addEventListener('click', () => setOpen(!links.classList.contains('is-open')));
    links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && links.classList.contains('is-open')) setOpen(false, true);
    });
    window.matchMedia('(min-width: 961px)').addEventListener('change', e => { if (e.matches) setOpen(false); });
});

// Contact page: keyboard-accessible tour scheduling calendar
document.addEventListener('DOMContentLoaded', () => {
    const daysGrid = document.getElementById('daysGrid');
    if (!daysGrid) return;
    const monthYearLabel = document.getElementById('monthYearLabel');
    const timePopup = document.getElementById('timePopup');
    const selectedDateText = document.getElementById('selectedDateText');
    const timeSelect = document.getElementById('timeSlot');
    const widget = daysGrid.closest('.calendar-widget');
    const status = document.createElement('p');
    status.className = 'schedule-status';
    status.setAttribute('role', 'status');
    widget.insertAdjacentElement('afterend', status);

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const currentDate = new Date();
    currentDate.setDate(1);
    let selectedButton = null;

    function closePopup(returnFocus) {
        timePopup.classList.remove('is-visible');
        daysGrid.querySelectorAll('.day-cell').forEach(c => { c.classList.remove('active-day'); c.setAttribute('aria-pressed', 'false'); });
        if (returnFocus && selectedButton) selectedButton.focus();
    }

    function renderCalendar() {
        daysGrid.innerHTML = '';
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        monthYearLabel.textContent = `${monthNames[month]} ${year}`;
        const firstDayIndex = new Date(year, month, 1).getDay();
        const totalDays = new Date(year, month + 1, 0).getDate();

        for (let i = 0; i < firstDayIndex; i++) {
            const empty = document.createElement('div');
            empty.className = 'day-cell empty-cell';
            empty.setAttribute('aria-hidden', 'true');
            daysGrid.appendChild(empty);
        }
        for (let day = 1; day <= totalDays; day++) {
            const cell = document.createElement('button');
            cell.type = 'button';
            cell.className = 'day-cell';
            cell.textContent = day;
            cell.setAttribute('aria-pressed', 'false');
            cell.setAttribute('aria-label', `${monthNames[month]} ${day}, ${year}`);
            cell.addEventListener('click', () => {
                closePopup(false);
                selectedButton = cell;
                cell.classList.add('active-day');
                cell.setAttribute('aria-pressed', 'true');
                selectedDateText.textContent = `${monthNames[month]} ${day}`;
                timePopup.classList.add('is-visible');
                const containerWidth = daysGrid.parentElement.offsetWidth;
                const popupWidth = timePopup.offsetWidth;
                let leftPos = cell.offsetLeft - 20;
                if (leftPos < 10) leftPos = 10;
                else if (leftPos + popupWidth > containerWidth - 10) leftPos = containerWidth - popupWidth - 10;
                timePopup.style.top = `${cell.offsetTop + 36}px`;
                timePopup.style.left = `${leftPos}px`;
                timeSelect?.focus();
            });
            daysGrid.appendChild(cell);
        }
    }

    document.getElementById('prevMonth')?.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); closePopup(false); renderCalendar(); });
    document.getElementById('nextMonth')?.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); closePopup(false); renderCalendar(); });
    document.getElementById('closePopupBtn')?.addEventListener('click', () => closePopup(true));
    timePopup.addEventListener('keydown', e => { if (e.key === 'Escape') closePopup(true); });
    document.getElementById('confirmTimeBtn')?.addEventListener('click', () => {
        if (!timeSelect.value) {
            status.textContent = 'Please choose a time before confirming.';
            timeSelect.focus();
            return;
        }
        status.textContent = `Selected: ${selectedDateText.textContent} at ${timeSelect.options[timeSelect.selectedIndex].text}.`;
        closePopup(true);
    });
    renderCalendar();
});

// Properties gallery (buttons, arrow keys, alt text follows the slide)
document.addEventListener('DOMContentLoaded', () => {
    const mainImg = document.getElementById('mainSlide');
    const counter = document.getElementById('slideCounter');
    const thumbs = Array.from(document.querySelectorAll('.thumb-item'));
    if (!mainImg || !counter || !thumbs.length) return;
    let index = 0;
    const show = i => {
        index = (i + thumbs.length) % thumbs.length;
        const t = thumbs[index];
        mainImg.src = t.dataset.src;
        mainImg.alt = t.dataset.alt;
        counter.textContent = `${index + 1}/${thumbs.length}`;
        thumbs.forEach((th, n) => {
            th.classList.toggle('active', n === index);
            th.setAttribute('aria-current', n === index ? 'true' : 'false');
        });
    };
    document.querySelectorAll('[data-slide-dir]').forEach(b => b.addEventListener('click', () => show(index + Number(b.dataset.slideDir))));
    thumbs.forEach((t, n) => t.addEventListener('click', () => show(n)));
    mainImg.closest('.properties-gallery').addEventListener('keydown', e => {
        if (e.key === 'ArrowLeft') show(index - 1);
        if (e.key === 'ArrowRight') show(index + 1);
    });
});

// PRICING - single source of truth. Change a price here and the rate dropdown, the calculator and the booking modal all follow.
const RATES = {
    weeknight: 80,        // per night, Sun-Thu nights
    weekend: 88,          // per night, Fri & Sat nights
    monthly: 800,         // per full block of monthLength nights
    monthLength: 30,
    commercialMonthly: 800, // commercial lease: price per month of the lease term (3-5 years)
    serviceFee: 0.15,     // added on top of the base rate
    capAtMonthly: false   // true = a partial month never costs more than one monthly rate
};

const RENT_CONFIG = {
    'commercial': { taxRate: RATES.serviceFee },
    'residential': { taxRate: RATES.serviceFee }
};

const ADDON_PRICES = { 'feature1': 25, 'feature2': 35, 'feature3': 15, 'feature4': 50 };

const INVEST_CONFIG = {
    'commercial': 0.182, // 18.2% annual yield
    'residential': 0.125 // 12.5% annual yield
};

const DAY_MS = 86400000;
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const money = n => new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2
}).format(n);
// 'YYYY-MM-DD' -> UTC midnight, so time zones and daylight saving can never shift a night
const parseDay = s => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };

const fmtDay = ms => new Date(ms).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });

// Commercial lease: monthly rate x every month of the 3-5 year term
function calculateLease(startStr, yearsStr) {
    const years = parseInt(yearsStr, 10);
    if (!startStr || !years) return { valid: false, reason: !startStr ? 'lease-start' : 'lease-term' };
    const [y, m, d] = startStr.split('-').map(Number);
    const months = years * 12;
    return { valid: true, years, months, startMs: Date.UTC(y, m - 1, d), endMs: Date.UTC(y + years, m - 1, d),
             base: months * RATES.commercialMonthly };
}

// Prices a stay night by night. A "night" belongs to the day you sleep: Fri/Sat nights are weekend rate.
// Every full 30 nights is billed at the monthly rate; leftover nights are billed nightly.
function calculateStay(startStr, endStr) {
    if (!startStr || !endStr) return { valid: false, reason: 'missing' };
    const start = parseDay(startStr);
    const nights = Math.round((parseDay(endStr) - start) / DAY_MS);
    if (nights < 1) return { valid: false, reason: 'order' };

    const months = Math.floor(nights / RATES.monthLength);
    let weekday = 0, weekend = 0;
    for (let i = months * RATES.monthLength; i < nights; i++) {
        const dow = new Date(start + i * DAY_MS).getUTCDay(); // 5 = Friday, 6 = Saturday
        if (dow === 5 || dow === 6) weekend++; else weekday++;
    }
    const extra = weekday + weekend;
    const capped = RATES.capAtMonthly && (weekday * RATES.weeknight + weekend * RATES.weekend) > RATES.monthly;

    const lines = [];
    if (months) lines.push([`Monthly rate (${months} × ${money(RATES.monthly)})`, months * RATES.monthly]);
    if (capped) {
        lines.push([`Monthly rate for the last ${plural(extra, 'night')}`, RATES.monthly]);
    } else {
        if (weekday) lines.push([`${plural(weekday, 'week night')} × ${money(RATES.weeknight)}`, weekday * RATES.weeknight]);
        if (weekend) lines.push([`${plural(weekend, 'weekend night')} × ${money(RATES.weekend)}`, weekend * RATES.weekend]);
    }
    return { valid: true, nights, lines, base: lines.reduce((sum, [, amount]) => sum + amount, 0) };
}

const withFee = (base, rate) => { const fee = Math.round(base * rate * 100) / 100; return { fee, total: base + fee }; };
const row = (label, value) => `<div class="breakdown-item"><span>${label} =</span> <b>${value}</b></div>`;
const note = text => `<div class="breakdown-item"><span>${text}</span></div>`;

// Open/Close Modal Handlers
function openPaymentModal() {
    const modal = document.getElementById('paymentModal');
    if (modal) {
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
    }
}

function closePaymentModal() {
    const modal = document.getElementById('paymentModal');
    if (modal) {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
    }
}

// Toggle between Short-Term Residential vs Commercial Lease fields
function toggleModalLeaseFields(intent) {
    const resFields = document.getElementById('modalResidentialFields');
    const commFields = document.getElementById('modalCommercialFields');
    const checkin = document.getElementById('modal-checkin');
    const checkout = document.getElementById('modal-checkout');
    const commStart = document.getElementById('modal-comm-start');
    const totalOutput = document.getElementById('modalTotalOutput');

    if (intent === 'commercial') {
        resFields.style.display = 'none';
        commFields.style.display = 'flex';
        checkin.required = false;
        checkout.required = false;
        commStart.required = true;
        totalOutput.textContent = "Commercial Lease Inquiry";
    } else {
        resFields.style.display = 'flex';
        commFields.style.display = 'none';
        checkin.required = true;
        checkout.required = true;
        commStart.required = false;
        recalculateModalTotal();
    }
}

// Switch Payment Method Panel
function switchModalPaymentTab(type) {
    const cardPanel = document.getElementById('modalCardFields');
    const expressPanel = document.getElementById('modalExpressFields');
    const tabs = document.querySelectorAll('.payment-tabs .pay-tab');

    tabs.forEach(t => t.classList.remove('active'));
    event.currentTarget.classList.add('active');

    if (type === 'card') {
        cardPanel.style.display = 'block';
        expressPanel.style.display = 'none';
        ['cardName', 'cardNumber', 'cardExp', 'cardCvc'].forEach(id => {
            document.getElementById(id).required = true;
        });
    } else {
        cardPanel.style.display = 'none';
        expressPanel.style.display = 'block';
        ['cardName', 'cardNumber', 'cardExp', 'cardCvc'].forEach(id => {
            document.getElementById(id).required = false;
        });
    }
}

// Booking modal total - uses the same pricing as the calculator
function recalculateModalTotal() {
    const totalOutput = document.getElementById('modalTotalOutput');
    if (!totalOutput) return;
    const stay = calculateStay(document.getElementById('modal-checkin')?.value, document.getElementById('modal-checkout')?.value);
    if (!stay.valid) { totalOutput.textContent = '$0.00 USD'; return; }
    totalOutput.textContent = `${money(withFee(stay.base, RATES.serviceFee).total)} USD`;
}

// Submission trigger ready for backend integration
function handlePaymentSubmit(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    console.log("Secure Payment Payload Ready for Backend API:", data);
    alert("Reservation request processed! Connecting to payment gateway backend...");
    closePaymentModal();
}

// Rent Calculator Logic
function calculateRentCost() {
    const propType = document.getElementById('rent-property-type')?.value || 'commercial';
    if (propType === 'commercial') { calculateCommercialLease(); return; }
    const startInput = document.getElementById('rent-start');
    const endInput = document.getElementById('rent-end');
    const totalDisplay = document.getElementById('total-amount-rent');
    const breakdown = document.getElementById('breakdown-rent');
    const stay = calculateStay(startInput?.value, endInput?.value);

    [startInput, endInput].forEach(el => el?.setAttribute('aria-invalid', String(!stay.valid)));
    if (!stay.valid) {
        if (totalDisplay) totalDisplay.textContent = '$0';
        if (breakdown) breakdown.innerHTML = note(stay.reason === 'order' ? 'Check-out must be after check-in.' : 'Choose both a start date and an end date.');
        return;
    }

    let addonTotal = 0;
    document.querySelectorAll('#form-rent input[name="addon"]:checked').forEach(box => { addonTotal += ADDON_PRICES[box.value] || 0; });

    const feeRate = (RENT_CONFIG[propType] || RENT_CONFIG['commercial']).taxRate;
    const { fee, total } = withFee(stay.base + addonTotal, feeRate);

    if (totalDisplay) totalDisplay.textContent = money(total);
    if (breakdown) {
        breakdown.innerHTML =
            row('Length of Stay', plural(stay.nights, 'night')) +
            stay.lines.map(([label, amount]) => row(label, money(amount))).join('') +
            (addonTotal ? row('Add-ons', money(addonTotal)) : '') +
            row(`Service Fees (${Math.round(feeRate * 100)}%)`, money(fee));
    }
}

function calculateCommercialLease() {
    const startInput = document.getElementById('lease-start');
    const termInput = document.getElementById('lease-duration');
    const totalDisplay = document.getElementById('total-amount-rent');
    const breakdown = document.getElementById('breakdown-rent');
    const lease = calculateLease(startInput?.value, termInput?.value);

    startInput?.setAttribute('aria-invalid', String(!lease.valid && lease.reason === 'lease-start'));
    termInput?.setAttribute('aria-invalid', String(!lease.valid && lease.reason === 'lease-term'));
    if (!lease.valid) {
        if (totalDisplay) totalDisplay.textContent = '$0';
        if (breakdown) breakdown.innerHTML = note(lease.reason === 'lease-start' ? 'Choose a lease start date.' : 'Choose a lease duration (3-5 years).');
        return;
    }
    const { fee, total } = withFee(lease.base, RATES.serviceFee);
    if (totalDisplay) totalDisplay.textContent = money(total);
    if (breakdown) {
        breakdown.innerHTML =
            row('Lease Term', `${plural(lease.years, 'year')} (${lease.months} months)`) +
            row('Lease Period', `${fmtDay(lease.startMs)} – ${fmtDay(lease.endMs)}`) +
            row(`Lease Rate (${lease.months} × ${money(RATES.commercialMonthly)})`, money(lease.base)) +
            row(`Service Fees (${Math.round(RATES.serviceFee * 100)}%)`, money(fee));
    }
}

// Investment ROI Calculator Logic
function calculateInvestROI(isInvestPage = false) {
    const sfx = isInvestPage ? '-page' : '';
    const capital = parseFloat(document.getElementById('invest-capital' + sfx)?.value) || 0;
    const strategy = document.getElementById('invest-strategy' + sfx)?.value || 'commercial';
    const targetEl = document.getElementById('invest-target' + sfx);
    const years = parseFloat(targetEl?.value);
    const totalDisplay = document.getElementById('total-amount-invest');
    const breakdown = document.getElementById(isInvestPage ? 'breakdown-invest-page' : 'breakdown-invest');

    if (!capital || !years) {
        if (totalDisplay) totalDisplay.textContent = '$0';
        if (breakdown) breakdown.innerHTML = note(!capital ? 'Move the slider to choose an investment amount.' : 'Choose a target holding period.');
        return;
    }

    const yieldRate = INVEST_CONFIG[strategy] || INVEST_CONFIG['commercial'];
    const annualYield = capital * yieldRate;
    const netProfit = annualYield * years;

    if (totalDisplay) totalDisplay.textContent = money(Math.round(capital + netProfit));
    if (breakdown) {
        breakdown.innerHTML =
            row('Initial Capital', money(capital)) +
            row(`Target Annual Yield (${(yieldRate * 100).toFixed(1)}%)`, `${money(Math.round(annualYield))}/yr`) +
            row('Holding Duration', targetEl.options[targetEl.selectedIndex].text) +
            row('Estimated Net Profit', money(Math.round(netProfit))) +
            `<a href="${isInvestPage ? '#form' : 'Invest.html#form'}" class="btn-prospectus">${isInvestPage ? 'Request Full Prospectus' : 'Inquire About Investment'}</a>`;
    }
}

// Calculator wiring
document.addEventListener('DOMContentLoaded', () => {
    // Rate dropdown labels come from RATES so they can never disagree with the calculator
    const rateLabels = {
        weeknight: `${money(RATES.weeknight)} USD / Week Night`,
        weekend: `${money(RATES.weekend)} USD / Weekend Night`,
        monthly: `${money(RATES.monthly)} USD / Month`
    };
    document.querySelectorAll('#price-rate-select option').forEach(o => { if (rateLabels[o.value]) o.textContent = rateLabels[o.value]; });

    // Commercial = lease start date + 3-5 year term; Residential = start/end stay dates
    const typeSelect = document.getElementById('rent-property-type');
    const stayGroup = document.getElementById('rent-stay-group');
    const leaseGroup = document.getElementById('rent-lease-group');
    if (typeSelect && stayGroup && leaseGroup) {
        const leaseStart = document.getElementById('lease-start');
        if (leaseStart) { const n = new Date(); leaseStart.min = new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())).toISOString().slice(0, 10); }
        const syncType = () => {
            const commercial = typeSelect.value === 'commercial';
            leaseGroup.hidden = !commercial;
            stayGroup.hidden = commercial;
        };
        typeSelect.addEventListener('change', syncType);
        syncType();
    }

    // Calculate on click / Enter, then keep the result live as inputs change
    document.querySelectorAll('.calc-mode-form').forEach(form => {
        const run = () => {
            form.dataset.calculated = 'true';
            if (form.id === 'form-rent') calculateRentCost();
            else calculateInvestROI(document.body.classList.contains('invest-page'));
        };
        form.addEventListener('submit', e => { e.preventDefault(); run(); });
        form.querySelectorAll('.btn-calculate[type="button"]').forEach(b => b.addEventListener('click', run));
        const live = () => { if (form.dataset.calculated) run(); };
        form.addEventListener('change', live);
        form.addEventListener('input', live);
    });

    // Date pickers: no past start dates, end date must be after the start date
    const pairs = [['rent-start', 'rent-end'], ['modal-checkin', 'modal-checkout']];
    const now = new Date();
    const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const iso = ms => new Date(ms).toISOString().slice(0, 10);
    pairs.forEach(([startId, endId]) => {
        const start = document.getElementById(startId), end = document.getElementById(endId);
        if (!start || !end) return;
        start.min = iso(todayUtc);
        const syncEnd = () => { end.min = iso((start.value ? parseDay(start.value) : todayUtc) + DAY_MS); };
        start.addEventListener('change', () => { syncEnd(); if (end.value && end.value <= start.value) end.value = ''; recalculateModalTotal(); });
        end.addEventListener('change', recalculateModalTotal);
        syncEnd();
    });

    document.querySelectorAll('input[type="range"][id^="invest-capital"]').forEach(s => s.addEventListener('input', e => updateCapitalValue(e.target.value)));
    document.querySelectorAll('[data-calc-mode]').forEach(btn => btn.addEventListener('click', () => {
        switchCalcMode(btn.dataset.calcMode);
        document.querySelectorAll('[data-calc-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.classList.contains('active'))));
    }));
    const slider = document.querySelector('.range-wrapper input[type="range"]');
    if (slider && document.getElementById('capital-display')) updateCapitalValue(slider.value);
});

// Calculator Javascript
function switchCalcMode(mode) {
    const rentForm = document.getElementById('form-rent');
    const investForm = document.getElementById('form-invest');
    const rentBreakdown = document.getElementById('breakdown-rent');
    const investBreakdown = document.getElementById('breakdown-invest');
    const rentTitle = document.getElementById('title-rent');
    const investTitle = document.getElementById('title-invest');
    const tabRent = document.getElementById('tab-rent');
    const tabInvest = document.getElementById('tab-invest');

    if (mode === 'rent') {
        // Active Forms & Displays
        rentForm.classList.add('active');
        investForm.classList.remove('active');
        rentBreakdown.classList.add('active');
        investBreakdown.classList.remove('active');
        
        // Toggle Titles
        if (rentTitle) rentTitle.style.display = 'block';
        if (investTitle) investTitle.style.display = 'none';

        // Toggle Tab Highlights
        tabRent.classList.add('active');
        tabInvest.classList.remove('active');
    } else if (mode === 'invest') {
        // Active Forms & Displays
        investForm.classList.add('active');
        rentForm.classList.remove('active');
        investBreakdown.classList.add('active');
        rentBreakdown.classList.remove('active');
        
        // Toggle Titles
        if (rentTitle) rentTitle.style.display = 'none';
        if (investTitle) investTitle.style.display = 'block';

        // Toggle Tab Highlights
        tabInvest.classList.add('active');
        tabRent.classList.remove('active');
    }
}

// Slider Display Helper
function updateCapitalValue(val) {
    const text = '$' + Number(val).toLocaleString();
    document.getElementById('capital-display').textContent = text;
    document.querySelectorAll('.range-wrapper input[type="range"]').forEach(s => s.setAttribute('aria-valuetext', text));
}

// Dynamic Slider Trail Progress Update
function updateSliderProgress(slider) {
    const min = parseFloat(slider.min) || 0;
    const max = parseFloat(slider.max) || 100;
    const value = parseFloat(slider.value) || 0;
    
    // Calculate trail fill percentage
    const percentage = ((value - min) / (max - min)) * 100;
    
    // Apply variable to slider inline style
    slider.style.setProperty('--progress', `${percentage}%`);
}

// Attach listener to range sliders when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    const rangeInputs = document.querySelectorAll('.range-wrapper input[type="range"]');
    
    rangeInputs.forEach(slider => {
        // Set initial state on load
        updateSliderProgress(slider);
        
        // Listen for user input / dragging
        slider.addEventListener('input', (e) => {
            updateSliderProgress(e.target);
            
            // Keeps existing inline label display function active if present
            if (typeof updateCapitalValue === 'function' && e.target.id === 'capital-range') {
                updateCapitalValue(e.target.value);
            }
        });
    });
});

// Toggle ROI calculator accordion (Invest page)
function toggleInvestCalculator() {
    const panel = document.getElementById('invest-calc-section');
    const btn = document.querySelector('[data-calc-toggle]');
    if (!panel) return;
    const open = panel.classList.toggle('is-expanded');
    if (btn) btn.setAttribute('aria-expanded', String(open));
    if (open) {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        setTimeout(() => panel.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' }), 150);
    }
}
document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('[data-calc-toggle]')?.addEventListener('click', toggleInvestCalculator);
});

// Inquiry forms: confirmation dialog, or an announced status message if the page has no dialog
// (forms using a backend, e.g. Supabase, handle their own submit)
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.contact-form').forEach(form => {
        if (form.dataset.backend === 'supabase') return;
        form.addEventListener('submit', event => {
            event.preventDefault();
            const status = form.querySelector('[role="status"]');
            const modal = document.getElementById('form-modal');
            form.reset();
            if (modal) modal.classList.add('active');
            else if (status) status.textContent = 'Thank you! Your inquiry has been submitted.';
        });
    });
});

function closeFormModal() {
    const modal = document.getElementById('form-modal');
    if (modal) modal.classList.remove('active');
}
function openFaqModal(event) {
    if (event) event.preventDefault();
    document.getElementById('faq-modal')?.classList.add('active');
}
function closeFaqModal() {
    document.getElementById('faq-modal')?.classList.remove('active');
}

// Dialog behaviour for every .modal-overlay, however it is opened (including by other scripts):
// focus moves in, Tab is trapped, Esc / overlay click / close buttons dismiss, focus returns.
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-faq-open]').forEach(b => b.addEventListener('click', openFaqModal));
    document.querySelectorAll('[data-faq-close]').forEach(b => b.addEventListener('click', closeFaqModal));
    document.querySelectorAll('[data-form-close]').forEach(b => b.addEventListener('click', closeFormModal));

    const overlays = Array.from(document.querySelectorAll('.modal-overlay'));
    const lastFocus = new Map();
    const activeOverlay = () => overlays.find(o => o.classList.contains('active'));

    overlays.forEach(overlay => {
        let wasActive = false;
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('active'); });
        new MutationObserver(() => {
            const isActive = overlay.classList.contains('active');
            if (isActive === wasActive) return;
            wasActive = isActive;
            document.body.classList.toggle('modal-open', Boolean(activeOverlay()));
            if (isActive) {
                lastFocus.set(overlay, document.activeElement);
                overlay.querySelector('.modal-card')?.focus();
            } else {
                lastFocus.get(overlay)?.focus();
            }
        }).observe(overlay, { attributes: true, attributeFilter: ['class'] });
    });

    document.addEventListener('keydown', e => {
        const overlay = activeOverlay();
        if (!overlay) return;
        if (e.key === 'Escape') { overlay.classList.remove('active'); return; }
        if (e.key !== 'Tab') return;
        const card = overlay.querySelector('.modal-card');
        const f = Array.from(overlay.querySelectorAll('a[href], button:not([disabled])'));
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === card)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
});