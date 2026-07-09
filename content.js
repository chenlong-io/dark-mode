let currentConfig = {
  isEnabled: true,
  listMode: 'blacklist',
  siteList: []
};

let isNativelyDark = false;
let nativeCheckDone = false;

function shouldEnableDarkMode(hostname, config) {
  if (!config.isEnabled) return false;
  
  // 如果页面本身已经是深色背景，则不再重复应用黑暗模式
  if (nativeCheckDone && isNativelyDark) return false;

  const inList = config.siteList.includes(hostname);
  if (config.listMode === 'whitelist') {
    // 只有在列表里的才开启
    return inList;
  } else {
    // 在列表里的不开启 (blacklist)
    return !inList;
  }
}

function applyDarkMode() {
  const hostname = window.location.hostname;
  const shouldBeEnabled = shouldEnableDarkMode(hostname, currentConfig);

  let styleTag = document.getElementById('dark-mode-extension-style');

  if (shouldBeEnabled) {
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'dark-mode-extension-style';
      styleTag.textContent = `
        html {
          /* 100%反转，确保子元素的再次反转能完美抵消 */
          filter: invert(1) hue-rotate(180deg) !important;
          /* 为了避免过分刺眼的纯黑，叠加一个降低对比度的属性是更好的选择，但为了原图无损，这里保持默认纯粹的 invert */
        }
        /* 将所有媒体元素二次反转，恢复原样 */
        img, video, canvas, iframe, picture, svg, image, *[style*="background-image"] {
          filter: invert(1) hue-rotate(180deg) !important;
        }
      `;
      if (document.documentElement) {
        document.documentElement.appendChild(styleTag);
      }
    }
  } else {
    if (styleTag) {
      styleTag.remove();
    }
  }
}

// 智能检测网页的实际背景色
function checkNativeDarkMode() {
  if (nativeCheckDone || !document.body) return;

  const bodyBg = window.getComputedStyle(document.body).backgroundColor;
  let bg = bodyBg;

  // 如果 body 透明，尝试检测 html
  if (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') {
    // 临时禁用我们的 style 标签，以获取 html 真实的背景色
    const styleTag = document.getElementById('dark-mode-extension-style');
    let wasDisabled = false;
    if (styleTag && !styleTag.disabled) {
      styleTag.disabled = true;
      wasDisabled = true;
    }
    bg = window.getComputedStyle(document.documentElement).backgroundColor;
    if (wasDisabled) {
      styleTag.disabled = false;
    }
  }

  if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
    const match = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      const r = parseInt(match[1], 10);
      const g = parseInt(match[2], 10);
      const b = parseInt(match[3], 10);
      // 计算亮度
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      if (luminance < 128) {
        isNativelyDark = true;
      }
    }
  }

  nativeCheckDone = true;
  applyDarkMode(); // 根据检测结果重新评估
}

// Initial fetch
chrome.storage.local.get(['isEnabled', 'listMode', 'siteList'], (data) => {
  if (data.isEnabled !== undefined) currentConfig.isEnabled = data.isEnabled;
  if (data.listMode !== undefined) currentConfig.listMode = data.listMode;
  if (data.siteList !== undefined) currentConfig.siteList = data.siteList;
  applyDarkMode();
});

// Listen to storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    if (changes.isEnabled !== undefined) currentConfig.isEnabled = changes.isEnabled.newValue;
    if (changes.listMode !== undefined) currentConfig.listMode = changes.listMode.newValue;
    if (changes.siteList !== undefined) currentConfig.siteList = changes.siteList.newValue;
    applyDarkMode();
  }
});

// 监听页面加载，一旦 body 出现就开始检测原生背景色
const observer = new MutationObserver((mutations) => {
  if (document.body && !nativeCheckDone) {
    // 稍微延迟，等待网站自己的 CSS 加载并应用
    setTimeout(checkNativeDarkMode, 100);
  }
});
observer.observe(document.documentElement, { childList: true });

// 确保在完全加载时检测一次
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', checkNativeDarkMode);
} else {
  checkNativeDarkMode();
}
