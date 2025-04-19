<!-- ✅ Enhanced Cluey Observation Form -->

  const access = localStorage.getItem('sc_token') || sessionStorage.getItem('sc_token');
  const refresh = localStorage.getItem('sc_refresh') || sessionStorage.getItem('sc_refresh');

  if (!access) {
    window.location.href = 'https://www.sensingclues.org/meldinglogintemp';
  }

  function logout() {
  localStorage.removeItem('sc_token');
  localStorage.removeItem('sc_refresh');
  sessionStorage.removeItem('sc_token');
  sessionStorage.removeItem('sc_refresh');
  // ✅ Force redirect
  window.location.assign('https://www.sensingclues.org/MeldingLoginTemp');
}

  

  const msgBox = document.getElementById('formMsg');

  function previewImage() {
    const input = document.getElementById('image');
    const preview = document.getElementById('imagePreview');
    preview.innerHTML = '';
    if (input.files.length > 0) {
      const reader = new FileReader();
      reader.onload = () => {
        const img = document.createElement('img');
        img.src = reader.result;
        preview.appendChild(img);
      };
      reader.readAsDataURL(input.files[0]);
    }
  }

  function loadMap(lat, lng) {
    const mapDiv = document.getElementById('map');
    mapDiv.innerHTML = `<iframe width="100%" height="200" frameborder="0" style="border:0"
      src="https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01}%2C${lat - 0.01}%2C${lng + 0.01}%2C${lat + 0.01}&layer=mapnik&marker=${lat}%2C${lng}" allowfullscreen>
    </iframe>`;
  }

  async function refreshTokenIfNeeded(token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) {
        const refresh = localStorage.getItem('sc_refresh') || sessionStorage.getItem('sc_refresh');
        if (!refresh) throw new Error('Session expired. Please log in again.');

        const res = await fetch('https://cluey.sensingclues.org/api/token/refresh/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh })
        });

        if (!res.ok) throw new Error('Token refresh failed.');
        const data = await res.json();
        localStorage.setItem('sc_token', data.access);
        return data.access;
      }
    } catch (e) {
      logout();
    }
    return token;
  }

  function getUserAgentInfo() {
    const ua = navigator.userAgent;
    const platform = navigator.platform;
    return `User Agent: ${ua}\nPlatform: ${platform}`;
  }

  document.getElementById('observationForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    msgBox.textContent = '';
    msgBox.className = 'msg';

    let token = localStorage.getItem('sc_token') || sessionStorage.getItem('sc_token');
    if (!token) {
      msgBox.classList.add('error');
      msgBox.textContent = '❌ Not authenticated. Please log in.';
      return;
    }

    token = await refreshTokenIfNeeded(token); // 🔁 Refresh if expired
        let lat = null, lng = null;
    try {
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      );
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
      loadMap(lat, lng);
    } catch (err) {
      msgBox.classList.add('error');
      msgBox.textContent = '⚠️ Geolocation failed.';
      return;
    }

    const notesInput = document.getElementById('notes').value;
    const fingerprint = getUserAgentInfo();

    const formData = new FormData();
    formData.append('latitude', lat);
    formData.append('longitude', lng);
    formData.append('observation_type', document.getElementById('type').value);
    formData.append('observation_category', document.getElementById('category').value);
    formData.append('observation_subcategory', document.getElementById('subcategory').value);
    formData.append('notes', notesInput + '\n\n' + fingerprint);
    formData.append('timestamp', new Date().toISOString());

    const imageInput = document.getElementById('image');
    if (imageInput.files.length > 0) {
      formData.append('image', imageInput.files[0]);
    }

    try {
      const response = await fetch('https://cluey.sensingclues.org/api/observation/', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token
        },
        body: formData
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || JSON.stringify(err));
      }

      msgBox.classList.add('success');
      msgBox.textContent = '✅ Observation submitted!';
      e.target.reset();
      document.getElementById('imagePreview').innerHTML = '';
      document.getElementById('map').innerHTML = '';
    } catch (err) {
      msgBox.classList.add('error');
      msgBox.textContent = '❌ Error: ' + err.message;
    }
  })();
window.logout = logout;
