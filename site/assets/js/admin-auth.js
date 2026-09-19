(() => {
  const client = window.forgefitSupabase;
  const page = document.body.dataset.adminPage;

  function setStatus(message, success = false) {
    const status = document.querySelector("[data-admin-status]");
    if (!status) return;

    status.textContent = message;
    status.classList.toggle("is-success", success);
  }

  async function getAdminAccess() {
    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError || !userData.user) return { user: null, isAdmin: false };

    const { data: adminRow, error: adminError } = await client
      .from("admin_users")
      .select("user_id")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (adminError) throw adminError;
    return { user: userData.user, isAdmin: Boolean(adminRow) };
  }

  async function signOutLocally() {
    const { error } = await client.auth.signOut({ scope: "local" });
    if (error) throw error;
  }

  async function prepareLoginPage() {
    const form = document.querySelector("[data-admin-login-form]");
    if (!form) return;

    try {
      const access = await getAdminAccess();
      if (access.user && access.isAdmin) {
        window.location.replace("../");
        return;
      }
      if (access.user) await signOutLocally();
    } catch (error) {
      console.warn("FORGEFIT admin access could not be checked before login.", error);
    }

    const queryError = new URLSearchParams(window.location.search).get("error");
    if (queryError === "not-authorized") setStatus("Tài khoản này không có quyền quản trị.");
    if (queryError === "session-required") setStatus("Vui lòng đăng nhập để tiếp tục.");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const emailInput = form.elements.email;
      const passwordInput = form.elements.password;
      const submitButton = form.querySelector('button[type="submit"]');
      const email = emailInput.value.trim();
      const password = passwordInput.value;

      if (!email || !password) {
        setStatus("Vui lòng nhập đầy đủ email và mật khẩu.");
        return;
      }

      submitButton.disabled = true;
      setStatus("Đang đăng nhập…", true);

      try {
        const { error: loginError } = await client.auth.signInWithPassword({ email, password });
        if (loginError) {
          setStatus("Email hoặc mật khẩu không đúng.");
          return;
        }

        const access = await getAdminAccess();
        if (!access.user || !access.isAdmin) {
          await signOutLocally();
          setStatus("Tài khoản này không có quyền quản trị.");
          return;
        }

        passwordInput.value = "";
        setStatus("Đăng nhập thành công. Đang chuyển trang…", true);
        window.location.replace("../");
      } catch (error) {
        console.warn("FORGEFIT admin login could not be completed.", error);
        setStatus("Tạm thời chưa thể đăng nhập. Vui lòng thử lại.");
      } finally {
        submitButton.disabled = false;
      }
    });
  }

  async function prepareDashboard() {
    const loading = document.querySelector("[data-admin-loading]");
    const content = document.querySelector("[data-admin-content]");
    const logoutButton = document.querySelector("[data-admin-logout]");

    try {
      const access = await getAdminAccess();
      if (!access.user) {
        window.location.replace("login/?error=session-required");
        return;
      }
      if (!access.isAdmin) {
        await signOutLocally();
        window.location.replace("login/?error=not-authorized");
        return;
      }

      const email = document.querySelector("[data-admin-email]");
      if (email) email.textContent = access.user.email || "tài khoản quản trị";
      if (loading) loading.hidden = true;
      if (content) content.hidden = false;
    } catch (error) {
      console.warn("FORGEFIT admin session could not be verified.", error);
      try {
        await signOutLocally();
      } catch (signOutError) {
        console.warn("FORGEFIT admin session could not be cleared.", signOutError);
      }
      window.location.replace("login/?error=session-required");
      return;
    }

    logoutButton?.addEventListener("click", async () => {
      logoutButton.disabled = true;
      try {
        await signOutLocally();
        window.location.replace("login/");
      } catch (error) {
        console.warn("FORGEFIT admin logout could not be completed.", error);
        logoutButton.disabled = false;
      }
    });
  }

  async function start() {
    if (!client) {
      setStatus("Không thể kết nối hệ thống đăng nhập. Vui lòng tải lại trang.");
      return;
    }

    if (page === "login") await prepareLoginPage();
    if (page === "dashboard") await prepareDashboard();
  }

  start();
})();
