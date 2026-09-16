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
const enhancedMotion = !isTouchDevice && !prefersReducedMotion;

// ============================================
// Mobile nav toggle
// ============================================
if (navToggle && navMenu) {
  navToggle.addEventListener('click', () => {
    const isOpen = navMenu.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });
}

// Smooth scroll (shared helper used by nav links and the scroll rail)
function scrollToSection(id) {
  const target = document.getElementById(id);
  if (!target) return;
  target.scrollIntoView({
    behavior: prefersReducedMotion ? 'auto' : 'smooth',
    block: 'start'
  });
}

navLinks.forEach(link => {
  link.addEventListener('click', function (e) {
    e.preventDefault();
    scrollToSection(this.getAttribute('href').substring(1));

    if (navMenu.classList.contains('open')) {
      navMenu.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    }
  });
});

// ============================================
// Scroll rail (desktop wayfinding)
// ============================================
const railFill = document.getElementById('rail-fill');
const railButtons = document.querySelectorAll('.scroll-rail [data-rail-target]');

railButtons.forEach(btn => {
  btn.addEventListener('click', () => scrollToSection(btn.getAttribute('data-rail-target')));
});

// ============================================
// Scroll-spy nav + header background + progress bar + rail
// ============================================
const progressBarContainer = document.createElement('div');
progressBarContainer.id = 'progress-bar-container';
progressBarContainer.innerHTML = '<div id="progress-bar"></div>';
document.body.prepend(progressBarContainer);
const progressBar = document.getElementById('progress-bar');

