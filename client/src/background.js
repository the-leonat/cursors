// this is the background code...

function injectFn(tabId) {
    chrome.tabs.executeScript(tabId, {
        file: "inject.js",
    });
}
const injectedTabIds = new Set();
// listen for our browerAction to be clicked
chrome.browserAction.onClicked.addListener(function (tab) {
    // for the current tab, inject the "inject.js" file & execute it
    console.log("inject");
    injectFn(tab.id);
    injectedTabIds.add(tab.id);
});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo.status == "complete" && injectedTabIds.has(tabId)) {
        injectFn(tab.id);
        // do your things
    }
});
