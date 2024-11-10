// Get the header element and nav links
let header = document.querySelector('header');
let navLinks = document.querySelectorAll('nav ul li a');
let sections = document.querySelectorAll('section');

// Smooth scroll to sections when clicking on header links
navLinks.forEach(link => {
  link.addEventListener('click', function(e) {
    e.preventDefault();
    
    // Get the target section ID from the link's href
    const targetID = this.getAttribute('href').substring(1);
    const targetSection = document.getElementById(targetID);

    // Scroll to the target section smoothly
    targetSection.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  });
});

// Add event listener for scrolling to check which section is in view
window.addEventListener('scroll', function() {
  let currentSection = '';

  // Loop through each section to check if it's in view
  sections.forEach(section => {
    const sectionTop = section.offsetTop;
    const sectionHeight = section.clientHeight;

    if (window.scrollY >= sectionTop - sectionHeight / 3) {
      currentSection = section.getAttribute('id');
    }
  });

  // Remove 'active' class from all links and add it to the current section link
  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href').substring(1) === currentSection) {
      link.classList.add('active');
    }
  });

  // Header transformation on scroll
  if (window.scrollY > 50) {
    header.classList.add('transformed');
  } else {
    header.classList.remove('transformed');
  }
});

// Create a progress bar
const progressBar = document.createElement('div');
progressBar.id = 'progress-bar-container';
progressBar.innerHTML = '<div id="progress-bar"></div>';
document.body.prepend(progressBar); // Insert at the top of the body

// Function to update the progress bar width based on scroll
window.addEventListener('scroll', function() {
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const scrollPercent = (scrollTop / docHeight) * 100;
  
  const progressBar = document.getElementById('progress-bar');
  progressBar.style.width = scrollPercent + '%'; // Update the width of the bar
});


// Create the cursor light effect element
const cursorLight = document.createElement('div');
cursorLight.id = 'cursor-light';
document.body.appendChild(cursorLight);

// Update the light's position based on cursor movement
document.addEventListener('mousemove', function(e) {
  const x = e.clientX - cursorLight.offsetWidth / 2;
  const y = e.clientY - cursorLight.offsetHeight / 2;
  
  // Apply the calculated position to the light effect
  cursorLight.style.transform = `translate(${x}px, ${y}px)`;
});


/*
document.getElementById('lang-toggle').addEventListener('change', function() {
  var langText = document.getElementById('lang-en');
  if (this.checked) {
      langText.innerHTML = "FR";
      // Add functionality to switch language to French
  } else {
      langText.innerHTML = "EN";
      // Add functionality to switch language to English
  }
});

document.addEventListener("DOMContentLoaded", function () {
  const languageSwitch = document.querySelector(".switch input");

  // Check localStorage for saved language preference
  const savedLanguage = localStorage.getItem("selectedLanguage");

  if (savedLanguage === "fr") {
    languageSwitch.checked = true; // Set switch to French
    setLanguage("fr");
  } else {
    languageSwitch.checked = false; // Set switch to English
    setLanguage("en");
  }

  // Event listener for the language switch toggle
  languageSwitch.addEventListener("change", function () {
    if (languageSwitch.checked) {
      localStorage.setItem("selectedLanguage", "fr");
      setLanguage("fr");
    } else {
      localStorage.setItem("selectedLanguage", "en");
      setLanguage("en");
    }
  });
});

function setLanguage(language) {
  // Logic to apply language change (e.g., swapping text content)
  if (language === "fr") {
    console.log("French selected");
    // Add your code to switch the content to French
  } else {
    console.log("English selected");
    // Add your code to switch the content to English
  }
}*/


let items = document.querySelectorAll('.slider2 .item2');
let next = document.getElementById('next');
let prev = document.getElementById('prev');

let active = 0; // Start with the 4th item as active
function loadShow() {
    let stt = 0;
    
    // Set the active item
    items[active].style.transform = `none`;
    items[active].style.zIndex = 1;
    items[active].style.filter = 'none';
    items[active].style.opacity = 1;

    // Position items to the right of the active item
    for (let i = active + 1; i < items.length; i++) {
        stt++;
        items[i].style.transform = `translateX(${120 * stt}px) scale(${1 - 0.2 * stt}) perspective(16px) rotateY(-1deg)`;
        items[i].style.zIndex = -stt;
        items[i].style.filter = 'blur(5px)';
        items[i].style.opacity = stt > 2 ? 0 : 0.6;
    }

    stt = 0;

    // Position items to the left of the active item
    for (let i = active - 1; i >= 0; i--) {
        stt++;
        items[i].style.transform = `translateX(${-120 * stt}px) scale(${1 - 0.2 * stt}) perspective(16px) rotateY(1deg)`;
        items[i].style.zIndex = -stt;
        items[i].style.filter = 'blur(5px)';
        items[i].style.opacity = stt > 2 ? 0 : 0.6;
    }
}

// Initialize the display
loadShow();

// Wrap around to the beginning if the active index exceeds the array length
next.onclick = function() {
    active = (active + 1) % items.length; // Wraps around to 0 after the last item
    loadShow();
};

// Wrap around to the end if the active index goes below 0
prev.onclick = function() {
    active = (active - 1 + items.length) % items.length; // Wraps around to the last item if below 0
    loadShow();
};





// JavaScript for rotating cards
let currentCard = 0;
const cards = document.querySelectorAll(".card");
const dots = document.querySelectorAll(".dot");

// Function to show the specific card
function showCard(index) {
  // Remove the active class from the currently active card and dot
  cards[currentCard].classList.remove("active");
  dots[currentCard].classList.remove("active");
  
  // Update the current card index
  currentCard = index;
  
  // Add the active class to the newly selected card and dot
  cards[currentCard].classList.add("active");
  dots[currentCard].classList.add("active");
}

// Auto-rotate every 10 seconds
setInterval(() => {
  let nextCard = (currentCard + 1) % cards.length;
  showCard(nextCard);
}, 10000);

// Add click event listeners for manual control through dots
dots.forEach((dot, index) => {
  dot.addEventListener("click", () => showCard(index));
});







document.querySelector('.contact-form form').addEventListener('submit', function(e) {
  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const subject = document.getElementById('subject').value;
  const message = document.getElementById('message').value;

  if (!name || !email || !subject || !message) {
      e.preventDefault();
      alert('Please fill in all fields.');
  }
});
