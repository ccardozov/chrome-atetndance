const END_MEETING_BUTTON = "span.I5fjHe.wb61gb";
const START_MEETING_BUTTON = "span.l4V7wb.Fxmcue";
const PARENT_NODE_INPUT_NAME = "div.qIHHZb";

const END_MEETING_CLASSNAME = "I5fjHe wb61gb";
const START_MEETING_CLASSNAME = "NPEfkd RveJvd snByac";
const START_WRAPPER_CLASSNAME = "l4V7wb Fxmcue";

const START_MEETING = "START_MEETING";
const END_MEETING = "END_MEETING";

const addAttendanceRecord = (type, person) => {
  chrome.storage.local.get(["meeting"], (result) => {
    let newAttendance = result.meeting.attendance;
    const timestamp = new Date().toGMTString();
    if (newAttendance.hasOwnProperty(person)) {
      if (newAttendance[person].hasOwnProperty(type)) {
        newAttendance[person][type].push(timestamp);
      } else {
        newAttendance[person][type] = [timestamp];
      }
    } else {
      newAttendance[person] = { [type]: [timestamp] };
    }

    Object.assign(result.meeting.attendance, newAttendance);
    chrome.storage.local.set({ meeting: result.meeting }, () => {
      chrome.storage.local.get("meeting", (result) => {
        console.log(result.meeting);
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
  let parent = document.querySelector(PARENT_NODE_INPUT_NAME);
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
  const buttons = document.querySelectorAll(START_MEETING_BUTTON);
  buttons.forEach((button) => {
    button.addEventListener("mousedown", () => {
      const meetingName = document.getElementById("meeting-name-id").value;
      chrome.storage.local.set({
        meeting: {
          name: meetingName,
          time: new Date().toLocaleString(),
          attendance: {},
        },
      });
    });
  });
};

const clearMeetingStorage = () => {
  chrome.storage.local.clear(() =>
    console.log("<<< Storage.local CLEARED >>>")
  );
};


checkStartEndMeeting = () => {
  const eventTypes = ["mousedown", "touchstart"];
  eventTypes.forEach((event) => {
    document.body.addEventListener(`${event}`, (e) => {

      switch (e.target.className) {
        case START_MEETING_CLASSNAME:
        case START_WRAPPER_CLASSNAME:
          chrome.runtime.sendMessage(START_MEETING);
          break;
        case END_MEETING_CLASSNAME:
          if(e.target.parentElement.getAttribute('aria-label') === "Leave call"){
            chrome.runtime.sendMessage(END_MEETING);
          }
          break;
          default:
          break;
      }
    });
  });
};

// All js that need the page loaded first.
window.addEventListener("load", () => {
  addInputMeetingName();
  clearMeetingStorage();
  listenToJoinButtons();
  checkStartEndMeeting();
});
