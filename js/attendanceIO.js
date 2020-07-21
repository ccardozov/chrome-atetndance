//CONSTANTS
const INPUT_NAME_PARENT_NODE = "div.qIHHZb";
const END_MEETING_CLASSNAME = "I5fjHe wb61gb";
const START_WRAPPER_CLASSNAME = "l4V7wb Fxmcue";
const START_MEETING_CLASSNAME = "NPEfkd RveJvd snByac";

// MESSAGE ACTION TYPES
// (KEEP UPDATED WITH OTHER JS FILES THAT NEEDS THEM)
const actions = {
  START_MEETING: "START_MEETING",
  END_MEETING: "END_MEETING",
  PERSON_ENTERED: "PERSON_ENTERED",
  PERSON_LEFT: "PERSON_LEFT",
  CHANGE_MEETING_NAME: "CHANGE_MEETING_NAME",
  SAVE_TAB_ID: "SAVE_TAB_ID",
};

/**
 * Callback function to execute when mutations are observed
 * @param {MutationRecord} mutations
 * @param {MutationObserver} observer
  */
const callback = (mutationsList, observer) => {
  for (let mutation of mutationsList) {
    if (mutation.type === "childList") {
      const addedNodes = mutation.addedNodes;
      if (addedNodes.length && addedNodes[0].innerText !== undefined) {
        let innerText = addedNodes[0].innerText;
        if (innerText.includes(" joined")) {
          // Someone has joined the conversation
          innerText = innerText.replace(" joined", "");
          chrome.runtime.sendMessage({
            action: actions.PERSON_ENTERED,
            data: innerText,
          });
        } else if (innerText.includes(" has left the meeting")) {
          // Someone has left the conversation
          innerText = innerText.replace(" has left the meeting", "");
          chrome.runtime.sendMessage({
            action: actions.PERSON_LEFT,
            data: innerText,
          });
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

/**
 * Add text input for Meeting name
 */
const addInputMeetingName = () => {
  let parent = document.querySelector(INPUT_NAME_PARENT_NODE);
  let node = document.createElement("INPUT");
  node.placeholder = "Meeting Name";
  node.type = "text";
  node.id = "meeting-name-id";
  node.style = `
    text-align:center;
    font-size:1.75rem;
    font-family:'Google Sans',Roboto,Arial,sans-serif;
  `;
  node.addEventListener("blur", (e) => {
    chrome.runtime.sendMessage({
      action: actions.CHANGE_MEETING_NAME,
      data: e.target.value || "",
    });
  });
  parent.appendChild(node);
};


/**
 * Event listeners for JOIN and END meeting buttons
 * */
checkStartEndMeeting = () => {
  const eventTypes = ["mousedown", "touchstart"];
  eventTypes.forEach((event) => {
    document.body.addEventListener(`${event}`, (e) => {
      switch (e.target.className) {
        case START_MEETING_CLASSNAME:
        case START_WRAPPER_CLASSNAME:
          if (e.target.innerText in ["Join now", "Present"]) {
            const meetingName = document.getElementById("meeting-name-id")
              .value;
            chrome.runtime.sendMessage({
              action: actions.START_MEETING,
              data: meetingName,
            });
            saveTabId();
          }
          break;
        case END_MEETING_CLASSNAME:
          if (
            e.target.parentElement.getAttribute("aria-label") === "Leave call"
          ) {
            chrome.runtime.sendMessage({ action: actions.END_MEETING });
          }
          break;
        default:
          break;
      }
    },false);
  });
};

/**
 * Saves tab id for the meeting room
 */
saveTabId = () => {
  chrome.runtime.sendMessage({ action: actions.SAVE_TAB_ID });
};

// All js that need the page loaded first.
window.addEventListener("load", () => {
  addInputMeetingName();
  checkStartEndMeeting();
});
