(() => {
  const client = window.forgefitSupabase;
  const adminReady = window.forgefitAdminReady;
  const i18n = window.forgefitAdminI18n;
  const t = (key, values) => i18n?.t(key, values) || key;
  const TRAINER_IMAGE_BUCKET = "trainer-images";
  const TRAINER_IMAGE_FOLDER = "team";
  const scriptUrl = document.currentScript?.src;
  const localImageFallback = scriptUrl
    ? new URL("../images/trainer-team.png", scriptUrl).href
    : "../../assets/images/trainer-team.png";
  const trainerFields = [
    "id",
    "name_vi",
    "name_ko",
    "title_vi",
    "title_ko",
    "bio_vi",
    "bio_ko",
    "credentials_vi",
    "credentials_ko",
    "image_url",
    "image_position_percent",
    "display_order",
    "active",
  ].join(", ");
  const trainersById = new Map();
  let previewObjectUrl = null;
  let translationController = null;

  function setListStatus(message, isError = false) {
    const status = document.querySelector("[data-trainer-list-status]");
    if (!status) return;
    status.textContent = message;
    status.classList.toggle("is-error", isError);
  }

  function setFormStatus(message, success = false) {
    const status = document.querySelector("[data-trainer-form-status]");
    if (!status) return;
    status.textContent = message;
    status.classList.toggle("is-success", success);
  }

  function textValue(value) {
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }

  function linesToArray(value) {
    return value
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function normalizeImagePosition(value) {
    const position = Number(value);
    return Number.isInteger(position) && position >= 0 && position <= 100 ? position : 50;
  }

  function getStoragePublicUrl(value) {
    const imagePath = textValue(value);
    if (!imagePath) return null;

    const pathSegments = imagePath.split("/");
    if (
      imagePath.startsWith("/")
      || imagePath.includes("://")
      || pathSegments.some((segment) => segment === "." || segment === "..")
    ) return null;

    try {
      const { data } = client.storage.from(TRAINER_IMAGE_BUCKET).getPublicUrl(imagePath);
      return textValue(data?.publicUrl);
    } catch (error) {
      console.warn("FORGEFIT admin could not build a trainer image URL.", error);
      return null;
    }
  }

  function applyImageSource(image, imagePath, trainerName) {
    const storageUrl = getStoragePublicUrl(imagePath);
    let usingFallback = !storageUrl;

    image.onerror = () => {
      if (usingFallback) {
        image.onerror = null;
        console.warn("FORGEFIT local trainer fallback image could not be loaded.", {
          trainer: trainerName,
        });
        return;
      }

      console.warn("FORGEFIT trainer Storage image could not be loaded; using fallback.", {
        trainer: trainerName,
        imagePath,
      });
      usingFallback = true;
      image.src = localImageFallback;
    };

    image.src = storageUrl || localImageFallback;
  }

  function releasePreviewObjectUrl() {
    if (!previewObjectUrl) return;
    URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = null;
  }

  function updatePreview(imagePath = "") {
    const form = document.querySelector("[data-trainer-form]");
    const preview = document.querySelector("[data-trainer-preview]");
    if (!form || !preview) return;

    releasePreviewObjectUrl();
    applyImageSource(preview, imagePath, form.elements.name_vi.value.trim() || "trainer");
    preview.style.objectPosition = `${normalizeImagePosition(form.elements.image_position_percent.value)}% center`;
  }

  function previewSelectedFile(file) {
    const preview = document.querySelector("[data-trainer-preview]");
    if (!preview || !file) return;

    releasePreviewObjectUrl();
    previewObjectUrl = URL.createObjectURL(file);
    preview.onerror = () => {
      console.warn("FORGEFIT selected trainer image could not be previewed.");
      updatePreview(document.querySelector("[data-trainer-form]")?.elements.image_url.value || "");
    };
    preview.src = previewObjectUrl;
  }

  function makeButton(label, className, action, id) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.dataset.trainerAction = action;
    button.dataset.trainerId = id;
    button.textContent = label;
    return button;
  }

  function createTrainerItem(trainer) {
    const item = document.createElement("article");
    item.className = "admin-trainer-item";

    const image = document.createElement("img");
    image.className = "admin-trainer-thumbnail";
    image.alt = `${t("trainerImage")} ${trainer.name_vi}`;
    image.width = 88;
    image.height = 88;
    image.loading = "lazy";
    image.style.objectPosition = `${normalizeImagePosition(trainer.image_position_percent)}% center`;
    applyImageSource(image, trainer.image_url, trainer.name_vi);

    const content = document.createElement("div");
    content.className = "admin-trainer-item-content";

    const heading = document.createElement("div");
    heading.className = "admin-trainer-item-heading";

    const title = document.createElement("h3");
    title.textContent = trainer.name_vi;

    const state = document.createElement("span");
    state.className = `admin-state${trainer.active ? " is-active" : ""}`;
    state.textContent = t(trainer.active ? "visible" : "hidden");
    heading.append(title, state);

    const koreanName = document.createElement("p");
    koreanName.className = "admin-program-korean-name";
    koreanName.textContent = trainer.name_ko;

    const meta = document.createElement("p");
    meta.className = "admin-program-meta";
    meta.textContent = `${trainer.title_vi} · ${t("orderMeta", { order: trainer.display_order })}`;

    const actions = document.createElement("div");
    actions.className = "admin-trainer-actions";
    actions.append(
      makeButton(t("edit"), "admin-text-button", "edit", trainer.id),
      makeButton(t(trainer.active ? "hide" : "show"), "admin-text-button", "toggle", trainer.id),
      makeButton(t("delete"), "admin-text-button is-danger", "delete", trainer.id),
    );

    content.append(heading, koreanName, meta, actions);
    item.append(image, content);
    return item;
  }

  function renderTrainers(trainers) {
    const list = document.querySelector("[data-trainer-list]");
    if (!list) return;

    trainersById.clear();
    trainers.forEach((trainer) => trainersById.set(trainer.id, trainer));

    if (!trainers.length) {
      list.replaceChildren();
      setListStatus(t("noTrainers"));
      return;
    }

    list.replaceChildren(...trainers.map(createTrainerItem));
    setListStatus(t("trainerCount", { count: trainers.length }));
  }

  async function loadTrainers() {
    setListStatus(t("loadingData"));
    const { data, error } = await client
      .from("trainers")
      .select(trainerFields)
      .order("display_order", { ascending: true })
      .order("id", { ascending: true });

    if (error) throw error;
    renderTrainers(data || []);
  }

  function resetForm() {
    const form = document.querySelector("[data-trainer-form]");
    if (!form) return;

    form.reset();
    form.elements.id.value = "";
    form.elements.image_url.value = "";
    form.elements.active.checked = true;
    form.elements.image_position_percent.value = "50";
    document.querySelector("[data-trainer-form-title]").textContent = t("addTrainer");
    document.querySelector("[data-trainer-cancel]").hidden = true;
    setFormStatus("");
    updatePreview();
    translationController?.resetBaselines();
  }

  function editTrainer(id) {
    const trainer = trainersById.get(id);
    const form = document.querySelector("[data-trainer-form]");
    if (!trainer || !form) return;

    form.elements.id.value = trainer.id;
    form.elements.name_vi.value = trainer.name_vi;
    form.elements.name_ko.value = trainer.name_ko;
    form.elements.title_vi.value = trainer.title_vi;
    form.elements.title_ko.value = trainer.title_ko;
    form.elements.bio_vi.value = trainer.bio_vi;
    form.elements.bio_ko.value = trainer.bio_ko;
    form.elements.credentials_vi.value = (trainer.credentials_vi || []).join("\n");
    form.elements.credentials_ko.value = (trainer.credentials_ko || []).join("\n");
    form.elements.image_url.value = trainer.image_url;
    form.elements.image.value = "";
    form.elements.image_position_percent.value = normalizeImagePosition(trainer.image_position_percent);
    form.elements.display_order.value = trainer.display_order;
    form.elements.active.checked = trainer.active;

    document.querySelector("[data-trainer-form-title]").textContent = t("editItem", { name: trainer.name_vi });
    document.querySelector("[data-trainer-cancel]").hidden = false;
    setFormStatus("");
    updatePreview(trainer.image_url);
    translationController?.resetBaselines();
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function getTrainerPayload(form) {
    const textFields = ["name_vi", "name_ko", "title_vi", "title_ko", "bio_vi", "bio_ko"];
    const values = Object.fromEntries(
      textFields.map((field) => [field, form.elements[field].value.trim()]),
    );
    const displayOrder = Number(form.elements.display_order.value);
    const imagePosition = Number(form.elements.image_position_percent.value);

    if (textFields.some((field) => !values[field])) {
      throw new Error(t("requiredTrainerLanguages"));
    }
    if (!Number.isSafeInteger(displayOrder) || displayOrder < 1) {
      throw new Error(t("invalidOrder"));
    }
    if (!Number.isSafeInteger(imagePosition) || imagePosition < 0 || imagePosition > 100) {
      throw new Error(t("invalidImagePosition"));
    }

    return {
      ...values,
      credentials_vi: linesToArray(form.elements.credentials_vi.value),
      credentials_ko: linesToArray(form.elements.credentials_ko.value),
      image_url: form.elements.image_url.value.trim(),
      image_position_percent: imagePosition,
      display_order: displayOrder,
      active: form.elements.active.checked,
    };
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

  async function uploadTrainerImage(file) {
    if (!file.type.startsWith("image/")) {
      throw new Error(t("imageNotValid"));
    }

    const uniqueId = typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const objectPath = `${TRAINER_IMAGE_FOLDER}/${Date.now()}-${uniqueId}.${getImageExtension(file)}`;
    const { data, error } = await client.storage
      .from(TRAINER_IMAGE_BUCKET)
      .upload(objectPath, file, {
        cacheControl: "31536000",
        contentType: file.type,
        upsert: false,
      });

    if (error) throw error;
    return data?.path || objectPath;
  }

  function friendlyError(error) {
    if (error?.code === "23514") return t("invalidData");
    if (error?.statusCode === "403" || error?.status === 403) {
      return t("noPermission");
    }
    return error?.message || t("saveFailed");
  }

  async function saveTrainer(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const submitButton = form.querySelector('button[type="submit"]');

    submitButton.disabled = true;
    setFormStatus(t("saving"), true);

    try {
      const payload = getTrainerPayload(form);
      const imageFile = form.elements.image.files[0];
      if (imageFile) {
        setFormStatus(t("uploadingImage"), true);
        payload.image_url = await uploadTrainerImage(imageFile);
      }
      if (!payload.image_url) throw new Error(t("imageNotSelected"));

      const id = form.elements.id.value;
      const query = id
        ? client.from("trainers").update(payload).eq("id", id)
        : client.from("trainers").insert(payload);
      const { error } = await query;
      if (error) throw error;

      resetForm();
      await loadTrainers();
      setFormStatus(t(id ? "trainerUpdated" : "trainerAdded"), true);
    } catch (error) {
      console.warn("FORGEFIT admin trainer could not be saved.", error);
      setFormStatus(friendlyError(error));
    } finally {
      submitButton.disabled = false;
    }
  }

  async function toggleTrainer(trainer) {
    const { error } = await client
      .from("trainers")
      .update({ active: !trainer.active })
      .eq("id", trainer.id);

    if (error) throw error;
    await loadTrainers();
    setListStatus(t(trainer.active ? "trainerHidden" : "trainerShown"));
  }

  async function deleteTrainer(trainer) {
    const confirmed = window.confirm(t("deleteTrainerConfirm", { name: trainer.name_vi }));
    if (!confirmed) return;

    const { error } = await client.from("trainers").delete().eq("id", trainer.id);
    if (error) throw error;

    resetForm();
    await loadTrainers();
    setListStatus(t("trainerDeleted"));
  }

  async function handleListAction(event) {
    const button = event.target.closest("[data-trainer-action]");
    if (!button) return;

    const trainer = trainersById.get(button.dataset.trainerId);
    if (!trainer) return;
    if (button.dataset.trainerAction === "edit") {
      editTrainer(trainer.id);
      return;
    }

    button.disabled = true;
    try {
      if (button.dataset.trainerAction === "toggle") await toggleTrainer(trainer);
      if (button.dataset.trainerAction === "delete") await deleteTrainer(trainer);
    } catch (error) {
      console.warn("FORGEFIT admin trainer action could not be completed.", error);
      setListStatus(friendlyError(error), true);
    } finally {
      button.disabled = false;
    }
  }

  function handleImageSelection(event) {
    const [file] = event.currentTarget.files;
    if (!file) {
      updatePreview(event.currentTarget.form.elements.image_url.value);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setFormStatus(t("imageNotValid"));
      event.currentTarget.value = "";
      updatePreview(event.currentTarget.form.elements.image_url.value);
      return;
    }
    setFormStatus("");
    previewSelectedFile(file);
  }

  async function start() {
    if (!client || !adminReady) return;
    const user = await adminReady;
    if (!user) return;

    const form = document.querySelector("[data-trainer-form]");
    translationController = window.forgefitAdminTranslation?.setup(form) || null;
    form?.addEventListener("submit", saveTrainer);
    form?.elements.image.addEventListener("change", handleImageSelection);
    form?.elements.image_position_percent.addEventListener("input", () => {
      const preview = document.querySelector("[data-trainer-preview]");
      if (preview) {
        preview.style.objectPosition = `${normalizeImagePosition(form.elements.image_position_percent.value)}% center`;
      }
    });
    document.querySelector("[data-trainer-list]")?.addEventListener("click", handleListAction);
    document.querySelector("[data-trainer-new]")?.addEventListener("click", resetForm);
    document.querySelector("[data-trainer-cancel]")?.addEventListener("click", resetForm);

    try {
      await loadTrainers();
    } catch (error) {
      console.warn("FORGEFIT admin trainers could not be loaded.", error);
      setListStatus(t("trainersLoadFailed"), true);
    }
  }

  start();
})();
