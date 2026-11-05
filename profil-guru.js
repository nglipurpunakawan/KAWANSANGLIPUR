/* ==========================================
   KAWANSA - Profil Guru
   Dimuat SETELAH script.js. Hanya menangani:
   identitas profil kanan atas + modal pengaturan profil.
   Penyimpanan: localStorage (sama seperti website).
========================================== */
(function () {
  "use strict";

  const PROFILE_KEY = "kawansa_profile_v1";
  const PHOTO_MAX = 256; // px, sisi terpanjang foto setelah diperkecil

  const el = {
    btn: document.getElementById("teacherProfileBtn"),
    avatar: document.getElementById("teacherAvatar"),
    name: document.getElementById("teacherName"),
    role: document.getElementById("teacherRole"),
    modal: document.getElementById("profileModal"),
    form: document.getElementById("profileForm"),
    preview: document.getElementById("profilePhotoPreview"),
    file: document.getElementById("profilePhotoInput"),
    pick: document.getElementById("profilePhotoPick"),
    remove: document.getElementById("profilePhotoRemove"),
    fName: document.getElementById("profileName"),
    fEmail: document.getElementById("profileEmail"),
    fField: document.getElementById("profileField"),
    fUser: document.getElementById("profileUsername"),
    fPass: document.getElementById("profilePassword"),
    passToggle: document.getElementById("profilePassToggle"),
    error: document.getElementById("profileError"),
    cancel: document.getElementById("profileCancel")
  };
  if (!el.btn || !el.modal || !el.form) return;

  /* ---------- Data ---------- */
  function loadProfile() {
    try {
      const raw = JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
      return raw && typeof raw === "object" ? raw : {};
    } catch (e) {
      return {};
    }
  }

  function persist(profile) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }

  // Profil tersimpan (jika ada) menimpa kredensial/nama bawaan agar login ikut memakai data terbaru.
  let profile = loadProfile();
  if (profile.name) DEFAULT_USER.name = profile.name;
  if (profile.username) DEFAULT_USER.username = profile.username;
  if (profile.password) DEFAULT_USER.password = profile.password;

  let draftPhoto = null; // foto sementara selama modal terbuka (null = ikuti profil tersimpan)
  let photoChanged = false;

  /* ---------- Tampilan identitas di Dashboard ---------- */
  function initialOf(name) {
    const t = (name || "").trim();
    return t ? t.charAt(0).toUpperCase() : "G";
  }

  function paintPhoto(target, photo, name) {
    target.textContent = "";
    if (photo) {
      const img = document.createElement("img");
      img.src = photo;
      img.alt = "Foto profil " + (name || "guru");
      target.appendChild(img);
    } else {
      target.textContent = initialOf(name);
    }
  }

  function renderIdentity() {
    const name = profile.name || DEFAULT_USER.name;
    el.name.textContent = name;
    el.role.textContent = profile.field
      ? "Administrator \u2022 " + profile.field
      : "Administrator";
    paintPhoto(el.avatar, profile.photo, name);
  }

  /* ---------- Modal ---------- */
  function fillForm() {
    el.fName.value = profile.name || DEFAULT_USER.name || "";
    el.fEmail.value = profile.email || "";
    el.fField.value = profile.field || "";
    el.fUser.value = DEFAULT_USER.username || "";
    el.fPass.value = DEFAULT_USER.password || "";
    el.fPass.type = "password";
    el.passToggle.textContent = "Tampilkan";
    el.error.textContent = "";
    el.file.value = "";
    draftPhoto = profile.photo || null;
    photoChanged = false;
    renderPreview();
  }

  function renderPreview() {
    paintPhoto(el.preview, draftPhoto, el.fName.value || DEFAULT_USER.name);
    el.remove.classList.toggle("hidden", !draftPhoto);
  }

  function openProfile() {
    fillForm();
    el.modal.classList.remove("hidden");
    setTimeout(() => el.fName.focus(), 30);
  }

  function closeProfile() {
    el.modal.classList.add("hidden");
    el.btn.focus();
  }

  el.btn.addEventListener("click", openProfile);
  el.btn.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openProfile();
    }
  });
  el.cancel.addEventListener("click", closeProfile);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !el.modal.classList.contains("hidden")) closeProfile();
  });

  // Inisial pada pratinjau ikut berubah saat nama diketik (jika belum ada foto)
  el.fName.addEventListener("input", () => {
    if (!draftPhoto) renderPreview();
  });

  el.passToggle.addEventListener("click", () => {
    const show = el.fPass.type === "password";
    el.fPass.type = show ? "text" : "password";
    el.passToggle.textContent = show ? "Sembunyikan" : "Tampilkan";
  });

  /* ---------- Foto: baca, perkecil, jadikan data URL ---------- */
  el.pick.addEventListener("click", () => el.file.click());

  el.file.addEventListener("change", () => {
    const file = el.file.files && el.file.files[0];
    if (!file) return;
    el.error.textContent = "";

    if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) {
      el.error.textContent = "Format foto harus JPG, PNG, atau WebP.";
      el.file.value = "";
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      el.error.textContent = "Ukuran foto terlalu besar (maksimal 8 MB).";
      el.file.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => { el.error.textContent = "Foto tidak dapat dibaca. Coba file lain."; };
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => { el.error.textContent = "File bukan gambar yang valid."; };
      img.onload = () => {
        // Potong persegi dari tengah agar pas dalam lingkaran, lalu perkecil
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        const size = Math.min(PHOTO_MAX, side);
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        canvas.getContext("2d").drawImage(img, sx, sy, side, side, 0, 0, size, size);
        draftPhoto = canvas.toDataURL("image/jpeg", 0.85);
        photoChanged = true;
        renderPreview();
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

  el.remove.addEventListener("click", () => {
    draftPhoto = null;
    photoChanged = true;
    el.file.value = "";
    renderPreview();
  });

  /* ---------- Simpan ---------- */
  el.form.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = el.fName.value.trim();
    const email = el.fEmail.value.trim();
    const field = el.fField.value.trim();
    const username = el.fUser.value.trim();
    const password = el.fPass.value;

    if (!name) return fail("Nama lengkap wajib diisi.", el.fName);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return fail("Format email belum benar.", el.fEmail);
    }
    if (!username) return fail("Username wajib diisi.", el.fUser);
    if (/\s/.test(username)) return fail("Username tidak boleh mengandung spasi.", el.fUser);
    if (!password) return fail("Password wajib diisi.", el.fPass);

    const next = { name, email, field, username, password, photo: draftPhoto || "" };

    try {
      persist(next);
    } catch (err) {
      return fail("Penyimpanan penuh. Gunakan foto yang lebih kecil lalu coba lagi.", el.pick);
    }

    profile = next;
    DEFAULT_USER.name = name;
    DEFAULT_USER.username = username;
    DEFAULT_USER.password = password;

    renderIdentity();
    el.modal.classList.add("hidden");
    if (typeof toast === "function") toast("Profil guru berhasil diperbarui.");
  });

  function fail(message, field) {
    el.error.textContent = message;
    if (field && field.focus) field.focus();
  }

  renderIdentity();
})();
