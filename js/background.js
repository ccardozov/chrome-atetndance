function generateCsvFile(attendanceList) {
  let csvText = "";
  attendanceList.array.forEach((io, person) => {
    csvText += `${person};${io}\n`;
  });
}

function downloadAttendance(filename = "attendance.csv", text) {
  var element = document.createElement("a");
  element.setAttribute(
    "href",
    "data:text/csv;charset=utf-8," + encodeURIComponent(text)
  );
  element.setAttribute("download", filename);
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

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

chrome.runtime.onMessage.addListener(function (message) {
  console.log(`This is the message: ${message}`);
});