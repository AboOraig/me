// Contact form: inline validation, honeypot, Formspree submit (no alert()).
// Loaded only by contact.html, with `defer`.
(() => {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const byId = id => document.getElementById(id);
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const fields = {
    name: { el: byId('name'), message: 'Please enter your name.' },
    email: {
      el: byId('email'),
      message: 'Please enter a valid email address.',
      validate: value => EMAIL_RE.test(value)
    },
    subject: { el: byId('subject'), message: 'Please add a subject.' },
    message: { el: byId('message'), message: 'Please write a message.' }
  };

  const statusEl = byId('form-status');
  const submitBtn = byId('submit-btn');
  const honeypot = byId('company');

  function validateField(key) {
    const field = fields[key];
    const value = field.el.value.trim();
    const isValid = field.validate ? field.validate(value) : value.length > 0;

    field.el.setAttribute('aria-invalid', String(!isValid));
    byId(`${key}-error`).textContent = isValid ? '' : field.message;
    return isValid;
  }

  function clearErrors() {
    Object.keys(fields).forEach(key => {
      fields[key].el.removeAttribute('aria-invalid');
      byId(`${key}-error`).textContent = '';
    });
  }

  function setStatus(message, type) {
    statusEl.textContent = message;
    statusEl.classList.remove('success', 'error');
    if (type) statusEl.classList.add(type);
  }

  Object.keys(fields).forEach(key => {
    const { el } = fields[key];
    el.addEventListener('blur', () => validateField(key));
    // Once a field has been flagged, re-check while typing so the error clears as soon as it is fixed.
    el.addEventListener('input', () => {
      if (el.getAttribute('aria-invalid') === 'true') validateField(key);
    });
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();

    // Bots fill every field. Pretend it worked and send nothing.
    if (honeypot && honeypot.value.trim() !== '') {
      form.reset();
      clearErrors();
      setStatus("Thanks! Your message is on its way, and I'll reply soon.", 'success');
      return;
    }

    const invalid = Object.keys(fields).filter(key => !validateField(key));
    if (invalid.length > 0) {
      setStatus('Please fix the highlighted fields before sending.', 'error');
      fields[invalid[0]].el.focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    setStatus('Sending…', null);

    try {
      const response = await fetch(form.getAttribute('action'), {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      });

      if (response.ok) {
        form.reset();
        clearErrors();
        setStatus("Thanks! Your message is on its way, and I'll reply soon.", 'success');
      } else {
        setStatus('Something went wrong sending your message. Please try again or email me directly.', 'error');
      }
    } catch (error) {
      setStatus('Network error. Please check your connection and try again.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
    }
  });
})();