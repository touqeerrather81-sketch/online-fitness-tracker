import { auth, db } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

import {
  collection,
  doc,
  getDocs,
  addDoc,
  deleteDoc,
  setDoc,
  getDoc,
  updateDoc,
  collectionGroup
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

/* =========================
   SHARED HELPERS
========================= */

const $ = (id) => document.getElementById(id);

// Accessible off-canvas dashboard navigation.
const sidebarToggle = $("sidebarToggle");
const dashboardSidebar = $("dashboardSidebar");
const sidebarBackdrop = $("sidebarBackdrop");

function setSidebarOpen(open) {
  if (!sidebarToggle || !dashboardSidebar || !sidebarBackdrop) return;
  dashboardSidebar.classList.toggle("is-open", open);
  sidebarBackdrop.classList.toggle("is-visible", open);
  sidebarToggle.setAttribute("aria-expanded", String(open));
  sidebarToggle.setAttribute("aria-label", open ? "Close navigation menu" : "Open navigation menu");
  document.body.classList.toggle("sidebar-open", open);
}

if (sidebarToggle) {
  sidebarToggle.addEventListener("click", () => {
    setSidebarOpen(sidebarToggle.getAttribute("aria-expanded") !== "true");
  });
}
if (sidebarBackdrop) sidebarBackdrop.addEventListener("click", () => setSidebarOpen(false));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setSidebarOpen(false);
});
if (dashboardSidebar) {
  dashboardSidebar.querySelectorAll('.dashboard-nav a[href^="#"]').forEach((link) => {
    link.addEventListener("click", () => {
      dashboardSidebar.querySelectorAll(".dashboard-nav a").forEach((item) => item.classList.remove("active"));
      link.classList.add("active");
      setSidebarOpen(false);
    });
  });
}

function showMessage(element, message, success = false) {
  if (!element) return;

  element.textContent = message;
  element.style.color = success ? "#16743d" : "#b42318";
}

function getToday() {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function getWeekStart(dateString) {
  const date = new Date(`${dateString}T12:00:00`);
  const day = date.getDay();

  date.setDate(date.getDate() - ((day + 6) % 7));

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function readableError(error) {
  const messages = {
    "auth/email-already-in-use":
      "This email already has an account. Please log in.",
    "auth/invalid-email":
      "Please enter a valid email address.",
    "auth/invalid-credential":
      "Email or password is incorrect.",
    "auth/weak-password":
      "Please choose a stronger password.",
    "auth/network-request-failed":
      "Network error. Check your internet connection.",
    "auth/too-many-requests":
      "Too many attempts. Please try again later.",
    "permission-denied":
      "Access denied. Check your Firestore security rules."
  };

  return messages[error.code] ||
    error.message ||
    "Something went wrong. Please try again.";
}

/* =========================
   LOGIN AND SIGNUP
========================= */

const loginTab = $("loginTab");
const signupTab = $("signupTab");
const authForm = $("authForm");

if (loginTab && signupTab && authForm) {
  const authTitle = $("authTitle");
  const authSubtitle = $("authSubtitle");
  const nameField = $("nameField");
  const fullName = $("fullName");
  const email = $("email");
  const password = $("password");
  const authSubmit = $("authSubmit");
  const authSwitchCopy = $("authSwitchCopy");
  const formMessage = $("formMessage");

  let isSignup = false;
  let submitting = false;

  function setAuthMode(signup) {
    isSignup = signup;
    formMessage.textContent = "";

    loginTab.classList.toggle("active", !signup);
    signupTab.classList.toggle("active", signup);

    loginTab.setAttribute("aria-selected", String(!signup));
    signupTab.setAttribute("aria-selected", String(signup));

    nameField.hidden = !signup;
    fullName.required = signup;

    password.autocomplete = signup
      ? "new-password"
      : "current-password";

    password.placeholder = signup
      ? "Create a password"
      : "Enter your password";

    authTitle.textContent = signup
      ? "Create your account"
      : "Welcome back";

    authSubtitle.textContent = signup
      ? "Start building a stronger routine."
      : "Enter your details to continue.";

    authSubmit.innerHTML = signup
      ? 'Create Account <span>→</span>'
      : 'Log In <span>→</span>';

    authSwitchCopy.innerHTML = signup
      ? 'Already have an account? <button type="button" id="switchToLogin">Log in</button>'
      : 'New to Fitness Tracker? <button type="button" id="switchToSignup">Create an account</button>';
  }

  loginTab.addEventListener("click", () => setAuthMode(false));
  signupTab.addEventListener("click", () => setAuthMode(true));

  authSwitchCopy.addEventListener("click", (event) => {
    if (event.target.id === "switchToSignup") {
      setAuthMode(true);
    }

    if (event.target.id === "switchToLogin") {
      setAuthMode(false);
    }
  });

  authForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (submitting) return;

    const userEmail = email.value.trim();
    const userPassword = password.value;
    const userName = fullName.value.trim();

    if (!userEmail) {
      showMessage(formMessage, "Please enter your email address.");
      email.focus();
      return;
    }

    if (isSignup && !userName) {
      showMessage(formMessage, "Please enter your full name.");
      fullName.focus();
      return;
    }

    if (userPassword.length < 8) {
      showMessage(
        formMessage,
        "Password must be at least 8 characters."
      );
      password.focus();
      return;
    }

    submitting = true;
    authSubmit.disabled = true;
    showMessage(formMessage, "Please wait...", true);

    try {
      if (isSignup) {
        const result = await createUserWithEmailAndPassword(
          auth,
          userEmail,
          userPassword
        );

        await updateProfile(result.user, {
          displayName: userName
        });

        await setDoc(
          doc(db, "users", result.user.uid),
          {
            name: userName,
            email: userEmail,
            weeklyGoal: 4
          },
          { merge: true }
        );

        localStorage.setItem("fitnessTrackerName", userName);
      } else {
        const result = await signInWithEmailAndPassword(
          auth,
          userEmail,
          userPassword
        );

        localStorage.setItem(
          "fitnessTrackerName",
          result.user.displayName || userEmail.split("@")[0]
        );
      }

      window.location.href = "dashboard.html";
    } catch (error) {
      console.error("Authentication error:", error);
      showMessage(formMessage, readableError(error));
    } finally {
      submitting = false;
      authSubmit.disabled = false;
    }
  });

  setAuthMode(false);
}

