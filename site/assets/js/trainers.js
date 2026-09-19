(() => {
  const language = document.documentElement.lang === "ko" ? "ko" : "vi";
  const copy = {
    vi: {
      nameField: "name_vi",
      titleField: "title_vi",
      bioField: "bio_vi",
      credentialsField: "credentials_vi",
      loading: "Đang tải đội ngũ huấn luyện viên...",
      empty: "Hiện chưa có thông tin huấn luyện viên. Vui lòng quay lại sau.",
      error: "Tạm thời chưa thể tải đội ngũ huấn luyện viên. Vui lòng thử lại sau.",
      imageAlt: (name) => `Huấn luyện viên ${name}`,
    },
    ko: {
      nameField: "name_ko",
      titleField: "title_ko",
      bioField: "bio_ko",
      credentialsField: "credentials_ko",
      loading: "코치진 정보를 불러오는 중입니다...",
      empty: "현재 등록된 코치 정보가 없습니다. 나중에 다시 확인해 주세요.",
      error: "현재 코치진 정보를 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.",
      imageAlt: (name) => `${name} 코치`,
    },
  }[language];
  const TRAINER_IMAGE_BUCKET = "trainer-images";
  const scriptUrl = document.currentScript?.src;
  const siteRootUrl = scriptUrl ? new URL("../../", scriptUrl) : new URL("./", document.baseURI);
  const localTrainerImageFallback = new URL(
    "assets/images/trainer-team.png",
    siteRootUrl,
  ).href;

  function textValue(value) {
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }

  function resolveTrainerImage(value) {
    const imagePath = textValue(value);
    if (!imagePath) return null;
    const pathSegments = imagePath.split("/");
    if (
      imagePath.startsWith("/")
      || imagePath.includes("://")
      || pathSegments.some((segment) => segment === "." || segment === "..")
    ) return null;

    try {
      const { data } = window.forgefitSupabase.storage
        .from(TRAINER_IMAGE_BUCKET)
        .getPublicUrl(imagePath);
      const publicUrl = textValue(data?.publicUrl);
      if (!publicUrl) return null;

      return {
        path: imagePath,
        source: "storage",
        url: publicUrl,
      };
    } catch (error) {
      console.error("FORGEFIT could not build the trainer Storage URL.", {
        error,
        imagePath,
      });
      return null;
    }
  }

  function setTrainerImageSource(image, imageSource, trainerName, databaseValue) {
    let fallbackApplied = !imageSource || imageSource.url === localTrainerImageFallback;
    let fallbackFailureLogged = false;

    image.addEventListener("error", () => {
      const failedUrl = image.currentSrc || image.src;
      if (fallbackApplied) {
        if (!fallbackFailureLogged) {
          console.error("FORGEFIT local trainer fallback image failed to load.", {
            trainer: trainerName,
            url: failedUrl,
          });
          fallbackFailureLogged = true;
        }
        return;
      }

      console.error("FORGEFIT trainer image failed to load; using the local fallback.", {
        trainer: trainerName,
        source: imageSource.source,
        path: imageSource.path,
        url: failedUrl,
      });
      fallbackApplied = true;
      image.src = localTrainerImageFallback;
    });

    if (!imageSource) {
      console.error("FORGEFIT trainer image path is missing or invalid; using the local fallback.", {
        trainer: trainerName,
        imageUrl: databaseValue ?? null,
      });
    }

    image.src = imageSource?.url || localTrainerImageFallback;
  }

  function showStatus(grid, message, isError = false) {
    const status = document.createElement("p");
    status.className = `trainer-status${isError ? " is-error" : ""}`;
    status.setAttribute("role", isError ? "alert" : "status");
    status.textContent = message;
    grid.replaceChildren(status);
  }

  function createTrainerCard(trainer) {
    const name = textValue(trainer[copy.nameField]);
    const title = textValue(trainer[copy.titleField]);
    const bio = textValue(trainer[copy.bioField]);
    if (!name || !title || !bio) return null;

    const imageSource = resolveTrainerImage(trainer.image_url);

    const card = document.createElement("article");
    card.className = "trainer-card";

    const image = document.createElement("img");
    image.className = "trainer-photo";
    image.alt = copy.imageAlt(name);
    image.width = 1536;
    image.height = 1024;
    image.loading = "lazy";
    image.decoding = "async";
    setTrainerImageSource(image, imageSource, name, trainer.image_url);

    const imagePosition = Number(trainer.image_position_percent);
    image.style.objectPosition = `${Number.isInteger(imagePosition) && imagePosition >= 0 && imagePosition <= 100 ? imagePosition : 50}% center`;

    const info = document.createElement("div");
    info.className = "trainer-info";

    const heading = document.createElement("h2");
    heading.textContent = name;

    const role = document.createElement("span");
    role.className = "trainer-role";
    role.textContent = title;

    const biography = document.createElement("p");
    biography.textContent = bio;

    info.append(heading, role, biography);

    const credentials = Array.isArray(trainer[copy.credentialsField])
      ? trainer[copy.credentialsField].map(textValue).filter(Boolean)
      : [];
    if (credentials.length) {
      const credentialList = document.createElement("div");
      credentialList.className = "credentials";
      credentials.forEach((credential) => {
        const badge = document.createElement("span");
        badge.textContent = credential;
        credentialList.append(badge);
      });
      info.append(credentialList);
    }

    card.append(image, info);
    return card;
  }

  async function loadTrainers() {
    const grid = document.querySelector("[data-trainer-grid]");
    if (!grid) return;

    grid.setAttribute("aria-busy", "true");
    if (!window.forgefitSupabase) {
      showStatus(grid, copy.error, true);
      grid.setAttribute("aria-busy", "false");
      return;
    }

    let data;
    try {
      let error;
      ({ data, error } = await window.forgefitSupabase
        .from("trainers")
        .select(
          "id, name_vi, name_ko, title_vi, title_ko, bio_vi, bio_ko, credentials_vi, credentials_ko, image_url, image_position_percent, display_order",
        )
        .eq("active", true)
        .order("display_order", { ascending: true })
        .order("id", { ascending: true }));

      if (error) throw error;
    } catch (error) {
      console.warn("FORGEFIT trainer query failed.", error);
      showStatus(grid, copy.error, true);
      grid.setAttribute("aria-busy", "false");
      return;
    }

    if (!data?.length) {
      showStatus(grid, copy.empty);
      grid.setAttribute("aria-busy", "false");
      return;
    }

    try {
      const cards = data.map(createTrainerCard).filter(Boolean);
      if (!cards.length) {
        showStatus(grid, copy.error, true);
        return;
      }

      grid.replaceChildren(...cards);
    } catch (error) {
      console.error("FORGEFIT trainer cards could not be rendered.", error);
      showStatus(grid, copy.error, true);
    } finally {
      grid.setAttribute("aria-busy", "false");
    }
  }

  const initialGrid = document.querySelector("[data-trainer-grid]");
  if (initialGrid) showStatus(initialGrid, copy.loading);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadTrainers);
  } else {
    loadTrainers();
  }
})();
