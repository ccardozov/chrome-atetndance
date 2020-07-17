const button = document.getElementById("btn-change-name");
button.addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const nameInput = document.getElementById("input-meeting-name").value || "";
    chrome.tabs.executeScript(tabs[0].id, {
      code: `
            ;
            if(document.getElementById("meeting-name-id")) {
                document.getElementById("meeting-name-id").value = "${nameInput}";
            }
        `,
    });
    chrome.runtime.sendMessage({
      action: "CHANGE_MEETING_NAME",
      data: nameInput,
    }, () => chrome.pageAction.hide(tabs[0].id));
    window.close();
  });
});

window.addEventListener("load", (event) => {
  chrome.storage.local.get("meeting", (result) => {
    const nameInput = document.getElementById("input-meeting-name");
    nameInput.value = result.meeting.name || "My Meeting";
  });
});
