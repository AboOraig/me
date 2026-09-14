// ============================================
// Shared references
// ============================================
const header = document.querySelector('header');
const navLinks = document.querySelectorAll('#nav-menu a');
const navMenu = document.getElementById('nav-menu');
const navToggle = document.getElementById('nav-toggle');
const sections = document.querySelectorAll('main section');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouchDevice = window.matchMedia('(hover: none)').matches;

// ============================================
// Mobile nav toggle
// ============================================
if (navToggle && navMenu) {
  navToggle.addEventListener('click', () => {
    const isOpen = navMenu.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });
}

// Smooth scroll + close mobile menu on link click
navLinks.forEach(link => {
  link.addEventListener('click', function (e) {
    e.preventDefault();
    const targetID = this.getAttribute('href').substring(1);
    const targetSection = document.getElementById(targetID);
    if (!targetSection) return;

    targetSection.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start'
    });

    if (navMenu.classList.contains('open')) {
      navMenu.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    }
  });
});

// ============================================
// Scroll-spy nav + header background + progress bar
// ============================================
const progressBarContainer = document.createElement('div');
progressBarContainer.id = 'progress-bar-container';
progressBarContainer.innerHTML = '<div id="progress-bar"></div>';
document.body.prepend(progressBarContainer);
const progressBar = document.getElementById('progress-bar');

function onScroll() {
  // Active section for nav highlighting
  let currentSection = '';
  sections.forEach(section => {
    const sectionTop = section.offsetTop;
    const sectionHeight = section.clientHeight;
    if (window.scrollY >= sectionTop - sectionHeight / 3) {
      currentSection = section.getAttribute('id');
    }
  });

  navLinks.forEach(link => {
    const isActive = link.getAttribute('href').substring(1) === currentSection;
    link.classList.toggle('active', isActive);
    if (isActive) {
      link.setAttribute('aria-current', 'true');
    } else {
      link.removeAttribute('aria-current');
    }
  });

  // Header background once scrolled
  header.classList.toggle('transformed', window.scrollY > 40);

  // Reading progress bar
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
  progressBar.style.width = scrollPercent + '%';
}

window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// ============================================
// Cursor light effect (desktop / non-touch only)
// ============================================
if (!isTouchDevice && !prefersReducedMotion) {
  const cursorLight = document.createElement('div');
  cursorLight.id = 'cursor-light';
  document.body.appendChild(cursorLight);

  document.addEventListener('mousemove', function (e) {
    const x = e.clientX - cursorLight.offsetWidth / 2;
    const y = e.clientY - cursorLight.offsetHeight / 2;
    cursorLight.style.transform = `translate(${x}px, ${y}px)`;
  });
}

// ============================================
// About section — accessible tabs
// ============================================
const tabButtons = document.querySelectorAll('.tab-btn');
const cards = document.querySelectorAll('.card');
let currentCard = 0;
let aboutAutoRotate;

function showCard(index) {
  cards[currentCard].classList.remove('active');
  cards[currentCard].hidden = true;
  tabButtons[currentCard].classList.remove('active');
  tabButtons[currentCard].setAttribute('aria-selected', 'false');

  currentCard = index;

  cards[currentCard].classList.add('active');
  cards[currentCard].hidden = false;
  tabButtons[currentCard].classList.add('active');
  tabButtons[currentCard].setAttribute('aria-selected', 'true');
}

tabButtons.forEach((btn, index) => {
  btn.addEventListener('click', () => {
    showCard(index);
    restartAutoRotate();
  });
});

function restartAutoRotate() {
  clearInterval(aboutAutoRotate);
  if (prefersReducedMotion) return;
  aboutAutoRotate = setInterval(() => {
    showCard((currentCard + 1) % cards.length);
  }, 10000);
}

if (cards.length && tabButtons.length) {
  restartAutoRotate();
}

// ============================================
// Contact form — real inline validation (no alert())
// ============================================
const contactForm = document.getElementById('contact-form');

