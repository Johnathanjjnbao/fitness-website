(() => {
  const client = window.forgefitSupabase;
  const page = document.body.dataset.adminPage;
  const i18n = window.forgefitAdminI18n;
  const t = (key, values) => i18n?.t(key, values) || key;

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
    if (queryError === "not-authorized") setStatus(t("notAuthorized"));
    if (queryError === "session-required") setStatus(t("sessionRequired"));

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const emailInput = form.elements.email;
      const passwordInput = form.elements.password;
      const submitButton = form.querySelector('button[type="submit"]');
      const email = emailInput.value.trim();
      const password = passwordInput.value;

      if (!email || !password) {
        setStatus(t("enterCredentials"));
        return;
      }

      submitButton.disabled = true;
      setStatus(t("loggingIn"), true);

      try {
        const { error: loginError } = await client.auth.signInWithPassword({ email, password });
        if (loginError) {
          setStatus(t("invalidCredentials"));
          return;
        }

        const access = await getAdminAccess();
        if (!access.user || !access.isAdmin) {
          await signOutLocally();
          setStatus(t("notAuthorized"));
          return;
        }

        passwordInput.value = "";
        setStatus(t("loginSuccess"), true);
        window.location.replace("../");
      } catch (error) {
        console.warn("FORGEFIT admin login could not be completed.", error);
        setStatus(t("loginUnavailable"));
      } finally {
        submitButton.disabled = false;
      }
    });
  }

  async function prepareProtectedPage() {
    const loading = document.querySelector("[data-admin-loading]");
    const content = document.querySelector("[data-admin-content]");
    const logoutButton = document.querySelector("[data-admin-logout]");
    const nestedAdminPage = page === "programs" || page === "trainers" || page === "site-settings";
    const loginPath = nestedAdminPage ? "../login/" : "login/";
    let verifiedUser = null;

    try {
      const access = await getAdminAccess();
      if (!access.user) {
        window.location.replace(`${loginPath}?error=session-required`);
        return null;
      }
      if (!access.isAdmin) {
        await signOutLocally();
        window.location.replace(`${loginPath}?error=not-authorized`);
        return null;
      }

      const email = document.querySelector("[data-admin-email]");
      if (email) email.textContent = access.user.email || t("adminAccount");
      if (loading) loading.hidden = true;
      if (content) content.hidden = false;
      verifiedUser = access.user;
    } catch (error) {
      console.warn("FORGEFIT admin session could not be verified.", error);
      try {
        await signOutLocally();
      } catch (signOutError) {
        console.warn("FORGEFIT admin session could not be cleared.", signOutError);
      }
      window.location.replace(`${loginPath}?error=session-required`);
      return null;
    }

    logoutButton?.addEventListener("click", async () => {
      logoutButton.disabled = true;
      try {
        await signOutLocally();
        window.location.replace(loginPath);
      } catch (error) {
        console.warn("FORGEFIT admin logout could not be completed.", error);
        logoutButton.disabled = false;
      }
    });

    return verifiedUser;
  }

  async function start() {
    if (!client) {
      setStatus(t("authUnavailable"));
      return null;
    }

    if (page === "login") {
      await prepareLoginPage();
      return null;
    }
    if (page === "dashboard" || page === "programs" || page === "trainers" || page === "site-settings") {
      return prepareProtectedPage();
    }
    return null;
  }

  window.forgefitAdminReady = start();
})();
