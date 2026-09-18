(() => {
  const language = document.documentElement.lang === "ko" ? "ko" : "vi";
  const content = {
    vi: {
      locale: "vi-VN",
      nameField: "name_vi",
      descriptionField: "description_vi",
      featuresField: "features_vi",
      badgeField: "badge_vi",
      choose: "Chọn gói này",
      empty: "Hiện chưa có gói tập nào. Vui lòng quay lại sau hoặc liên hệ FORGEFIT để được tư vấn.",
      error: "Tạm thời chưa thể tải bảng giá. Vui lòng thử lại sau hoặc liên hệ FORGEFIT để được hỗ trợ.",
    },
    ko: {
      locale: "ko-KR",
      nameField: "name_ko",
      descriptionField: "description_ko",
      featuresField: "features_ko",
      badgeField: "badge_ko",
      choose: "이용권 선택",
      empty: "현재 이용 가능한 프로그램이 없습니다. 나중에 다시 확인하거나 FORGEFIT에 문의해 주세요.",
      error: "현재 이용 요금을 불러올 수 없습니다. 잠시 후 다시 시도하거나 FORGEFIT에 문의해 주세요.",
    },
  }[language];
  const priceFormatter = new Intl.NumberFormat(content.locale, {
    style: "currency",
    currency: "VND",
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 0,
  });

  function showStatus(grid, message, isError = false) {
    const status = document.createElement("p");
    status.className = `pricing-status${isError ? " is-error" : ""}`;
    status.setAttribute("role", isError ? "alert" : "status");
    status.textContent = message;
    grid.replaceChildren(status);
  }

  function createProgramCard(program) {
    const price = Number(program.price_vnd);
    if (!Number.isSafeInteger(price) || price < 0) return null;

    const isFeatured = program.featured === true;
    const card = document.createElement("article");
    card.className = `price-card${isFeatured ? " featured" : ""}`;

    const badgeText = program[content.badgeField];
    if (isFeatured && typeof badgeText === "string" && badgeText.trim()) {
      const label = document.createElement("span");
      label.className = "popular-label";
      label.textContent = badgeText;
      card.append(label);
    }

    const name = document.createElement("h2");
    name.textContent = program[content.nameField];

    const priceElement = document.createElement("div");
    priceElement.className = "price";
    priceElement.textContent = priceFormatter.format(price);

    const description = document.createElement("span");
    description.className = "price-unit";
    description.textContent = program[content.descriptionField];

    card.append(name, priceElement, description);

    const features = Array.isArray(program[content.featuresField])
      ? program[content.featuresField].filter((feature) => typeof feature === "string" && feature.trim())
      : [];
    if (features.length) {
      const featureList = document.createElement("ul");
      featureList.className = "feature-list";
      features.forEach((feature) => {
        const item = document.createElement("li");
        item.textContent = feature;
        featureList.append(item);
      });
      card.append(featureList);
    }

    const link = document.createElement("a");
    link.className = `button ${isFeatured ? "button-primary" : "button-secondary"}`;
    link.href = "contact.html";
    link.textContent = content.choose;
    card.append(link);

    return card;
  }

  async function loadPrograms() {
    const grid = document.querySelector("[data-pricing-grid]");
    if (!grid) return;

    if (!window.forgefitSupabase) {
      showStatus(grid, content.error, true);
      return;
    }

    try {
      const { data, error } = await window.forgefitSupabase
        .from("programs")
        .select("name_vi, name_ko, description_vi, description_ko, price_vnd, display_order, features_vi, features_ko, featured, badge_vi, badge_ko")
        .eq("active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      if (!data?.length) {
        showStatus(grid, content.empty);
        return;
      }

      const cards = [...data]
        .sort((first, second) => first.display_order - second.display_order)
        .map(createProgramCard)
        .filter(Boolean);

      if (!cards.length) {
        showStatus(grid, content.error, true);
        return;
      }

      grid.replaceChildren(...cards);
    } catch (error) {
      console.warn("FORGEFIT pricing could not be loaded.", error);
      showStatus(grid, content.error, true);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadPrograms);
  } else {
    loadPrograms();
  }
})();
