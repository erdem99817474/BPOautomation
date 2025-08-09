document.addEventListener("DOMContentLoaded", () => {
  renderCurrentYear();
  initializeTheme();
  wireUpContactForm();
});

function renderCurrentYear() {
  const yearElement = document.getElementById("year");
  if (yearElement) {
    yearElement.textContent = String(new Date().getFullYear());
  }
}

function initializeTheme() {
  const savedTheme = window.localStorage.getItem("pref-theme");
  if (savedTheme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  }

  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (!savedTheme && prefersDark) {
    document.documentElement.setAttribute("data-theme", "dark");
  }

  const toggleButton = document.getElementById("themeToggle");
  toggleButton?.addEventListener("click", () => {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const next = isDark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    window.localStorage.setItem("pref-theme", next);
  });
}

function wireUpContactForm() {
  const form = document.getElementById("contactForm");
  const status = document.getElementById("formStatus");
  if (!form || !status) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const name = (formData.get("name") || "").toString().trim();
    const email = (formData.get("email") || "").toString().trim();
    const message = (formData.get("message") || "").toString().trim();

    if (!name || !email || !message) {
      status.textContent = "Please fill out all fields.";
      status.style.color = "#d14343";
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      status.textContent = "Please enter a valid email address.";
      status.style.color = "#d14343";
      return;
    }

    // Simulate async submission
    status.textContent = "Sending...";
    status.style.color = "";

    setTimeout(() => {
      status.textContent = "Thanks! Your message has been sent (simulated).";
      status.style.color = "#15803d";
      form.reset();
    }, 800);
  });
}