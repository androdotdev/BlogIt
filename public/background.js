/* BlogIt background service worker: keyboard shortcut bridge. */

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'toggle-reader') return

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab || tab.id === undefined) return

  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'BLOGIT_TOGGLE' })
    return
  } catch {
    // No content script yet — inject it into this tab on demand.
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js'],
    })
    await chrome.tabs.sendMessage(tab.id, { type: 'BLOGIT_TOGGLE' })
  } catch {
    // The page has no content script (chrome:// pages, the Web Store, etc.).
    // Flash the badge so the shortcut still feels intentional.
    await chrome.action.setBadgeBackgroundColor({ color: '#B5562F' })
    await chrome.action.setBadgeText({ text: '—' })
    setTimeout(() => chrome.action.setBadgeText({ text: '' }), 1400)
  }
})
