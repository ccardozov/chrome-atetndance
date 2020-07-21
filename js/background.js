// MESSAGE ACTION TYPES
// (KEEP UPDATED WITH OTHER JS)
const actions = {
  START_MEETING: "START_MEETING",
  END_MEETING: "END_MEETING",
  PERSON_ENTERED: "PERSON_ENTERED",
  PERSON_LEFT: "PERSON_LEFT",
  CHANGE_MEETING_NAME: "CHANGE_MEETING_NAME",
  SAVE_TAB_ID: "SAVE_TAB_ID",
};

//I18N constants

const strStartTime = chrome.i18n.getMessage("strStartTime");
const strEndTime = chrome.i18n.getMessage("strEndTime");
const strHeaders = chrome.i18n.getMessage("strHeaders");

// ***********************************************************
// *************** HELPER FUNCTIONS **************************
// ***********************************************************

/**
 * Downloads as <filename>.csv file the <text>
 * @param {string} text file contents
 * @param {string} filename name of the file
 */
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

/**
 * Process results from the meeting contained in results
 * @param {object} result of all meeting attendance
 * @return {array} <csv> which is the contents of the csv
 *                 generated file
 *                 <MeetingName> which is the name of the file.
 */
function processResult(result) {
  const meeting = result.meeting;
  const sTime = new Date(meeting.startTimestamp);
  const eTime = new Date(meeting.endTimestamp);
  let csv = `${meeting.name};\n`;
  csv += `${strStartTime}:${sTime.toLocaleString()};`;
  csv += `${strEndTime}:${eTime.toLocaleString()};\n`;
  csv += strHeaders;
  
  for (const [person, attendance] of Object.entries(
    meeting.attendance
  ).sort()) {
    const firstName = `${person.split(" ")[0]}`;
    const lastName = `${person.split(" ")[1] || ""}`;
    const ins = attendance.in || [];
    const outs = attendance.out || [];
    let maxTime = Number.NEGATIVE_INFINITY;
    let totalTime = 0;
    let numExits = 0;

    if (ins.length > outs.length) {
      outs.push(eTime.toUTCString()); //Add as out the meeting end time
    } else if (ins.length < outs.length) {
      ins.unsift(sTime.toUTCString()); //Add in since the person was already in
    }

    const len = Math.min(ins.length, outs.length);
    const firstEntry = new Date(ins[0]).toLocaleTimeString();
    const lastExit = new Date(outs[outs.length - 1]).toLocaleTimeString();
    let i = 0; // Ins index
    let j = 0; // Outs index
    for (let i = 0, j = 0; i < ins.length, j < outs.length; i++, j++) {
      let inTimestamp = new Date(ins[i]);
      let outTimestamp = new Date(outs[i]);
      if (inTimestamp > outTimestamp) {
        inTimestamp = sTime;
        i--;
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

/**
 * Gets the "meeting" object to process and download once
 * the meeting is finished.
 */
function generateCsvFileAndDownload() {
  chrome.storage.local.get("meeting", function (result) {
    const [csv, meetingName] = processResult(result);
    downloadAttendance(csv, meetingName);
  });
}

/**
 * Create an attendance record in the "meeting" object
 * stored in the storage.local.
 * @param {string} type of record "in" or "out"
 * @param {string} person that entered/left the meeting room
 */
function addAttendanceRecord(type, person) {
  chrome.storage.local.get(["meeting"], (result) => {
    let newAttendance = result.meeting.attendance;
    const timestamp = new Date().toUTCString();
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

// ******************************************
// ************ LISTENERS *******************
// ******************************************

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

/**
 * Check for messages sent from content scripts
 */
chrome.runtime.onMessage.addListener(function (message, sender) {
  switch (message.action) {
    case actions.START_MEETING:
      chrome.storage.local.clear();
      chrome.storage.local.set({
        meeting: {
          name: message.data || chrome.i18n.getMessage("defaultMeetName"),
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
        chrome.storage.local.set({ meeting: result.meeting }, () => {
          generateCsvFileAndDownload();
          chrome.storage.sync.clear();
        });
      });
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

/**
 * Function to listen to tab close and
 * ask to save attendance
 */
chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
  chrome.storage.sync.get("tabId", (result) => {
    if (result && tabId === result.tabId) {
      if (confirm(chrome.i18n.getMessage("confirmSaveMessage"))) {
        chrome.storage.local.get("meeting", (result) => {
          Object.assign(result.meeting, {
            endTimestamp: new Date().toUTCString(),
          });
          chrome.storage.local.set({ meeting: result.meeting }, () => {
            generateCsvFileAndDownload();
          });
        });
      }
    }
  });
});
