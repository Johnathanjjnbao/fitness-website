(() => {
  const client = window.forgefitSupabase;
  const adminReady = window.forgefitAdminReady;
  const i18n = window.forgefitAdminI18n;
  const t = (key, values) => i18n?.t(key, values) || key;
  const programFields = [
    "id",
    "name_vi",
    "name_ko",
    "description_vi",
    "description_ko",
    "price_vnd",
    "features_vi",
    "features_ko",
    "active",
    "display_order",
    "featured",
    "badge_vi",
    "badge_ko",
  ].join(", ");
  const priceFormatter = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  });
  const programsById = new Map();
  let translationController = null;

  function setListStatus(message, isError = false) {
    const status = document.querySelector("[data-program-list-status]");
    if (!status) return;
    status.textContent = message;
    status.classList.toggle("is-error", isError);
  }

  function setFormStatus(message, success = false) {
    const status = document.querySelector("[data-program-form-status]");
    if (!status) return;
    status.textContent = message;
    status.classList.toggle("is-success", success);
  }

  function linesToArray(value) {
    return value
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function makeButton(label, className, action, id) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.dataset.programAction = action;
    button.dataset.programId = id;
    button.textContent = label;
    return button;
  }

  function createProgramItem(program) {
    const item = document.createElement("article");
    item.className = "admin-program-item";

    const heading = document.createElement("div");
    heading.className = "admin-program-item-heading";

    const title = document.createElement("h3");
    title.textContent = program.name_vi;

    const state = document.createElement("span");
    state.className = `admin-state${program.active ? " is-active" : ""}`;
    state.textContent = t(program.active ? "visible" : "hidden");
    heading.append(title, state);

    const koreanName = document.createElement("p");
    koreanName.className = "admin-program-korean-name";
    koreanName.textContent = program.name_ko;

    const meta = document.createElement("p");
    meta.className = "admin-program-meta";
    meta.textContent = `${priceFormatter.format(program.price_vnd)} · ${t("orderMeta", { order: program.display_order })}`;

    const actions = document.createElement("div");
    actions.className = "admin-program-actions";
    actions.append(
      makeButton(t("edit"), "admin-text-button", "edit", program.id),
      makeButton(t(program.active ? "disableDisplay" : "enableDisplay"), "admin-text-button", "toggle", program.id),
      makeButton(t("delete"), "admin-text-button is-danger", "delete", program.id),
    );

    item.append(heading, koreanName, meta, actions);
    return item;
  }

  function renderPrograms(programs) {
    const list = document.querySelector("[data-program-list]");
    if (!list) return;

    programsById.clear();
    programs.forEach((program) => programsById.set(program.id, program));

    if (!programs.length) {
      list.replaceChildren();
      setListStatus(t("noPrograms"));
      return;
    }

    list.replaceChildren(...programs.map(createProgramItem));
    setListStatus(t("programCount", { count: programs.length }));
  }

  async function loadPrograms() {
    setListStatus(t("loadingData"));
    const { data, error } = await client
      .from("programs")
      .select(programFields)
      .order("display_order", { ascending: true });

    if (error) throw error;
    renderPrograms(data || []);
  }

  function resetForm() {
    const form = document.querySelector("[data-program-form]");
    if (!form) return;

    form.reset();
    form.elements.id.value = "";
    form.elements.active.checked = true;
    document.querySelector("[data-program-form-title]").textContent = t("addProgram");
    document.querySelector("[data-program-cancel]").hidden = true;
    setFormStatus("");
    translationController?.resetBaselines();
  }

  function editProgram(id) {
    const program = programsById.get(id);
    const form = document.querySelector("[data-program-form]");
    if (!program || !form) return;

    form.elements.id.value = program.id;
    form.elements.name_vi.value = program.name_vi;
    form.elements.name_ko.value = program.name_ko;
    form.elements.description_vi.value = program.description_vi;
    form.elements.description_ko.value = program.description_ko;
    form.elements.price_vnd.value = program.price_vnd;
    form.elements.features_vi.value = (program.features_vi || []).join("\n");
    form.elements.features_ko.value = (program.features_ko || []).join("\n");
    form.elements.active.checked = program.active;
    form.elements.display_order.value = program.display_order;

    document.querySelector("[data-program-form-title]").textContent = t("editItem", { name: program.name_vi });
    document.querySelector("[data-program-cancel]").hidden = false;
    setFormStatus("");
    translationController?.resetBaselines();
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function getProgramPayload(form) {
    const price = Number(form.elements.price_vnd.value);
    const displayOrder = Number(form.elements.display_order.value);
    const textFields = ["name_vi", "name_ko", "description_vi", "description_ko"];
    const values = Object.fromEntries(
      textFields.map((field) => [field, form.elements[field].value.trim()]),
    );

    if (textFields.some((field) => !values[field])) {
      throw new Error(t("requiredProgramLanguages"));
    }
    if (!Number.isSafeInteger(price) || price < 0) {
      throw new Error(t("invalidPrice"));
    }
    if (!Number.isSafeInteger(displayOrder) || displayOrder < 1) {
      throw new Error(t("invalidOrder"));
    }

    return {
      ...values,
      price_vnd: price,
      features_vi: linesToArray(form.elements.features_vi.value),
      features_ko: linesToArray(form.elements.features_ko.value),
      active: form.elements.active.checked,
      display_order: displayOrder,
    };
  }

  function friendlyError(error) {
    if (error?.code === "23505") return t("duplicateOrder");
    if (error?.code === "23514") return t("invalidData");
    return error?.message || t("saveFailed");
  }

  async function saveProgram(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const submitButton = form.querySelector('button[type="submit"]');

    submitButton.disabled = true;
    setFormStatus(t("saving"), true);

    try {
      const payload = getProgramPayload(form);
      const id = form.elements.id.value;
      const query = id
        ? client.from("programs").update(payload).eq("id", id)
        : client.from("programs").insert(payload);
      const { error } = await query;

      if (error) throw error;
      resetForm();
      await loadPrograms();
      setFormStatus(t(id ? "programUpdated" : "programAdded"), true);
    } catch (error) {
      console.warn("FORGEFIT admin program could not be saved.", error);
      setFormStatus(friendlyError(error));
    } finally {
      submitButton.disabled = false;
    }
  }

  async function toggleProgram(program) {
    const { error } = await client
      .from("programs")
      .update({ active: !program.active })
      .eq("id", program.id);

    if (error) throw error;
    await loadPrograms();
    setListStatus(t(program.active ? "programDisabled" : "programEnabled"));
  }

  async function deleteProgram(program) {
    const confirmed = window.confirm(t("deleteProgramConfirm", { name: program.name_vi }));
    if (!confirmed) return;

    const { error } = await client.from("programs").delete().eq("id", program.id);
    if (error) throw error;

    resetForm();
    await loadPrograms();
    setListStatus(t("programDeleted"));
  }

  async function handleListAction(event) {
    const button = event.target.closest("[data-program-action]");
    if (!button) return;

    const program = programsById.get(button.dataset.programId);
    if (!program) return;
    if (button.dataset.programAction === "edit") {
      editProgram(program.id);
      return;
    }

    button.disabled = true;
    try {
      if (button.dataset.programAction === "toggle") await toggleProgram(program);
      if (button.dataset.programAction === "delete") await deleteProgram(program);
    } catch (error) {
      console.warn("FORGEFIT admin program action could not be completed.", error);
      setListStatus(friendlyError(error), true);
    } finally {
      button.disabled = false;
    }
  }

  async function start() {
    if (!client || !adminReady) return;
    const user = await adminReady;
    if (!user) return;

    const form = document.querySelector("[data-program-form]");
    translationController = window.forgefitAdminTranslation?.setup(form) || null;
    form?.addEventListener("submit", saveProgram);
    document.querySelector("[data-program-list]")?.addEventListener("click", handleListAction);
    document.querySelector("[data-program-new]")?.addEventListener("click", resetForm);
    document.querySelector("[data-program-cancel]")?.addEventListener("click", resetForm);

    try {
      await loadPrograms();
    } catch (error) {
      console.warn("FORGEFIT admin programs could not be loaded.", error);
      setListStatus(t("programsLoadFailed"), true);
    }
  }

  start();
})();
