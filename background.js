// UPtool Background Service Worker - Website Blocker
console.log('UPtool background service worker started');

let isBlockingEnabled = false;
let blockedSites = [];

// Daily stats tracking
let dailyStats = {
    date: null,
    blockedAttempts: 0,
    timeSaved: 0
};

// Initialize on extension startup
chrome.runtime.onStartup.addListener(initializeBlocker);
chrome.runtime.onInstalled.addListener(initializeBlocker);

async function initializeBlocker() {
    console.log('Initializing UPtool website blocker...');
    
    // Load settings from storage
    const result = await chrome.storage.local.get(['isBlockingEnabled', 'blockedSites', 'dailyStats']);
    isBlockingEnabled = result.isBlockingEnabled || false;
    blockedSites = result.blockedSites || [];
    dailyStats = result.dailyStats || { date: null, blockedAttempts: 0, timeSaved: 0 };
    
    // Reset daily stats if it's a new day
    const today = new Date().toDateString();
    if (dailyStats.date !== today) {
        console.log('New day detected, resetting daily stats');
        dailyStats = {
            date: today,
            blockedAttempts: 0,
            timeSaved: 0
        };
        await chrome.storage.local.set({ dailyStats });
    }
    
    // Update blocking rules
    await updateBlockingRules();
    
    console.log(`Website blocker initialized. Blocking: ${isBlockingEnabled}, Sites: ${blockedSites.length}`);
}

// Listen for storage changes from the UI
chrome.storage.onChanged.addListener(async (changes, namespace) => {
    if (namespace === 'local') {
        let needsUpdate = false;
        
        if (changes.isBlockingEnabled) {
            isBlockingEnabled = changes.isBlockingEnabled.newValue;
            needsUpdate = true;
            console.log(`Blocking toggled: ${isBlockingEnabled}`);
        }
        
        if (changes.blockedSites) {
            blockedSites = changes.blockedSites.newValue || [];
            needsUpdate = true;
            console.log(`Blocked sites updated: ${blockedSites.length} sites`);
        }
        
        if (needsUpdate) {
            await updateBlockingRules();
        }
    }
});

// Function to increment daily stats when a site is blocked
async function incrementBlockedStats() {
    const today = new Date().toDateString();
    
    // Reset stats if it's a new day
    if (dailyStats.date !== today) {
        dailyStats = {
            date: today,
            blockedAttempts: 0,
            timeSaved: 0
        };
    }
    
    // Increment stats
    dailyStats.blockedAttempts += 1;
    dailyStats.timeSaved += 5; // Add 5 minutes per block
    
    // Save to storage
    await chrome.storage.local.set({ dailyStats });
    
    console.log(`Updated daily stats: ${dailyStats.blockedAttempts} blocks, ${dailyStats.timeSaved} minutes saved`);
    
    return dailyStats;
}

