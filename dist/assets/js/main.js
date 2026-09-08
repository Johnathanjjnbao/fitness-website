document.addEventListener("DOMContentLoaded", () => {
  const menuButton = document.querySelector(".menu-toggle");
  const navigation = document.querySelector(".site-nav");

  if (menuButton && navigation) {
    menuButton.addEventListener("click", () => {
      const isOpen = menuButton.getAttribute("aria-expanded") === "true";
      menuButton.setAttribute("aria-expanded", String(!isOpen));
      navigation.classList.toggle("is-open", !isOpen);
      document.body.classList.toggle("menu-open", !isOpen);
    });

    navigation.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        menuButton.setAttribute("aria-expanded", "false");
        navigation.classList.remove("is-open");
        document.body.classList.remove("menu-open");
      });
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 900) {
        menuButton.setAttribute("aria-expanded", "false");
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
          message = "Vui lòng điền thông tin này.";
        } else if (field.type === "email" && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(field.value)) {
          message = "Email chưa đúng định dạng.";
        } else if (field.type === "tel" && !/^[0-9+() .-]{9,15}$/.test(field.value)) {
          message = "Số điện thoại chưa hợp lệ.";
        }

        field.setAttribute("aria-invalid", String(Boolean(message)));
        if (error) error.textContent = message;
        if (message && !firstInvalid) firstInvalid = field;
      });

      if (firstInvalid) {
        firstInvalid.focus();
        if (formStatus) {
          formStatus.textContent = "Vui lòng kiểm tra lại các trường được đánh dấu.";
          formStatus.className = "form-status is-error";
        }
        return;
      }

      if (formStatus) {
        formStatus.textContent = "Cảm ơn bạn! FORGEFIT đã nhận thông tin và sẽ liên hệ trong giờ làm việc.";
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
