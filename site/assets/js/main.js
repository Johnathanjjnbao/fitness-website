document.addEventListener("DOMContentLoaded", () => {
  const language = document.documentElement.lang === "ko" ? "ko" : "vi";
  const messages = {
    vi: {
      openMenu: "Mở menu",
      closeMenu: "Đóng menu",
      required: "Vui lòng điền thông tin này.",
      invalidEmail: "Email chưa đúng định dạng.",
      invalidPhone: "Số điện thoại chưa hợp lệ.",
      checkFields: "Vui lòng kiểm tra lại các trường được đánh dấu.",
      success: "Cảm ơn bạn! FORGEFIT đã nhận thông tin và sẽ liên hệ trong giờ làm việc.",
    },
    ko: {
      openMenu: "메뉴 열기",
      closeMenu: "메뉴 닫기",
      required: "필수 정보를 입력해 주세요.",
      invalidEmail: "올바른 이메일 주소를 입력해 주세요.",
      invalidPhone: "올바른 전화번호를 입력해 주세요.",
      checkFields: "표시된 항목을 다시 확인해 주세요.",
      success: "감사합니다! 상담 신청이 접수되었습니다. 운영 시간 내에 연락드리겠습니다.",
    },
  }[language];
  const menuButton = document.querySelector(".menu-toggle");
  const navigation = document.querySelector(".site-nav");

  if (menuButton && navigation) {
    menuButton.addEventListener("click", () => {
      const isOpen = menuButton.getAttribute("aria-expanded") === "true";
      menuButton.setAttribute("aria-expanded", String(!isOpen));
      menuButton.setAttribute("aria-label", isOpen ? messages.openMenu : messages.closeMenu);
      navigation.classList.toggle("is-open", !isOpen);
      document.body.classList.toggle("menu-open", !isOpen);
    });

    navigation.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.setAttribute("aria-label", messages.openMenu);
        navigation.classList.remove("is-open");
        document.body.classList.remove("menu-open");
      });
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 900) {
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.setAttribute("aria-label", messages.openMenu);
        navigation.classList.remove("is-open");
        document.body.classList.remove("menu-open");
      }
    });
  }

  const currentFile = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".site-nav a").forEach((link) => {
    const href = link.getAttribute("href");
    if (href === currentFile) {
      link.classList.add("active");
      link.setAttribute("aria-current", "page");
    }
  });

  document.querySelectorAll("[data-accordion-button]").forEach((button) => {
    button.addEventListener("click", () => {
      const panel = document.getElementById(button.getAttribute("aria-controls"));
      const isOpen = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!isOpen));
      if (panel) panel.hidden = isOpen;
    });
  });

  const contactForm = document.querySelector("#contact-form");
  if (contactForm) {
    const formStatus = document.querySelector("#form-status");

    contactForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const requiredFields = [...contactForm.querySelectorAll("[required]")];
      let firstInvalid = null;

      requiredFields.forEach((field) => {
        const group = field.closest(".form-group");
        const error = group?.querySelector(".field-error");
        let message = "";

        if (!field.value.trim()) {
          message = messages.required;
        } else if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value)) {
          message = messages.invalidEmail;
        } else if (field.type === "tel" && !/^[0-9+() .-]{9,15}$/.test(field.value)) {
          message = messages.invalidPhone;
        }

        field.setAttribute("aria-invalid", String(Boolean(message)));
        if (error) error.textContent = message;
        if (message && !firstInvalid) firstInvalid = field;
      });

      if (firstInvalid) {
        firstInvalid.focus();
        if (formStatus) {
          formStatus.textContent = messages.checkFields;
          formStatus.className = "form-status is-error";
        }
        return;
      }

      if (formStatus) {
        formStatus.textContent = messages.success.replaceAll("FORGEFIT", window.forgefitBrandName || "FORGEFIT");
        formStatus.className = "form-status is-success";
      }
      contactForm.reset();
    });

    contactForm.querySelectorAll("input, select, textarea").forEach((field) => {
      field.addEventListener("input", () => {
        field.setAttribute("aria-invalid", "false");
        const error = field.closest(".form-group")?.querySelector(".field-error");
        if (error) error.textContent = "";
      });
    });
  }

  const year = document.querySelector("[data-current-year]");
  if (year) year.textContent = new Date().getFullYear();
});
