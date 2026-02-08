const html = document.documentElement;
const toggleButton = document.querySelector(".lang-toggle");
const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightbox-image");
const lightboxTitle = document.getElementById("lightbox-title");
const lightboxClose = document.querySelector(".lightbox-close");
const inputFields = document.querySelectorAll("[data-placeholder-es]");
const galleryGrid = document.querySelector("#gallery-grid");
const galleryPath =
  galleryGrid?.dataset.galleryPath?.replace(/\/$/, "") || "assets/gallery";
const galleryFallback = "assets/hero-art.svg";

let currentLang = "es";
let activeArtwork = null;

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

const createGalleryCard = (src) => {
  const title = getImageTitleFromSrc(src);
  if (!title) return null;

  const card = document.createElement("button");
  card.type = "button";
  card.className = "art-card";
  card.setAttribute("data-lightbox", "");
  card.setAttribute("data-src", src);
  card.setAttribute("data-fallback", galleryFallback);
  card.setAttribute("data-title-es", title);
  card.setAttribute("data-title-en", title);

  const img = document.createElement("img");
  img.src = src;
  img.alt = title;
  img.setAttribute("data-fallback", galleryFallback);

  const meta = document.createElement("span");
  meta.className = "art-meta";
  const titleEs = document.createElement("span");
  titleEs.className = "art-title lang-es";
  titleEs.textContent = title;
  const titleEn = document.createElement("span");
  titleEn.className = "art-title lang-en";
  titleEn.textContent = title;

  meta.appendChild(titleEs);
  meta.appendChild(titleEn);
  card.appendChild(img);
  card.appendChild(meta);

  card.addEventListener("click", () => openLightboxFromCard(card));
  return card;
};

const normalizeGalleryItem = (item) => {
  if (!item) return "";
  if (/^https?:\/\//i.test(item)) return item;
  if (item.startsWith("/")) return item;
  if (item.startsWith(`${galleryPath}/`)) return item;
  return `${galleryPath}/${item}`;
};

const isImageFile = (fileName) => /\.(jpe?g|png|webp|gif)$/i.test(fileName);

const renderGallery = (items) => {
  if (!galleryGrid) return;
  galleryGrid.innerHTML = "";
  const validItems = items.filter((item) => isImageFile(item));
  if (!validItems.length) {
    galleryGrid.innerHTML =
      '<p class="lang-es">No hay obras aún.</p><p class="lang-en">No artworks yet.</p>';
    return;
  }

  validItems.forEach((item) => {
    const src = normalizeGalleryItem(item);
    const card = createGalleryCard(src);
    if (card) {
      galleryGrid.appendChild(card);
    }
  });

  attachFallbacks(galleryGrid);
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
