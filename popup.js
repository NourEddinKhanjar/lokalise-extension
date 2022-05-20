function getWebsiteBaseUrl(url) {
  return window.btoa(url.split('//')[1].split('/')[0]);
}

const enableSwitch = document.getElementById("enable_switch");
const livePreviewSwitch = document.getElementById("live_preview");

chrome.storage.sync.get("lokaliseSettings", ({ lokaliseSettings }) => {
  chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
    const url = tab.url;
    const baseUrl = getWebsiteBaseUrl(url);

    const settings = lokaliseSettings[baseUrl];

    if (settings?.enabled) {
      enableSwitch.setAttribute('checked', 'true');
    } else {
      enableSwitch.removeAttribute('checked');
    }

    if(settings?.livePreview) {
      livePreviewSwitch.setAttribute('checked', 'true');
    } else {
      livePreviewSwitch.removeAttribute('checked');
    }
  });
});

enableSwitch.addEventListener("click", async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: toggleExtension,
  });
});

livePreviewSwitch.addEventListener("click", async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: toggleLivePreview,
  });
});


function toggleExtension() {
  const baseUrl = window.btoa(window.location.href.split('//')[1].split('/')[0])
  chrome.storage.sync.get("lokaliseSettings", ({ lokaliseSettings }) => {

    if(lokaliseSettings[baseUrl] === undefined) {
      lokaliseSettings[baseUrl] = { enabled: true, livePreview: false};
    } else {
      lokaliseSettings[baseUrl].enabled = !lokaliseSettings[baseUrl].enabled;
    }

    chrome.storage.sync.set({
      lokaliseSettings: lokaliseSettings,
    });

    window.location.reload();
  });
}


function toggleLivePreview() {
  const baseUrl = window.btoa(window.location.href.split('//')[1].split('/')[0])
  chrome.storage.sync.get("lokaliseSettings", ({ lokaliseSettings }) => {

    if(lokaliseSettings[baseUrl] === undefined) {
      lokaliseSettings[baseUrl] = { enabled: false, livePreview: true };
    } else {
      lokaliseSettings[baseUrl].livePreview = !lokaliseSettings[baseUrl].livePreview;
    }

    chrome.storage.sync.set({
      lokaliseSettings: lokaliseSettings,
    });

    window.location.reload();
  });
}

