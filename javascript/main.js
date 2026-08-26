// Mobile Navigation Toggle
document.addEventListener('DOMContentLoaded', () => {
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');

    if (navToggle && navLinks) {
        navToggle.addEventListener('click', () => {
            const isOpen = navLinks.classList.toggle('is-open');
            navToggle.classList.toggle('is-active', isOpen);
            navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });

        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('is-open');
                navToggle.classList.remove('is-active');
                navToggle.setAttribute('aria-expanded', 'false');
            });
        });
    }
});

//Contact page tour scheduling calendar pseudo interaction
document.addEventListener('DOMContentLoaded', () => {
    const daysGrid = document.getElementById('daysGrid');
    const monthYearLabel = document.getElementById('monthYearLabel');
    const prevBtn = document.getElementById('prevMonth');
    const nextBtn = document.getElementById('nextMonth');
    const timePopup = document.getElementById('timePopup');
    const selectedDateText = document.getElementById('selectedDateText');
    const closePopupBtn = document.getElementById('closePopupBtn');

    let currentDate = new Date(2026, 7, 1); // August 2026 default

    function renderCalendar() {
        daysGrid.innerHTML = '';
        
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // Header Label
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        monthYearLabel.textContent = `${monthNames[month]} ${year}`;

        // Get first day of month & total days
        const firstDayIndex = new Date(year, month, 1).getDay();
        const totalDays = new Date(year, month + 1, 0).getDate();

        // Empty cells for alignment before start of month
        for (let i = 0; i < firstDayIndex; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.classList.add('day-cell', 'empty-cell');
            daysGrid.appendChild(emptyCell);
        }

        // Render actual day cells
        for (let day = 1; day <= totalDays; day++) {
            const dayCell = document.createElement('div');
            dayCell.classList.add('day-cell');
            dayCell.textContent = day;

            dayCell.addEventListener('click', () => {
                document.querySelectorAll('.day-cell').forEach(c => c.classList.remove('active-day'));
                dayCell.classList.add('active-day');

                if (selectedDateText) {
                    selectedDateText.textContent = `${monthNames[month]} ${day}`;
                }

                // Display first to get actual rendered width
                timePopup.classList.add('is-visible');

                // Calculate boundary constraints
                const containerWidth = daysGrid.parentElement.offsetWidth;
                const popupWidth = timePopup.offsetWidth;

                let leftPos = dayCell.offsetLeft - 20;

                // Keep popup inside left boundary
                if (leftPos < 10) {
                    leftPos = 10;
                }
                // Keep popup inside right boundary
                else if (leftPos + popupWidth > containerWidth - 10) {
                    leftPos = containerWidth - popupWidth - 10;
                }

                timePopup.style.top = `${dayCell.offsetTop + 36}px`;
                timePopup.style.left = `${leftPos}px`;
            });

            daysGrid.appendChild(dayCell);
        }
    }

    // Month Navigation
    prevBtn?.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        timePopup.classList.remove('is-visible');
        renderCalendar();
    });

    nextBtn?.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        timePopup.classList.remove('is-visible');
        renderCalendar();
    });

    renderCalendar();

    closePopupBtn?.addEventListener('click', () => {
        timePopup.classList.remove('is-visible');
        document.querySelectorAll('.day-cell').forEach(c => c.classList.remove('active-day'));
    });
});

// Properties Gallery Slideshow Logic
const slides = [
    'images/property.png',
    'images/living room.png',
    'images/pool.png',
    'images/gallery vid.png',
    'images/gallery 360.png'
];

let currentSlideIndex = 0;

function updateSlide() {
    const mainImg = document.getElementById('mainSlide');
    const counter = document.getElementById('slideCounter');
    const thumbs = document.querySelectorAll('.thumb-item');

    if (!mainImg || !counter) return;

    // Update main image source and counter text
    mainImg.src = slides[currentSlideIndex];
    counter.textContent = `${currentSlideIndex + 1}/${slides.length}`;

    // Active state toggling on thumbnails
    thumbs.forEach((thumb, index) => {
        if (index === currentSlideIndex) {
            thumb.classList.add('active');
        } else {
            thumb.classList.remove('active');
        }
    });
}

function changeSlide(direction) {
    currentSlideIndex += direction;
    
    // Loop navigation
    if (currentSlideIndex < 0) {
        currentSlideIndex = slides.length - 1;
    } else if (currentSlideIndex >= slides.length) {
        currentSlideIndex = 0;
    }
    
    updateSlide();
}

function setSlide(index) {
    currentSlideIndex = index;
    updateSlide();
}

// Rate & Fee Configurations
const RENT_CONFIG = {
    'vacation-commercial': { baseNightly: 200, cleaningFee: 45, taxRate: 0.12 },
    'residential': { baseNightly: 120, cleaningFee: 35, taxRate: 0.08 }
};

const ADDON_PRICES = {
    'feature1': 25,
    'feature2': 35,
    'feature3': 15,
    'feature4': 50
};

const INVEST_CONFIG = {
    'vacation-commercial': 0.182, // 18.2% ROI
    'residential': 0.125          // 12.5% ROI
};

// Global Calculator Controller
function calculateCosts() {
    const isInvestPage = document.body.classList.contains('invest-page');
    const isPropertiesInvest = !isInvestPage && document.getElementById('form-invest')?.classList.contains('active');

    if (isInvestPage || isPropertiesInvest) {
        calculateInvestROI(isInvestPage);
    } else {
        calculateRentCost();
    }
}

