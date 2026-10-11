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

// Rate & Fee Configurations
const RENT_CONFIG = {
    'commercial': { baseNightly: 80, taxRate: 0.15 },
    'residential': { baseNightly: 80, taxRate: 0.15 }
};

const ADDON_PRICES = {
    'feature1': 25,
    'feature2': 35,
    'feature3': 15,
    'feature4': 50
};

const INVEST_CONFIG = {
    'commercial': 0.182, // 18.2% ROI
    'residential': 0.125  // 12.5% ROI
};

// Global Calculator Controller
function calculateCosts() {
    const investForm = document.getElementById('form-invest');
    const investPageForm = document.getElementById('form-invest-page');
    
    // Check if on Invest page or Invest mode tab is active
    if (investPageForm || (investForm && investForm.classList.contains('active'))) {
        calculateInvestROI(document.body.classList.contains('invest-page'));
    } else {
        calculateRentCost();
    }
}

// Rent Calculator Logic
function calculateRentCost() {
    const propType = document.getElementById('rent-property-type')?.value || 'commercial';
    const startDateInput = document.getElementById('rent-start');
    const endDateInput = document.getElementById('rent-end');
    
    let nights = 1;
    let baseRate = 0;
    
    // Parse start and end dates if provided
    if (startDateInput?.value && endDateInput?.value) {
        const start = new Date(startDateInput.value + 'T00:00:00');
        const end = new Date(endDateInput.value + 'T00:00:00');
        
        // Calculate total calendar days
        const diffTime = end - start;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        nights = diffDays > 0 ? diffDays : 1;

        if (nights >= 30) {
            // Monthly calculation logic ($800 per 30 days)
            const months = Math.floor(nights / 30);
            const remainingNights = nights % 30;
            
            // Calculate remaining nights with standard weekend logic
            let remainingCost = 0;
            let currentDate = new Date(start);
            currentDate.setDate(currentDate.getDate() + (months * 30));
            
            for (let i = 0; i < remainingNights; i++) {
                const dayOfWeek = currentDate.getDay(); // 5 = Friday, 6 = Saturday
                remainingCost += (dayOfWeek === 5 || dayOfWeek === 6) ? 88 : 80;
                currentDate.setDate(currentDate.getDate() + 1);
            }

            baseRate = (months * 800) + remainingCost;
        } else {
            // Nightly calculation with weekend adjustments
            let currentDate = new Date(start);
            for (let i = 0; i < nights; i++) {
                const dayOfWeek = currentDate.getDay(); // 5 = Friday, 6 = Saturday
                baseRate += (dayOfWeek === 5 || dayOfWeek === 6) ? 88 : 80;
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }
    } else {
        // Default single night base rate
        baseRate = 80;
    }

    const config = RENT_CONFIG[propType] || RENT_CONFIG['commercial'];

    // Calculate selected add-ons if present
    let addonTotal = 0;
    document.querySelectorAll('#form-rent input[name="addon"]:checked').forEach(checkbox => {
        addonTotal += ADDON_PRICES[checkbox.value] || 0;
    });

    const subtotal = baseRate + addonTotal;
    const taxes = subtotal * config.taxRate;
    const totalCost = subtotal + taxes;

    // Update DOM output
    const totalDisplay = document.getElementById('total-amount-rent');
    const breakdownContainer = document.getElementById('breakdown-rent');

    if (totalDisplay) {
        totalDisplay.textContent = `$${Math.round(totalCost).toLocaleString()}`;
    }

    if (breakdownContainer) {
        breakdownContainer.innerHTML = `
            <div class="breakdown-item"><span>Base Rate (${nights} night${nights > 1 ? 's' : ''}) =</span> <b>$${baseRate.toLocaleString()}</b></div>
            <div class="breakdown-item"><span>Service Fees (15%) =</span> <b>$${Math.round(taxes).toLocaleString()}</b></div>
        `;
    }
}

// Investment ROI Calculator Logic
function calculateInvestROI(isInvestPage = false) {
    const capitalId = isInvestPage ? 'invest-capital-page' : 'invest-capital';
    const strategyId = isInvestPage ? 'invest-strategy-page' : 'invest-strategy';
    const targetId = isInvestPage ? 'invest-target-page' : 'invest-target';
    const totalId = 'total-amount-invest'; // Standardized for both pages
    const breakdownId = isInvestPage ? 'breakdown-invest-page' : 'breakdown-invest';

    const capital = parseFloat(document.getElementById(capitalId)?.value) || 0;
    const strategy = document.getElementById(strategyId)?.value || 'commercial';
    const years = parseFloat(document.getElementById(targetId)?.value) || 1;

    const yieldRate = INVEST_CONFIG[strategy] || 0.182;
    const annualYield = capital * yieldRate;
    const netProfit = annualYield * years;
    const estimatedTotal = capital + netProfit;

    // Update DOM output
    const totalDisplay = document.getElementById(totalId);
    const breakdownContainer = document.getElementById(breakdownId);

    if (totalDisplay) {
        totalDisplay.textContent = `$${Math.round(estimatedTotal).toLocaleString()}`;
    }

    if (breakdownContainer) {
        breakdownContainer.innerHTML = `
            <div class="breakdown-item"><span>Initial Capital =</span> <b>$${capital.toLocaleString()}</b></div>
            <div class="breakdown-item"><span>Target Annual Yield (${(yieldRate * 100).toFixed(1)}%) =</span> <b>$${Math.round(annualYield).toLocaleString()}/yr</b></div>
            <div class="breakdown-item"><span>Holding Duration =</span> <b>${years} Year${years > 1 ? 's' : ''}</b></div>
            <div class="breakdown-item"><span>Estimated Net Profit =</span> <b>$${Math.round(netProfit).toLocaleString()}</b></div>
            <a href="${isInvestPage ? '#form' : 'Invest.html#form'}" class="btn-prospectus">Request Full Prospectus</a>
        `;
    }
}

// Calculator wiring (forms submit with Enter or button; no inline handlers)
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.calc-mode-form').forEach(form => {
        form.addEventListener('submit', e => {
            e.preventDefault();
            if (form.id === 'form-rent') calculateRentCost();
            else calculateInvestROI(document.body.classList.contains('invest-page'));
        });
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