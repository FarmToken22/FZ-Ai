// bonus.js - Bonus Section Module (Fixed & Improved)
import { auth, database } from './config.js';
import { ref, update, runTransaction } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

// ========================================
// CONSTANTS
// ========================================
const BONUS_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
const STREAK_BREAK_THRESHOLD = 48 * 60 * 60 * 1000; // 48 hours
const MAX_HISTORY = 50; // Limit history
const dailyRewards = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 5, 5, 5, 5, 7];

let bonusTimerInterval = null;

// ========================================
// DYNAMIC SECTION RENDERING
// ========================================
export function renderBonusSection() {
    const container = document.getElementById('bonusSection');
    if (!container) {
        console.error('Bonus section container not found');
        return;
    }
    
    container.innerHTML = `
        <div class="p-3 sm:p-4 max-w-lg mx-auto w-full pb-20">
            <div class="bg-white shadow rounded-xl p-4 sm:p-6 text-center">
                <h2 class="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Daily Streak Bonus</h2>
                <p class="text-gray-500 mb-6">Claim every 24 hours to grow your streak!</p>
                
                <div class="bg-yellow-50 border-2 border-dashed border-yellow-300 rounded-xl p-6 mb-5">
                    <p class="text-yellow-600 font-semibold">Next Reward (After Claim)</p>
                    <p id="nextBonusAmount" class="text-4xl font-bold text-yellow-800 my-2">Gift -- FZ</p>
                    <p id="bonusStreakDisplay" class="text-sm text-yellow-700">Current Streak: 0 day(s)</p>
                </div>
                
                <button id="claimBonusBtn" class="w-full bg-yellow-500 text-white py-3 rounded-lg shadow text-base font-semibold hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    <span id="claimBtnText">Claim Bonus</span>
                    <span id="claimLoader" class="hidden">
                        <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </span>
                </button>
                <div id="bonusTimer" class="mt-4 text-gray-600 font-medium"></div>
                <p id="bonusStatus" class="status text-center mt-2"></p>
            </div>
            
            <!-- Bonus History -->
            <div class="bg-white shadow rounded-xl p-4 sm:p-6 mt-4">
                <h3 class="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Bonus History
                </h3>
                <div id="bonusHistory" class="space-y-2 max-h-48 overflow-y-auto">
                    <p class="text-gray-500 text-sm text-center py-4">No claims yet. Start your streak!</p>
                </div>
            </div>
            
            <!-- Info -->
            <div class="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-500 rounded-lg p-4 mt-4">
                <h4 class="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    How It Works
                </h4>
                <ul class="text-sm text-gray-600 space-y-1">
                    <li class="flex items-start gap-2"><span class="text-yellow-500 font-bold">•</span><span>Claim every 24 hours to increase streak.</span></li>
                    <li class="flex items-start gap-2"><span class="text-yellow-500 font-bold">•</span><span>Miss >48 hours → streak resets to 0.</span></li>
                    <li class="flex items-start gap-2"><span class="text-yellow-500 font-bold">•</span><span>Rewards cap at day 30.</span></li>
                </ul>
            </div>
        </div>
    `;
    
    console.log('Bonus section rendered');
}

// ========================================
// BONUS STATE LOGIC
// ========================================
function getBonusState(userData, getServerTime) {
    if (!userData || typeof getServerTime !== 'function') {
        return { isAvailable: false, currentStreak: 0, nextBonusAmount: 1, timeUntilNextBonus: BONUS_INTERVAL };
    }

    const now = getServerTime();
    const lastClaim = userData.lastBonusClaim || 0;
    const streak = userData.bonusStreak || 0;

    const timeSinceLastClaim = now - lastClaim;
    const isAvailable = timeSinceLastClaim >= BONUS_INTERVAL;
    const isStreakBroken = timeSinceLastClaim >= STREAK_BREAK_THRESHOLD;

    const currentStreak = isStreakBroken ? 0 : streak;
    const nextStreak = isAvailable ? currentStreak + 1 : currentStreak;
    const nextBonusAmount = dailyRewards[Math.min(nextStreak - 1, dailyRewards.length - 1)];

    return {
        isAvailable,
        currentStreak,
        nextStreak,
        nextBonusAmount,
        timeUntilNextBonus: Math.max(0, (lastClaim + BONUS_INTERVAL) - now)
    };
}

export function isBonusAvailable(userData, getServerTime) {
    return getBonusState(userData, getServerTime).isAvailable;
}

export function getTimeUntilNextBonus(userData, getServerTime) {
    return getBonusState(userData, getServerTime).timeUntilNextBonus;
}

