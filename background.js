chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['isEnabled', 'listMode', 'siteList'], (data) => {
    if (data.isEnabled === undefined) {
      chrome.storage.local.set({ isEnabled: true });
    }
    if (data.listMode === undefined) {
      chrome.storage.local.set({ listMode: 'blacklist' }); // 'blacklist' = exclude list, 'whitelist' = include list
    }
    if (data.siteList === undefined) {
      chrome.storage.local.set({ siteList: [] });
    }
  });
});
