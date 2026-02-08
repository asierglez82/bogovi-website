const html = document.documentElement;
const toggleButton = document.querySelector(".lang-toggle");
const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightbox-image");
const lightboxTitle = document.getElementById("lightbox-title");
const lightboxClose = document.querySelector(".lightbox-close");
const inputFields = document.querySelectorAll("[data-placeholder-es]");
const customCursor = document.querySelector(".custom-cursor");
const contactForm = document.querySelector(".contact-form");
const galleryGrid = document.querySelector("#gallery-grid");
const galleryPath =
  galleryGrid?.dataset.galleryPath?.replace(/\/$/, "") || "assets/gallery";
const galleryFallback = "assets/hero-art.svg";

let currentLang = "es";
let activeArtwork = null;
const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;
const hasFinePointer = window.matchMedia(
  "(hover: hover) and (pointer: fine)"
).matches;
const canObserve = "IntersectionObserver" in window;
const revealObserver =
  prefersReducedMotion || !canObserve
    ? null
    : new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          });
        },
        { threshold: 0.2 }
      );

const formatTitle = (rawTitle) => {
  if (!rawTitle) return "";
  const withSpaces = rawTitle.replace(/[_-]+/g, " ").trim();
  if (!withSpaces) return "";
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
};

const getImageTitleFromSrc = (src) => {
  if (!src) return "";
  const cleanSrc = src.split("?")[0].split("#")[0];
  const filename = cleanSrc.substring(cleanSrc.lastIndexOf("/") + 1);
  const baseName = filename.replace(/\.[^.]+$/, "");
  return formatTitle(baseName || filename);
};

const attachFallbacks = (root = document) => {
  root.querySelectorAll("img[data-fallback]").forEach((image) => {
    if (image.dataset.fallbackBound) return;
    image.dataset.fallbackBound = "true";
    image.addEventListener("error", () => {
      const fallback = image.getAttribute("data-fallback");
      if (!fallback || image.src.includes(fallback)) return;
      image.src = fallback;
      image.removeAttribute("data-fallback");
    });
  });
};

const registerReveals = (elements) => {
  elements.forEach((element) => {
    if (element.dataset.revealBound) return;
    element.dataset.revealBound = "true";
    if (prefersReducedMotion || !revealObserver) {
      element.classList.add("is-visible");
      return;
    }
    revealObserver.observe(element);
  });
};

const setLanguage = (lang) => {
  currentLang = lang;
  html.setAttribute("data-lang", lang);
  html.setAttribute("lang", lang);

  if (toggleButton) {
    toggleButton.textContent = lang === "es" ? "EN" : "ES";
    toggleButton.setAttribute(
      "aria-label",
      lang === "es" ? "Cambiar a inglés" : "Cambiar a español"
    );
  }

  inputFields.forEach((field) => {
    const placeholder =
      lang === "es"
        ? field.getAttribute("data-placeholder-es")
        : field.getAttribute("data-placeholder-en");
    if (placeholder) {
      field.setAttribute("placeholder", placeholder);
    }
  });

  if (activeArtwork && lightboxTitle) {
    const title =
      lang === "es" ? activeArtwork.titleEs : activeArtwork.titleEn;
    lightboxTitle.textContent = title;
    lightboxImage.setAttribute("alt", title);
  }
};

const openLightboxFromCard = (card) => {
  if (!lightbox || !lightboxImage || !lightboxTitle) return;
  const titleEs = card.getAttribute("data-title-es") || "";
  const titleEn = card.getAttribute("data-title-en") || "";
  const src = card.getAttribute("data-src") || "";
  const fallback = card.getAttribute("data-fallback") || "";
  activeArtwork = { titleEs, titleEn };
  lightboxImage.src = src;
  if (fallback) {
    lightboxImage.setAttribute("data-fallback", fallback);
  } else {
    lightboxImage.removeAttribute("data-fallback");
  }
  lightboxTitle.textContent = currentLang === "es" ? titleEs : titleEn;
  lightboxImage.setAttribute(
    "alt",
    currentLang === "es" ? titleEs : titleEn
  );
  if (typeof lightbox.showModal === "function") {
    lightbox.showModal();
  }
};

