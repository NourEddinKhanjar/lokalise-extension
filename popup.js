const enableSwitch = document.getElementById("enable_switch");

chrome.storage.sync.get("enabled", ({ enabled }) => {
  if (enabled) {
    enableSwitch.setAttribute('checked', 'true');
  } else {
    enableSwitch.removeAttribute('checked');
  }
});

enableSwitch.addEventListener("click", async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: toggleExtension,
  });
});

// The body of this function will be execuetd as a content script inside the
// current page
function toggleExtension() {
  chrome.storage.sync.get("enabled", ({ enabled }) => {
    chrome.storage.sync.set({
      enabled: !enabled,
    });

    window.location = window.location;
  });
}