// Rent Calculator Logic
function calculateRentCost() {
    const propType = document.getElementById('rent-property-type')?.value || 'vacation-commercial';
    const startDateInput = document.querySelector('.date-inputs input[placeholder*="Start"]');
    const endDateInput = document.querySelector('.date-inputs input[placeholder*="End"]');
    
    // Default to 1 night if dates are invalid or missing
    let nights = 1;
    if (startDateInput?.value && endDateInput?.value) {
        const start = new Date(startDateInput.value);
        const end = new Date(endDateInput.value);
        const diffTime = end - start;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        nights = diffDays > 0 ? diffDays : 1;
    }

    const config = RENT_CONFIG[propType] || RENT_CONFIG['vacation-commercial'];
    const baseRate = config.baseNightly * nights;

    // Calculate selected add-ons
    let addonTotal = 0;
    document.querySelectorAll('#form-rent input[name="addon"]:checked').forEach(checkbox => {
        addonTotal += ADDON_PRICES[checkbox.value] || 0;
    });

    const cleaningFee = config.cleaningFee;
    const subtotal = baseRate + cleaningFee + addonTotal;
    const taxes = subtotal * config.taxRate;
    const totalCost = subtotal + taxes;

    // Update DOM output
    const totalDisplay = document.getElementById('total-amount');
    const breakdownContainer = document.getElementById('breakdown-rent');

    if (totalDisplay) {
        totalDisplay.textContent = `$${Math.round(totalCost).toLocaleString()}`;
    }

    if (breakdownContainer) {
        breakdownContainer.innerHTML = `
            <div class="breakdown-item"><span>Base Rate (${nights} night${nights > 1 ? 's' : ''}) =</span> <b>$${baseRate.toLocaleString()}</b></div>
            <div class="breakdown-item"><span>Cleaning & Maintenance Fee =</span> <b>$${cleaningFee.toLocaleString()}</b></div>
            ${addonTotal > 0 ? `<div class="breakdown-item"><span>Selected Add-ons =</span> <b>$${addonTotal.toLocaleString()}</b></div>` : ''}
            <div class="breakdown-item"><span>Taxes & Fees =</span> <b>$${Math.round(taxes).toLocaleString()}</b></div>
        `;
    }
}

// Investment ROI Calculator Logic
function calculateInvestROI(isInvestPage = false) {
    const capitalId = isInvestPage ? 'invest-capital-page' : 'invest-capital';
    const strategyId = isInvestPage ? 'invest-strategy-page' : 'invest-strategy';
    const targetId = isInvestPage ? 'invest-target-page' : 'invest-target';
    const totalId = isInvestPage ? 'total-amount-invest' : 'total-amount';
    const breakdownId = isInvestPage ? 'breakdown-invest-page' : 'breakdown-invest';

    const capital = parseFloat(document.getElementById(capitalId)?.value) || 0;
    const strategy = document.getElementById(strategyId)?.value || 'vacation-commercial';
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
            <a href="#" class="btn-prospectus">Request Full Prospectus</a>
        `;
    }
}

// Sync range slider display and live updates on page load
document.addEventListener('DOMContentLoaded', () => {
    // Attach event listeners to all calculate buttons
    document.querySelectorAll('.btn-calculate').forEach(button => {
        button.addEventListener('click', calculateCosts);
    });

    // Sync input updates for capital sliders
    const investCapitalSlider = document.getElementById('invest-capital');
    const investCapitalPageSlider = document.getElementById('invest-capital-page');

    if (investCapitalSlider) {
        investCapitalSlider.addEventListener('input', (e) => updateCapitalValue(e.target.value));
    }
    if (investCapitalPageSlider) {
        investCapitalPageSlider.addEventListener('input', (e) => updateCapitalValue(e.target.value));
    }
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
    document.getElementById('capital-display').innerText = '$' + Number(val).toLocaleString();
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

// Toggle ROI Calculator Accordion on Invest Page
function toggleInvestCalculator(e) {
    if (e) e.preventDefault();

    const calcContainer = document.getElementById('invest-calc-section');
    if (!calcContainer) return;

    // Toggle expanded class
    calcContainer.classList.toggle('is-expanded');

    // Smooth scroll into view if expanded
    if (calcContainer.classList.contains('is-expanded')) {
        setTimeout(() => {
            calcContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 150);
    }
}

// Form Modal Javascript
document.addEventListener('DOMContentLoaded', () => {
    // Intercept form submissions across contact forms
    const contactForms = document.querySelectorAll('.contact-form');
    
    contactForms.forEach(form => {
        form.addEventListener('submit', (event) => {
            event.preventDefault(); // Prevent standard page refresh
            
            // Show Modal
            const modal = document.getElementById('form-modal');
            if (modal) {
                modal.classList.add('active');
            }
            
            // Reset input fields
            form.reset();
        });
    });
});

// Close modal handler
function closeFormModal() {
    const modal = document.getElementById('form-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

//FAQs Modal Javascript
// Open FAQ Modal
function openFaqModal(event) {
    if (event) event.preventDefault(); // Prevent page scroll jump (#)
    const faqModal = document.getElementById('faq-modal');
    if (faqModal) {
        faqModal.classList.add('active');
    }
}

// Close FAQ Modal
function closeFaqModal() {
    const faqModal = document.getElementById('faq-modal');
    if (faqModal) {
        faqModal.classList.remove('active');
    }
}