const createGalleryCard = ({ src, title, sold }) => {
  const resolvedTitle = title || getImageTitleFromSrc(src);
  if (!resolvedTitle) return null;

  const card = document.createElement("button");
  card.type = "button";
  card.className = "art-card reveal";
  card.setAttribute("data-lightbox", "");
  card.setAttribute("data-src", src);
  card.setAttribute("data-fallback", galleryFallback);
  card.setAttribute("data-title-es", resolvedTitle);
  card.setAttribute("data-title-en", resolvedTitle);

  const img = document.createElement("img");
  img.src = src;
  img.alt = resolvedTitle;
  img.setAttribute("data-fallback", galleryFallback);

  const meta = document.createElement("span");
  meta.className = "art-meta";
  const titleEs = document.createElement("span");
  titleEs.className = "art-title lang-es";
  titleEs.textContent = resolvedTitle;
  const titleEn = document.createElement("span");
  titleEn.className = "art-title lang-en";
  titleEn.textContent = resolvedTitle;

  meta.appendChild(titleEs);
  meta.appendChild(titleEn);
  if (sold) {
    const badge = document.createElement("span");
    badge.className = "art-badge";
    const soldEs = document.createElement("span");
    soldEs.className = "lang-es";
    soldEs.textContent = "Vendido";
    const soldEn = document.createElement("span");
    soldEn.className = "lang-en";
    soldEn.textContent = "Sold";
    badge.appendChild(soldEs);
    badge.appendChild(soldEn);
    card.appendChild(badge);
  }
  card.appendChild(img);
  card.appendChild(meta);

  card.addEventListener("click", () => openLightboxFromCard(card));
  return card;
};

const getGalleryItemSrc = (item) => {
  if (!item) return "";
  if (typeof item === "string") return item;
  return item.src || item.file || item.image || "";
};

const getGalleryItemTitle = (item) => {
  if (!item || typeof item === "string") return "";
  return item.title || "";
};

const getGalleryItemSold = (item) => {
  if (!item || typeof item === "string") return false;
  return Boolean(item.sold || item.vendido || item.status === "sold");
};

const normalizeGalleryItem = (src) => {
  if (!src) return "";
  if (/^https?:\/\//i.test(src)) return src;
  if (src.startsWith("/")) return src;
  if (src.startsWith(`${galleryPath}/`)) return src;
  return `${galleryPath}/${src}`;
};

const isImageFile = (fileName) =>
  /\.(jpe?g|png|webp|gif)$/i.test(fileName);

const renderGallery = (items) => {
  if (!galleryGrid) return;
  galleryGrid.innerHTML = "";
  const validItems = items
    .map((item) => {
      const src = getGalleryItemSrc(item);
      if (!isImageFile(src)) return null;
      return {
        src,
        title: getGalleryItemTitle(item),
        sold: getGalleryItemSold(item)
      };
    })
    .filter(Boolean);
  if (!validItems.length) {
    galleryGrid.innerHTML =
      '<p class="lang-es">No hay obras aún.</p><p class="lang-en">No artworks yet.</p>';
    return;
  }

  validItems.forEach((item) => {
    const src = normalizeGalleryItem(item.src);
    const card = createGalleryCard({
      src,
      title: item.title,
      sold: item.sold
    });
    if (card) {
      galleryGrid.appendChild(card);
    }
  });

  attachFallbacks(galleryGrid);
  registerReveals(galleryGrid.querySelectorAll(".reveal"));
};

const fetchGalleryManifest = async () => {
  const manifestUrl = `${galleryPath}/manifest.json`;
  try {
    const response = await fetch(manifestUrl, { cache: "no-store" });
    if (!response.ok) return null;
    const data = await response.json();
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.images)) return data.images;
    return null;
  } catch (error) {
    return null;
  }
};

const fetchGalleryListing = async () => {
  try {
    const response = await fetch(`${galleryPath}/`, { cache: "no-store" });
    if (!response.ok) return null;
    const htmlText = await response.text();
    const matches = Array.from(
      htmlText.matchAll(/href="([^"]+\.(?:png|jpe?g|webp|gif))"/gi)
    );
    if (!matches.length) return null;
    return matches.map((match) => decodeURIComponent(match[1]));
  } catch (error) {
    return null;
  }
};

