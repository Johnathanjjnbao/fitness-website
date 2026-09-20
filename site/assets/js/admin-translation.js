(() => {
  const client = window.forgefitSupabase;
  const i18n = window.forgefitAdminI18n;
  const t = (key, values) => i18n?.t(key, values) || key;

  function setTranslationStatus(pair, state) {
    pair.status.textContent = state ? t(state) : "";
    pair.status.className = `admin-translation-status${state ? ` is-${state}` : ""}`;
  }

  function sourceValue(field) {
    return field.value.replace(/\r\n/g, "\n");
  }

  function sourceTexts(pair) {
    if (pair.mode === "lines") return sourceValue(pair.source).split("\n");
    return [sourceValue(pair.source).trim()];
  }

  async function requestTranslation(texts) {
    const { data, error } = await client.functions.invoke("translate-admin", {
      body: {
        texts,
        sourceLanguage: "vi",
        targetLanguage: "ko",
      },
    });
    if (error) throw error;
    if (!Array.isArray(data?.translations) || data.translations.length !== texts.length) {
      throw new Error("Translation response did not preserve the input order.");
    }
    return data.translations.map((value) => String(value ?? ""));
  }

  function setup(form) {
    if (!form || !client) return null;

    const pairs = [...form.querySelectorAll("[data-translate-target]")].map((source) => {
      const targetName = source.dataset.translateTarget;
      return {
        source,
        target: form.elements[targetName],
        mode: source.dataset.translateMode === "lines" ? "lines" : "text",
        status: form.querySelector(`[data-translation-status-for="${targetName}"]`),
        forceButton: form.querySelector(`[data-translation-force-for="${targetName}"]`),
        state: {
          lastSource: "",
          lastAutoTarget: null,
          targetRevision: 0,
          manual: false,
          translating: false,
        },
      };
    }).filter((pair) => pair.target && pair.status && pair.forceButton);

    async function translatePair(pair, force = false) {
      const currentSource = sourceValue(pair.source);
      if (!currentSource.trim() || pair.state.translating) return;
      if (!force && currentSource === pair.state.lastSource) return;

      const targetHasText = Boolean(pair.target.value.trim());
      const targetMatchesAuto = pair.state.lastAutoTarget !== null
        && pair.target.value === pair.state.lastAutoTarget;
      if (!force && targetHasText && (pair.state.manual || !targetMatchesAuto)) {
        setTranslationStatus(pair, "translationConflict");
        pair.forceButton.hidden = false;
        return;
      }

      const texts = sourceTexts(pair);
      const startingRevision = pair.state.targetRevision;
      pair.state.translating = true;
      pair.forceButton.hidden = true;
      setTranslationStatus(pair, "translating");

      try {
        const translations = await requestTranslation(texts);
        if (sourceValue(pair.source) !== currentSource || pair.state.targetRevision !== startingRevision) {
          setTranslationStatus(pair, "translationConflict");
          pair.forceButton.hidden = false;
          return;
        }

        const translatedValue = pair.mode === "lines" ? translations.join("\n") : translations[0];
        pair.target.value = translatedValue;
        pair.state.lastSource = currentSource;
        pair.state.lastAutoTarget = translatedValue;
        pair.state.manual = false;
        setTranslationStatus(pair, "translated");
      } catch (error) {
        console.warn("FORGEFIT admin translation failed.", error);
        setTranslationStatus(pair, "translationError");
      } finally {
        pair.state.translating = false;
      }
    }

    function resetBaselines() {
      pairs.forEach((pair) => {
        pair.state.lastSource = sourceValue(pair.source);
        pair.state.lastAutoTarget = null;
        pair.state.targetRevision = 0;
        pair.state.manual = Boolean(pair.target.value.trim());
        pair.state.translating = false;
        pair.forceButton.hidden = true;
        setTranslationStatus(pair, "");
      });
    }

    pairs.forEach((pair) => {
      pair.source.addEventListener("blur", () => translatePair(pair));
      pair.target.addEventListener("input", () => {
        pair.state.targetRevision += 1;
        pair.state.manual = pair.target.value !== pair.state.lastAutoTarget;
      });
      pair.forceButton.addEventListener("click", async () => {
        if (!window.confirm(t("overwriteTranslation"))) return;
        await translatePair(pair, true);
      });
    });

    resetBaselines();
    return { resetBaselines };
  }

  window.forgefitAdminTranslation = { setup };
})();
