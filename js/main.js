// Desenvolva-se — comportamento compartilhado entre todas as páginas

document.addEventListener("DOMContentLoaded", () => {
  initMobileNav();
  initYear();
  initForms();
  initHeaderScroll();
  initScrollReveal();
  initCounters();
  initHeroCarousel();
  initContatoConsole();
  initPixCopy();
});

/**
 * Envia um evento anônimo de uso. Só repassa o nome do evento e rótulos
 * fixos definidos no código — nunca nome, telefone, e-mail ou mensagem
 * digitados pelo visitante.
 *
 * Hoje o site não tem ferramenta de analytics instalada, então isto não
 * envia nada: apenas empilha em window.dataLayer, que é o formato lido
 * por GA4/Google Tag Manager assim que um deles for adicionado.
 * Os nomes de evento estão documentados no SETUP.md.
 */
function rastrear(evento, rotulo) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(rotulo ? { event: evento, rotulo: rotulo } : { event: evento });
}

// Copia a chave PIX com retorno acessível e caminho manual de reserva.
function initPixCopy() {
  const botao = document.getElementById("pix-copiar");
  if (!botao) return;

  const retorno = document.getElementById("pix-feedback");
  const chave = botao.dataset.chave;
  let limpeza = null;

  const avisar = (texto, copiou) => {
    retorno.textContent = texto;
    retorno.classList.toggle("erro", !copiou);
    clearTimeout(limpeza);
    limpeza = setTimeout(() => {
      retorno.textContent = "";
      retorno.classList.remove("erro");
    }, 8000);
  };

  // Reserva para navegadores sem a API de área de transferência
  // (ou em páginas servidas sem HTTPS, onde ela fica indisponível).
  const copiaDeReserva = () => {
    const campo = document.createElement("textarea");
    campo.value = chave;
    campo.setAttribute("readonly", "");
    campo.style.position = "fixed";
    campo.style.top = "0";
    campo.style.opacity = "0";
    document.body.appendChild(campo);
    campo.select();
    let copiou = false;
    try {
      copiou = document.execCommand("copy");
    } catch (erro) {
      copiou = false;
    }
    document.body.removeChild(campo);
    return copiou;
  };

  botao.addEventListener("click", async () => {
    let copiou = false;

    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(chave);
        copiou = true;
      } catch (erro) {
        copiou = false;
      }
    }

    if (!copiou) copiou = copiaDeReserva();

    if (copiou) {
      avisar("Chave PIX copiada. Agora é só colar no app do seu banco.", true);
      rastrear("pix_chave_copiada");
    } else {
      avisar("Não conseguimos copiar automaticamente. Selecione o número acima e copie manualmente.", false);
      rastrear("pix_copia_falhou");
    }
  });
}

// Página de contato: escolher o assunto adapta o formulário (sugestão de
// escrita + atalho para o formulário certo), e a trilha de circuito acima
// dos campos acende conforme a mensagem fica pronta para enviar.
function initContatoConsole() {
  const form = document.getElementById("contato-console");
  if (!form) return;

  const nome = form.querySelector("#ct-nome");
  const email = form.querySelector("#ct-email");
  const telefone = form.querySelector("#ct-telefone");
  const mensagem = form.querySelector("#ct-mensagem");
  const trace = form.querySelector(".rail-live");
  const steps = form.querySelectorAll(".rail-step");
  const caption = form.querySelector(".rail-caption");
  const hint = form.querySelector("#intent-hint");
  const hintLink = form.querySelector("#intent-hint-link");
  const promptPadrao = mensagem.placeholder;

  // quanto da trilha fica acesa a cada etapa concluída (0 a 3)
  const PERCURSO = [95, 65, 35, 0];
  const LEGENDAS = [
    "Comece pelo seu nome.",
    "Como podemos te responder?",
    "Agora conta o que você precisa.",
    "Pronto — é só enviar.",
  ];

  const atualizarTrilha = () => {
    const etapas = [
      nome.value.trim().length > 1,
      email.value.trim().length > 3 || telefone.value.trim().length > 7,
      mensagem.value.trim().length > 9,
    ];

    let concluidas = 0;
    for (const ok of etapas) {
      if (!ok) break;
      concluidas += 1;
    }

    trace.style.strokeDashoffset = PERCURSO[concluidas];
    steps.forEach((node, i) => node.classList.toggle("on", i < concluidas));
    caption.textContent = LEGENDAS[concluidas];
  };

  form.querySelectorAll(".intent input").forEach((opcao) => {
    opcao.addEventListener("change", () => {
      mensagem.placeholder = opcao.dataset.prompt || promptPadrao;
      if (opcao.dataset.atalhoHref) {
        hintLink.href = opcao.dataset.atalhoHref;
        hintLink.textContent = opcao.dataset.atalhoLabel;
        hint.hidden = false;
      } else {
        hint.hidden = true;
      }
    });
  });

  form.addEventListener("input", atualizarTrilha);
  form.addEventListener("reset", () => {
    setTimeout(() => {
      hint.hidden = true;
      mensagem.placeholder = promptPadrao;
      atualizarTrilha();
    }, 0);
  });

  atualizarTrilha();
}

