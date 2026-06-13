/**
 * Target Match Module - Injected via Vanilla JS
 * Connects with index.txt via window.TargetMatch
 */

window.TargetMatch = (function() {
    let mergedData = null;
    let profiles = JSON.parse(localStorage.getItem('targetMatchProfiles') || '[]');
    let currentProfile = {
        name: 'Default Target Profile',
        mappings: {}, // "Group Name|Brand Name": "DB Brand"
        rebateConfig: { percent: 0 },
        pointConfig: {
            unit: 'points', // 'points' or 'baht'
            tiers: [
                { threshold: 50000, reward: 100 }
            ]
        }
    };
    if (profiles.length > 0) {
        currentProfile = profiles[0]; // load first for now
    }
    
    // Expose config globally so Dashboard charts can read it easily
    window.__TargetMatchActiveProfile = currentProfile;

    let extractedGroups = []; // Array of { group: '', brand: '' }

    function onTargetDataLoaded(data) {
        mergedData = data;
        console.log('[TargetMatch] Target Data Loaded. Extracting groups...');
        extractGroupsAndBrands();
        openModal();
    }

    function extractGroupsAndBrands() {
        if (!mergedData || !mergedData.targets) return;
        const targetRows = mergedData.targets;
        
        let map = new Map();
        targetRows.forEach(row => {
            // Group is typically in 'กลุ่มสินค้า' and brand in 'แบรนด์'
            let group = row['กลุ่มสินค้า'] || row['Group'] || 'Uncategorized';
            let brand = row['แบรนด์'] || row['Brand'] || 'Unknown Brand';
            let key = group + '|' + brand;
            if(!map.has(key)) {
                map.set(key, { group, brand });
            }
        });
        extractedGroups = Array.from(map.values());
    }

    function openModal() {
        // Create modal DOM if not exists
        let modal = document.getElementById('target-match-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'target-match-modal';
            modal.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 transition-opacity';
            document.body.appendChild(modal);
        }
        modal.style.display = 'flex';
        renderUI();
    }

    function renderUI() {
        let modal = document.getElementById('target-match-modal');
        
        let html = `
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-slate-50">
                <h2 class="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <span class="material-symbols-outlined text-blue-600">account_tree</span>
                    ตั้งค่า Target Match & กฎโบนัส
                </h2>
                <button onclick="TargetMatch.closeModal()" class="text-gray-400 hover:text-gray-600 transition-colors">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
            
            <div class="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                
                <!-- Tree View Section -->
                <div class="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <div class="bg-slate-50 px-4 py-3 border-b border-gray-200 font-semibold text-slate-700">
                        1. จับคู่กลุ่มสินค้าและแบรนด์ (Data Mapping)
                    </div>
                    <div class="p-4 flex flex-col gap-3" id="tm-tree-container">
                        <!-- Rendered Tree -->
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- Rebate Config -->
                    <div class="border border-blue-100 rounded-xl overflow-hidden bg-blue-50/30 shadow-sm">
                        <div class="bg-blue-100/50 px-4 py-3 border-b border-blue-100 font-semibold text-blue-800 flex items-center gap-2">
                            <span class="material-symbols-outlined text-blue-600 text-lg">percent</span>
                            2. Rebate Program
                        </div>
                        <div class="p-4">
                            <label class="block text-sm font-medium text-gray-700 mb-2">ให้เงินคืนกี่เปอร์เซ็นต์ (%) เมื่อถึงเป้า</label>
                            <div class="flex items-center gap-2">
                                <input type="number" id="tm-rebate-percent" value="${currentProfile.rebateConfig.percent}" class="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3 border">
                                <span class="text-gray-500 font-medium">%</span>
                            </div>
                        </div>
                    </div>

                    <!-- Point Program -->
                    <div class="border border-amber-100 rounded-xl overflow-hidden bg-amber-50/30 shadow-sm">
                        <div class="bg-amber-100/50 px-4 py-3 border-b border-amber-100 font-semibold text-amber-800 flex items-center gap-2">
                            <span class="material-symbols-outlined text-amber-600 text-lg">stars</span>
                            3. Point Program (แบบขั้นบันได)
                        </div>
                        <div class="p-4 flex flex-col gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">หน่วยของรางวัล (Unit)</label>
                                <select id="tm-point-unit" class="w-full border-gray-300 rounded-lg shadow-sm focus:border-amber-500 focus:ring-amber-500 py-2 px-3 border bg-white">
                                    <option value="points" ${currentProfile.pointConfig.unit === 'points' ? 'selected' : ''}>เป็นคะแนน (Points)</option>
                                    <option value="baht" ${currentProfile.pointConfig.unit === 'baht' ? 'selected' : ''}>เป็นเงินบาท (Baht)</option>
                                </select>
                            </div>
                            
                            <div class="border-t border-amber-200/50 pt-4">
                                <label class="block text-sm font-bold text-gray-700 mb-2">เงื่อนไขขั้นบันได (Tiers)</label>
                                <p class="text-xs text-gray-500 mb-3">*ยอดขายสะสมทะลุขั้นไหน จะได้รางวัลของขั้นนั้นบวกเพิ่มไปเรื่อยๆ</p>
                                <div id="tm-tiers-container" class="flex flex-col gap-2 mb-3">
                                    <!-- Rendered Tiers -->
                                </div>
                                <button onclick="TargetMatch.addTier()" class="w-full py-2.5 border-2 border-dashed border-amber-300 rounded-lg text-amber-700 hover:bg-amber-100 font-medium text-sm transition-colors flex items-center justify-center gap-1">
                                    <span class="material-symbols-outlined text-sm">add</span> เพิ่มเงื่อนไขใหม่
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            <div class="px-6 py-4 border-t border-gray-100 bg-slate-50 flex justify-end gap-3">
                <button onclick="TargetMatch.closeModal()" class="px-5 py-2.5 text-gray-700 hover:bg-gray-200 bg-gray-100 rounded-xl font-medium transition-colors">ยกเลิก</button>
                <button onclick="TargetMatch.saveConfig()" class="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-sm transition-colors flex items-center gap-2">
                    <span class="material-symbols-outlined text-sm">save</span>
                    บันทึก & นำไปใช้ (Save & Apply)
                </button>
            </div>
        </div>
        `;
        modal.innerHTML = html;
        
        renderTree();
        renderTiers();
    }

    function renderTree() {
        const container = document.getElementById('tm-tree-container');
        if (!container) return;
        
        // Group by 'กลุ่มสินค้า'
        let grouped = {};
        extractedGroups.forEach(item => {
            if (!grouped[item.group]) grouped[item.group] = [];
            grouped[item.group].push(item.brand);
        });

        let html = '';
        for (const [group, brands] of Object.entries(grouped)) {
            html += `
                <div class="border border-gray-200 rounded-lg p-3 bg-white shadow-sm">
                    <div class="font-bold text-slate-800 border-b border-gray-100 pb-2 mb-2 flex items-center gap-2">
                        <span class="material-symbols-outlined text-gray-400">folder</span>
                        ${group}
                    </div>
                    <div class="flex flex-col gap-2 pl-6 border-l-2 border-gray-100 ml-3 py-1">
                        ${brands.map(brand => {
                            let key = group + '|' + brand;
                            let val = currentProfile.mappings[key] || '';
                            return `
                                <div class="flex items-center gap-3">
                                    <span class="material-symbols-outlined text-gray-400 text-sm">subdirectory_arrow_right</span>
                                    <div class="w-1/3 text-sm text-gray-700 font-medium">${brand}</div>
                                    <div class="flex-1 flex items-center gap-2 bg-slate-50 p-1.5 rounded-md border border-gray-100">
                                        <span class="text-xs text-gray-500 whitespace-nowrap pl-1">ผูกกับ:</span>
                                        <input type="text" placeholder="พิมพ์ชื่อแบรนด์เป้าหมาย" 
                                            class="tm-mapping-input flex-1 text-sm border border-gray-300 rounded py-1.5 px-2 focus:ring-blue-500 focus:border-blue-500 bg-white" 
                                            data-key="${key}" value="${val}">
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }
        
        if (extractedGroups.length === 0) {
            html = `<div class="text-gray-500 text-sm text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        <span class="material-symbols-outlined text-gray-400 text-3xl mb-2 block">find_in_page</span>
                        ไม่พบข้อมูล กลุ่มสินค้า/แบรนด์ ในไฟล์ Target ที่อัปโหลด
                    </div>`;
        }
        
        container.innerHTML = html;
    }

    function renderTiers() {
        const container = document.getElementById('tm-tiers-container');
        if (!container) return;

        let html = '';
        currentProfile.pointConfig.tiers.forEach((tier, index) => {
            html += `
                <div class="flex items-center gap-2 bg-white p-3 rounded-lg border border-amber-200 shadow-sm relative group">
                    <div class="absolute -left-2.5 -top-2.5 bg-amber-100 text-amber-700 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center border border-amber-200">
                        ${index + 1}
                    </div>
                    <div class="flex flex-col w-1/2 ml-2">
                        <span class="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">ยอดขายถึง (Baht)</span>
                        <input type="number" onchange="TargetMatch.updateTier(${index}, 'threshold', this.value)" value="${tier.threshold}" class="w-full text-sm border-gray-300 rounded-md p-1.5 border focus:ring-amber-500 focus:border-amber-500">
                    </div>
                    <div class="flex flex-col w-1/2">
                        <span class="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">รางวัลที่ได้</span>
                        <input type="number" onchange="TargetMatch.updateTier(${index}, 'reward', this.value)" value="${tier.reward}" class="w-full text-sm border-gray-300 rounded-md p-1.5 border focus:ring-amber-500 focus:border-amber-500">
                    </div>
                    <button onclick="TargetMatch.removeTier(${index})" class="mt-4 text-red-400 hover:text-red-600 transition-colors p-1" title="ลบเงื่อนไข">
                        <span class="material-symbols-outlined text-lg">delete</span>
                    </button>
                </div>
            `;
        });
        
        if (currentProfile.pointConfig.tiers.length === 0) {
            html = `<div class="text-sm text-gray-400 text-center py-2 italic">ยังไม่มีเงื่อนไขขั้นบันได</div>`;
        }

        container.innerHTML = html;
    }

    function addTier() {
        // Find max threshold to suggest the next one
        let maxThreshold = 0;
        if (currentProfile.pointConfig.tiers.length > 0) {
            maxThreshold = Math.max(...currentProfile.pointConfig.tiers.map(t => t.threshold));
        }
        currentProfile.pointConfig.tiers.push({ threshold: maxThreshold + 50000, reward: 0 });
        
        // Sort tiers by threshold
        currentProfile.pointConfig.tiers.sort((a, b) => a.threshold - b.threshold);
        renderTiers();
    }

    function removeTier(index) {
        currentProfile.pointConfig.tiers.splice(index, 1);
        renderTiers();
    }

    function updateTier(index, field, value) {
        currentProfile.pointConfig.tiers[index][field] = Number(value);
    }

    function closeModal() {
        let modal = document.getElementById('target-match-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    function saveConfig() {
        // Collect mappings
        const inputs = document.querySelectorAll('.tm-mapping-input');
        inputs.forEach(input => {
            const key = input.getAttribute('data-key');
            if (input.value.trim()) {
                currentProfile.mappings[key] = input.value.trim();
            } else {
                delete currentProfile.mappings[key];
            }
        });

        // Collect Rebate
        const rebateInput = document.getElementById('tm-rebate-percent');
        if(rebateInput) currentProfile.rebateConfig.percent = Number(rebateInput.value);

        // Collect Point Unit
        const unitInput = document.getElementById('tm-point-unit');
        if(unitInput) currentProfile.pointConfig.unit = unitInput.value;

        // Sort Tiers
        currentProfile.pointConfig.tiers.sort((a, b) => a.threshold - b.threshold);

        // Save
        profiles[0] = currentProfile;
        localStorage.setItem('targetMatchProfiles', JSON.stringify(profiles));
        
        // Update global variable for immediate dashboard sync
        window.__TargetMatchActiveProfile = currentProfile;

        // Trigger a custom event in case dashboard needs to re-render charts
        window.dispatchEvent(new CustomEvent('targetMatchProfileUpdated', { detail: currentProfile }));

        alert('บันทึกการตั้งค่า Target Match สำเร็จ! ข้อมูลพร้อมถูกนำไปคำนวณกราฟ');
        closeModal();
    }

    // Public API
    return {
        onTargetDataLoaded,
        closeModal,
        saveConfig,
        addTier,
        removeTier,
        updateTier
    };
})();
