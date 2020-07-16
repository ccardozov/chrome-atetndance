const actions = {
  START_MEETING: "START_MEETING",
  END_MEETING: "END_MEETING",
  PERSON_ENTERED: "PERSON_ENTERED",
  PERSON_LEFT: "PERSON_LEFT"
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

function generateCsvFileAndDownload() {
  chrome.storage.local.get("meeting", function (result) {
    let meeting = result.meeting;
    let csvText = `${meeting.name};\n${meeting.time}\n`;
    for (const [person, attendance] of Object.entries(meeting.attendance)) {
      csvText += `${person};`;
      let len = Math.min(attendance.in.length, attendance.out.length);
      for (let i = 0; i < len; i++) {
        let inTime = new Date(attendance.in[i]);
        let outTime = new Date(attendance.out[i]);
        csvText += `IN:${inTime};OUT:${outTime};`;
      }
      csvText += "\n";
    }
    downloadAttendance(csvText, meeting.name);
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
};




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

///Check for messages sent from content scripts
const START_MEETING = "START_MEETING";
const END_MEETING = "END_MEETING";
chrome.runtime.onMessage.addListener(function (message) {
  switch (message.action) {
    case actions.START_MEETING:
      chrome.storage.local.clear();
      chrome.storage.local.set({
        meeting: {
          name: message.data,
          time: new Date().toLocaleString(),
          attendance: {},
        },
      });
      break;
    case actions.END_MEETING:
      generateCsvFileAndDownload();
      break;
    case actions.PERSON_ENTERED:
      addAttendanceRecord("in", message.data);
      break;
    case actions.PERSON_LEFT:
      addAttendanceRecord("out", message.data);
      break;
    default:
      break;
  }
});
