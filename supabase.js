/**
 * Punchi Battle — front-end Supabase client.
 * Only the publishable key belongs in this public browser file.
 * Database authorization is enforced by PostgreSQL RLS and column-level grants.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.119.2?bundle";

const SUPABASE_URL = "https://ppuhpuuuxohokuzfctpq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_L17EU-Fw8NBMjTY3dYgWmg_12B8Ty8V";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

const $ = (id) => document.getElementById(id);
const authForms = $("pb-cloud-auth");
const accountPanel = $("pb-cloud-account");
const loginForm = $("pb-cloud-login");
const signupForm = $("pb-cloud-signup");
const entryForm = $("pb-cloud-entry-form");
const statusNode = $("pb-cloud-status");
const authMessage = $("pb-cloud-auth-message");
const entryMessage = $("pb-cloud-entry-message");
const themesNode = $("pb-cloud-themes");
const entriesNode = $("pb-cloud-entries");
const pendingNode = $("pb-cloud-pending");
const themeSelect = $("pb-cloud-theme");
const memberContent = $("pb-cloud-member-content");
const memberNav = $("pb-cloud-member-nav");
const leaderboardNode = $("pb-cloud-leaderboard");
const phoneAuthArea = $("pb-cloud-phone-auth-area");
const phoneAuthForm = $("pb-cloud-phone-form");
const phoneCodePanel = $("pb-cloud-phone-code-panel");
const phoneVerifyForm = $("pb-cloud-phone-verify");
const contactForm = $("pb-cloud-contact-form");
const contactMessage = $("pb-cloud-contact-message");
const accountConsentForm = $("pb-cloud-existing-consent");
const PRIVACY_POLICY_VERSION = "PB-PRIVACY-2026-11-V1";

let currentUser = null;
let currentProfile = null;
let currentContacts = null;
let privacyAccepted = false;
let profileReady = false;
let pendingPhone = "";
let activeThemes = [];
let userVotes = new Set();
let loadingEntries = false;

window.PunchiBattleAuth = { isAuthenticated: false };

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function setMessage(node, message, kind = "info") {
  if (!node) return;
  node.textContent = message;
  node.dataset.kind = kind;
  node.hidden = !message;
}

function safeDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date inconnue";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function redirectUrl() {
  const url = new URL(window.location.href);
  url.hash = "";
  url.search = "";
  return url.toString();
}

function usernameCandidate(value) {
  let name = String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);

  if (name.length < 3) name = ("mc_" + name).slice(0, 24);
  if (!/^[a-z0-9_]{3,24}$/.test(name)) name = "mc_" + crypto.randomUUID().slice(0, 6);
  return name;
}

async function ensureProfile(user) {
  const { data: existing, error: lookupError } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (existing) {
    currentProfile = existing;
    return existing;
  }

  const preferred = user.user_metadata?.username
    || (user.email ? user.email.split("@")[0] : "")
    || "mc";
  const displayName = String(user.user_metadata?.display_name || preferred).trim().slice(0, 60);
  let username = usernameCandidate(preferred);

  let { data, error } = await supabase
    .from("profiles")
    .insert({ id: user.id, username, display_name: displayName })
    .select("id, username, display_name, bio, avatar_url")
    .single();

  if (error?.code === "23505") {
    username = usernameCandidate("mc_" + user.id.replace(/-/g, "").slice(0, 8));
    ({ data, error } = await supabase
      .from("profiles")
      .insert({ id: user.id, username, display_name: displayName })
      .select("id, username, display_name, bio, avatar_url")
      .single());
  }

  if (error) throw error;
  currentProfile = data;
  return data;
}

function normalizeE164(value) {
  const compact = String(value || "").replace(/[\s().-]/g, "");
  return /^\+[1-9][0-9]{7,14}$/.test(compact) ? compact : "";
}

function renderProtectedNavigation() {
  const unlocked = Boolean(currentUser && privacyAccepted && profileReady);
  window.PunchiBattleAuth = { isAuthenticated: unlocked };
  document.body.classList.toggle("pb-authenticated", unlocked);

  document.querySelectorAll(".pb-cloud-menu-button[data-pb-view]").forEach((button) => {
    button.setAttribute("aria-disabled", unlocked ? "false" : "true");
    button.title = unlocked ? "" : "Inscris-toi, connecte-toi et accepte la politique pour ouvrir ce menu.";
  });
}

async function loadPrivateContacts() {
  if (!currentUser) {
    currentContacts = null;
    return;
  }

  const { data, error } = await supabase
    .from("profile_contacts")
    .select("backup_email, phone_e164, country_iso2")
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (error) throw error;
  currentContacts = data || null;

  $("pb-contact-email").value = currentContacts?.backup_email || "";
  $("pb-contact-phone").value = currentContacts?.phone_e164 || "";
  $("pb-contact-country").value = currentContacts?.country_iso2 || "CG";
  $("pb-contact-consent").checked = false;

  const primary = currentUser.email || currentUser.phone || "Coordonnée de connexion non disponible";
  $("pb-contact-primary").textContent = primary;
  $("pb-contact-primary-type").textContent = currentUser.email ? "E-mail du compte" : "Téléphone du compte";
}

function renderSession() {
  const hasSession = Boolean(currentUser);
  const isSignedIn = Boolean(currentUser && privacyAccepted && profileReady);
  authForms.hidden = hasSession;
  phoneAuthArea.hidden = hasSession;
  accountPanel.hidden = !hasSession;
  accountConsentForm.hidden = !hasSession || privacyAccepted;
  $("pb-cloud-user").textContent = isSignedIn
    ? (currentProfile?.display_name || currentProfile?.username || currentUser.email || currentUser.phone || "Membre")
    : "";
  $("pb-cloud-user-handle").textContent = currentProfile?.username
    ? "@" + currentProfile.username
    : (currentUser?.email || currentUser?.phone || "Compte connecté");
  $("pb-cloud-entry-panel").hidden = !isSignedIn || activeThemes.length === 0;
  $("pb-cloud-login-note").hidden = isSignedIn;
  if (memberContent) memberContent.hidden = !isSignedIn;

  if ($("pb-cloud-profile-name")) {
    $("pb-cloud-profile-name").textContent =
      currentProfile?.display_name || currentProfile?.username || "Ton nom de guerrier";
    $("pb-cloud-profile-handle").textContent =
      currentProfile?.username ? "@" + currentProfile.username : "";
    $("pb-cloud-profile-primary").textContent =
      isSignedIn ? (currentUser.email || currentUser.phone || "Identifiant de connexion géré par Supabase Auth") : "";
    $("pb-cloud-profile-joined").textContent =
      isSignedIn && currentUser.created_at ? safeDate(currentUser.created_at) : "—";
  }
  $("pb-cloud-primary-contact").textContent =
    isSignedIn ? (currentUser.email || currentUser.phone || "Compte membre") : "";
  renderProtectedNavigation();
}

function renderThemes() {
  if (activeThemes.length === 0) {
    themesNode.innerHTML = '<p class="pb-cloud-empty">Aucun thème n’est ouvert pour le moment. Les thèmes restent fermés jusqu’à leur activation par la modération.</p>';
    themeSelect.innerHTML = '<option value="">Aucun thème ouvert</option>';
    themeSelect.disabled = true;
    $("pb-cloud-entry-panel").hidden = true;
    return;
  }

  themesNode.innerHTML = activeThemes.map((theme) =>
    '<article class="pb-cloud-theme">' +
      '<strong>' + escapeHTML(theme.title) + '</strong>' +
      '<p>' + escapeHTML(theme.description || "Thème ouvert aux participations.") + '</p>' +
      '<small>' + (theme.closes_at ? "Clôture : " + escapeHTML(safeDate(theme.closes_at)) : "Ouvert") + '</small>' +
    '</article>'
  ).join("");

  themeSelect.innerHTML = activeThemes.map((theme) =>
    '<option value="' + escapeHTML(theme.id) + '">' + escapeHTML(theme.title) + '</option>'
  ).join("");
  themeSelect.disabled = false;
  $("pb-cloud-entry-panel").hidden = !currentUser;
}

function renderEntries(entries) {
  if (!entries?.length) {
    entriesNode.innerHTML = '<p class="pb-cloud-empty">Aucune punchline publiée pour l’instant. Les nouvelles participations passent d’abord en modération.</p>';
    return;
  }

  entriesNode.innerHTML = entries.map((entry) => {
    const profile = Array.isArray(entry.profiles) ? entry.profiles[0] : entry.profiles;
    const theme = Array.isArray(entry.themes) ? entry.themes[0] : entry.themes;
    const voted = userVotes.has(entry.id);
    const count = Number(entry.vote_count ?? 0);
    return '<article class="pb-cloud-entry">' +
      '<div class="pb-cloud-entry-meta">' +
        '<strong>' + escapeHTML(profile?.display_name || profile?.username || "MC") + '</strong>' +
        '<span>' + escapeHTML(safeDate(entry.created_at)) + '</span>' +
      '</div>' +
      '<p class="pb-cloud-entry-body">' + escapeHTML(entry.body) + '</p>' +
      '<div class="pb-cloud-entry-footer">' +
        '<span>' + escapeHTML(theme?.title || "Battle") + '</span>' +
        '<span class="pb-cloud-vote-count">' + count.toLocaleString("fr-FR") + ' vote' + (count === 1 ? "" : "s") + '</span>' +
      '</div>' +
      '<button class="pb-cloud-vote' + (voted ? " is-voted" : "") + '" type="button" data-vote-entry="' + escapeHTML(entry.id) + '"' +
        (currentUser ? "" : " disabled") +
        ' aria-pressed="' + (voted ? "true" : "false") + '">' +
        (voted ? "✓ Retirer mon vote" : "🔥 Voter") +
      '</button>' +
    '</article>';
  }).join("");
}

function renderCloudLeaderboard(rows) {
  if (!leaderboardNode) return;
  if (!rows?.length) {
    leaderboardNode.innerHTML = '<p class="pb-cloud-empty-state">Le classement apparaîtra lorsque les premières punchlines auront été publiées et votées.</p>';
    return;
  }

  leaderboardNode.innerHTML = rows.map((row, index) => {
    const rank = index + 1;
    const name = row.display_name || row.username || "MC";
    return '<article class="pb-cloud-rank">' +
      '<div class="pb-cloud-rank-number">#' + rank + '</div>' +
      '<div>' +
        '<div class="pb-cloud-rank-name">' + escapeHTML(name) + '</div>' +
        '<div class="pb-cloud-rank-sub">@' + escapeHTML(row.username || "mc") + ' · ' +
          Number(row.submissions_count || 0).toLocaleString("fr-FR") + ' participations</div>' +
      '</div>' +
      '<div class="pb-cloud-rank-score">' +
        Number(row.votes_total || 0).toLocaleString("fr-FR") + ' votes' +
      '</div>' +
    '</article>';
  }).join("");
}

function showMemberView(view) {
  if (!currentUser || !privacyAccepted || !profileReady) {
    setMessage(authMessage, "Inscris-toi ou connecte-toi, puis accepte la politique de confidentialité pour accéder à ces menus.", "info");
    $("pb-cloud").scrollIntoView({ behavior: "smooth", block: "start" });
    const focusTarget = $("pb-cloud-signup-username") || $("pb-cloud-login-email");
    if (focusTarget) focusTarget.focus({ preventScroll: true });
    return false;
  }

  const permitted = new Set(["arena", "ranking", "profile"]);
  if (!permitted.has(view)) return false;

  activeMemberView = view;
  document.querySelectorAll("[data-pb-view-panel]").forEach((panel) => {
    panel.hidden = panel.id !== "pb-cloud-view-" + view;
  });
  document.querySelectorAll(".pb-cloud-menu-button[data-pb-view]").forEach((button) => {
    const active = button.dataset.pbView === view;
    button.classList.toggle("active", active);
    button.setAttribute("aria-current", active ? "page" : "false");
  });
  return true;
}

async function loadCloudData() {
  if (loadingEntries) return;
  if (!currentUser || !profileReady) {
    activeThemes = [];
    userVotes = new Set();
    renderThemes();
    renderEntries([]);
    if (memberContent) memberContent.hidden = true;
    statusNode.textContent = "Inscris-toi ou connecte-toi pour accéder aux menus et à l’arène.";
    return;
  }
  loadingEntries = true;
  try {
    const { data: themes, error: themesError } = await supabase
      .from("themes")
      .select("id, slug, title, description, opens_at, closes_at, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (themesError) throw themesError;
    activeThemes = themes || [];
    renderThemes();

    if (currentUser) {
      const { data: votes, error: votesError } = await supabase
        .from("votes")
        .select("entry_id")
        .eq("voter_id", currentUser.id);

      if (votesError) throw votesError;
      userVotes = new Set((votes || []).map((vote) => vote.entry_id));
    } else {
      userVotes = new Set();
    }

    const { data: entries, error: entriesError } = await supabase
      .from("entries")
      .select("id, author_id, body, vote_count, created_at, profiles!entries_author_id_fkey(username,display_name), themes!entries_theme_id_fkey(title)")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(50);

    if (entriesError) throw entriesError;
    renderEntries(entries || []);

    const { data: ranking, error: rankingError } = await supabase
      .from("member_leaderboard")
      .select("author_id, username, display_name, submissions_count, votes_total")
      .order("votes_total", { ascending: false })
      .order("submissions_count", { ascending: false })
      .limit(50);
    if (rankingError) throw rankingError;
    renderCloudLeaderboard(ranking || []);

    const ownRanking = (ranking || []).find((row) => row.author_id === currentUser.id);
    $("pb-cloud-profile-submissions").textContent =
      Number(ownRanking?.submissions_count || 0).toLocaleString("fr-FR");
    $("pb-cloud-profile-votes").textContent =
      Number(ownRanking?.votes_total || 0).toLocaleString("fr-FR");
    const ownRank = ownRanking ? ranking.findIndex((row) => row.author_id === currentUser.id) + 1 : 0;
    $("pb-cloud-profile-rank").textContent = ownRank ? "#" + ownRank : "Non classé";

    if (currentUser) {
      const { data: pending, error: pendingError } = await supabase
        .from("entries")
        .select("id, body, created_at, themes!entries_theme_id_fkey(title)")
        .eq("author_id", currentUser.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(10);

      if (pendingError) throw pendingError;
      pendingNode.hidden = !pending?.length;
      pendingNode.innerHTML = pending?.length
        ? '<h4>Mes participations en attente</h4>' + pending.map((entry) => {
            const theme = Array.isArray(entry.themes) ? entry.themes[0] : entry.themes;
            return '<p><strong>' + escapeHTML(theme?.title || "Thème") + '</strong> — ' + escapeHTML(entry.body) + '</p>';
          }).join("")
        : "";
    } else {
      pendingNode.hidden = true;
      pendingNode.textContent = "";
    }

    statusNode.textContent = activeThemes.length
      ? "Arène en ligne · Les contenus affichés et les votes sont partagés."
      : "Base connectée · En attente de l’ouverture du premier thème par la modération.";
  } catch (error) {
    console.error("Punchi Battle cloud error:", error);
    statusNode.textContent = "L’arène en ligne est temporairement indisponible. Les données membres restent protégées ; réessaie avec Actualiser.";
    setMessage(authMessage, error.message || "Impossible de charger les données en ligne.", "error");
  } finally {
    loadingEntries = false;
  }
}

async function recordPrivacyConsent(user) {
  // The database record is authoritative. user_metadata is only used to carry
  // the signup checkbox assertion until an append-only consent row exists.
  const { data: existing, error: readError } = await supabase
    .from("account_consents")
    .select("id")
    .eq("user_id", user.id)
    .eq("consent_code", "privacy_policy")
    .eq("policy_version", PRIVACY_POLICY_VERSION)
    .maybeSingle();

  if (readError) throw readError;
  if (existing) return true;

  const metadata = user?.user_metadata || {};
  if (metadata.pb_privacy_version !== PRIVACY_POLICY_VERSION || metadata.pb_privacy_accepted !== true) {
    return false;
  }

  const { error: insertError } = await supabase
    .from("account_consents")
    .insert({
      user_id: user.id,
      consent_code: "privacy_policy",
      policy_version: PRIVACY_POLICY_VERSION
    });

  if (insertError && insertError.code !== "23505") throw insertError;
  return true;
}

async function syncSession(session) {
  currentUser = session?.user ?? null;
  currentProfile = null;
  currentContacts = null;
  privacyAccepted = false;
  profileReady = false;
  renderSession();

  if (currentUser) {
    try {
      privacyAccepted = await recordPrivacyConsent(currentUser);
      if (privacyAccepted) {
        await ensureProfile(currentUser);
        await loadPrivateContacts();
        profileReady = true;
      } else {
        setMessage(authMessage, "Avant d’ouvrir les menus, lis et accepte la politique de confidentialité mise à jour.", "info");
      }
      renderSession();
    } catch (error) {
      console.error("Account setup error:", error);
      setMessage(authMessage, "La préparation sécurisée du compte a échoué : " + (error.message || "erreur inconnue"), "error");
    }
  } else {
    phoneCodePanel.hidden = true;
    pendingPhone = "";
    if (contactForm) contactForm.reset();
    if (accountConsentForm) accountConsentForm.reset();
  }

  await loadCloudData();
  if (profileReady) showMemberView(activeMemberView || "arena");
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = $("pb-cloud-login-email").value.trim();
  const password = $("pb-cloud-login-password").value;
  const button = loginForm.querySelector("button[type=submit]");
  button.disabled = true;
  setMessage(authMessage, "Connexion en cours…", "info");

  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setMessage(authMessage, "Connexion réussie.", "success");
    loginForm.reset();
  } catch (error) {
    setMessage(authMessage, error.message || "Connexion impossible.", "error");
  } finally {
    button.disabled = false;
  }
});

signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const usernameRaw = $("pb-cloud-signup-username").value.trim();
  const username = usernameCandidate(usernameRaw);
  const email = $("pb-cloud-signup-email").value.trim();
  const password = $("pb-cloud-signup-password").value;
  const button = signupForm.querySelector("button[type=submit]");

  if (!$("pb-cloud-privacy-consent").checked) {
    setMessage(authMessage, "Lis la politique de confidentialité et accepte-la pour créer ton compte.", "error");
    return;
  }
  if (password.length < 12) {
    setMessage(authMessage, "Utilise un mot de passe d’au moins 12 caractères.", "error");
    return;
  }

  button.disabled = true;
  setMessage(authMessage, "Création du compte…", "info");
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          display_name: usernameRaw.slice(0, 60),
          pb_privacy_version: PRIVACY_POLICY_VERSION,
          pb_privacy_accepted: true
        },
        emailRedirectTo: redirectUrl()
      }
    });
    if (error) throw error;

    if (data.session) {
      setMessage(authMessage, "Compte créé et connecté.", "success");
    } else {
      setMessage(authMessage, "Compte créé. Consulte ta boîte e-mail pour confirmer l’adresse avant de te connecter.", "success");
    }
    signupForm.reset();
  } catch (error) {
    setMessage(authMessage, error.message || "Inscription impossible.", "error");
  } finally {
    button.disabled = false;
  }
});

accountConsentForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!$("pb-cloud-existing-consent-checkbox").checked) {
    setMessage(authMessage, "Coche la case pour accepter la politique de confidentialité et déverrouiller tes menus.", "error");
    return;
  }

  const button = accountConsentForm.querySelector("button[type=submit]");
  button.disabled = true;
  setMessage(authMessage, "Enregistrement de ton consentement…", "info");
  try {
    const { data, error } = await supabase.auth.updateUser({
      data: {
        pb_privacy_version: PRIVACY_POLICY_VERSION,
        pb_privacy_accepted: true
      }
    });
    if (error) throw error;
    await syncSession({ user: data.user });
    setMessage(authMessage, "Notice acceptée. Ton espace membre est maintenant accessible.", "success");
  } catch (error) {
    setMessage(authMessage, error.message || "Impossible d’enregistrer ton consentement.", "error");
  } finally {
    button.disabled = false;
  }
});

phoneAuthForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const usernameRaw = $("pb-cloud-phone-username").value.trim();
  const username = usernameCandidate(usernameRaw);
  const phone = normalizeE164($("pb-cloud-phone-number").value);
  const button = phoneAuthForm.querySelector("button[type=submit]");

  if (!usernameRaw || usernameRaw.length > 24 || !/^[a-z0-9_]{3,24}$/i.test(usernameRaw)) {
    setMessage(authMessage, "Choisis un pseudo de 3 à 24 caractères : lettres, chiffres ou _.", "error");
    return;
  }
  if (!phone) {
    setMessage(authMessage, "Saisis ton numéro au format international E.164, par exemple +242XXXXXXXXX ou +33XXXXXXXXX.", "error");
    return;
  }
  if (!$("pb-cloud-phone-privacy-consent").checked) {
    setMessage(authMessage, "Lis la politique de confidentialité et accepte-la avant de recevoir un code SMS.", "error");
    return;
  }

  button.disabled = true;
  setMessage(authMessage, "Envoi du code SMS sécurisé…", "info");
  try {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: {
        shouldCreateUser: true,
        data: {
          username,
          display_name: usernameRaw.slice(0, 60),
          pb_privacy_version: PRIVACY_POLICY_VERSION,
          pb_privacy_accepted: true
        }
      }
    });
    if (error) throw error;

    pendingPhone = phone;
    $("pb-cloud-phone-target").textContent = phone;
    phoneCodePanel.hidden = false;
    $("pb-cloud-phone-code").focus();
    setMessage(authMessage, "Code envoyé. Saisis les 6 chiffres reçus par SMS pour créer ton compte ou te connecter.", "success");
  } catch (error) {
    const message = error.message || "Impossible d’envoyer le code SMS.";
    setMessage(authMessage, message + " Vérifie que l’authentification téléphone et un fournisseur SMS sont configurés dans Supabase.", "error");
  } finally {
    button.disabled = false;
  }
});

phoneVerifyForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const token = $("pb-cloud-phone-code").value.trim();
  const button = phoneVerifyForm.querySelector("button[type=submit]");

  if (!pendingPhone || !/^\d{6}$/.test(token)) {
    setMessage(authMessage, "Le code reçu doit contenir exactement 6 chiffres.", "error");
    return;
  }

  button.disabled = true;
  setMessage(authMessage, "Vérification du numéro…", "info");
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      phone: pendingPhone,
      token,
      type: "sms"
    });
    if (error) throw error;
    pendingPhone = "";
    phoneVerifyForm.reset();
    phoneCodePanel.hidden = true;
    await syncSession(data.session);
    setMessage(authMessage, "Numéro vérifié. Ton compte est prêt, les menus sont déverrouillés.", "success");
  } catch (error) {
    setMessage(authMessage, error.message || "Code incorrect ou expiré. Demande un nouveau code.", "error");
  } finally {
    button.disabled = false;
  }
});

contactForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser || !profileReady) {
    setMessage(contactMessage, "Connecte-toi pour gérer tes coordonnées privées.", "error");
    return;
  }

  const backupEmail = $("pb-contact-email").value.trim().toLowerCase() || null;
  const phone = $("pb-contact-phone").value.trim()
    ? normalizeE164($("pb-contact-phone").value)
    : null;
  const country = $("pb-contact-country").value.trim().toUpperCase();
  const hasContact = Boolean(backupEmail || phone);

  if (backupEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(backupEmail)) {
    setMessage(contactMessage, "Adresse e-mail secondaire invalide.", "error");
    return;
  }
  if ($("pb-contact-phone").value.trim() && !phone) {
    setMessage(contactMessage, "Le téléphone doit respecter le format international, par exemple +242XXXXXXXXX.", "error");
    return;
  }
  if (!/^[A-Z]{2}$/.test(country)) {
    setMessage(contactMessage, "Le pays doit être indiqué avec son code ISO à 2 lettres (CG, FR, CD…).", "error");
    return;
  }
  if (hasContact && !$("pb-contact-consent").checked) {
    setMessage(contactMessage, "Confirme que tu autorises l’enregistrement privé de ces coordonnées pour la gestion de ton compte.", "error");
    return;
  }

  const button = contactForm.querySelector("button[type=submit]");
  button.disabled = true;
  setMessage(contactMessage, "Enregistrement privé en cours…", "info");

  try {
    if (!hasContact) {
      const { error } = await supabase
        .from("profile_contacts")
        .delete()
        .eq("user_id", currentUser.id);
      if (error) throw error;
      currentContacts = null;
      setMessage(contactMessage, "Les coordonnées secondaires ont été supprimées.", "success");
    } else {
      const payload = {
        backup_email: backupEmail,
        phone_e164: phone,
        country_iso2: country
      };
      let result;
      if (currentContacts) {
        result = await supabase
          .from("profile_contacts")
          .update(payload)
          .eq("user_id", currentUser.id);
      } else {
        result = await supabase
          .from("profile_contacts")
          .insert({ user_id: currentUser.id, ...payload });
      }
      if (result.error) throw result.error;
      setMessage(contactMessage, "Coordonnées enregistrées dans ton espace privé. Elles ne sont jamais affichées sur ton profil public.", "success");
    }

    await loadPrivateContacts();
    $("pb-contact-consent").checked = false;
  } catch (error) {
    setMessage(contactMessage, error.message || "Enregistrement impossible. Vérifie ta connexion.", "error");
  } finally {
    button.disabled = false;
  }
});

$("pb-cloud-signout").addEventListener("click", async () => {
  const button = $("pb-cloud-signout");
  button.disabled = true;
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setMessage(authMessage, "Déconnexion effectuée.", "success");
  } catch (error) {
    setMessage(authMessage, error.message || "Déconnexion impossible.", "error");
  } finally {
    button.disabled = false;
  }
});

entryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser) {
    setMessage(entryMessage, "Connecte-toi pour participer.", "error");
    return;
  }

  const themeId = themeSelect.value;
  const body = $("pb-cloud-entry-body").value.trim();
  if (!themeId || !body) {
    setMessage(entryMessage, "Choisis un thème ouvert et écris ta punchline.", "error");
    return;
  }
  if (body.length < 10 || body.length > 280) {
    setMessage(entryMessage, "La punchline doit contenir entre 10 et 280 caractères.", "error");
    return;
  }

  const button = entryForm.querySelector("button[type=submit]");
  button.disabled = true;
  setMessage(entryMessage, "Envoi en cours…", "info");
  try {
    const { error } = await supabase
      .from("entries")
      .insert({ author_id: currentUser.id, theme_id: themeId, body });
    if (error) throw error;

    entryForm.reset();
    setMessage(entryMessage, "Punchline envoyée. Elle apparaîtra publiquement après modération.", "success");
    await loadCloudData();
  } catch (error) {
    setMessage(entryMessage, error.message || "Impossible d’envoyer cette punchline.", "error");
  } finally {
    button.disabled = false;
  }
});

entriesNode.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-vote-entry]");
  if (!button) return;
  if (!currentUser) {
    setMessage(authMessage, "Connecte-toi pour voter.", "error");
    return;
  }

  const entryId = button.dataset.voteEntry;
  const alreadyVoted = userVotes.has(entryId);
  button.disabled = true;
  try {
    const result = alreadyVoted
      ? await supabase.from("votes").delete().eq("entry_id", entryId).eq("voter_id", currentUser.id)
      : await supabase.from("votes").insert({ entry_id: entryId, voter_id: currentUser.id });

    if (result.error) throw result.error;
    await loadCloudData();
  } catch (error) {
    setMessage(authMessage, error.message || "Ton vote n’a pas pu être enregistré.", "error");
  } finally {
    button.disabled = false;
  }
});

memberNav.addEventListener("click", (event) => {
  const button = event.target.closest("[data-pb-view]");
  if (!button) return;
  showMemberView(button.dataset.pbView);
});

$("pb-cloud-refresh").addEventListener("click", () => {
  void loadCloudData();
});

async function initialize() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    await syncSession(data.session);

    supabase.auth.onAuthStateChange((_event, session) => {
      // Defer database calls until Supabase has released its internal auth lock.
      Promise.resolve().then(() => syncSession(session));
    });
  } catch (error) {
    console.error("Punchi Battle initialization error:", error);
    statusNode.textContent = "Le service en ligne n’est pas disponible pour le moment.";
    setMessage(authMessage, error.message || "Initialisation impossible.", "error");
  }
}

void initialize();
