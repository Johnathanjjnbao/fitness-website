(() => {
  const supabaseUrl = "https://geaoblmxzxowxbuyxcfw.supabase.co";
  const supabasePublishableKey = "sb_publishable_1XwFEiH2QhXK6Yir90GM0g_xW3uyFxI";
  const supabaseLibrary = window.supabase;

  if (!supabaseLibrary?.createClient) {
    console.error("Không thể tải Supabase JavaScript client.");
    return;
  }

  window.forgefitSupabase = supabaseLibrary.createClient(
    supabaseUrl,
    supabasePublishableKey,
  );
})();