const loadGallery = async () => {
  if (!galleryGrid) return;
  const manifestItems = await fetchGalleryManifest();
  if (manifestItems?.length) {
    renderGallery(manifestItems);
    return;
  }
  const listedItems = await fetchGalleryListing();
  if (listedItems?.length) {
    renderGallery(listedItems);
    return;
  }
  renderGallery([]);
};

const savedLang = window.localStorage.getItem("begovi-lang");
if (savedLang === "es" || savedLang === "en") {
  setLanguage(savedLang);
} else {
  setLanguage("es");
}

attachFallbacks();
loadGallery();
document.querySelectorAll(".section").forEach((section) => {
  section.classList.add("reveal");
});
registerReveals(document.querySelectorAll(".reveal"));

if (toggleButton) {
  toggleButton.addEventListener("click", () => {
    const nextLang = currentLang === "es" ? "en" : "es";
    setLanguage(nextLang);
    window.localStorage.setItem("begovi-lang", nextLang);
  });
}

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const href = link.getAttribute("href");
    if (!href || href.length <= 1) return;
    const target = document.querySelector(href);
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

if (customCursor && hasFinePointer) {
  let mouseX = 0;
  let mouseY = 0;
  let rafId = null;

  const updateCursor = () => {
    customCursor.style.left = `${mouseX}px`;
    customCursor.style.top = `${mouseY}px`;
    rafId = null;
  };

  document.addEventListener("mousemove", (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
    customCursor.classList.add("is-visible");
    if (!rafId) {
      rafId = window.requestAnimationFrame(updateCursor);
    }
  });

  document.addEventListener("mousedown", () => {
    customCursor.classList.add("is-active");
  });

  document.addEventListener("mouseup", () => {
    customCursor.classList.remove("is-active");
  });

  document.querySelectorAll("a, button").forEach((el) => {
    el.addEventListener("mouseenter", () => {
      customCursor.classList.add("is-active");
    });
    el.addEventListener("mouseleave", () => {
      customCursor.classList.remove("is-active");
    });
  });
}

if (lightboxImage) {
  lightboxImage.addEventListener("error", () => {
    const fallback = lightboxImage.getAttribute("data-fallback");
    if (!fallback || lightboxImage.src.includes(fallback)) return;
    lightboxImage.src = fallback;
  });
}

if (lightboxClose) {
  lightboxClose.addEventListener("click", () => {
    lightbox.close();
  });
}

if (lightbox) {
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) {
      lightbox.close();
    }
  });
}

if (contactForm) {
  const statusEl = contactForm.querySelector(".form-status");
  const submitButtons = contactForm.querySelectorAll('button[type="submit"]');
  const messages = {
    sending: {
      es: "Enviando mensaje...",
      en: "Sending message..."
    },
    success: {
      es: "Mensaje enviado. Gracias.",
      en: "Message sent. Thank you."
    },
    error: {
      es: "No se pudo enviar. Inténtalo de nuevo.",
      en: "Could not send. Please try again."
    },
    captcha: {
      es: "Completa el captcha antes de enviar.",
      en: "Please complete the captcha."
    },
    required: {
      es: "Completa todos los campos.",
      en: "Please complete all fields."
    }
  };

  const setStatus = (key) => {
    if (!statusEl) return;
    statusEl.textContent = messages[key]?.[currentLang] || "";
  };

  const setSubmitting = (isSubmitting) => {
    submitButtons.forEach((button) => {
      button.disabled = isSubmitting;
      button.style.opacity = isSubmitting ? "0.6" : "";
      button.style.pointerEvents = isSubmitting ? "none" : "";
    });
  };

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(contactForm);
    const name = formData.get("nombre")?.toString().trim() || "";
    const email = formData.get("email")?.toString().trim() || "";
    const message = formData.get("mensaje")?.toString().trim() || "";

    if (!name || !email || !message) {
      setStatus("required");
      return;
    }

    const captchaToken = window.grecaptcha?.getResponse?.() || "";

    if (!captchaToken) {
      setStatus("captcha");
      return;
    }

    try {
      setSubmitting(true);
      setStatus("sending");
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          nombre: name,
          email,
          mensaje: message,
          captchaToken
        })
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      contactForm.reset();
      window.grecaptcha?.reset?.();
      setStatus("success");
    } catch (error) {
      setStatus("error");
    } finally {
      setSubmitting(false);
    }
  });
}