function onScroll() {
  // Detection line sits just below the sticky header. A section becomes
  // "current" once its top has scrolled past that line — this is independent
  // of how tall any individual section is (unlike a height-proportional
  // threshold, which breaks once one section is much taller than the rest).
  const detectionPoint = window.scrollY + header.offsetHeight + 20;

  let currentSection = '';
  sections.forEach(section => {
    if (section.offsetTop <= detectionPoint) {
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

  railButtons.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-rail-target') === currentSection);
  });

  header.classList.toggle('transformed', window.scrollY > 40);

  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
  progressBar.style.width = scrollPercent + '%';
  if (railFill) railFill.style.height = scrollPercent + '%';
}

window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// ============================================
// Hero — single orchestrated load sequence
// ============================================
const hero = document.querySelector('.hero');
if (hero) {
  // Small delay ensures the browser has painted the initial (hidden) state
  // before transitioning, so the animation actually plays.
  requestAnimationFrame(() => {
    setTimeout(() => hero.classList.add('stage-in'), 60);
  });
}

// ============================================
// Two-part cursor (dot + ring) — desktop, motion-enabled only
// ============================================
if (enhancedMotion) {
  const cursorDot = document.getElementById('cursor-dot');
  const cursorRing = document.getElementById('cursor-ring');

  if (cursorDot && cursorRing) {
    let ringX = window.innerWidth / 2;
    let ringY = window.innerHeight / 2;
    let targetX = ringX;
    let targetY = ringY;

    document.addEventListener('mousemove', e => {
      targetX = e.clientX;
      targetY = e.clientY;
      cursorDot.style.transform = `translate(${targetX}px, ${targetY}px) translate(-50%, -50%)`;
      document.body.classList.add('cursor-ready');
    });

    // Ring eases toward the pointer for a slight, deliberate lag
    function animateRing() {
      ringX += (targetX - ringX) * 0.18;
      ringY += (targetY - ringY) * 0.18;
      cursorRing.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
      requestAnimationFrame(animateRing);
    }
    animateRing();

    const interactiveSelector = 'a, button, .skill-badge, .project-card, .filter-chip, input, textarea, summary';
    document.querySelectorAll(interactiveSelector).forEach(el => {
      el.addEventListener('mouseenter', () => cursorRing.classList.add('hovering'));
      el.addEventListener('mouseleave', () => cursorRing.classList.remove('hovering'));
    });
  }
}

// ============================================
// Magnetic buttons — pull slightly toward the cursor within their bounds
// ============================================
if (enhancedMotion) {
  document.querySelectorAll('.magnetic').forEach(el => {
    el.addEventListener('mousemove', e => {
      const rect = el.getBoundingClientRect();
      const relX = e.clientX - rect.left - rect.width / 2;
      const relY = e.clientY - rect.top - rect.height / 2;
      el.style.transform = `translate(${relX * 0.25}px, ${relY * 0.25}px)`;
    });
    el.addEventListener('mouseleave', () => {
      el.style.transform = 'translate(0, 0)';
    });
  });
}

// ============================================
// Skill badges — subtle tilt toward the cursor
// ============================================
if (enhancedMotion) {
  document.querySelectorAll('.skill-badge-icon').forEach(icon => {
    icon.addEventListener('mousemove', e => {
      const rect = icon.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      icon.style.transform = `perspective(300px) rotateX(${-py * 18}deg) rotateY(${px * 18}deg) scale(1.06)`;
    });
    icon.addEventListener('mouseleave', () => {
      icon.style.transform = '';
    });
  });
}

// ============================================
// About section — tabs with sliding indicator
// ============================================
const tabButtons = document.querySelectorAll('.tab-btn');
const cards = document.querySelectorAll('.card');
const tabIndicator = document.getElementById('tab-indicator');
let currentCard = 0;
let aboutAutoRotate;

function moveIndicator(btn) {
  if (!tabIndicator || !btn) return;
  tabIndicator.style.width = `${btn.offsetWidth}px`;
  tabIndicator.style.transform = `translateX(${btn.offsetLeft - 4}px)`;
}

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
  moveIndicator(tabButtons[currentCard]);
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

const aboutPanel = document.querySelector('.about-cards');
if (aboutPanel) {
  aboutPanel.addEventListener('mouseenter', () => clearInterval(aboutAutoRotate));
  aboutPanel.addEventListener('mouseleave', restartAutoRotate);
}

if (cards.length && tabButtons.length) {
  // Position the indicator once layout is ready, then start the cycle.
  requestAnimationFrame(() => moveIndicator(tabButtons[currentCard]));
  window.addEventListener('resize', () => moveIndicator(tabButtons[currentCard]));
  restartAutoRotate();
}

// ============================================
// Projects — filter chips
// ============================================
const filterChips = document.querySelectorAll('.filter-chip');
const filterableCards = document.querySelectorAll('.projects-grid .project-card');
const filterEmpty = document.getElementById('filter-empty');

filterChips.forEach(chip => {
  chip.addEventListener('click', () => {
    filterChips.forEach(c => {
      c.classList.remove('active');
      c.setAttribute('aria-pressed', 'false');
    });
    chip.classList.add('active');
    chip.setAttribute('aria-pressed', 'true');

    const filter = chip.getAttribute('data-filter');
    let visibleCount = 0;

    filterableCards.forEach(card => {
      const matches = filter === 'all' || card.getAttribute('data-category') === filter;
      card.classList.toggle('filtered-out', !matches);
      if (matches) visibleCount++;
    });

    if (filterEmpty) filterEmpty.hidden = visibleCount > 0;
  });
});

// ============================================
// Project cards — manual image carousel with dots + blurred backdrop
// ============================================
function initProjectCarousels() {
  document.querySelectorAll('.project-card').forEach(card => {
    const images = card.querySelectorAll('.carousel-track img');
    const dots = card.querySelectorAll('.carousel-dots .dot');
    const backdrop = card.querySelector('.carousel-backdrop');
    if (!images.length) return;

    if (backdrop) {
      const activeImg = card.querySelector('.carousel-track img.active') || images[0];
      backdrop.style.backgroundImage = `url('${activeImg.getAttribute('src')}')`;
    }

    if (dots.length < 2) return; // nothing to switch or autoplay

    let current = 0;
    dots.forEach((dot, index) => {
      if (dot.classList.contains('active')) current = index;
    });

    let timer;

    function goTo(index) {
      images[current].classList.remove('active');
      dots[current].classList.remove('active');
      current = index;
      images[current].classList.add('active');
      dots[current].classList.add('active');
      if (backdrop) {
        backdrop.style.backgroundImage = `url('${images[current].getAttribute('src')}')`;
      }
    }

    function startAutoplay() {
      if (prefersReducedMotion) return;
      clearInterval(timer);
      timer = setInterval(() => {
        goTo((current + 1) % images.length);
      }, 4000);
    }

    dots.forEach((dot, index) => {
      dot.addEventListener('click', () => {
        goTo(index);
        startAutoplay(); // reset the clock after manual navigation
      });
    });

    // Pause while the user is actually looking at this card
    card.addEventListener('mouseenter', () => clearInterval(timer));
    card.addEventListener('mouseleave', startAutoplay);

    startAutoplay();
  });
}

initProjectCarousels();

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
