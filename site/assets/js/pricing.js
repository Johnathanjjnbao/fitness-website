(() => {
  const language = document.documentElement.lang === "ko" ? "ko" : "vi";
  const content = {
    vi: {
      locale: "vi-VN",
      nameField: "name_vi",
      descriptionField: "description_vi",
      choose: "Chọn gói này",
      popular: "Phổ biến nhất",
      empty: "Hiện chưa có gói tập nào. Vui lòng quay lại sau hoặc liên hệ FORGEFIT để được tư vấn.",
      error: "Tạm thời chưa thể tải bảng giá. Vui lòng thử lại sau hoặc liên hệ FORGEFIT để được hỗ trợ.",
    },
    ko: {
      locale: "ko-KR",
      nameField: "name_ko",
      descriptionField: "description_ko",
      choose: "이용권 선택",
      popular: "가장 인기 있는 선택",
      empty: "현재 이용 가능한 프로그램이 없습니다. 나중에 다시 확인하거나 FORGEFIT에 문의해 주세요.",
      error: "현재 이용 요금을 불러올 수 없습니다. 잠시 후 다시 시도하거나 FORGEFIT에 문의해 주세요.",
    },
  }[language];
  const presentationById = {
    "00000000-0000-4000-8000-000000000001": {
      vi: ["Đánh giá thể lực ban đầu", "4 buổi huấn luyện 1:1", "Giáo án cơ bản cá nhân hóa", "Hướng dẫn kỹ thuật nền tảng"],
      ko: ["초기 체력 평가", "1:1 트레이닝 4회", "기초 맞춤 운동 계획", "기본 자세 지도"],
    },
    "00000000-0000-4000-8000-000000000002": {
      featured: true,
      vi: ["Đánh giá và đo chỉ số chuyên sâu", "12 buổi huấn luyện 1:1", "Giáo án cập nhật theo tuần", "Hướng dẫn dinh dưỡng cơ bản", "Báo cáo tiến bộ giữa kỳ"],
      ko: ["세부 체력 및 신체 지표 평가", "1:1 트레이닝 12회", "주별 맞춤 계획 업데이트", "기초 영양 가이드", "중간 변화 리포트"],
    },
    "00000000-0000-4000-8000-000000000003": {
      vi: ["Toàn bộ quyền lợi gói Bứt phá", "24 buổi huấn luyện 1:1", "Theo dõi thói quen hằng tuần", "2 lần đánh giá lại toàn diện", "Hỗ trợ trực tuyến giữa các buổi"],
      ko: ["도약 이용권의 모든 혜택", "1:1 트레이닝 24회", "주간 생활 습관 점검", "종합 재평가 2회", "세션 사이 온라인 상담"],
    },
  };
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

    const presentation = presentationById[program.id];
    const card = document.createElement("article");
    card.className = `price-card${presentation?.featured ? " featured" : ""}`;

    if (presentation?.featured) {
      const label = document.createElement("span");
      label.className = "popular-label";
      label.textContent = content.popular;
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

    const features = presentation?.[language] ?? [];
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
    link.className = `button ${presentation?.featured ? "button-primary" : "button-secondary"}`;
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
        .select("id, name_vi, name_ko, description_vi, description_ko, price_vnd, display_order")
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
