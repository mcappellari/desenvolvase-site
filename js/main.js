// Desenvolva-se — comportamento compartilhado entre todas as páginas

document.addEventListener("DOMContentLoaded", () => {
  initMobileNav();
  initYear();
  initForms();
  initHeaderScroll();
  initScrollReveal();
  initCounters();
});

function initMobileNav() {
  const toggle = document.getElementById("nav-toggle");
  const nav = document.getElementById("main-nav");
  if (!toggle || !nav) return;

  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  // No mobile, "Nossas Iniciativas" vira um accordion ao tocar.
  document.querySelectorAll(".has-dropdown > a").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (window.innerWidth > 720) return;
      event.preventDefault();
      link.parentElement.classList.toggle("open");
    });
  });
}

function initYear() {
  const el = document.getElementById("year");
  if (el) el.textContent = new Date().getFullYear();
}

function initHeaderScroll() {
  const header = document.querySelector(".site-header");
  if (!header) return;
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

// Anima seções, cards e outros blocos ao entrarem na tela.
function initScrollReveal() {
  const selector = [
    ".hero h1",
    ".hero .lead",
    ".hero .btn-group",
    ".hero-visual",
    ".section-header",
    ".grid > *",
    ".stats > *",
    ".timeline-item",
    ".form-card",
    ".cta-band h2",
    ".cta-band p",
    ".cta-band .btn-group",
    ".instagram-grid > *",
    ".page-hero h1",
    ".page-hero p",
  ].join(",");
  const els = document.querySelectorAll(selector);
  if (!els.length) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) {
    els.forEach((el) => el.classList.add("reveal", "in-view"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in-view");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );

  els.forEach((el, index) => {
    el.classList.add("reveal");
    el.style.transitionDelay = `${(index % 4) * 90}ms`;
    observer.observe(el);
  });
}

// Anima os números da seção "Nosso impacto" contando do zero até o valor final.
function initCounters() {
  const counters = document.querySelectorAll("[data-count]");
  if (!counters.length) return;

  const renderFinal = (el) => {
    el.textContent = `${el.dataset.count}${el.dataset.suffix || ""}`;
  };

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    counters.forEach(renderFinal);
    return;
  }

  const animate = (el) => {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || "";
    const duration = 1200;
    const start = performance.now();

    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = `${Math.round(target * eased)}${suffix}`;
      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animate(entry.target);
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.5 }
  );

  counters.forEach((el) => observer.observe(el));
}

/**
 * URL do Google Apps Script (Web App) que grava os envios no Google Sheets.
 * Ver SETUP.md para o passo a passo de como criar e publicar esse script.
 * Enquanto este valor não for preenchido, os formulários mostram uma
 * mensagem de aviso em vez de tentar enviar.
 */
const GOOGLE_SCRIPT_URL = "COLE_AQUI_A_URL_DO_APPS_SCRIPT";

function initForms() {
  document.querySelectorAll("form[data-sheet-form]").forEach((form) => {
    form.addEventListener("submit", (event) => handleFormSubmit(event, form));
  });
}

async function handleFormSubmit(event, form) {
  event.preventDefault();
  const status = form.querySelector(".form-status");
  const formulario = form.getAttribute("data-sheet-form");

  if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.startsWith("COLE_AQUI")) {
    setStatus(status, "error", "Formulário ainda não conectado à planilha. Veja o SETUP.md.");
    return;
  }

  const dados = Object.fromEntries(new FormData(form).entries());
  dados.formulario = formulario;
  dados.dataEnvio = new Date().toISOString();

  setStatus(status, "loading", "Enviando...");

  try {
    await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    // "no-cors" não deixa ler a resposta, então assumimos sucesso
    // quando o fetch não lança erro de rede.
    setStatus(status, "success", "Recebemos sua solicitação! Em breve entraremos em contato.");
    form.reset();
  } catch (erro) {
    setStatus(status, "error", "Não foi possível enviar agora. Tente novamente ou fale pelo WhatsApp.");
  }
}

function setStatus(el, tipo, mensagem) {
  if (!el) return;
  el.className = `form-status ${tipo}`;
  el.textContent = mensagem;
}
