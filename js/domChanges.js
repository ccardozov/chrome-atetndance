// Callback function to execute when mutations are observed
const callback = function (mutationsList, observer) {
  for (let mutation of mutationsList) {
    if (mutation.type === "childList") {
      const addedNodes = mutation.addedNodes;
      if (addedNodes.length && addedNodes[0].innerText !== undefined) {
        const innerText = addedNodes[0].innerText;
        if( innerText.includes(" joined") || innerText.includes(" has left the meeting")){
          console.log(mutation.addedNodes[0].innerText);
        }
      }
    }
  }
};

// Create an observer instance linked to the callback function
const observer = new MutationObserver(callback);

// Select the node that will be observed for mutations
const targetNode = document.body;

// const inNode = document.querySelector('div[aria-live="assertive"]');
// const outNode = document.querySelector("div[aria-live='polite']");
// Options for the observer (which mutations to observe)
var config = { childList: true, subtree: true };

observer.observe(targetNode, config);

// Start observing the target node for configured mutations
// observer.observe(inNode, config);
// observer.observe(outNode, config);

// // Later, you can stop observing
// observer.disconnect();
