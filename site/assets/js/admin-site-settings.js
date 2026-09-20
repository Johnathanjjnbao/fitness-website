(() => {
  const client = window.forgefitSupabase;
  const adminReady = window.forgefitAdminReady;
  const i18n = window.forgefitAdminI18n;
  const t = (key, values) => i18n?.t(key, values) || key;
  const HOMEPAGE_IMAGE_BUCKET = "trainer-images";
  const HOMEPAGE_IMAGE_FOLDER = "homepage";
  const scriptUrl = document.currentScript?.src;
  const localImageFallback = scriptUrl
    ? new URL("../images/trainer-team.png", scriptUrl).href
    : "../../assets/images/trainer-team.png";
  let previewObjectUrl = null;

  function textValue(value) {
    return typeof value === "string" && value.trim() ? value.trim() : null;
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

  function normalizeImagePosition(value) {
    const position = Number(value);
    return Number.isInteger(position) && position >= 0 && position <= 100 ? position : 50;
  }

  function setStatus(message, success = false) {
    const status = document.querySelector("[data-homepage-image-status]");
    if (!status) return;
    status.textContent = message;
    status.classList.toggle("is-success", success);
  }

  function setPathLabel(path) {
    const label = document.querySelector("[data-homepage-image-path]");
    if (label) label.textContent = storageObjectPath(path) || t("storageImageMissing");
  }

  function getStoragePublicUrl(value) {
    const imagePath = storageObjectPath(value);
    if (!imagePath) return null;

    try {
      const { data } = client.storage.from(HOMEPAGE_IMAGE_BUCKET).getPublicUrl(imagePath);
      return textValue(data?.publicUrl);
    } catch (error) {
      console.warn("FORGEFIT admin could not build the homepage image URL.", error);
      return null;
    }
  }

  function releasePreviewObjectUrl() {
    if (!previewObjectUrl) return;
    URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = null;
  }

  function applyStoredImage(imagePath) {
    const preview = document.querySelector("[data-homepage-image-preview]");
    if (!preview) return;

    releasePreviewObjectUrl();
    const storageUrl = getStoragePublicUrl(imagePath);
    let usingFallback = !storageUrl;

    preview.onerror = () => {
      if (usingFallback) {
        preview.onerror = null;
        console.warn("FORGEFIT local homepage fallback image could not be loaded.");
        return;
      }

      console.warn("FORGEFIT homepage Storage image could not be loaded; using fallback.", {
        imagePath,
      });
      usingFallback = true;
      preview.src = localImageFallback;
    };
    preview.src = storageUrl || localImageFallback;
  }

  function updatePreviewPosition(value) {
    const position = normalizeImagePosition(value);
    const preview = document.querySelector("[data-homepage-image-preview]");
    if (preview) preview.style.objectPosition = `${position}% center`;
    return position;
  }

  function previewSelectedFile(file) {
    const preview = document.querySelector("[data-homepage-image-preview]");
    const form = document.querySelector("[data-homepage-image-form]");
    if (!preview || !form || !file) return;

    releasePreviewObjectUrl();
    previewObjectUrl = URL.createObjectURL(file);
    preview.onerror = () => {
      console.warn("FORGEFIT selected homepage image could not be previewed.");
      applyStoredImage(form.elements.homepage_image_url.value);
    };
    preview.src = previewObjectUrl;
  }

  function getImageExtension(file) {
    const byMimeType = {
      "image/avif": "avif",
      "image/gif": "gif",
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/svg+xml": "svg",
      "image/webp": "webp",
    };
    if (byMimeType[file.type]) return byMimeType[file.type];

    const fileExtension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
    return fileExtension || "image";
  }

  async function uploadHomepageImage(file) {
    if (!file.type.startsWith("image/")) throw new Error(t("imageNotValid"));

    const uniqueId = typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const objectPath = `${HOMEPAGE_IMAGE_FOLDER}/${Date.now()}-${uniqueId}.${getImageExtension(file)}`;
    const { data, error } = await client.storage
      .from(HOMEPAGE_IMAGE_BUCKET)
      .upload(objectPath, file, {
        cacheControl: "31536000",
        contentType: file.type,
        upsert: false,
      });

    if (error) throw error;
    return data?.path || objectPath;
  }

  function friendlyError(error) {
    if (error?.code === "23514") return t("homepagePositionInvalid");
    if (error?.statusCode === "403" || error?.status === 403) {
      return t("noPermission");
    }
    return error?.message || t("homepageSaveFailed");
  }

  function fillForm(settings) {
    const form = document.querySelector("[data-homepage-image-form]");
    if (!form) return;

    const imagePath = storageObjectPath(settings.homepage_image_url) || "";
    const position = normalizeImagePosition(settings.homepage_image_position_percent);
    form.elements.homepage_image_url.value = imagePath;
    form.elements.homepage_image_position_percent.value = String(position);
    form.elements.homepage_image_position_number.value = String(position);
    form.elements.image.value = "";
    setPathLabel(imagePath);
    applyStoredImage(imagePath);
    updatePreviewPosition(position);
  }

  async function loadSettings() {
    setStatus(t("loadingCurrentImage"), true);
    const { data, error } = await client
      .from("site_settings")
      .select("homepage_image_url, homepage_image_position_percent")
      .eq("id", 1)
      .single();

    if (error) throw error;
    fillForm(data);
    setStatus("");
  }

  async function saveSettings(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const submitButton = form.querySelector('button[type="submit"]');
    const position = Number(form.elements.homepage_image_position_number.value);

    if (!Number.isSafeInteger(position) || position < 0 || position > 100) {
      setStatus(t("homepagePositionInvalid"));
      return;
    }

    submitButton.disabled = true;
    setStatus(t("saving"), true);

    try {
      let imagePath = storageObjectPath(form.elements.homepage_image_url.value);
      const imageFile = form.elements.image.files[0];
      if (imageFile) {
        setStatus(t("uploadingHomepageImage"), true);
        imagePath = await uploadHomepageImage(imageFile);
      }
      if (!imagePath) throw new Error(t("chooseHomepageImage"));

      const { data, error } = await client
        .from("site_settings")
        .update({
          homepage_image_url: imagePath,
          homepage_image_position_percent: position,
        })
        .eq("id", 1)
        .select("homepage_image_url, homepage_image_position_percent")
        .single();

      if (error) throw error;
      fillForm(data);
      setStatus(t("homepageSaved"), true);
    } catch (error) {
      console.warn("FORGEFIT admin homepage image could not be saved.", error);
      setStatus(friendlyError(error));
    } finally {
      submitButton.disabled = false;
    }
  }

  function handleImageSelection(event) {
    const [file] = event.currentTarget.files;
    if (!file) {
      applyStoredImage(event.currentTarget.form.elements.homepage_image_url.value);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setStatus(t("imageNotValid"));
      event.currentTarget.value = "";
      applyStoredImage(event.currentTarget.form.elements.homepage_image_url.value);
      return;
    }

    setStatus("");
    previewSelectedFile(file);
  }

  function syncPosition(source, target) {
    const position = normalizeImagePosition(source.value);
    source.value = String(position);
    target.value = String(position);
    updatePreviewPosition(position);
  }

  async function start() {
    if (!client || !adminReady) return;
    const user = await adminReady;
    if (!user) return;

    const form = document.querySelector("[data-homepage-image-form]");
    if (!form) return;

    form.addEventListener("submit", saveSettings);
    form.elements.image.addEventListener("change", handleImageSelection);
    form.elements.homepage_image_position_percent.addEventListener("input", () => {
      syncPosition(
        form.elements.homepage_image_position_percent,
        form.elements.homepage_image_position_number,
      );
    });
    form.elements.homepage_image_position_number.addEventListener("input", () => {
      const value = Number(form.elements.homepage_image_position_number.value);
      if (!Number.isInteger(value) || value < 0 || value > 100) return;
      form.elements.homepage_image_position_percent.value = String(value);
      updatePreviewPosition(value);
    });

    try {
      await loadSettings();
    } catch (error) {
      console.warn("FORGEFIT admin site settings could not be loaded.", error);
      setStatus(t("settingsLoadFailed"));
      applyStoredImage("");
    }
  }

  start();
})();
