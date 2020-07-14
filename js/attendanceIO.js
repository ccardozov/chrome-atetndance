const addAttendanceRecord = (type, person) => {
  chrome.storage.local.get([person], (result) => {
    let personAttendance = result[person] || [];
    const timestamp = new Date().toGMTString();
    personAttendance.push({ [type]: timestamp });
    chrome.storage.local.set({ [person]: personAttendance }, () => {
      chrome.storage.local.get("meeting", (result) => {
        console.log(result.meeting, person, personAttendance);
      });
    });
  });
};

// Callback function to execute when mutations are observed
const callback = (mutationsList, observer) => {
  for (let mutation of mutationsList) {
    if (mutation.type === "childList") {
      const addedNodes = mutation.addedNodes;
      if (addedNodes.length && addedNodes[0].innerText !== undefined) {
        let innerText = addedNodes[0].innerText;
        if (innerText.includes(" joined")) {
          // Someone has joined the conversation
          innerText = innerText.replace(" joined", "");
          addAttendanceRecord("in", innerText);
        } else if (innerText.includes(" has left the meeting")) {
          // Someone has left the conversation
          innerText = innerText.replace(" has left the meeting", "");
          addAttendanceRecord("out", innerText);
        }
      }
    }
  }
};

// Create an observer instance linked to the callback function
const observer = new MutationObserver(callback);

// Select the node that will be observed for mutations
const targetNode = document.body;

// Options for the observer (which mutations to observe)
var config = { childList: true, subtree: true };

// Start observing the target node for configured mutations
observer.observe(targetNode, config);

// Add input tag for class name
const addInputMeetingName = () => {
  let parent = document.querySelector("div.qIHHZb");
  let node = document.createElement("INPUT");
  node.placeholder = "Meeting Name";
  node.type = "text";
  node.id = "meeting-name-id";
  node.style = `
    text-align:center;
    font-size:1.75rem;
    font-family:'Google Sans',Roboto,Arial,sans-serif;
  `;
  parent.appendChild(node);
};

const listenToJoinButtons = () => {
  const buttons = document.querySelectorAll("span.l4V7wb.Fxmcue");
  buttons.forEach((button) => {
    button.addEventListener("mousedown", () => {
      const meetingName = document.getElementById("meeting-name-id").value;
      chrome.storage.local.set({ 'meeting': meetingName });
    });
  });
};

// All js that need the page loaded first.
window.addEventListener("load", () => {
  addInputMeetingName();
  listenToJoinButtons();
});
