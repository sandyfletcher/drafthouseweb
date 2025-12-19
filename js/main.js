import { DraftManager } from './classes/DraftManager.js';
import { DeckBuilder } from './classes/DeckBuilder.js';

let currentSetCode = '';
let draftManager = null;
let basicLandData = {};

const heroSection = document.getElementById('view-hero');
const draftSection = document.getElementById('view-draft');
const startBtn = document.getElementById('btn-start-draft');
const setSelect = document.getElementById('set-select');
const packContainer = document.getElementById('pack-container');
const opponentsArea = document.getElementById('opponents-area');
const poolCountLabel = document.getElementById('pool-count');
const playerHudColumns = document.getElementById('player-hud-columns');
const notificationOverlay = document.getElementById('notification-overlay');
const notificationText = document.getElementById('notification-text');

startBtn.addEventListener('click', initDraft);

async function loadSetOptions() {
    const setSelect = document.getElementById('set-select');
    try {
        const response = await fetch('src/data/manifest.json');
        const sets = await response.json();
        setSelect.innerHTML = ''; // clear defaults
        sets.forEach(set => {
            const option = document.createElement('option');
            option.value = set.code;
            option.innerText = set.name;
            setSelect.appendChild(option);
        });
    } catch (err) {
        console.error("ERROR LOADING MANIFEST:", err);
    }
}
loadSetOptions();

async function initDraft() {
    currentSetCode = setSelect.value;
    startBtn.disabled = true;
    try {
        // get set
        const response = await fetch(`src/data/${currentSetCode}.json`);
        if (!response.ok) throw new Error(`DATA FOR ${currentSetCode} NOT FOUND`);
        const setData = await response.json();

        // get basic lands
        basicLandData = {
            Plains: setData.find(c => c.name === "Plains"),
            Island: setData.find(c => c.name === "Island"),
            Swamp: setData.find(c => c.name === "Swamp"),
            Mountain: setData.find(c => c.name === "Mountain"),
            Forest: setData.find(c => c.name === "Forest")
        };
        // get "list" cards
        let listData = [];
        try {
            const listRes = await fetch('src/data/plst.json');
            if(listRes.ok) listData = await listRes.json();
        } catch(e) { 
            console.warn("LIST CARDS NOT LOADED"); 
        }
        // initialize manager with human and bot opponents
        draftManager = new DraftManager(setData, listData);
        // start first round
        draftManager.startRound(1);
        transitionToTable();
        updateTable();
    } catch (err) {
        console.error(err);
        alert(`ERROR STARTING DRAFT: ${err.message}`);
        startBtn.disabled = false;
    }
}

function transitionToTable() {
    heroSection.classList.add('hidden');
    heroSection.classList.remove('active-view');
    draftSection.classList.remove('hidden');
    draftSection.classList.add('active-view');
}

function updateTable() {
    renderActivePack();
    renderOpponents();
    renderPlayerHud();
}

function renderActivePack() {
    packContainer.innerHTML = ''; // clear existing cards
    const currentPack = draftManager.getHumanPack(); // get pack held by user
    if (!currentPack || currentPack.length === 0) {
        return; 
    }
    currentPack.forEach(card => {
        const cardNode = card.render();
        cardNode.classList.add('card-lg');
        cardNode.addEventListener('click', () => {
            draftManager.handleHumanPick(card.id);
            updateTable(); 
        });
        packContainer.appendChild(cardNode);
    });
}

function renderOpponents() {
    opponentsArea.innerHTML = ''; 
    // loop through opponents
    for(let i=1; i<8; i++) {
        const botSeat = draftManager.seats[i];
        const el = document.createElement('div');
        el.className = 'opponent';
        // show avatar and pack count
        el.innerHTML = `
            <div class="avatar">🤖</div>
            <div class="name">${botSeat.name}</div>
            <div class="pack-count">${botSeat.currentPack.length} cards</div>
        `;
        opponentsArea.appendChild(el);
    }
}

function renderPlayerHud() {
    const humanSeat = draftManager.seats[0];
    if(poolCountLabel) { // update count
        poolCountLabel.innerText = `${humanSeat.pool.length} Cards`;
    }
    if(!playerHudColumns) return;
    playerHudColumns.innerHTML = '';
    // create CMC buckets
    const buckets = Array.from({length: 7}, () => []);
    humanSeat.pool.forEach(card => {
        let cmc = Math.floor(card.cmc || 0);
        if (cmc > 6) cmc = 6;
        buckets[cmc].push(card);
    });
    buckets.forEach((cards, index) => {
        const col = document.createElement('div');
        col.className = 'mana-column';
        // dynamic CMC label
        const label = document.createElement('div');
        label.className = 'col-label';
        label.innerText = index === 6 ? '6+' : index;
        col.appendChild(label);
        // card slivers for curve visual
        cards.forEach(card => {
            const sliver = document.createElement('div');
            sliver.className = 'pool-card';
            const img = document.createElement('img');
            img.src = card.image;
            img.className = 'tooltip-image';
            img.loading = "lazy"; 
            sliver.appendChild(img);
            // assign sliver colour
            let colorCode = 'C';
            if (card.type_line.includes('Land')) colorCode = 'L';
            else if (card.colors.length === 0) colorCode = 'C';
            else if (card.colors.length > 1) colorCode = 'M';
            else if (card.colors.length === 1) colorCode = card.colors[0];
            sliver.classList.add(`bg-${colorCode.toLowerCase()}`);
            col.appendChild(sliver);
        });
        playerHudColumns.appendChild(col);
    });
}

// notification overlay
function showNotification(message, duration = 2000) {
    return new Promise((resolve) => {
        notificationText.innerText = message;
        notificationOverlay.classList.remove('hidden');
        requestAnimationFrame(() => {
            notificationOverlay.classList.add('visible');
        });
        setTimeout(() => {
            notificationOverlay.classList.remove('visible');
            setTimeout(() => {
                notificationOverlay.classList.add('hidden');
                resolve();
            }, 500); // synced to fade out transition in CSS
        }, duration);
    });
}

// listener for pack intermission
document.addEventListener('pack-complete', async (e) => {
    const finishedPackNum = e.detail.packNumber;
    packContainer.innerHTML = ''; 
    await showNotification(`End of Pack ${finishedPackNum}`);
    await showNotification(`Starting Pack ${finishedPackNum + 1}...`, 1500);
    draftManager.startRound(finishedPackNum + 1);
    updateTable();
});

// handle end of draft
document.addEventListener('draft-complete', async () => {
    await showNotification("Draft Complete!", 2000);
    // hide draft
    draftSection.classList.add('hidden');
    draftSection.classList.remove('active-view');
    // show/initialize builder
    const builderSection = document.getElementById('view-builder');
    builderSection.classList.remove('hidden');
    builderSection.classList.add('active-view');
    const playerPool = draftManager.seats[0].pool;
    new DeckBuilder(playerPool, basicLandData);
});