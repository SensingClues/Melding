(() => {

  // =======================
  // 🧹 LOGOUT
  // =======================
  window.logout = function logout() {
    localStorage.removeItem("sc_token");
    sessionStorage.removeItem("sc_token");
    window.location.href = "/meldinglogintemp";
  };

  // =======================
  // 🖼️ IMAGE PREVIEW
  // =======================
  window.previewImage = function () {
    const input = document.getElementById("image");
    const preview = document.getElementById("imagePreview");
    preview.innerHTML = "";
    if (input.files.length > 0) {
      const reader = new FileReader();
      reader.onload = () => {
        const img = document.createElement("img");
        img.src = reader.result;
        preview.appendChild(img);
      };
      reader.readAsDataURL(input.files[0]);
    }
  };

  // =======================
  // 🗺️ MAP PREVIEW
  // =======================
  window.loadMap = function (lat, lng) {
    const mapDiv = document.getElementById("map");
    mapDiv.innerHTML = `<iframe width="100%" height="200" frameborder="0" style="border:0"
      src="https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01}%2C${lat - 0.01}%2C${lng + 0.01}%2C${lat + 0.01}&layer=mapnik&marker=${lat}%2C${lng}" allowfullscreen>
    </iframe>`;
  };

  // =======================
  // 📤 OBSERVATION FORM
  // =======================
  const form = document.getElementById("observationForm");
  if (form) {
    const msgBox = document.getElementById("formMsg");

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      msgBox.textContent = "";
      msgBox.className = "msg";

      const token = localStorage.getItem("sc_token") || sessionStorage.getItem("sc_token");
      if (!token) {
        msgBox.classList.add("error");
        msgBox.textContent = "❌ Not authenticated.";
        return;
      }

      let lat = null, lng = null;
      try {
        const pos = await new Promise((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
        loadMap(lat, lng);
      } catch (err) {
        msgBox.classList.add("error");
        msgBox.textContent = "⚠️ Geolocation failed.";
        return;
      }

      const formData = new FormData();
      formData.append("latitude", lat);
      formData.append("longitude", lng);
      formData.append("observation_type", document.getElementById("type").value);
      formData.append("observation_category", document.getElementById("category").value);
      formData.append("observation_subcategory", document.getElementById("subcategory").value);
      formData.append("notes", document.getElementById("notes").value);
      formData.append("timestamp", new Date().toISOString());

      const imageInput = document.getElementById("image");
      if (imageInput.files.length > 0) {
        formData.append("image", imageInput.files[0]);
      }

      try {
        const response = await fetch("https://cluey.sensingclues.org/api/observation/", {
          method: "POST",
          headers: {
            Authorization: "Bearer " + token,
          },
          body: formData,
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.detail || "Unknown error");
        }

        msgBox.classList.add("success");
        msgBox.textContent = "✅ Observation submitted!";
        form.reset();
        document.getElementById("imagePreview").innerHTML = "";
        document.getElementById("map").innerHTML = "";
      } catch (err) {
        msgBox.classList.add("error");
        msgBox.textContent = "❌ " + err.message;
      }
    });
  }
})();

// =======================
// 🔐 LOGIN HANDLER
// =======================
window.handleLogin = async function handleLogin() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const msgBox = document.getElementById("loginMsg");

  msgBox.textContent = "🔄 Logging in...";

  try {
    const token = await loginToCluey(username, password);
    localStorage.setItem("sc_token", token);
    window.location.href = "/melding";
  } catch (err) {
    msgBox.textContent = "❌ " + err.message;
  }
};

// =======================
// 🔑 AUTH REQUEST
// =======================
async function loginToCluey(username, password) {
  const API_BASE_URL = "https://cluey.sensingclues.org/v1";

  const response = await fetch(`${API_BASE_URL}/users/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "appVersion": "3.0.0",
    },
    body: JSON.stringify({
      identifier: username,
      password: password,
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || "Login failed");
  }

  const data = await response.json();
  return data.token;
}