// Alterna os slides do carrossel do herói (logo + fotos), com bolinhas
// de navegação. Não avança sozinho se o visitante preferir menos movimento.
function initHeroCarousel() {
  const root = document.getElementById("hero-carousel");
  if (!root) return;

  const slides = root.querySelectorAll(".hero-slide");
  const dots = root.querySelectorAll(".hero-dot");
  const botaoPausa = document.getElementById("hero-pausa");
  if (slides.length < 2) return;

  let index = 0;
  let timer = null;
  // pausa temporária, enquanto o ponteiro ou o foco está sobre o carrossel
  let suspenso = false;

  /* loading="lazy" não serve aqui: os 8 quadros ficam empilhados em
     inset:0 no topo da página, então o navegador considera todos dentro
     da viewport e baixa os 8 de uma vez. Quem decide quando baixar passa
     a ser este código: só o primeiro quadro tem src no HTML, os demais
     guardam o caminho em data-src. */
  const hidratar = (i) => {
    const img = slides[i]?.querySelector("img[data-src]");
    if (!img) return;
    /* O <source> do WebP tem de ser preenchido ANTES do src do <img>:
       definir o src primeiro faz o navegador fixar o JPEG na hora, e o
       WebP que chegasse depois seria ignorado ou baixado à toa. */
    const fonte = img.parentElement?.querySelector("source[data-srcset]");
    if (fonte) {
      fonte.srcset = fonte.dataset.srcset;
      delete fonte.dataset.srcset;
    }
    img.src = img.dataset.src;
    delete img.dataset.src;
  };
  // pausa deliberada, pelo botão: vale até o visitante desfazer
  let pausadoPeloUsuario = false;
  const prefereMenosMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const goTo = (next) => {
    slides[index].classList.remove("active");
    slides[index].setAttribute("aria-hidden", "true");
    dots[index]?.classList.remove("active");
    dots[index]?.removeAttribute("aria-current");

    index = (next + slides.length) % slides.length;

    // garante a foto que vai aparecer e adianta a seguinte
    hidratar(index);
    hidratar((index + 1) % slides.length);

    slides[index].classList.add("active");
    // o quadro visível precisa ser legível por leitor de tela; os outros não
    slides[index].removeAttribute("aria-hidden");
    dots[index]?.classList.add("active");
    dots[index]?.setAttribute("aria-current", "true");
  };

  const restartTimer = () => {
    clearInterval(timer);
    if (prefereMenosMovimento || pausadoPeloUsuario) return;
    timer = setInterval(() => {
      if (!suspenso) goTo(index + 1);
    }, 6000);
  };

  dots.forEach((dot, i) => {
    dot.addEventListener("click", () => {
      goTo(i);
      restartTimer();
    });
    dot.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goTo(i + 1);
        dots[index]?.focus();
        restartTimer();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goTo(i - 1);
        dots[index]?.focus();
        restartTimer();
      }
    });
  });

  // WCAG 2.2.2: conteúdo que se move sozinho por mais de 5s precisa de um
  // jeito explícito de parar. Pausar no hover não basta para quem navega
  // por teclado ou toque.
  if (botaoPausa) {
    const iconePausa = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="7" y="5" width="3.5" height="14" rx="1"/><rect x="13.5" y="5" width="3.5" height="14" rx="1"/></svg>';
    const iconePlay = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5-11-6.5Z"/></svg>';

    // com movimento reduzido o carrossel já não gira: o botão vira "retomar"
    if (prefereMenosMovimento) {
      pausadoPeloUsuario = true;
      botaoPausa.innerHTML = iconePlay;
      botaoPausa.setAttribute("aria-pressed", "true");
      botaoPausa.setAttribute("aria-label", "Retomar a troca automática de imagens");
    }

    botaoPausa.addEventListener("click", () => {
      pausadoPeloUsuario = !pausadoPeloUsuario;
      botaoPausa.setAttribute("aria-pressed", String(pausadoPeloUsuario));
      botaoPausa.setAttribute(
        "aria-label",
        pausadoPeloUsuario
          ? "Retomar a troca automática de imagens"
          : "Pausar a troca automática de imagens"
      );
      botaoPausa.innerHTML = pausadoPeloUsuario ? iconePlay : iconePausa;
      restartTimer();
      rastrear(pausadoPeloUsuario ? "carrossel_pausado" : "carrossel_retomado");
    });
  }

  root.addEventListener("mouseenter", () => (suspenso = true));
  root.addEventListener("mouseleave", () => (suspenso = false));
  root.addEventListener("focusin", () => (suspenso = true));
  root.addEventListener("focusout", () => (suspenso = false));

  /* As fotos restantes só depois do load, e então em ociosidade. Esperar
     apenas o idle não basta: em conexão rápida o navegador fica ocioso
     antes de a página terminar de carregar e as fotos voltam a disputar
     banda com o primeiro paint. */
  const carregarResto = () => slides.forEach((_, i) => hidratar(i));
  const agendarResto = () => {
    hidratar(1); // a próxima do ciclo fica pronta antes da primeira troca
    if ("requestIdleCallback" in window) {
      requestIdleCallback(carregarResto, { timeout: 5000 });
    } else {
      setTimeout(carregarResto, 2500);
    }
  };

  if (document.readyState === "complete") {
    agendarResto();
  } else {
    window.addEventListener("load", agendarResto, { once: true });
  }

  restartTimer();
}

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
    const value = Number(el.dataset.count).toLocaleString("pt-BR");
    el.textContent = `${value}${el.dataset.suffix || ""}`;
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
      const value = Math.round(target * eased).toLocaleString("pt-BR");
      el.textContent = `${value}${suffix}`;
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
 *
 * ATENÇÃO: enquanto este valor for o texto de exemplo, NENHUM envio chega
 * à planilha. O site não perde o visitante nesse caso — os formulários
 * oferecem enviar o mesmo conteúdo pelo WhatsApp —, mas as respostas não
 * ficam registradas em lugar nenhum. Preencher isto é o que liga os nove
 * formulários do site.
 */
