// mining.js - Mining related functions (Updated for Telegram)
import { database } from './config.js';
import { ref, get, update, serverTimestamp, runTransaction, push, set } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

export let countdownInterval = null;

// ========================================
// MINING CALCULATIONS
// ========================================
export function calculateCurrentEarned(userData, appSettings, getServerTime) {
    if (!userData?.miningStartTime) return 0;
    
    const durationSec = appSettings.mining.miningDuration * 3600;
    const rewardPerSec = appSettings.mining.totalReward / durationSec;
    const now = getServerTime();
    
    // Mining শেষ হয়ে গেলে পুরো reward return করো
    if (now >= userData.miningEndTime) {
        return appSettings.mining.totalReward;
    }
    
    // এখনো চলছে - calculate current earned
    const elapsed = Math.floor((now - userData.miningStartTime) / 1000);
    const earned = elapsed * rewardPerSec;
    
    return Math.min(earned, appSettings.mining.totalReward);
}

// ========================================
// COUNTDOWN + EARNED DISPLAY (একসাথে)
// ========================================
export function startCountdownAndEarned(
    endTime, 
    getServerTime, 
    appSettings, 
    userData, 
    stopMining, 
    showNotification
) {
    // পুরানো interval clear করো
    clearInterval(countdownInterval);
    
    const timerEl = document.querySelector('#miningBtn .timer-display');
    const earnedEl = document.getElementById('currentEarned');
    const displayEl = document.getElementById('earnedDisplay');
    const statusEl = document.getElementById('miningStatus');

    countdownInterval = setInterval(() => {
        const now = getServerTime();
        const leftSec = Math.max(0, Math.floor((endTime - now) / 1000));
        const earned = calculateCurrentEarned(userData, appSettings, getServerTime);
        const roundedEarned = Number(earned.toFixed(6));

        // Update Timer
        if (timerEl) {
            timerEl.textContent = leftSec > 0 ? formatTime(leftSec) : 'Claim';
        }

        // Update Earned (দুটো জায়গায়)
        const earnedText = `${roundedEarned.toFixed(6)} FZ`;
        if (earnedEl) earnedEl.textContent = earnedText;
        if (displayEl) displayEl.textContent = earnedText;

        // Update Status
        if (statusEl && leftSec > 0) {
            statusEl.textContent = 'Active';
            statusEl.className = 'mining-status text-green-600';
        }

        // Mining শেষ?
        if (leftSec <= 0) {
            clearInterval(countdownInterval);
            countdownInterval = null;
            stopMining();
            showNotification(`Mining complete! Claim ${appSettings.mining.totalReward} FZ.`, 'success');
        }
    }, 1000); // প্রতি সেকেন্ডে আপডেট
}

function formatTime(seconds) {
    const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
}

// ========================================
// START MINING
// ========================================
export async function startMining(
    currentUser, 
    userData, 
    appSettings, 
    getServerTime, 
    showNotification, 
    startCountdownAndEarned
) {
    if (!currentUser) {
        return showNotification('Login required.', 'error');
    }
    
    // Check if already mining
    if (userData.miningStartTime && getServerTime() < userData.miningEndTime) {
        return showNotification('Mining already active.', 'error');
    }

    const userRef = ref(database, `users/${currentUser.uid}`);
    
    try {
        const durationMs = appSettings.mining.miningDuration * 3600 * 1000;

        // Step 1: Set start time with server timestamp
        await update(userRef, { 
            miningStartTime: serverTimestamp(),
            miningEndTime: null // Temporarily null
        });

        // Step 2: Get actual server start time
        const snap = await get(userRef);
        const actualStart = snap.val().miningStartTime;
        const endTime = actualStart + durationMs;

        // Step 3: Set end time
        await update(userRef, { 
            miningEndTime: endTime 
        });

        // Step 4: Update UI - Start countdown + earned display
        const miningBtn = document.getElementById('miningBtn');
        const miningStatus = document.getElementById('miningStatus');
        
        if (miningBtn) {
            miningBtn.disabled = true;
            miningBtn.classList.remove('claim');
        }
        
        if (miningStatus) {
            miningStatus.textContent = 'Active';
            miningStatus.className = 'mining-status text-green-600';
        }

        // Start countdown
        startCountdownAndEarned(
            endTime,
            getServerTime,
            appSettings,
            { ...userData, miningStartTime: actualStart, miningEndTime: endTime },
            stopMining,
            showNotification
        );

        showNotification(
            `Mining started for ${appSettings.mining.miningDuration} hours!`, 
            'success'
        );
        
        console.log('✅ Mining started:', {
            startTime: new Date(actualStart).toISOString(),
            endTime: new Date(endTime).toISOString(),
            duration: appSettings.mining.miningDuration + ' hours'
        });
        
    } catch (err) {
        console.error("❌ Start mining error:", err);
        showNotification('Failed to start mining.', 'error');
        
        // Reset UI on error
        const miningBtn = document.getElementById('miningBtn');
        if (miningBtn) {
            miningBtn.disabled = false;
            miningBtn.classList.remove('claim');
        }
    }
}

