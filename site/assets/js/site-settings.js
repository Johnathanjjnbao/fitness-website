(() => {
  const homepageImageBucket = "trainer-images";
  const language = document.documentElement.lang === "ko" ? "ko" : "vi";

  function textValue(value) {
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }

  function setMultilineText(element, value) {
    if (!element || !value) return;

    const lines = value.split(/\r?\n/);
    const nodes = [];
    lines.forEach((line, index) => {
      if (index > 0) nodes.push(document.createElement("br"));
      nodes.push(document.createTextNode(line));
    });
    element.replaceChildren(...nodes);
  }

  function storageObjectPath(value) {
    const path = textValue(value);
    if (!path || path.startsWith("/") || path.includes("\\") || /^[a-z][a-z\d+.-]*:/i.test(path)) {
      return null;
    }

    const pathSegments = path.split("/");
    if (pathSegments.some((segment) => !segment || segment === "." || segment === "..")) return null;

    return path;
  }

  function imagePositionPercent(value) {
    if (value === null || value === undefined || (typeof value === "string" && !value.trim())) return 50;

    const position = Number(value);
    return Number.isInteger(position) && position >= 0 && position <= 100 ? position : 50;
  }

  function updateBrand(settings) {
    const brandName = textValue(settings.brand_name);
    const brandDisplay = textValue(settings.brand_display);
    if (brandName) window.forgefitBrandName = brandName;

    if (brandName && brandName !== "FORGEFIT") {
      document.title = document.title.replaceAll("FORGEFIT", brandName);
      document.querySelectorAll('meta[name="description"], [alt], [aria-label]').forEach((element) => {
        for (const attribute of ["content", "alt", "aria-label"]) {
          const value = element.getAttribute(attribute);
          if (value?.includes("FORGEFIT")) {
            element.setAttribute(attribute, value.replaceAll("FORGEFIT", brandName));
          }
        }
      });

      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (node.textContent.includes("FORGEFIT")) {
          node.textContent = node.textContent.replaceAll("FORGEFIT", brandName);
        }
      }
    }

    document.querySelectorAll("a.brand").forEach((link) => {
      const logoText = link.querySelector(".brand-mark")?.nextElementSibling;
      if (logoText && brandDisplay) {
        const slashIndex = brandDisplay.indexOf("//");
        if (slashIndex > 0 && slashIndex < brandDisplay.length - 2) {
          const slash = document.createElement("span");
          slash.className = "brand-slash";
          slash.textContent = "//";
          logoText.replaceChildren(
            document.createTextNode(brandDisplay.slice(0, slashIndex)),
            slash,
            document.createTextNode(brandDisplay.slice(slashIndex + 2)),
          );
        } else {
          logoText.textContent = brandDisplay;
        }
      }

      if (brandName) {
        link.setAttribute("aria-label", language === "ko" ? `${brandName} 홈` : `${brandName} - Trang chủ`);
      }
    });

  }

  function updateContactDetails(settings) {
    const phoneDisplay = textValue(settings.phone_display);
    const phoneE164 = textValue(settings.phone_e164);
    if (phoneDisplay && phoneE164 && /^\+?[0-9]{8,15}$/.test(phoneE164)) {
      document.querySelectorAll('a[href^="tel:"]').forEach((link) => {
        link.textContent = phoneDisplay;
        link.href = `tel:${phoneE164}`;
      });
    }

    const email = textValue(settings.email);
    if (email && /^[^\s@?/]+@[^\s@?/]+\.[^\s@?/]+$/.test(email)) {
      document.querySelectorAll('a[href^="mailto:"]').forEach((link) => {
        link.textContent = email;
        link.href = `mailto:${email}`;
      });
    }

    const footerAddress = textValue(settings[`address_short_${language}`]);
    const footerAddressElement = document.querySelector(
      ".site-footer .footer-main > div:last-child .footer-links li:last-child",
    );
    if (footerAddress && footerAddressElement) footerAddressElement.textContent = footerAddress;

    setMultilineText(
      document.querySelector("[data-site-address-full]"),
      textValue(settings[`address_full_${language}`]),
    );
    setMultilineText(
      document.querySelector("[data-site-hours]"),
      textValue(settings[`hours_${language}`]),
    );

    const footerCopy = textValue(settings[`footer_copy_${language}`]);
    const footerCopyElement = document.querySelector(".site-footer .footer-copy");
    if (footerCopy && footerCopyElement) footerCopyElement.textContent = footerCopy;
  }

  function updateHomepageImage(settings) {
    const image = document.querySelector("[data-homepage-image]");
    if (!image) return;

    image.style.objectPosition = `${imagePositionPercent(settings.homepage_image_position_percent)}% center`;

    const imagePath = storageObjectPath(settings.homepage_image_url);
    if (!imagePath) return;

    try {
      const { data } = window.forgefitSupabase.storage
        .from(homepageImageBucket)
        .getPublicUrl(imagePath);
      const publicUrl = textValue(data?.publicUrl);
      if (!publicUrl) throw new Error("Supabase Storage did not return a public URL.");

      const fallbackSource = image.getAttribute("src");
      image.addEventListener("error", () => {
        console.warn("FORGEFIT homepage image could not be loaded; showing the saved local image.");
        if (fallbackSource) image.setAttribute("src", fallbackSource);
      }, { once: true });
      image.src = publicUrl;
    } catch (error) {
      console.warn("FORGEFIT homepage image URL could not be created; showing the saved local image.", error);
    }
  }

  async function loadSiteSettings() {
    if (!window.forgefitSupabase) return;

    try {
      const { data, error } = await window.forgefitSupabase
        .from("site_settings")
        .select(
          "brand_name, brand_display, phone_display, phone_e164, email, address_short_vi, address_short_ko, address_full_vi, address_full_ko, hours_vi, hours_ko, footer_copy_vi, footer_copy_ko, homepage_image_url, homepage_image_position_percent",
        )
        .eq("id", 1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return;

      updateBrand(data);
      updateContactDetails(data);
      updateHomepageImage(data);
    } catch (error) {
      console.warn("FORGEFIT site settings could not be loaded; showing the saved contact details.", error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadSiteSettings);
  } else {
    loadSiteSettings();
  }
})();