const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbz1E3aRnOTKbE9AS-bkhCo85NBaLAYufl8UhndR5xWnwT-ywDi8RBjgf7oOp3ZyeJbS/exec";

const WHATSAPP_NUMERO = "5551984406121";

function backendConectado() {
  return Boolean(GOOGLE_SCRIPT_URL) && !GOOGLE_SCRIPT_URL.startsWith("COLE_AQUI");
}

function initForms() {
  document.querySelectorAll("form[data-sheet-form]").forEach((form) => {
    form.addEventListener("submit", (event) => handleFormSubmit(event, form));

    // um único evento por formulário, quando o visitante começa a
    // preencher — só o nome do formulário, nada do que foi digitado
    let jaContou = false;
    form.addEventListener(
      "input",
      () => {
        if (jaContou) return;
        jaContou = true;
        rastrear("formulario_iniciado", form.getAttribute("data-sheet-form"));
      },
      { once: false }
    );
  });
}

// Usa o texto do <label> visível em vez do name do campo, para que o
// resumo enviado pelo WhatsApp fique legível para quem recebe.
function rotuloDoCampo(form, campo) {
  const el = form.elements[campo];
  if (!el) return campo;
  const alvo = el instanceof RadioNodeList ? el[0] : el;
  const rotulo = alvo && alvo.id ? form.querySelector(`label[for="${alvo.id}"]`) : null;
  if (rotulo) return rotulo.textContent.trim().replace(/\s+/g, " ");
  return campo;
}