/* =========================
   DASHBOARD
========================= */

const workoutForm = $("workoutForm");

if (workoutForm) {
  const workoutName = $("workoutName");
  const workoutType = $("workoutType");
  const workoutMinutes = $("workoutMinutes");
  const workoutDate = $("workoutDate");
  const workoutStatus = $("workoutStatus");
  const workoutList = $("workoutList");
  const scheduleForm = $("scheduleForm");
  const scheduleName = $("scheduleName");
  const scheduleDate = $("scheduleDate");
  const scheduleList = $("scheduleList");
  const scheduleMessage = $("scheduleMessage");
  const workoutMessage = $("workoutMessage");
  const weeklyGoal = $("weeklyGoal");
  const profileName = $("profileName");
  const profileAvatar = $("profileAvatar");
  const profileButton = $("profileButton");
  const sidebarProfileLink = $("sidebarProfileLink");
  const sidebarLogout = $("sidebarLogout");

  if (sidebarProfileLink && profileButton) {
    sidebarProfileLink.addEventListener("click", () => {
      setSidebarOpen(false);
      profileButton.click();
    });
  }

  if (sidebarLogout) {
    sidebarLogout.addEventListener("click", async () => {
      try {
        await signOut(auth);
        localStorage.removeItem("fitnessTrackerName");
        window.location.href = "login.html";
      } catch (error) {
        console.error("Logout error:", error);
        showDashboardMessage(readableError(error));
      }
    });
  }

  // These controls were added to dashboard.html.
  const workoutSearch = $("workoutSearch");
  const workoutTypeFilter = $("workoutTypeFilter");

  const today = getToday();

  workoutDate.value = today;
  // Workout records may be logged for any valid date, including future planned sessions.
  // Do not set a maximum date here.
  if (scheduleDate) { scheduleDate.value = today; scheduleDate.min = today; }

  let workouts = [];
  let scheduledPlans = [];
  let currentUser = null;
  let verifiedRole = "member";
  let dashboardReady = false;
  let savingWorkout = false;
  let editingWorkoutId = null;

  weeklyGoal.value = "4";

  const submitButton = workoutForm.querySelector(
    'button[type="submit"]'
  );

  // Create a cancel button without changing the existing HTML.
  let cancelEditButton = $("cancelWorkoutEdit");

  if (!cancelEditButton && submitButton) {
    cancelEditButton = document.createElement("button");
    cancelEditButton.id = "cancelWorkoutEdit";
    cancelEditButton.type = "button";
    cancelEditButton.textContent = "Cancel edit";
    cancelEditButton.hidden = true;

    submitButton.insertAdjacentElement("afterend", cancelEditButton);
  }

  function showDashboardMessage(message, success = false) {
    showMessage(workoutMessage, message, success);
  }

  function setFormMode(isEditing) {
    if (submitButton) {
      submitButton.innerHTML = isEditing
        ? 'Update Workout <span>→</span>'
        : 'Save Workout <span>→</span>';
    }

    if (cancelEditButton) {
      cancelEditButton.hidden = !isEditing;
    }
  }

  function resetWorkoutForm() {
    editingWorkoutId = null;
    workoutForm.reset();
    workoutDate.value = today;
    if (workoutStatus) workoutStatus.value = "Completed";
    setFormMode(false);
  }

  function startEditingWorkout(workout) {
    editingWorkoutId = workout.id;

    workoutName.value = workout.name || "";
    workoutType.value = workout.type || "Other";
    workoutMinutes.value = workout.minutes ?? "";
    workoutDate.value = workout.date || today;
    if (workoutStatus) workoutStatus.value = workout.status || "Completed";

    setFormMode(true);
    showDashboardMessage(
      `Editing "${workout.name}". Make your changes and select Update Workout.`,
      true
    );

    workoutForm.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });

    workoutName.focus();
  }

  if (cancelEditButton) {
    cancelEditButton.addEventListener("click", () => {
      // Leave edit mode silently: reset the form, hide this button and clear any stale message.
      resetWorkoutForm();
      showDashboardMessage("");
    });
  }

  function renderDashboard() {
    const currentWeek = getWeekStart(today);

    // Calculate progress using ALL workouts, not filtered results.
    const weeklyWorkouts = workouts.filter(
      (workout) => getWeekStart(workout.date) === currentWeek &&
        (workout.status || "Completed") === "Completed"
    );

    const goal = Number(weeklyGoal.value) || 4;
    const percentage = Math.min(
      100,
      Math.round((weeklyWorkouts.length / goal) * 100)
    );

    $("weeklyCount").textContent = weeklyWorkouts.length;
    $("totalCount").textContent = workouts.length;
    $("goalCount").textContent = `${percentage}%`;
    $("goalProgress").style.width = `${percentage}%`;

    $("goalCaption").textContent =
      `${weeklyWorkouts.length} of ${goal} workouts completed`;

    $("largeGoalProgress").style.width = `${percentage}%`;
    $("largeGoalPercent").textContent = `${percentage}%`;

    $("largeGoalText").textContent =
      `${weeklyWorkouts.length} of ${goal} workouts`;

    workoutList.replaceChildren();

    // Apply search and type filter only to the displayed list.
    const searchText = workoutSearch
      ? workoutSearch.value.trim().toLowerCase()
      : "";

    const selectedType = workoutTypeFilter
      ? workoutTypeFilter.value
      : "all";

    const filteredWorkouts = [...workouts]
      .filter((workout) => {
        const matchesSearch =
          String(workout.name || "")
            .toLowerCase()
            .includes(searchText);

        const matchesType =
          selectedType === "all" ||
          workout.type === selectedType;

        return matchesSearch && matchesType;
      })
      .sort((a, b) => {
        return String(b.date || "").localeCompare(String(a.date || "")) ||
          String(b.id).localeCompare(String(a.id));
      });

    $("workoutListCount").textContent =
      `${filteredWorkouts.length} ${
        filteredWorkouts.length === 1 ? "entry" : "entries"
      }`;

    if (workouts.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";

      const icon = document.createElement("span");
      icon.className = "empty-state-icon";
      icon.textContent = "↗";

      const heading = document.createElement("h3");
      heading.textContent = "Your progress starts here";

      const description = document.createElement("p");
      description.textContent =
        "Log your first workout to see it appear here.";

      empty.append(icon, heading, description);
      workoutList.append(empty);
      return;
    }

    if (filteredWorkouts.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";

      const heading = document.createElement("h3");
      heading.textContent = "No matching workouts";

      const description = document.createElement("p");
      description.textContent =
        "Try another search term or choose a different workout type.";

      empty.append(heading, description);
      workoutList.append(empty);
      return;
    }

    filteredWorkouts.forEach((workout) => {
      const entry = document.createElement("article");
      entry.className = "workout-entry";

      const icon = document.createElement("span");
      icon.className = "entry-icon";
      icon.textContent = String(workout.type || "O").charAt(0);

      const details = document.createElement("div");
      details.className = "entry-details";

      const title = document.createElement("h4");
      title.textContent = workout.name || "Untitled workout";

      const metadata = document.createElement("p");
      metadata.textContent =
        `${workout.type || "Other"} · ${
          workout.date
            ? new Date(`${workout.date}T12:00:00`).toLocaleDateString(
                "en-IN",
                {
                  day: "numeric",
                  month: "short",
                  year: "numeric"
                }
              )
            : "Date not set"
        }`;

      details.append(title, metadata);

      const duration = document.createElement("span");
      duration.className = "entry-duration";
      duration.textContent = `${workout.minutes} min`;

      const statusSelect = document.createElement("select");
      statusSelect.className = "entry-status-select";
      statusSelect.setAttribute("aria-label", `Update status for ${workout.name}`);
      ["Completed", "Planned", "Missed"].forEach((value) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        statusSelect.append(option);
      });
      statusSelect.value = workout.status || "Completed";
      statusSelect.disabled = !dashboardReady || verifiedRole !== "member";
      statusSelect.addEventListener("change", async () => {
        if (!currentUser || !dashboardReady || verifiedRole !== "member") return;
        statusSelect.disabled = true;
        try {
          await updateDoc(doc(db, "users", currentUser.uid, "workouts", workout.id), { status: statusSelect.value });
          workouts = workouts.map((item) => item.id === workout.id ? { ...item, status: statusSelect.value } : item);
          renderDashboard();
          showDashboardMessage("Workout status updated.", true);
        } catch (error) {
          console.error("Update workout status error:", error);
          showDashboardMessage(readableError(error));
          statusSelect.disabled = false;
        }
      });

      const actions = document.createElement("div");
      actions.className = "workout-entry-actions";
      actions.style.display = "flex";
      actions.style.alignItems = "center";
      actions.style.gap = "6px";

      const edit = document.createElement("button");
      edit.className = "entry-edit";
      edit.type = "button";
      edit.textContent = "Edit";
      edit.setAttribute("aria-label", `Edit ${workout.name}`);
      edit.disabled = !dashboardReady;

      edit.addEventListener("click", () => {
        startEditingWorkout(workout);
      });

      const remove = document.createElement("button");
      remove.className = "entry-delete";
      remove.type = "button";
      remove.textContent = "×";
      remove.setAttribute("aria-label", `Delete ${workout.name}`);
      remove.disabled = !dashboardReady;

      remove.addEventListener("click", async () => {
        if (!currentUser || !dashboardReady || verifiedRole !== "member") return;

        const shouldDelete = confirm(
          `Delete the workout "${workout.name}"?`
        );

        if (!shouldDelete) return;

        try {
          remove.disabled = true;

          await deleteDoc(
            doc(
              db,
              "users",
              currentUser.uid,
              "workouts",
              workout.id
            )
          );

          workouts = workouts.filter(
            (item) => item.id !== workout.id
          );

          if (editingWorkoutId === workout.id) {
            resetWorkoutForm();
          }

          renderDashboard();
          showDashboardMessage("Workout deleted.", true);
        } catch (error) {
          console.error("Delete workout error:", error);
          showDashboardMessage(readableError(error));
          remove.disabled = false;
        }
      });

      if (verifiedRole === "member") actions.append(edit, remove);
      else actions.hidden = true;
      entry.append(icon, details, duration, statusSelect, actions);
      workoutList.append(entry);
    });
  }

  function renderSchedules() {
    if (!scheduleList) return;
    scheduleList.replaceChildren();
    const ordered = [...scheduledPlans].sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
    if (!ordered.length) {
      const empty = document.createElement("p");
      empty.className = "schedule-empty";
      empty.textContent = "Your planned activities will appear here.";
      scheduleList.append(empty);
      return;
    }
    ordered.forEach((plan) => {
      const row = document.createElement("div");
      row.className = "schedule-item";
      const copy = document.createElement("div");
      copy.className = "schedule-item-copy";
      const title = document.createElement("strong");
      title.textContent = plan.name || "Workout plan";
      const date = document.createElement("span");
      date.textContent = plan.date ? new Date(`${plan.date}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Date not set";
      copy.append(title, date);
      const remove = document.createElement("button");
      remove.className = "schedule-remove";
      remove.type = "button";
      remove.textContent = "Remove";
      remove.hidden = verifiedRole !== "member";
      remove.addEventListener("click", async () => {
        if (!currentUser || !dashboardReady || verifiedRole !== "member") return;
        remove.disabled = true;
        try {
          await deleteDoc(doc(db, "users", currentUser.uid, "plans", plan.id));
          scheduledPlans = scheduledPlans.filter((item) => item.id !== plan.id);
          renderSchedules();
          showMessage(scheduleMessage, "Scheduled activity removed.", true);
        } catch (error) {
          showMessage(scheduleMessage, readableError(error));
          remove.disabled = false;
        }
      });
      row.append(copy, remove);
      scheduleList.append(row);
    });
  }

  if (scheduleForm) {
    scheduleForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (verifiedRole !== "member") { showMessage(scheduleMessage, "Staff and admin dashboard access is read-only."); return; }
      if (!currentUser || !dashboardReady) {
        showMessage(scheduleMessage, "Please wait for your account data to load.");
        return;
      }
      const name = scheduleName.value.trim();
      const date = scheduleDate.value;
      if (!name || !date || date < today) {
        showMessage(scheduleMessage, "Enter an activity and choose today or a future date.");
        return;
      }
      const button = scheduleForm.querySelector('button[type="submit"]');
      button.disabled = true;
      try {
        const plan = { name, date, status: "Planned", createdAt: new Date().toISOString() };
        const saved = await addDoc(collection(db, "users", currentUser.uid, "plans"), plan);
        scheduledPlans.push({ ...plan, id: saved.id });
        scheduleForm.reset();
        scheduleDate.value = today;
        renderSchedules();
        showMessage(scheduleMessage, "Activity added to your schedule.", true);
      } catch (error) {
        showMessage(scheduleMessage, readableError(error));
      } finally {
        button.disabled = false;
      }
    });
  }

  async function loadDashboardData(user) {
    currentUser = user;
    dashboardReady = false;
    showDashboardMessage("Loading your data…", true);

    // Roles are read only from Firebase ID-token custom claims. Never read a role
    // from localStorage or a user-editable Firestore profile document.
    verifiedRole = "member";
    try {
      const tokenResult = await user.getIdTokenResult(true);
      const claims = tokenResult.claims || {};
      if (claims.admin === true || claims.role === "admin") verifiedRole = "admin";
      else if (claims.staff === true || claims.role === "staff") verifiedRole = "staff";
    } catch (claimError) {
      console.warn("Could not refresh role claims; using least-privilege member role.", claimError);
    }

    const displayName =
      user.displayName || user.email?.split("@")[0] || "Member";

    profileName.textContent = displayName;
    profileAvatar.textContent = displayName.charAt(0).toUpperCase();
    const roleLabel = $("profileRoleLabel");
    if (roleLabel) {
      roleLabel.textContent = verifiedRole === "admin" ? "Administrator" :
        verifiedRole === "staff" ? "Staff member" : "Member account";
      roleLabel.dataset.role = verifiedRole;
      roleLabel.title = "Role is read from trusted Firebase custom claims.";
    }
    document.body.dataset.userRole = verifiedRole;
    const rolePanel = $("roleAccessPanel");
    if (rolePanel) {
      rolePanel.hidden = verifiedRole === "member";
      const roleTitle = $("roleAccessTitle");
      const roleDescription = $("roleAccessDescription");
      if (roleTitle) roleTitle.textContent = verifiedRole === "admin" ? "Administrator access" : "Staff access";
      if (roleDescription) roleDescription.textContent = verifiedRole === "admin"
        ? "Your account has the administrator claim. Protected admin operations must also be enforced by Firestore Rules or a trusted backend."
        : "Your account has the staff claim. Only operations explicitly allowed by Firestore Rules or a trusted backend should be available.";
    }

    const staffAdminPanel = $("staffAdminPanel");
    const staffAdminRecords = $("staffAdminRecords");
    const staffAdminMessage = $("staffAdminMessage");
    if (staffAdminPanel) staffAdminPanel.hidden = verifiedRole === "member";
    // Privileged accounts are view-only in the dashboard. All real permissions
    // must also be enforced by Firestore Security Rules.
    document.body.classList.toggle("read-only-role", verifiedRole !== "member");
    if (verifiedRole !== "member") {
      if (staffAdminRecords) staffAdminRecords.replaceChildren();
      if (staffAdminMessage) staffAdminMessage.textContent = "Loading shared records…";
      try {
        const [workoutSnapshots, planSnapshots] = await Promise.all([
          getDocs(collectionGroup(db, "workouts")),
          getDocs(collectionGroup(db, "plans"))
        ]);
        const records = [];
        workoutSnapshots.forEach((item) => {
          const ownerId = item.ref.parent.parent?.id || "Unknown user";
          const data = item.data();
          records.push({ kind: "Workout", ownerId, name: data.name || "Untitled workout", date: data.date || "—", detail: `${data.type || "Other"} · ${data.minutes || 0} min · ${data.status || "Completed"}` });
        });
        planSnapshots.forEach((item) => {
          const ownerId = item.ref.parent.parent?.id || "Unknown user";
          const data = item.data();
          records.push({ kind: "Schedule", ownerId, name: data.name || "Planned activity", date: data.date || "—", detail: data.status || "Planned" });
        });
        records.sort((a, b) => String(b.date).localeCompare(String(a.date)));
        if (staffAdminRecords) {
          if (!records.length) {
            const empty = document.createElement("p");
            empty.className = "schedule-empty";
            empty.textContent = "No shared workout or schedule records were found.";
            staffAdminRecords.append(empty);
          } else {
            records.forEach((record) => {
              const row = document.createElement("article");
              row.className = "role-record-row";
              const heading = document.createElement("strong");
              heading.textContent = `${record.kind}: ${record.name}`;
              const metadata = document.createElement("p");
              metadata.textContent = `Owner UID: ${record.ownerId} · ${record.date} · ${record.detail}`;
              row.append(heading, metadata);
              staffAdminRecords.append(row);
            });
          }
        }
        if (staffAdminMessage) staffAdminMessage.textContent = `${records.length} shared records · read-only access`;
      } catch (roleDataError) {
        console.error("Shared records load error:", roleDataError);
        if (staffAdminMessage) staffAdminMessage.textContent = "Shared records are not available yet. Publish the matching Firestore rules and confirm this account has a trusted staff/admin claim.";
      }
    }

    try {
      const userRef = doc(db, "users", user.uid);
      const userSnapshot = await getDoc(userRef);

      const savedGoal = userSnapshot.exists()
        ? Number(userSnapshot.data().weeklyGoal) || 4
        : 4;

      weeklyGoal.value = String(
        Math.min(7, Math.max(2, savedGoal))
      );

      const workoutsRef = collection(
        db,
        "users",
        user.uid,
        "workouts"
      );

      const snapshot = await getDocs(workoutsRef);

      workouts = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data()
      }));

      const plansSnapshot = await getDocs(collection(db, "users", user.uid, "plans"));
      scheduledPlans = plansSnapshot.docs.map((item) => ({ id: item.id, ...item.data() }));

      dashboardReady = true;
      renderDashboard();
      renderSchedules();
      showDashboardMessage("", true);
    } catch (error) {
      console.error("Load dashboard error:", error);
      showDashboardMessage(
        "Could not load your data. Check your Firestore security rules."
      );
    }
  }

  // Search and filter update only the displayed workout list.
  if (workoutSearch) {
    workoutSearch.addEventListener("input", renderDashboard);
  }

  if (workoutTypeFilter) {
    workoutTypeFilter.addEventListener("change", renderDashboard);
  }

  workoutForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (verifiedRole !== "member") { showDashboardMessage("Staff and admin dashboard access is read-only."); return; }
    if (!currentUser || !dashboardReady || savingWorkout) {
      showDashboardMessage("Please wait for your account data to load.");
      return;
    }

    showDashboardMessage("");

    if (!workoutForm.reportValidity()) return;

    // Future dates are allowed for planned workouts and can also be recorded as workout dates.

    const workoutData = {
      name: workoutName.value.trim(),
      type: workoutType.value,
      minutes: Number(workoutMinutes.value),
      date: workoutDate.value,
      status: workoutStatus ? workoutStatus.value : "Completed"
    };

    if (
      !workoutData.name ||
      !workoutData.date ||
      !Number.isFinite(workoutData.minutes) ||
      workoutData.minutes < 1 ||
      workoutData.minutes > 600
    ) {
      showDashboardMessage(
        "Enter a workout name and a duration between 1 and 600 minutes."
      );
      return;
    }

    const allowedTypes = [
      "Strength",
      "Cardio",
      "Calisthenics",
      "Flexibility",
      "Boxing",
      "Other"
    ];

    if (!allowedTypes.includes(workoutData.type)) {
      showDashboardMessage("Please select a valid workout type.");
      return;
    }

    savingWorkout = true;

    if (submitButton) submitButton.disabled = true;
    if (cancelEditButton) cancelEditButton.disabled = true;

    try {
      if (editingWorkoutId) {
        // Update the existing Firestore workout.
        const workoutId = editingWorkoutId;

        await updateDoc(
          doc(
            db,
            "users",
            currentUser.uid,
            "workouts",
            workoutId
          ),
          {
            ...workoutData,
            updatedAt: new Date().toISOString()
          }
        );

        workouts = workouts.map((workout) =>
          workout.id === workoutId
            ? { ...workout, ...workoutData }
            : workout
        );

        resetWorkoutForm();
        renderDashboard();
        showDashboardMessage("Workout updated successfully.", true);
      } else {
        // Create a new Firestore workout.
        const newWorkout = {
          ...workoutData,
          createdAt: new Date().toISOString()
        };

        const workoutsRef = collection(
          db,
          "users",
          currentUser.uid,
          "workouts"
        );

        const saved = await addDoc(workoutsRef, newWorkout);

        workouts.push({
          ...newWorkout,
          id: saved.id
        });

        resetWorkoutForm();
        renderDashboard();
        showDashboardMessage("Workout saved to your account.", true);
      }
    } catch (error) {
      console.error("Save/update workout error:", error);
      showDashboardMessage(readableError(error));
    } finally {
      savingWorkout = false;

      if (submitButton) submitButton.disabled = false;
      if (cancelEditButton) cancelEditButton.disabled = false;
    }
  });

  weeklyGoal.addEventListener("change", async () => {
    if (!currentUser || !dashboardReady) return;

    const goal = Math.min(
      7,
      Math.max(2, Number(weeklyGoal.value) || 4)
    );

    weeklyGoal.value = String(goal);

    try {
      await setDoc(
        doc(db, "users", currentUser.uid),
        {
          name: currentUser.displayName || "",
          email: currentUser.email || "",
          weeklyGoal: goal
        },
        { merge: true }
      );

      renderDashboard();
      showDashboardMessage("Weekly goal updated.", true);
    } catch (error) {
      console.error("Save goal error:", error);
      showDashboardMessage(readableError(error));
    }
  });

  if (profileButton) {
    profileButton.addEventListener("click", async () => {
      const action = prompt("Account options: type EDIT to update your name, or LOGOUT to sign out.", "EDIT");
      if (!action) return;
      if (action.trim().toUpperCase() === "EDIT") {
        const newName = prompt("Enter your display name:", currentUser?.displayName || "");
        if (!newName || !newName.trim() || !currentUser) return;
        try {
          const name = newName.trim().slice(0, 60);
          await updateProfile(currentUser, { displayName: name });
          await setDoc(doc(db, "users", currentUser.uid), { name, email: currentUser.email || "" }, { merge: true });
          profileName.textContent = name;
          profileAvatar.textContent = name.charAt(0).toUpperCase();
          showDashboardMessage("Profile name updated.", true);
        } catch (error) {
          showDashboardMessage(readableError(error));
        }
        return;
      }
      if (action.trim().toUpperCase() !== "LOGOUT") return;
      try {
        await signOut(auth);
        localStorage.removeItem("fitnessTrackerName");
        window.location.href = "login.html";
      } catch (error) {
        console.error("Logout error:", error);
        showDashboardMessage(readableError(error));
      }
    });
  }

  // Do not show the dashboard to signed-out visitors.
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.replace("login.html");
      return;
    }

    await loadDashboardData(user);
  });
}
