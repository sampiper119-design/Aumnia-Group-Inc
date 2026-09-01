// ============================================================================
// Contact form -> Supabase `inquiries`
//
// Wires the existing Contact.html form (.contact-form) to insert a row into
// the `inquiries` table. A Database Webhook on that table then triggers the
// handle-form-submission Edge Function, which emails Mrs. Piper — so there is
// no email logic here on the client.
//
// Requires, in this order, before this file:
//   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
//   <script src="javascript/supabase-client.js"></script>
//
// The form is marked data-backend="supabase" so the placeholder success-modal
// handler in main.js stands down and lets this file own the submit.
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('.contact-form[data-backend="supabase"]');
    if (!form) return;

    const submitBtn = form.querySelector('.submit-btn');
    const statusEl = document.getElementById('formStatus');

    function setStatus(message, isError) {
        if (!statusEl) return;
        statusEl.textContent = message;
        statusEl.dataset.state = isError ? 'error' : 'info';
    }

    // Reuses the existing #form-modal so we don't introduce new UI. On failure
    // we swap its copy, then restore the original text next time it succeeds.
    const modal = document.getElementById('form-modal');
    const modalHeading = modal?.querySelector('h2');
    const modalBody = modal?.querySelector('p');
    const successHeading = modalHeading?.textContent ?? 'Inquiry Received';
    const successBody = modalBody?.textContent ?? '';

    function showModal(heading, body) {
        if (!modal) return;
        if (modalHeading) modalHeading.textContent = heading;
        if (modalBody) modalBody.textContent = body;
        modal.classList.add('active');
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (typeof supabaseClient === 'undefined') {
            setStatus('Configuration error: could not reach the server.', true);
            return;
        }

        const formData = new FormData(form);
        const payload = {
            name: String(formData.get('name') ?? '').trim(),
            email: String(formData.get('email') ?? '').trim(),
            phone: String(formData.get('phone') ?? '').trim() || null,
            inquiry_type: String(formData.get('inquiry') ?? '').trim() || null,
            message: String(formData.get('message') ?? '').trim() || null,
            // No property picker on the Contact page, so this stays null.
            // The column exists for inquiries raised from a property listing.
            property_id: null,
        };

        // Guard against a disabled-button double submit.
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.dataset.originalText = submitBtn.textContent;
            submitBtn.textContent = 'Sending...';
        }
        setStatus('Sending your inquiry...', false);

        const { error } = await supabaseClient.from('inquiries').insert(payload);

        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = submitBtn.dataset.originalText || 'Submit Form';
        }

        if (error) {
            console.error('Inquiry insert failed:', error);
            setStatus('Sorry, your inquiry could not be sent. Please try again or email us directly.', true);
            showModal(
                'Something Went Wrong',
                'We could not submit your inquiry. Please try again, or reach us directly at info@business.org.'
            );
            return;
        }

        setStatus('', false);
        form.reset();
        showModal(successHeading, successBody);
    });
});