function linkDoWhatsapp(form, dados, titulo) {
  const linhas = [titulo, ""];
  Object.entries(dados).forEach(([campo, valor]) => {
    if (!valor || campo === "formulario" || campo === "dataEnvio") return;
    linhas.push(`${rotuloDoCampo(form, campo)}: ${valor}`);
  });
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(linhas.join("\n"))}`;
}

async function handleFormSubmit(event, form) {
  event.preventDefault();

  const status = form.querySelector(".form-status");
  const botao = form.querySelector('button[type="submit"]');
  const formulario = form.getAttribute("data-sheet-form");

  const dados = Object.fromEntries(new FormData(form).entries());
  dados.formulario = formulario;
  dados.dataEnvio = new Date().toISOString();

  /* Quando a planilha não está conectada, o visitante não pode simplesmente
     perder o que escreveu: oferecemos o mesmo conteúdo pelo WhatsApp, que é
     o canal que a organização já usa todo dia. */
  const oferecerWhatsapp = (titulo, mensagem) => {
    setStatus(status, "error", mensagem, {
      href: linkDoWhatsapp(form, dados, titulo),
      texto: "Enviar pelo WhatsApp",
    });
  };

  if (!backendConectado()) {
    oferecerWhatsapp(
      "Novo contato pelo site",
      "O envio pelo site está temporariamente indisponível. Seus dados não foram perdidos: toque no botão abaixo para mandar tudo pelo WhatsApp."
    );
    rastrear("formulario_erro", formulario);
    return;
  }

  const textoOriginal = botao ? botao.textContent : "";
  if (botao) {
    botao.disabled = true;
    botao.textContent = "Enviando...";
  }
  setStatus(status, "loading", "Enviando...");

  try {
    await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    /* "no-cors" impede ler a resposta: dá para detectar falha de rede, mas
       não um erro do servidor. Por isso a mensagem confirma o envio, sem
       prometer que a solicitação já foi processada, e deixa um caminho de
       retorno caso ninguém responda. */
    setStatus(
      status,
      "success",
      "Enviado. A coordenação recebe as respostas e entra em contato pelo WhatsApp ou e-mail que você informou. Se preferir adiantar, fale com a gente pelo WhatsApp."
    );
    form.reset();
    rastrear("formulario_enviado", formulario);
  } catch (erro) {
    oferecerWhatsapp(
      "Novo contato pelo site",
      "Não conseguimos enviar agora — pode ter sido a conexão. Seus dados não foram perdidos: toque no botão abaixo para mandar tudo pelo WhatsApp."
    );
    rastrear("formulario_erro", formulario);
  } finally {
    if (botao) {
      botao.disabled = false;
      botao.textContent = textoOriginal;
    }
  }
}

function setStatus(el, tipo, mensagem, acao) {
  if (!el) return;
  el.className = `form-status ${tipo}`;
  el.textContent = mensagem;

  if (acao) {
    const link = document.createElement("a");
    link.className = "btn btn-primary btn-small form-status-acao";
    link.href = acao.href;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = acao.texto;
    el.appendChild(link);
  }

  /* Leva o foco para o aviso: sem isso, quem navega por teclado ou usa
     leitor de tela continua no botão e não percebe o que aconteceu.
     role="status" já está no HTML, então a mensagem também é anunciada. */
  if (tipo !== "loading") {
    el.setAttribute("tabindex", "-1");
    el.focus({ preventScroll: false });
  }
}