// ========================================
// TIMER UPDATE
// ========================================
export function updateBonusTimer(userData, getServerTime) {
    const timerEl = document.getElementById('bonusTimer');
    const claimBtn = document.getElementById('claimBonusBtn');
    const nextBonusAmountEl = document.getElementById('nextBonusAmount');
    const streakDisplayEl = document.getElementById('bonusStreakDisplay');

    if (!timerEl || !claimBtn || !nextBonusAmountEl || !streakDisplayEl) return;

    if (bonusTimerInterval) clearInterval(bonusTimerInterval);

    const update = () => {
        const state = getBonusState(userData, getServerTime);

        nextBonusAmountEl.innerHTML = `Gift ${state.nextBonusAmount} FZ`;
        streakDisplayEl.textContent = `Current Streak: ${state.currentStreak} day${state.currentStreak !== 1 ? 's' : ''}`;

        if (state.isAvailable) {
            timerEl.innerHTML = `<span class="text-green-600 font-bold">Bonus Ready!</span>`;
            claimBtn.disabled = false;
            clearInterval(bonusTimerInterval);
            bonusTimerInterval = null;
        } else {
            const remaining = state.timeUntilNextBonus;
            const h = String(Math.floor(remaining / 3600000)).padStart(2, '0');
            const m = String(Math.floor((remaining % 3600000) / 60000)).padStart(2, '0');
            const s = String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0');

            timerEl.innerHTML = `
                <span class="inline-flex items-center gap-2 text-gray-600">
                    <svg class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                    </svg>
                    Next: <strong>${h}h ${m}m ${s}s</strong>
                </span>
            `;
            claimBtn.disabled = true;
        }
    };

    update();
    if (!getBonusState(userData, getServerTime).isAvailable) {
        bonusTimerInterval = setInterval(update, 1000);
    }
}

// ========================================
// HISTORY UPDATE
// ========================================
function updateBonusHistory(userData) {
    const historyEl = document.getElementById('bonusHistory');
    if (!historyEl) return;

    const history = (userData.bonusHistory || []).slice(-MAX_HISTORY).reverse();

    if (history.length === 0) {
        historyEl.innerHTML = `<p class="text-gray-500 text-sm text-center py-4">No claims yet. Start now!</p>`;
        return;
    }

    historyEl.innerHTML = history.map(claim => {
        const date = new Date(claim.timestamp);
        const fmt = date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        return `
            <div class="flex justify-between items-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div class="flex items-center gap-3">
                    <div class="bg-yellow-500 text-white rounded-full p-1.5">
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/></svg>
                    </div>
                    <div>
                        <p class="font-semibold text-gray-800">+${claim.amount} FZ</p>
                        <p class="text-xs text-gray-500">${fmt}</p>
                    </div>
                </div>
                <span class="text-green-600 font-bold">Checkmark</span>
            </div>
        `;
    }).join('');
}

// ========================================
// CLAIM BONUS (SECURE TRANSACTION)
// ========================================
export async function claimBonus(currentUser, userData, getServerTime, showNotification, showAdModal) {
    const statusEl = document.getElementById('bonusStatus');
    const claimBtn = document.getElementById('claimBonusBtn');
    const btnText = document.getElementById('claimBtnText');
    const loader = document.getElementById('claimLoader');

    if (!currentUser || !userData) return;

    const state = getBonusState(userData, getServerTime);
    if (!state.isAvailable) {
        showStatus(statusEl, 'Bonus not ready yet', true);
        return;
    }

    claimBtn.disabled = true;
    btnText.classList.add('hidden');
    loader.classList.remove('hidden');

    try {
        const userRef = ref(database, `users/${currentUser.uid}`);
        const now = getServerTime();
        const bonusAmount = state.nextBonusAmount;
        const newStreak = state.currentStreak + 1;

        await runTransaction(userRef, (currentData) => {
            if (!currentData) return currentData;

            const last = currentData.lastBonusClaim || 0;
            const timeDiff = now - last;

            if (timeDiff < BONUS_INTERVAL) return currentData;
            if (timeDiff >= STREAK_BREAK_THRESHOLD) {
                currentData.bonusStreak = 0;
            }

            const history = (currentData.bonusHistory || []).slice(-MAX_HISTORY + 1);
            history.push({ amount: bonusAmount, timestamp: now });

            currentData.balance = (currentData.balance || 0) + bonusAmount;
            currentData.lastBonusClaim = now;
            currentData.bonusStreak = (currentData.bonusStreak || 0) + 1;
            currentData.bonusHistory = history;

            return currentData;
        });

        const updated = { ...userData, balance: userData.balance + bonusAmount, lastBonusClaim: now, bonusStreak: newStreak };
        updateBonusHistory(updated);
        updateBonusTimer(updated, getServerTime);

        showStatus(statusEl, `Claimed ${bonusAmount} FZ! Streak: ${newStreak}`, false);
        showNotification(`+${bonusAmount} FZ Bonus!`, 'success');

        if (showAdModal) setTimeout(showAdModal, 500);

    } catch (error) {
        console.error('Claim failed:', error);
        showStatus(statusEl, 'Claim failed. Try again.', true);
    } finally {
        claimBtn.disabled = false;
        btnText.classList.remove('hidden');
        loader.classList.add('hidden');
    }
}

// ========================================
// UTILITIES
// ========================================
function showStatus(el, message, isError = false) {
    if (!el) return;
    el.textContent = message;
    el.className = `status text-center mt-2 ${isError ? 'text-red-600' : 'text-green-600'} font-medium`;
    setTimeout(() => el.className = 'status', 4000);
}

export function cleanupBonus() {
    if (bonusTimerInterval) {
        clearInterval(bonusTimerInterval);
        bonusTimerInterval = null;
    }
}

export function initBonusSection(userData, getServerTime) {
    if (!userData || typeof getServerTime !== 'function') {
        console.warn('initBonusSection: Invalid params');
        return;
    }
    updateBonusTimer(userData, getServerTime);
    updateBonusHistory(userData);
    console.log('Streak bonus initialized');
}

export { dailyRewards, BONUS_INTERVAL };