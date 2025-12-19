import { Card } from './Card.js';

export class PackFactory {
    constructor(setData, listData = []) {
        this.rawSet = setData;
        this.rawList = listData; 
        this.commons = [];
        this.uncommons = [];
        this.rares = []; 
        this.basicLands = [];
        this.sortCards();
    }
    sortCards() { // by rarity
        this.rawSet.forEach(c => {
            if (c.booster === false) return; 
            if (c.type_line.includes('Basic Land')) {
                this.basicLands.push(c);
                return;
            }
            switch(c.rarity) {
                case 'common': this.commons.push(c); break;
                case 'uncommon': this.uncommons.push(c); break;
                case 'rare': 
                case 'mythic': this.rares.push(c); break;
                default: break; 
            }
        });
    }
    generatePack() {
        const pack = [];
        // track IDs to prevent duplicate cards in pack 
        const packIds = new Set(); 
        const getUnique = (sourceArray) => {
            if (sourceArray.length === 0) return null;
            let cardData;
            let attempts = 0;
            do { // only 10 times just in case
                cardData = sourceArray[Math.floor(Math.random() * sourceArray.length)];
                attempts++;
            } while (packIds.has(cardData.id) && attempts < 10);
            packIds.add(cardData.id);
            return new Card(cardData);
        };
        // SLOT 1-6: commons
        for(let i=0; i<6; i++) pack.push(getUnique(this.commons));
        // SLOT 7: common OR "the list" @ 12.5% chance
        if (this.rawList.length > 0 && Math.random() < 0.125) {
            const listData = this.rawList[Math.floor(Math.random() * this.rawList.length)];
            const card = new Card(listData);
            card.isList = true;
            pack.push(card);
        } else {
            pack.push(getUnique(this.commons));
        }
        // SLOT 8-10: uncommons
        for(let i=0; i<3; i++) pack.push(getUnique(this.uncommons));
        // SLOT 11: rare OR mythic
        pack.push(getUnique(this.rares));
        // SLOT 12: basic land
        if (this.basicLands.length > 0) {
            pack.push(getUnique(this.basicLands));
        } else {
            pack.push(getUnique(this.commons));
        }
        // SLOT 13: wildcard
        const rand = Math.random();
        if(rand < 0.5) pack.push(getUnique(this.commons));
        else if(rand < 0.75) pack.push(getUnique(this.uncommons));
        else pack.push(getUnique(this.rares));
        // SLOT 14: foil
        let foilCard;
        const randFoil = Math.random();
        if(randFoil < 0.6) foilCard = getUnique(this.commons);
        else if(randFoil < 0.9) foilCard = getUnique(this.uncommons);
        else foilCard = getUnique(this.rares);
        if(foilCard) {
            foilCard.isFoil = true;
            pack.push(foilCard);
        }
        // filter out any nulls in case something went wrong
        return pack.filter(c => c !== null);
    }
}