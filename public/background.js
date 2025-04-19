// Background script for Quizzer extension
chrome.action.onClicked.addListener((tab) => {
  // Open the side panel when the extension icon is clicked
  chrome.sidePanel.open({ tabId: tab.id });
}); 