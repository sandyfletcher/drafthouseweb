export class Bot {
    constructor() {
        // bot tries to choose cards within its colour scheme
        this.colors = { W: 0, U: 0, B: 0, R: 0, G: 0 };
        this.topColors = [];
    }
    pick(pack, pool) {
        this.analyzePool(pool);
        const scoredCards = pack.map((card, index) => {
            const score = this.evaluateCard(card, pool.length);
            return { index, score, card };
        });
        // sort options by descending score and select winner
        scoredCards.sort((a, b) => b.score - a.score);
        return scoredCards[0].index;
    }
    analyzePool(pool) {
        // reset each time for simplicity
        this.colors = { W: 0, U: 0, B: 0, R: 0, G: 0 };
        // evaluate colours with rarity multiplayer
        pool.forEach(card => {
            const weight = this.getRarityWeight(card.rarity);
            // ignore colourless cards
            if (card.colors.length === 0) return;
            card.colors.forEach(color => {
                if (this.colors[color] !== undefined) {
                    this.colors[color] += weight;
                }
            });
        });
        // sort colours by descending weight for top two
        this.topColors = Object.keys(this.colors).sort((a, b) => {
            return this.colors[b] - this.colors[a];
        });
    }
    evaluateCard(card, poolSize) {
        let score = 0;
        // bonus points for rarity
        score += this.getRarityWeight(card.rarity);
        // penalty for high CMC
        if (card.cmc > 6) score -= 1.0; 
        // mana-fixing land bonus
        if (card.type_line.includes('Land')) {
            score += 0.5; 
        }
        const colorBonus = this.calculateColorSynergy(card, poolSize);
        score += colorBonus;
        // break ties with a bit of randomness
        score += Math.random() * 0.5;
        return score;
    }

    calculateColorSynergy(card, poolSize) {
        // colourless castable in any deck
        if (card.colors.length === 0) return 0.5;
        const primaryColor = this.topColors[0];
        const secondaryColor = this.topColors[1];
        // establish current pack
        const isPack1 = poolSize < 14;
        const isPack2 = poolSize >= 14 && poolSize < 28;
        const isPack3 = poolSize >= 28;
        let synergyPoints = 0;
        let matchCount = 0;
        // check for colour match
        card.colors.forEach(c => {
            if (c === primaryColor || c === secondaryColor) matchCount++;
        });
        const isGold = card.colors.length > 1;
        if (isPack1) { // more open to switching
            if (matchCount > 0) synergyPoints += 2.0;
            if (matchCount === card.colors.length) synergyPoints += 1.0;
        }
        else if (isPack2) { // punishes bad matches more
            if (matchCount > 0) synergyPoints += 4.0; 
            if (isGold && matchCount < card.colors.length) {
                synergyPoints -= 5.0;
            }
            if (matchCount === 0) synergyPoints -= 2.0;
        }
        else if (isPack3) { // cutting colour hard
            if (matchCount > 0) synergyPoints += 6.0;
            if (matchCount === 0) synergyPoints -= 10.0;
        }
        return synergyPoints;
    }
    getRarityWeight(rarity) {
        switch(rarity) {
            case 'mythic': return 4.5;
            case 'rare': return 4.0;
            case 'uncommon': return 2.5;
            case 'common': return 1.0;
            default: return 1.0;
        }
    }
}