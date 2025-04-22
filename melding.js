(() => {
  const token = localStorage.getItem("sc_token") || sessionStorage.getItem("sc_token");
  const isInEditor = window.self !== window.top;

  if (
    !token &&
    !isInEditor &&
    !window.location.href.includes("meldinglogintemp")
  ) {
    window.location.href = "/meldinglogintemp";
  }

  window.logout = function logout() {
    localStorage.removeItem("sc_token");
    sessionStorage.removeItem("sc_token");
    window.location.href = "/meldinglogintemp";
  };

  const msgBox = document.getElementById("formMsg");

  document.getElementById("observationForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    msgBox.textContent = "";
    msgBox.className = "msg";

    let token = localStorage.getItem("sc_token") || sessionStorage.getItem("sc_token");
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
      e.target.reset();
      document.getElementById("imagePreview").innerHTML = "";
      document.getElementById("map").innerHTML = "";
    } catch (err) {
      msgBox.classList.add("error");
      msgBox.textContent = "❌ " + err.message;
    }
  });

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

  window.loadMap = function (lat, lng) {
    const mapDiv = document.getElementById("map");
    mapDiv.innerHTML = `<iframe width="100%" height="200" frameborder="0" style="border:0"
      src="https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01}%2C${lat - 0.01}%2C${lng + 0.01}%2C${lat + 0.01}&layer=mapnik&marker=${lat}%2C${lng}" allowfullscreen>
    </iframe>`;
  };
})();