if (contactForm) {
  const fields = {
    name: { el: document.getElementById('name'), message: 'Please enter your name.' },
    email: {
      el: document.getElementById('email'),
      message: 'Please enter a valid email address.',
      validate: value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    },
    subject: { el: document.getElementById('subject'), message: 'Please add a subject.' },
    message: { el: document.getElementById('message'), message: 'Please write a message.' }
  };

  const formStatus = document.getElementById('form-status');

  function validateField(key) {
    const field = fields[key];
    const errorEl = document.getElementById(`${key}-error`);
    const value = field.el.value.trim();
    const isValid = field.validate ? field.validate(value) : value.length > 0;

    field.el.setAttribute('aria-invalid', String(!isValid));
    errorEl.textContent = isValid ? '' : field.message;
    return isValid;
  }

  Object.keys(fields).forEach(key => {
    fields[key].el.addEventListener('blur', () => validateField(key));
  });

  const submitBtn = document.getElementById('submit-btn');
  const honeypot = document.getElementById('company');

  function setStatus(message, type) {
    formStatus.textContent = message;
    formStatus.classList.remove('success', 'error');
    if (type) formStatus.classList.add(type);
  }

  contactForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    // Silently drop likely-bot submissions (honeypot filled) without
    // revealing to the bot that anything was detected.
    if (honeypot && honeypot.value.trim() !== '') {
      contactForm.reset();
      setStatus("Thanks! I'll get back to you soon.", 'success');
      return;
    }

    const results = Object.keys(fields).map(validateField);
    const allValid = results.every(Boolean);

    if (!allValid) {
      setStatus('Please fix the highlighted fields before sending.', 'error');
      return;
    }

    const endpoint = contactForm.getAttribute('action');
    if (!endpoint || endpoint.includes('YOUR_FORM_ID')) {
      setStatus('Form endpoint not configured yet — set up Formspree and update the form action.', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    setStatus('Sending…', null);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: new FormData(contactForm),
        headers: { Accept: 'application/json' }
      });

      if (response.ok) {
        contactForm.reset();
        setStatus("Thanks! Your message is on its way — I'll reply soon.", 'success');
      } else {
        setStatus('Something went wrong sending your message. Please try again or email me directly.', 'error');
      }
    } catch (err) {
      setStatus('Network error — please check your connection and try again.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
    }
  });
}

function initProjectCarousels() {
  const prefersReducedMotion =
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('.project-card').forEach(card => {
    const images = card.querySelectorAll('.carousel-track img');
    const dots = card.querySelectorAll('.carousel-dots .dot');
    const backdrop = card.querySelector('.carousel-backdrop');

    if (!images.length) return;

    let current = 0;
    let timer;

    // Set initial backdrop
    if (backdrop) {
      const activeImg =
        card.querySelector('.carousel-track img.active') || images[0];

      backdrop.style.backgroundImage =
        `url('${activeImg.getAttribute('src')}')`;
    }

    // If there is only one image, no carousel/autoplay is needed
    if (dots.length < 2) return;

    function goTo(index) {
      // Remove active state
      images[current].classList.remove('active');
      dots[current].classList.remove('active');

      // Update current image
      current = index;

      // Add active state
      images[current].classList.add('active');
      dots[current].classList.add('active');

      // Update backdrop
      if (backdrop) {
        backdrop.style.backgroundImage =
          `url('${images[current].getAttribute('src')}')`;
      }
    }

    function startAutoplay() {
      // Don't autoplay if the user prefers reduced motion
      if (prefersReducedMotion) return;

      clearInterval(timer);

      timer = setInterval(() => {
        goTo((current + 1) % images.length);
      }, 4000);
    }

    // Manual navigation
    dots.forEach((dot, index) => {
      dot.addEventListener('click', () => {
        goTo(index);

        // Reset autoplay timer after manual navigation
        startAutoplay();
      });
    });

    // Pause autoplay while hovering over the card
    card.addEventListener('mouseenter', () => {
      clearInterval(timer);
    });

    // Resume autoplay when leaving the card
    card.addEventListener('mouseleave', () => {
      startAutoplay();
    });

    // Start autoplay
    startAutoplay();
  });
}

initProjectCarousels();