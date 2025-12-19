import { Card } from './Card.js';

export class DeckBuilder {
    constructor(pool, landTemplates) {
        this.sideboard = [...pool];
        this.mainDeck = [];
        this.landTemplates = landTemplates;
        this.currentSort = 'cmc'; // default sort mode
        this.mainArea = document.getElementById('main-deck-area');
        this.sideArea = document.getElementById('sideboard-area');
        this.uiMainCount = document.getElementById('main-count');
        this.uiSideCount = document.getElementById('side-count');
        this.uiLandCount = document.getElementById('land-count-display');
        this.initControls();
        this.render();
    }
    moveToMain(card) {
        const index = this.sideboard.findIndex(c => c.guid === card.guid);
        if (index > -1) {
            this.sideboard.splice(index, 1);
            this.mainDeck.push(card);
            this.render();
        }
    }
    moveToSideboard(card) {
        const index = this.mainDeck.findIndex(c => c.guid === card.guid);
        if (index > -1) {
            if (card.isBasicLand) {
                this.mainDeck.splice(index, 1);
            } else {
                this.mainDeck.splice(index, 1);
                this.sideboard.push(card);
            }
            this.render();
        }
    }
    addBasicLand(type) {
        const template = this.landTemplates[type];
        if (!template) {
            console.error(`No data found for ${type}`);
            return;
        }
        const landCard = new Card(template);
        landCard.isBasicLand = true; 
        this.mainDeck.push(landCard);
        this.render();
    }
    removeBasicLand(type) {
        for (let i = this.mainDeck.length - 1; i >= 0; i--) {
            const c = this.mainDeck[i];
            if (c.isBasicLand && c.name === type) {
                this.mainDeck.splice(i, 1);
                this.render();
                return; 
            }
        }
    }
    setSortMode(mode) {
        this.currentSort = mode;
        ['cmc', 'color', 'type'].forEach(m => {
            const btn = document.getElementById(`sort-${m}`);
            if(btn) {
                if(m === mode) btn.classList.add('active');
                else btn.classList.remove('active');
            }
        });
        this.render();
    }
    render() {
        this.renderMainDeck();
        this.renderSideboard();
        this.updateStats();
    }
    renderMainDeck() {
        this.mainArea.innerHTML = '';
        const strategies = { // define sorting options
            'cmc': {
                labels: ['Basics', '0','1','2','3','4','5','6+'], 
                getBucket: (c) => {
                    if (c.isBasicLand || c.type_line.includes('Basic Land')) return 0;
                    if (c.type_line.includes('Land')) return 1;
                    let val = Math.floor(c.cmc);
                    if (val > 6) val = 6;
                    return val + 1; // shift specific CMCs by 1
                }
            },
            'color': {
                labels: ['Basics', 'White','Blue','Black','Red','Green','Multi','Colorless','Land'],
                getBucket: (c) => {
                    if (c.isBasicLand || c.type_line.includes('Basic Land')) return 0;
                    if (c.type_line.includes('Land') && !c.colors.length) return 8;
                    if (c.colors.length === 0) return 7;
                    if (c.colors.length > 1) return 6; 
                    const map = { 'W':1, 'U':2, 'B':3, 'R':4, 'G':5 }; // shifted by 1 for basics
                    return map[c.colors[0]] ?? 7;
                }
            },
            'type': {
                labels: ['Basics', 'Creature', 'Instant/Sorc', 'Artifact/Ench', 'Planeswalker', 'Land'],
                getBucket: (c) => {
                    if (c.isBasicLand || c.type_line.includes('Basic Land')) return 0;
                    const t = c.type_line;
                    if (t.includes('Land')) return 5;
                    if (t.includes('Creature')) return 1;
                    if (t.includes('Instant') || t.includes('Sorcery')) return 2;
                    if (t.includes('Planeswalker')) return 4;
                    return 3; // artifacts/enchantments
                }
            }
        };
        // sort as requested and create labelled buckets
        const strategy = strategies[this.currentSort];
        const buckets = strategy.labels.map(() => []);
        this.mainDeck.forEach(card => {
            const bucketIndex = strategy.getBucket(card);
            if (buckets[bucketIndex]) {
                buckets[bucketIndex].push(card);
            } else {
                buckets[0].push(card);
            }
        });
        buckets.forEach((cards, idx) => {
             const col = document.createElement('div');
             col.className = 'deck-column';
             col.dataset.cmc = strategy.labels[idx];
             // alphabetic secondary sort
             cards.sort((a,b) => a.name.localeCompare(b.name));
             cards.forEach(card => {
                const cardNode = card.render();
                cardNode.classList.add('card-md');
                cardNode.onclick = () => this.moveToSideboard(card);
                col.appendChild(cardNode);
             });
             this.mainArea.appendChild(col);
        });
    }
    renderSideboard() {
        this.sideArea.innerHTML = '';
        // sideboard sorted by CMC, then colour, then name
        this.sideboard.sort((a, b) => {
            if (a.cmc !== b.cmc) return a.cmc - b.cmc;
            if (a.colors.length !== b.colors.length) return a.colors.length - b.colors.length;
            return a.name.localeCompare(b.name);
        });
        this.sideboard.forEach(card => {
            const cardNode = card.render();
            cardNode.classList.add('card-sm');
            cardNode.onclick = () => this.moveToMain(card);
            this.sideArea.appendChild(cardNode);
        });
    }
    updateStats() {
        const landCounts = { Plains: 0, Island: 0, Swamp: 0, Mountain: 0, Forest: 0 };
        let totalLands = 0;
        this.mainDeck.forEach(c => {
            if (c.isBasicLand && landCounts.hasOwnProperty(c.name)) {
                landCounts[c.name]++;
                totalLands++;
            } else if (c.type_line.includes("Land")) {
                totalLands++; 
            }
        });
        this.uiMainCount.innerText = `${this.mainDeck.length} / 40`;
        this.uiLandCount.innerText = `(${totalLands} Lands)`;
        this.uiSideCount.innerText = `${this.sideboard.length} Cards`;
        for (const [type, count] of Object.entries(landCounts)) {
            const control = document.querySelector(`.land-control[data-type="${type}"] span`);
            if(control) control.innerText = count;
        }
    }
    initControls() {
        // lands
        document.querySelectorAll('.land-control').forEach(div => {
            const type = div.dataset.type;
            const btnAdd = div.querySelector('.btn-add');
            const btnSub = div.querySelector('.btn-sub');
            if(btnAdd) btnAdd.onclick = () => this.addBasicLand(type);
            if(btnSub) btnSub.onclick = () => this.removeBasicLand(type);
        });
        // export
        const exportBtn = document.getElementById('btn-export-deck');
        if(exportBtn) exportBtn.onclick = () => this.exportDeck();
        // sort
        const sortCmc = document.getElementById('sort-cmc');
        const sortCol = document.getElementById('sort-color');
        const sortTyp = document.getElementById('sort-type');
        if(sortCmc) sortCmc.onclick = () => this.setSortMode('cmc');
        if(sortCol) sortCol.onclick = () => this.setSortMode('color');
        if(sortTyp) sortTyp.onclick = () => this.setSortMode('type');
        this.setSortMode('cmc');
    }

    exportDeck() {
        const deckList = { main: [], sideboard: [] };
        const countMap = {};
        this.mainDeck.forEach(c => {
            countMap[c.name] = (countMap[c.name] || 0) + 1;
        });
        for (const [name, count] of Object.entries(countMap)) {
            deckList.main.push({ count, name });
        }
        const sideMap = {};
        this.sideboard.forEach(c => {
             sideMap[c.name] = (sideMap[c.name] || 0) + 1;
        });
        for (const [name, count] of Object.entries(sideMap)) {
            deckList.sideboard.push({ count, name });
        }
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(deckList, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "draft-deck.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }
}