// Update declarativeNetRequest rules
async function updateBlockingRules() {
    try {
        // Clear existing rules
        const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
        const ruleIdsToRemove = existingRules.map(rule => rule.id);
        
        if (ruleIdsToRemove.length > 0) {
            await chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: ruleIdsToRemove
            });
        }
        
        // Add new rules if blocking is enabled
        if (isBlockingEnabled && blockedSites.length > 0) {
            const rulesToAdd = [];
            let ruleIdCounter = 1;
            
            blockedSites.forEach((site, index) => {
                // Clean the URL - remove protocol and www
                const cleanSite = site.replace(/^(https?:\/\/)?(www\.)?/, '').toLowerCase();
                
                // Rule 1: Block the main domain (e.g., facebook.com/*)
                rulesToAdd.push({
                    id: ruleIdCounter++,
                    priority: 1,
                    action: {
                        type: 'redirect',
                        redirect: {
                            url: chrome.runtime.getURL('blocked.html') + '?site=' + encodeURIComponent(cleanSite)
                        }
                    },
                    condition: {
                        urlFilter: `*://${cleanSite}/*`,
                        resourceTypes: ['main_frame']
                    }
                });
                
                // Rule 2: Block with www prefix (e.g., www.facebook.com/*)
                rulesToAdd.push({
                    id: ruleIdCounter++,
                    priority: 1,
                    action: {
                        type: 'redirect',
                        redirect: {
                            url: chrome.runtime.getURL('blocked.html') + '?site=' + encodeURIComponent(cleanSite)
                        }
                    },
                    condition: {
                        urlFilter: `*://www.${cleanSite}/*`,
                        resourceTypes: ['main_frame']
                    }
                });
                
                // Rule 3: Block subdomains (e.g., m.facebook.com/*)
                rulesToAdd.push({
                    id: ruleIdCounter++,
                    priority: 1,
                    action: {
                        type: 'redirect',
                        redirect: {
                            url: chrome.runtime.getURL('blocked.html') + '?site=' + encodeURIComponent(cleanSite)
                        }
                    },
                    condition: {
                        urlFilter: `*://*.${cleanSite}/*`,
                        resourceTypes: ['main_frame']
                    }
                });
            });
            
            await chrome.declarativeNetRequest.updateDynamicRules({
                addRules: rulesToAdd
            });
            
            console.log(`Added ${rulesToAdd.length} blocking rules for ${blockedSites.length} sites`);
        }
    } catch (error) {
        console.error('Failed to update blocking rules:', error);
    }
}

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Message received in background script');
    console.log('Action:', request.action);
    console.log('Full request:', JSON.stringify(request));
    console.log('Sender:', JSON.stringify(sender));
    
    try {
        if (request.action === 'getBlockingStatus') {
            sendResponse({
                isBlockingEnabled: isBlockingEnabled,
                blockedSites: blockedSites,
                dailyStats: dailyStats
            });
            return false; // Synchronous response
        } else if (request.action === 'updateBlockingStatus') {
            console.log('Received blocking status update from UI:', request.isBlockingEnabled);
            isBlockingEnabled = request.isBlockingEnabled;
            if (request.blockedSites) {
                blockedSites = request.blockedSites;
            }
            updateBlockingRules().then(() => {
                sendResponse({ success: true });
            }).catch(error => {
                console.error('Error updating blocking rules:', error);
                sendResponse({ success: false, error: error.message });
            });
            return true; // Asynchronous response
        } else if (request.action === 'updateBlockedSites') {
            console.log('Received blocked sites update from UI:', request.blockedSites);
            blockedSites = request.blockedSites || [];
            if (request.isBlockingEnabled !== undefined) {
                isBlockingEnabled = request.isBlockingEnabled;
            }
            updateBlockingRules().then(() => {
                sendResponse({ success: true });
            }).catch(error => {
                console.error('Error updating blocked sites:', error);
                sendResponse({ success: false, error: error.message });
            });
            return true; // Asynchronous response
        } else if (request.action === 'siteBlocked') {
            // Handle when a site is actually blocked (accessed)
            console.log('Site blocked:', request.site);
            incrementBlockedStats().then(stats => {
                sendResponse({ success: true, dailyStats: stats });
            }).catch(error => {
                console.error('Error incrementing stats:', error);
                sendResponse({ success: false, error: error.message });
            });
            return true; // Asynchronous response
        } else if (request.action === 'getDailyStats') {
            // Get current daily stats
            sendResponse({ dailyStats: dailyStats });
            return false; // Synchronous response
        } else if (request.action === 'disableBlocking') {
            // Handle disable blocking request from blocked page
            isBlockingEnabled = false;
            chrome.storage.local.set({ isBlockingEnabled: false }).then(() => {
                return updateBlockingRules();
            }).then(() => {
                sendResponse({ success: true });
            }).catch(error => {
                console.error('Error disabling blocking:', error);
                sendResponse({ success: false, error: error.message });
            });
            return true; // Asynchronous response
        } else if (request.action === 'temporaryDisable') {
            // Handle temporary disable (for breaks)
            console.log('Temporary disable requested for:', request.duration, 'ms');
            isBlockingEnabled = false;
            updateBlockingRules().then(() => {
                // Re-enable after specified duration
                setTimeout(async () => {
                    try {
                        const result = await chrome.storage.local.get(['isBlockingEnabled']);
                        if (result.isBlockingEnabled) {
                            isBlockingEnabled = true;
                            await updateBlockingRules();
                            console.log('Blocking re-enabled after temporary disable');
                        }
                    } catch (error) {
                        console.error('Error re-enabling blocking:', error);
                    }
                }, request.duration);
                
                sendResponse({ success: true });
            }).catch(error => {
                console.error('Error in temporary disable:', error);
                sendResponse({ success: false, error: error.message });
            });
            return true; // Asynchronous response
        } else if (request.action === 'openNewTab') {
            // Handle opening new tab request from blocked page
            console.log('🔄 OpenNewTab request received');
            console.log('Request details:', JSON.stringify(request));
            console.log('Sender details:', JSON.stringify(sender));
            
            const targetUrl = request.url || 'chrome://newtab/';
            console.log('Target URL:', targetUrl);
            
            try {
                console.log('Attempting to create tab...');
                chrome.tabs.create({ url: targetUrl }, function(tab) {
                    console.log('chrome.tabs.create callback called');
                    if (chrome.runtime.lastError) {
                        console.error('❌ Error creating new tab:', chrome.runtime.lastError.message);
                        sendResponse({ success: false, error: chrome.runtime.lastError.message });
                    } else {
                        console.log('✅ New tab created successfully:', tab);
                        sendResponse({ success: true, tabId: tab.id });
                    }
                });
            } catch (error) {
                console.error('❌ Exception in openNewTab:', error);
                sendResponse({ success: false, error: error.message });
            }
            return true; // Asynchronous response
        } else {
            // Unknown action
            sendResponse({ success: false, error: 'Unknown action: ' + request.action });
            return false;
        }
    } catch (error) {
        console.error('Error in message handler:', error);
        sendResponse({ success: false, error: error.message });
        return false;
    }
});
