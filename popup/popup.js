document.addEventListener('DOMContentLoaded', () => {
  const globalToggle = document.getElementById('global-toggle');
  const modeRadios = document.getElementsByName('list-mode');
  const currentSiteEl = document.getElementById('current-site');
  const addCurrentBtn = document.getElementById('add-current-btn');
  const customDomainInput = document.getElementById('custom-domain');
  const addCustomBtn = document.getElementById('add-custom-btn');
  const domainListEl = document.getElementById('domain-list');

  let config = {
    isEnabled: true,
    listMode: 'blacklist',
    siteList: []
  };

  let currentHostname = '';

  // Load current tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0 && tabs[0].url) {
      try {
        const url = new URL(tabs[0].url);
        currentHostname = url.hostname;
        if (currentHostname) {
          currentSiteEl.textContent = currentHostname;
        } else {
          currentSiteEl.textContent = '无法获取域名';
          addCurrentBtn.disabled = true;
        }
      } catch (e) {
        currentSiteEl.textContent = '无法解析 URL';
        addCurrentBtn.disabled = true;
      }
    } else {
      currentSiteEl.textContent = '特殊页面或空页面';
      addCurrentBtn.disabled = true;
    }
    updateAddButtonState();
  });

  function saveConfig() {
    chrome.storage.local.set(config);
  }

  function renderList() {
    domainListEl.innerHTML = '';
    config.siteList.forEach(domain => {
      const li = document.createElement('li');
      li.textContent = domain;
      const removeBtn = document.createElement('button');
      removeBtn.textContent = '移除';
      removeBtn.className = 'remove-btn';
      removeBtn.onclick = () => {
        config.siteList = config.siteList.filter(d => d !== domain);
        saveConfig();
        renderList();
        updateAddButtonState();
      };
      li.appendChild(removeBtn);
      domainListEl.appendChild(li);
    });
  }

  function updateAddButtonState() {
    if (currentHostname && config.siteList.includes(currentHostname)) {
      addCurrentBtn.textContent = '已在列表中';
      addCurrentBtn.disabled = true;
    } else if (currentHostname) {
      addCurrentBtn.textContent = '加入列表';
      addCurrentBtn.disabled = false;
    }
  }

  // Load config
  chrome.storage.local.get(['isEnabled', 'listMode', 'siteList'], (data) => {
    if (data.isEnabled !== undefined) config.isEnabled = data.isEnabled;
    if (data.listMode !== undefined) config.listMode = data.listMode;
    if (data.siteList !== undefined) config.siteList = data.siteList;

    globalToggle.checked = config.isEnabled;
    Array.from(modeRadios).forEach(r => {
      if (r.value === config.listMode) r.checked = true;
    });

    renderList();
    updateAddButtonState();
  });

  // Event Listeners
  globalToggle.addEventListener('change', (e) => {
    config.isEnabled = e.target.checked;
    saveConfig();
  });

  Array.from(modeRadios).forEach(r => {
    r.addEventListener('change', (e) => {
      if (e.target.checked) {
        config.listMode = e.target.value;
        saveConfig();
      }
    });
  });

  addCurrentBtn.addEventListener('click', () => {
    if (currentHostname && !config.siteList.includes(currentHostname)) {
      config.siteList.push(currentHostname);
      saveConfig();
      renderList();
      updateAddButtonState();
    }
  });

  addCustomBtn.addEventListener('click', () => {
    const val = customDomainInput.value.trim();
    if (val) {
      // Basic domain extraction
      let domainToAdd = val;
      try {
        if (val.startsWith('http')) {
          domainToAdd = new URL(val).hostname;
        }
      } catch (e) {}

      if (domainToAdd && !config.siteList.includes(domainToAdd)) {
        config.siteList.push(domainToAdd);
        saveConfig();
        renderList();
        updateAddButtonState();
      }
    }
    customDomainInput.value = '';
  });
  
  // Also support pressing Enter
  customDomainInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addCustomBtn.click();
    }
  });
});