// ========================================
// STOP MINING (UI Ready to Claim)
// ========================================
export function stopMining() {
    const btn = document.getElementById('miningBtn');
    const status = document.getElementById('miningStatus');
    const timerEl = btn?.querySelector('.timer-display');

    if (btn) {
        btn.classList.add('claim');
        btn.disabled = false;
    }
    
    if (timerEl) {
        timerEl.textContent = 'Claim';
    }
    
    if (status) {
        status.textContent = 'Ready to Claim';
        status.className = 'mining-status text-yellow-600';
    }
    
    console.log('⏰ Mining complete - Ready to claim');
}

// ========================================
// CLAIM MINING REWARD
// ========================================
export async function claimMiningReward(
    currentUser, 
    userData, 
    appSettings, 
    getServerTime, 
    showNotification, 
    showAdModal, 
    checkReferralMilestones
) {
    if (!currentUser) {
        return showNotification('Login required.', 'error');
    }

    const userRef = ref(database, `users/${currentUser.uid}`);
    const now = getServerTime();
    const reward = appSettings.mining.totalReward;

    try {
        // Use transaction to prevent double claiming
        const result = await runTransaction(userRef, (data) => {
            // Validation checks
            if (!data) {
                console.log('❌ No user data found');
                return; // Abort
            }
            
            if (!data.miningStartTime) {
                console.log('❌ Mining not started');
                return; // Abort
            }
            
            if (!data.miningEndTime || now < data.miningEndTime) {
                console.log('❌ Mining not complete yet');
                return; // Abort
            }

            // All checks passed - claim the reward
            return {
                ...data,
                balance: (data.balance || 0) + reward,
                totalMined: (data.totalMined || 0) + reward,
                miningStartTime: null,
                miningEndTime: null
            };
        });

        if (result.committed) {
            // Transaction successful
            await recordMiningTransaction(currentUser.uid, reward);
            
            showNotification(`✅ Claimed ${reward.toFixed(2)} FZ!`, 'success');
            
            // Show ad after claiming
            if (showAdModal) {
                setTimeout(() => showAdModal(), 500);
            }
            
            // Check referral milestones
            if (userData.referredBy && checkReferralMilestones) {
                await checkReferralMilestones(currentUser.uid);
            }
            
            // Reset UI
            resetMiningUI();
            
            console.log('✅ Mining reward claimed:', reward);
            
        } else {
            // Transaction aborted
            showNotification('Not ready to claim yet.', 'error');
            console.log('❌ Claim transaction aborted');
        }
        
    } catch (err) {
        console.error("❌ Claim error:", err);
        showNotification('Claim failed. Please try again.', 'error');
    }
}

// Reset Mining UI after claiming
function resetMiningUI() {
    const btn = document.getElementById('miningBtn');
    const status = document.getElementById('miningStatus');
    const timerEl = btn?.querySelector('.timer-display');
    const earnedEl = document.getElementById('currentEarned');
    const displayEl = document.getElementById('earnedDisplay');

    if (btn) {
        btn.classList.remove('claim');
        btn.disabled = false;
    }
    
    if (timerEl) {
        timerEl.textContent = 'Start Mining';
    }
    
    if (status) {
        status.textContent = 'Inactive';
        status.className = 'mining-status text-gray-600';
    }
    
    if (earnedEl) {
        earnedEl.textContent = '0.000000 FZ';
    }
    
    if (displayEl) {
        displayEl.textContent = '0.000000 FZ';
    }
}

// Record mining transaction
async function recordMiningTransaction(uid, amount) {
    try {
        const txRef = push(ref(database, `users/${uid}/transactions`));
        await set(txRef, { 
            type: 'mining', 
            amount: amount, 
            description: 'Mining Reward', 
            timestamp: serverTimestamp(), 
            status: 'completed' 
        });
        console.log('✅ Mining transaction recorded');
    } catch (error) {
        console.error('❌ Failed to record transaction:', error);
        // Don't throw - transaction already committed
    }
}

// ========================================
// CLEANUP
// ========================================
export function cleanupMining() {
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
        console.log('🧹 Mining countdown cleaned up');
    }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

// Get mining progress percentage
export function getMiningProgress(userData, getServerTime) {
    if (!userData?.miningStartTime || !userData?.miningEndTime) {
        return 0;
    }
    
    const now = getServerTime();
    const total = userData.miningEndTime - userData.miningStartTime;
    const elapsed = now - userData.miningStartTime;
    
    return Math.min(Math.max((elapsed / total) * 100, 0), 100);
}

// Check if mining is active
export function isMiningActive(userData, getServerTime) {
    if (!userData?.miningStartTime || !userData?.miningEndTime) {
        return false;
    }
    
    return getServerTime() < userData.miningEndTime;
}

// Get remaining mining time in seconds
export function getRemainingTime(userData, getServerTime) {
    if (!userData?.miningEndTime) {
        return 0;
    }
    
    return Math.max(0, Math.floor((userData.miningEndTime - getServerTime()) / 1000));
}