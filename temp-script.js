
        const USD_TO_NGN_RATE = 1400;

        const defaultConfig = {
            tiktokFollowHandle: "@tiktok_user",
            tiktokFollowUrl: "https://www.tiktok.com/@tiktok_user",
            youtubeFollowHandle: "Channel Name",
            youtubeFollowUrl: "https://www.youtube.com/channel/UCXXXXXXXXX",
            instagramFollowHandle: "@instagram_user",
            instagramFollowUrl: "https://www.instagram.com/instagram_user",
            tiktokWatchUrl: "https://www.tiktok.com/@tiktok_user/video/1234567890",
            youtubeWatchUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            instagramWatchUrl: "https://www.instagram.com/p/XXXXXXXXX/",
        };

        const state = JSON.parse(localStorage.getItem("dashboardAdmin")) || defaultConfig;

        function getLevelConfig() {
            return {
                0: { name: "Free", subscription: 0, taskPayout: 0.01, referralBonus: 0.5, minReferrals: 0, dailyBonus: 0.02, accessRigs: [] },
                1: { name: "Alpha", subscription: 10, taskPayout: 0.16, referralBonus: 1, minReferrals: 3, dailyBonus: 0.033, accessRigs: ["Alpha Rig"] },
                2: { name: "Beta", subscription: 15, taskPayout: 0.22, referralBonus: 1.5, minReferrals: 5, dailyBonus: 0.066, accessRigs: ["Alpha Rig", "Alpha Rig Pro", "Beta Rig"] },
                3: { name: "Gamma", subscription: 25, taskPayout: 0.3, referralBonus: 2, minReferrals: 7, dailyBonus: 0.1667, accessRigs: ["Beta Rig", "Beta Rig Pro", "Gamma Rig"] },
                4: { name: "Delta", subscription: 35, taskPayout: 0.45, referralBonus: 3, minReferrals: 10, dailyBonus: 0.25, accessRigs: ["Gamma Rig", "Gamma Rig Pro"] },
                5: { name: "Apex", subscription: 50, taskPayout: 0.6, referralBonus: 4, minReferrals: 12, dailyBonus: 0.3334, accessRigs: ["Delta Rig", "Delta Rig Pro"] }
            };
        }

        function getCurrentUser() {
            return JSON.parse(localStorage.getItem("dm_currentUser"));
        }

        function getUsers() {
            return JSON.parse(localStorage.getItem("dm_users")) || [];
        }

        function saveCurrentUser(user) {
            localStorage.setItem("dm_currentUser", JSON.stringify(user));
        }

        function saveUsers(users) {
            localStorage.setItem("dm_users", JSON.stringify(users));
        }

        function upgradeLevelIfEligible(user) {
            if (!user) return user;
            const levelConfig = getLevelConfig();
            const hasSubscription = user.subscription !== null && user.subscription !== undefined;
            if (hasSubscription && !user.level) {
                user.level = 1;
            }
            return user;
        }

        function checkWithdrawalEligibility(user) {
            if (!user || user.level === undefined) return false;
            const levelConfig = getLevelConfig()[user.level];
            const referralCount = (user.referrals || []).filter(ref => ref.subscribed).length;
            return user.balance >= 25 && referralCount >= levelConfig.minReferrals;
        }

        const elements = {
            accountBalance: document.getElementById("accountBalance"),
            accountBalanceNaira: document.getElementById("accountBalanceNaira"),
            tiktokFollowHandle: document.getElementById("tiktokFollowHandle"),
            tiktokFollowLink: document.getElementById("tiktokFollowLink"),
            youtubeFollowHandle: document.getElementById("youtubeFollowHandle"),
            youtubeFollowLink: document.getElementById("youtubeFollowLink"),
            instagramFollowHandle: document.getElementById("instagramFollowHandle"),
            instagramFollowLink: document.getElementById("instagramFollowLink"),
            tiktokWatchLink: document.getElementById("tiktokWatchLink"),
            youtubeWatchLink: document.getElementById("youtubeWatchLink"),
            instagramWatchLink: document.getElementById("instagramWatchLink"),
            tiktokWatchHandle: document.getElementById("tiktokWatchHandle"),
            youtubeWatchHandle: document.getElementById("youtubeWatchHandle"),
            instagramWatchHandle: document.getElementById("instagramWatchHandle"),
            tabButtons: document.querySelectorAll(".tab-button"),
            accordionHeaders: document.querySelectorAll(".accordion-header"),
        };

        function formatNaira(usdAmount) {
            const nairaAmount = usdAmount * USD_TO_NGN_RATE;
            return nairaAmount.toLocaleString("en-US");
        }

        function convertUsdToNaira(usdString) {
            const usdValue = parseFloat(usdString.replace("$", "").replace(",", ""));
            if (isNaN(usdValue)) return null;
            return formatNaira(usdValue);
        }

        function getSubscribedRig(user, rigName) {
            if (!user || !Array.isArray(user.subscribedRigs)) return null;
            return user.subscribedRigs.find((sub) => sub.rigName === rigName);
        }

        function getRigClaimStatus(subscription) {
            if (!subscription) return { state: "not_subscribed", canClaim: false, earned: 0, label: "Not subscribed" };
            const now = new Date();
            const last = new Date(subscription.lastClaimAt || subscription.purchasedAt);
            const diffMs = now - last;
            const hours = diffMs / (1000 * 60 * 60);
            const daily = rigData[subscription.rigName].daily || 0;
            const earned = subscription.quantity * daily;
            const canClaim = hours >= 24;
            const state = canClaim ? "paused" : "active";
            return {
                state,
                canClaim,
                earned: parseFloat(earned.toFixed(2)),
                label: canClaim ? "Ready to claim" : "Mining"
            };
        }

        function saveUser(user) {
            saveCurrentUser(user);
            const users = getUsers();
            const idx = users.findIndex((item) => item.id === user.id);
            if (idx !== -1) {
                users[idx] = user;
                saveUsers(users);
            }
        }

        function claimRigEarnings(rigName) {
            const user = getCurrentUser();
            if (!user) return;
            const subscription = getSubscribedRig(user, rigName);
            if (!subscription) return;
            const status = getRigClaimStatus(subscription);
            if (!status.canClaim) {
                alert("This rig is still mining. Claim is available after 24 hours.");
                return;
            }
            user.balance = (user.balance || 0) + status.earned;
            user.totalEarnings = (user.totalEarnings || 0) + status.earned;
            subscription.lastClaimAt = new Date().toISOString();
            saveUser(user);
            renderMembershipTab(user);
            renderMineTab(user);
            elements.accountBalance.textContent = `$${user.balance.toFixed(2)}`;
            alert(`Claim successful! You earned $${status.earned.toFixed(2)} from ${rigName}. Mining has resumed.`);
        }

        function handleLevelUp(level) {
            const user = getCurrentUser();
            const config = getLevelConfig()[level];
            if (!user || !config) return;
            if (user.level >= parseInt(level)) {
                alert("You already own this level or higher.");
                return;
            }
            if (parseInt(level) !== (user.level || 0) + 1) {
                alert("You can only level up to the next tier in order.");
                return;
            }
            if ((user.balance || 0) < config.subscription) {
                alert(`Insufficient balance for Level ${level}. You need $${config.subscription}.`);
                return;
            }
            user.balance -= config.subscription;
            user.level = parseInt(level);
            saveUser(user);
            renderMembershipTab(user);
            renderMineTab(user);
            elements.accountBalance.textContent = `$${user.balance.toFixed(2)}`;
            alert(`Congratulations! You are now Level ${level}: ${config.name}.`);
        }

        function renderMembershipTab(user) {
            const levelConfig = getLevelConfig();
            const currentLevelConfig = levelConfig[user.level || 0];
            const referralCount = (user.referrals || []).filter(ref => ref.subscribed).length;
            const isWithdrawalEligible = checkWithdrawalEligibility(user);

            document.getElementById("currentLevelDisplay").textContent = `${currentLevelConfig.name} (Level ${user.level || 0})`;
            document.getElementById("dailyBonusDisplay").textContent = `$${currentLevelConfig.dailyBonus.toFixed(4)}`;
            document.getElementById("referralCountDisplay").textContent = referralCount;
            document.getElementById("withdrawalStatusDisplay").textContent = isWithdrawalEligible ? "✓ Eligible" : "Not Eligible";
            document.getElementById("withdrawalStatusDisplay").style.color = isWithdrawalEligible ? "#f0c63d" : "#ff7a82";

            document.getElementById("referralCodeDisplay").textContent = user.referralCode || "N/A";
            const referralLink = `${window.location.origin}${window.location.pathname}?ref=${user.referralCode}`;
            document.getElementById("referralLinkDisplay").textContent = referralLink;

            const container = document.getElementById("membershipLevelsList");
            container.innerHTML = Object.entries(levelConfig).map(([level, config]) => {
                const isOwned = user.level >= parseInt(level);
                const isNext = parseInt(level) === (user.level || 0) + 1;
                return `
                    <div class="membership-card" data-level="${level}">
                        <div class="membership-card-header">
                            <div>
                                <strong>Level ${level}: ${config.name}</strong>
                                <span>Subscription $${config.subscription} · Daily $${config.dailyBonus.toFixed(4)}</span>
                            </div>
                            <button class="level-up-button" ${isOwned || !isNext ? 'disabled' : ''}>${isOwned ? 'Owned' : isNext ? 'Level Up' : 'Locked'}</button>
                        </div>
                        <div class="membership-card-details">
                            <div class="membership-detail-grid">
                                <div class="membership-detail-item"><strong>Task payout</strong><span>$${config.taskPayout.toFixed(2)}</span></div>
                                <div class="membership-detail-item"><strong>Referral bonus</strong><span>$${config.referralBonus.toFixed(2)}</span></div>
                                <div class="membership-detail-item"><strong>Min referrals</strong><span>${config.minReferrals}</span></div>
                                <div class="membership-detail-item"><strong>Rigs accessible</strong><span>${config.accessRigs.length ? config.accessRigs.join(', ') : 'None until Level 1'}</span></div>
                            </div>
                        </div>
                    </div>
                `;
            }).join("");

            container.querySelectorAll('.membership-card-header').forEach((header) => {
                header.addEventListener('click', () => {
                    const card = header.closest('.membership-card');
                    card.classList.toggle('active');
                });
            });

            container.querySelectorAll('.membership-card button.level-up-button').forEach((button) => {
                button.addEventListener('click', (event) => {
                    event.stopPropagation();
                    const card = button.closest('.membership-card');
                    const level = card.dataset.level;
                    handleLevelUp(level);
                });
            });
        }

        function renderMineTab(user) {
            const rigBody = document.getElementById('rigTableBody');
            rigBody.innerHTML = Object.entries(rigData).map(([rigName, rig]) => {
                const subscription = getSubscribedRig(user, rigName);
                const status = getRigClaimStatus(subscription);
                const canClaim = subscription && status.canClaim;
                const buttonLabel = subscription ? (canClaim ? 'Claim' : (status.state === 'active' ? 'Mining' : 'Claim')) : 'Subscribe';
                const buttonAction = subscription ? `claimRigEarnings('${rigName}')` : `openSubscribeModal('${rigName}')`;
                const hasAccess = getLevelConfig()[user.level || 0].accessRigs.includes(rigName);
                const disabled = subscription ? (status.canClaim ? '' : 'disabled') : (hasAccess ? '' : 'disabled');
                const description = subscription ? `Qty: ${subscription.quantity} · ${status.label}` : (hasAccess ? 'Subscribe to start mining' : 'Requires higher level');
                const background = subscription
                    ? (canClaim ? '#f0c63d' : 'rgba(255,255,255,0.12)')
                    : (hasAccess ? '#2e4ca0' : 'rgba(255,255,255,0.12)');
                const color = subscription
                    ? (canClaim ? '#071617' : '#9fb3d6')
                    : (hasAccess ? '#eef3ff' : '#9fb3d6');
                return `
                    <tr>
                        <td>${rigName}<div style="color: var(--muted); font-size: 0.85rem; margin-top: 6px;">${description}</div></td>
                        <td>$${rig.price.toFixed(2)}</td>
                        <td>$${rig.daily.toFixed(2)}</td>
                        <td>$${rig.total.toFixed(2)}</td>
                        <td>${rig.cycle} days</td>
                        <td><button type="button" ${disabled} onclick="${buttonAction}" style="padding: 10px 14px; border-radius: 999px; border:none; background: ${background}; color: ${color}; cursor:${disabled ? 'not-allowed' : 'pointer'};">${buttonLabel}</button></td>
                    </tr>
                `;
            }).join('');
        }

        const currentUser = getCurrentUser();
        if (currentUser) {
            // zero balances for safety
            currentUser.balance = 0;
            currentUser.totalEarnings = 0;
            saveUser(currentUser);
            upgradeLevelIfEligible(currentUser);
            renderMembershipTab(currentUser);
            renderMineTab(currentUser);
            elements.accountBalance.textContent = `$${currentUser.balance ? currentUser.balance.toFixed(2) : '0.00'}`;
            const nairaValue = formatNaira(currentUser.balance || 0);
            elements.accountBalanceNaira.textContent = `≈ ${nairaValue} NGN`;
        } else {
            window.location.href = "login.html";
        }

        renderDashboard(state);

        document.getElementById("copyReferralBtn").addEventListener("click", () => {
            const link = document.getElementById("referralLinkDisplay").textContent;
            navigator.clipboard.writeText(link).then(() => {
                alert("Referral link copied to clipboard!");
            }).catch(() => {
                alert("Failed to copy link");
            });
        });

        elements.tabButtons.forEach((button) => {
            button.addEventListener("click", () => {
                elements.tabButtons.forEach((btn) => btn.classList.remove("active"));
                button.classList.add("active");
                document.querySelectorAll(".tab-content").forEach((tab) => {
                    tab.classList.remove("active");
                });
                document.getElementById(button.dataset.tab).classList.add("active");
            });
        });

        const depositBtn = document.getElementById("depositBtn");
        const withdrawBtn = document.getElementById("withdrawBtn");

        if (depositBtn) {
            depositBtn.addEventListener("click", () => {
                window.location.href = "wallet.html?action=deposit";
            });
        }

        if (withdrawBtn) {
            withdrawBtn.addEventListener("click", () => {
                const user = getCurrentUser();
                if (!checkWithdrawalEligibility(user)) {
                    const levelConfig = getLevelConfig()[user.level || 0];
                    const referralCount = (user.referrals || []).filter(ref => ref.subscribed).length;
                    alert(`Withdrawal not eligible. Requirements: $25 minimum balance + ${levelConfig.minReferrals} referrals (you have ${referralCount})`);
                    return;
                }
                window.location.href = "wallet.html?action=withdraw";
            });
        }

        elements.accordionHeaders.forEach((header) => {
            header.addEventListener("click", () => {
                const panel = header.nextElementSibling;
                const expanded = panel.classList.toggle("active");
                header.querySelector("span").textContent = expanded ? "−" : "+";
            });
        });

        // Subscription Modal
        const modal = document.getElementById("subscribeModal");
        const btnCancel = document.getElementById("btnCancel");
        const btnConfirm = document.getElementById("btnConfirm");
        const btnPlus = document.getElementById("btnPlus");
        const btnMinus = document.getElementById("btnMinus");
        const quantityDisplay = document.getElementById("quantityDisplay");

        let currentRig = null;
        let quantity = 1;

        // Rig data mapping
        const rigData = {
            "Alpha Rig": { price: 5, daily: 0.75, cycle: 100, total: 75 },
            "Alpha Rig Pro": { price: 15, daily: 1.00, cycle: 100, total: 100 },
            "Beta Rig": { price: 25, daily: 1.30, cycle: 90, total: 125 },
            "Beta Rig Pro": { price: 30, daily: 1.67, cycle: 90, total: 150 },
            "Gamma Rig": { price: 50, daily: 5.00, cycle: 60, total: 300 },
            "Gamma Rig Pro": { price: 75, daily: 8.33, cycle: 60, total: 500 },
            "Delta Rig": { price: 100, daily: 16.67, cycle: 45, total: 750 },
            "Delta Rig Pro": { price: 150, daily: 22.22, cycle: 45, total: 1000 },
        };

        function updateRevenueEstimates() {
            if (!currentRig) return;

            const rig = rigData[currentRig];
            const totalCost = (rig.price * quantity).toFixed(2);
            const totalDaily = (rig.daily * quantity).toFixed(2);
            const totalCycle = (rig.total * quantity).toFixed(2);
            const profit = (totalCycle - totalCost).toFixed(2);

            document.getElementById("totalCost").textContent = `$${totalCost}`;
            document.getElementById("totalDailyEarnings").textContent = `$${totalDaily}`;
            document.getElementById("totalCycleEarnings").textContent = `$${totalCycle}`;
            document.getElementById("estimatedProfit").textContent = `$${profit}`;
        }

        function openSubscribeModal(rigName) {
            if (!rigData[rigName]) return;
            const user = getCurrentUser();
            const levelConfig = getLevelConfig()[user.level || 0];
            if (!levelConfig.accessRigs.includes(rigName)) {
                alert(`You must reach Level ${Object.entries(getLevelConfig()).find(([, cfg]) => cfg.accessRigs.includes(rigName))[0]} to access this rig.`);
                return;
            }

            currentRig = rigName;
            quantity = 1;

            const rig = rigData[rigName];

            document.getElementById("modalRigName").textContent = rigName;
            document.getElementById("modalPrice").textContent = `$${rig.price.toFixed(2)}`;
            document.getElementById("modalDailyRev").textContent = `$${rig.daily.toFixed(2)}`;
            document.getElementById("modalCycle").textContent = `${rig.cycle} days`;

            quantityDisplay.textContent = quantity;
            updateRevenueEstimates();

            modal.classList.add("active");
        }

        function closeSubscribeModal() {
            modal.classList.remove("active");
            currentRig = null;
            quantity = 1;
        }

        btnPlus.addEventListener("click", () => {
            quantity++;
            quantityDisplay.textContent = quantity;
            updateRevenueEstimates();
        });

        btnMinus.addEventListener("click", () => {
            if (quantity > 1) {
                quantity--;
                quantityDisplay.textContent = quantity;
                updateRevenueEstimates();
            }
        });

        btnCancel.addEventListener("click", closeSubscribeModal);

        modal.addEventListener("click", (e) => {
            if (e.target === modal) {
                closeSubscribeModal();
            }
        });

        btnConfirm.addEventListener("click", () => {
            if (currentRig && quantity > 0) {
                const user = getCurrentUser();
                if (!user) {
                    window.location.href = 'login.html';
                    return;
                }
                const rig = rigData[currentRig];
                const totalCost = rig.price * quantity;
                if ((user.balance || 0) < totalCost) {
                    alert(`Insufficient balance. You need $${totalCost.toFixed(2)} to subscribe to ${currentRig}.`);
                    return;
                }
                user.balance -= totalCost;
                user.subscribedRigs = user.subscribedRigs || [];
                const subscription = getSubscribedRig(user, currentRig);
                if (subscription) {
                    subscription.quantity += quantity;
                    subscription.lastClaimAt = new Date().toISOString();
                    subscription.purchasedAt = new Date().toISOString();
                } else {
                    user.subscribedRigs.push({
                        rigName: currentRig,
                        quantity,
                        purchasedAt: new Date().toISOString(),
                        lastClaimAt: new Date().toISOString()
                    });
                }
                saveUser(user);
                renderMineTab(user);
                renderMembershipTab(user);
                elements.accountBalance.textContent = `$${user.balance.toFixed(2)}`;
                alert(`Purchase confirmed!\n\nRig: ${currentRig}\nQuantity: ${quantity}\nTotal Cost: $${totalCost.toFixed(2)}`);
                closeSubscribeModal();
            }
        });

        // Attach click listeners to all subscribe buttons
        document.querySelectorAll(".rig-table button").forEach((button) => {
            button.addEventListener("click", function() {
                const row = this.closest("tr");
                const rigName = row.querySelector("td:first-child").textContent.trim();
                openSubscribeModal(rigName);
            });
        });
    
