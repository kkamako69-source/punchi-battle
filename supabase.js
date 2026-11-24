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

let currentUser = null;
let currentProfile = null;
let activeThemes = [];
let userVotes = new Set();
let loadingEntries = false;

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

function renderSession() {
  const isSignedIn = Boolean(currentUser);
  authForms.hidden = isSignedIn;
  accountPanel.hidden = !isSignedIn;
  $("pb-cloud-user").textContent = isSignedIn
    ? (currentProfile?.display_name || currentProfile?.username || currentUser.email || "Membre")
    : "";
  $("pb-cloud-user-handle").textContent = isSignedIn && currentProfile?.username
    ? "@" + currentProfile.username
    : "";
  $("pb-cloud-entry-panel").hidden = !isSignedIn || activeThemes.length === 0;
  $("pb-cloud-login-note").hidden = isSignedIn;
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

async function loadCloudData() {
  if (loadingEntries) return;
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
      .select("id, body, vote_count, created_at, profiles!entries_author_id_fkey(username,display_name), themes!entries_theme_id_fkey(title)")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(50);

    if (entriesError) throw entriesError;
    renderEntries(entries || []);

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
    statusNode.textContent = "Connexion à la base indisponible. La démonstration reste consultable plus bas.";
    setMessage(authMessage, error.message || "Impossible de charger les données en ligne.", "error");
  } finally {
    loadingEntries = false;
  }
}

async function syncSession(session) {
  currentUser = session?.user ?? null;
  currentProfile = null;
  renderSession();

  if (currentUser) {
    try {
      await ensureProfile(currentUser);
      renderSession();
    } catch (error) {
      console.error("Profile initialization error:", error);
      setMessage(authMessage, "Connexion réussie, mais le profil n’a pas pu être initialisé : " + (error.message || "erreur inconnue"), "error");
    }
  }

  await loadCloudData();
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
        data: { username, display_name: usernameRaw.slice(0, 60) },
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
