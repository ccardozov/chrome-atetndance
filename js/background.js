const actions = {
  START_MEETING: "START_MEETING",
  END_MEETING: "END_MEETING",
  PERSON_ENTERED: "PERSON_ENTERED",
  PERSON_LEFT: "PERSON_LEFT",
  CHANGE_MEETING_NAME: "CHANGE_MEETING_NAME",
  SAVE_TAB_ID: "SAVE_TAB_ID",
};

// *************** HELPER FUNCTIONS **************************
function downloadAttendance(text, filename = "attendance") {
  var element = document.createElement("a");
  element.setAttribute(
    "href",
    "data:text/csv;charset=utf-8," + encodeURIComponent(text)
  );
  const csvFilename = `${filename}_${new Date()
    .toLocaleDateString()
    .replace(/\//g, "-")}.csv`;
  element.setAttribute("download", csvFilename);
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

function processResult(result) {
  const meeting = result.meeting;
  const sTime = new Date(meeting.startTimestamp);
  const eTime = new Date(meeting.endTimestamp);
  let csv = `${meeting.name};\n`;
  csv += `Start Time:${sTime.toLocaleString()};`;
  csv += `End Time:${sTime.toLocaleString()};\n`;
  csv += "Name;Surname;Total Time;Max Time;";
  csv += "First Entry;Last Exit;N° Entries;N° Exists;\n";

  for (const [person, attendance] of Object.entries(
    meeting.attendance
  ).sort()) {
    const firstName = `${person.split(" ")[0]}`;
    const lastName = `${person.split(" ")[1] || ""}`;
    const ins = attendance.in || [];
    const outs = attendance.out || [];
    const len = Math.min(ins.length, outs.length);
    let maxTime = Number.NEGATIVE_INFINITY;
    const firstEntry = new Date(ins[0]).toLocaleTimeString();
    const lastExit = new Date(outs[outs.length - 1]).toLocaleTimeString();
    let totalTime = 0;
    let numExits = 0;

    for (let i = 0; i < len; i++) {
      let inTimestamp = new Date(ins[i]);
      let outTimestamp = new Date(outs[i]);
      if (inTimestamp > outTimestamp) {
        outs.splice(i, 1);
        outTimestamp = outs[i] ? new Date(outs[i]) : new Date();
      }
      const timeOnline = (outTimestamp - inTimestamp) / 1000;
      maxTime = Math.max(timeOnline, maxTime);
      totalTime += timeOnline;
    }

    csv += `${firstName};${lastName};`;
    csv += `${totalTime};${maxTime};`;
    csv += `${firstEntry};${lastExit};`;
    csv += `${ins.length};${outs.length};\n`;
  }
  return [csv, meeting.name];
}

function generateCsvFileAndDownload() {
  chrome.storage.local.get("meeting", function (result) {
    const [csv, meetingName] = processResult(result);
    downloadAttendance(csv, meetingName);
  });
}

function addAttendanceRecord(type, person) {
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
    chrome.storage.local.set({ meeting: result.meeting });
  });
}

// ************ LISTENERS *******************
chrome.runtime.onInstalled.addListener(function (details) {
  var rules = [
    {
      // Activate Attendance when url is on google meet
      conditions: [
        new chrome.declarativeContent.PageStateMatcher({
          pageUrl: { hostEquals: "meet.google.com", schemes: ["https"] },
        }),
      ],
      actions: [new chrome.declarativeContent.ShowPageAction()],
    },
  ];

  chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
    chrome.declarativeContent.onPageChanged.addRules(rules);
  });
});

/// Check for messages sent from content scripts
chrome.runtime.onMessage.addListener(function (message, sender) {
  switch (message.action) {
    case actions.START_MEETING:
      chrome.storage.local.clear();
      chrome.storage.local.set({
        meeting: {
          name: message.data || "MyMeeting",
          startTimestamp: new Date().toUTCString(),
          attendance: {},
        },
      });
      break;
    case actions.END_MEETING:
      chrome.storage.local.get("meeting", (result) => {
        Object.assign(result.meeting, {
          endTimestamp: new Date().toUTCString(),
        });
        chrome.storage.local.set({ meeting: result.meeting });
      });
      generateCsvFileAndDownload();
      break;
    case actions.PERSON_ENTERED:
      addAttendanceRecord("in", message.data);
      break;
    case actions.PERSON_LEFT:
      addAttendanceRecord("out", message.data);
      break;
    case actions.CHANGE_MEETING_NAME:
      chrome.storage.local.get("meeting", (result) => {
        Object.assign(result.meeting, { name: message.data });
        chrome.storage.local.set({ meeting: result.meeting });
      });
      break;
    case actions.SAVE_TAB_ID:
      chrome.storage.sync.set({ tabId: sender.tab.id });
      break;
    default:
      break;
  }
});

// As to save attendance on tab close
chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
  chrome.storage.sync.get("tabId", (result) => {
    const confirmMessage = "Do you want to save the meeting attendance?";
    if (tabId === result.tabId && confirm(confirmMessage)) {
      chrome.storage.local.get("meeting", (result) => {
        Object.assign(result.meeting, {
          endTimestamp: new Date().toUTCString(),
        });
        chrome.storage.local.set({ meeting: result.meeting }, () => {
          generateCsvFileAndDownload();
        });
      });
    }
  });
});
