import { PackFactory } from './PackFactory.js';
import { Bot } from './Bot.js';

export class DraftManager {
    constructor(setData, listData) {
        this.factory = new PackFactory(setData, listData);
        this.seats = []; 
        this.packNumber = 1; 
        this.pickNumber = 1;
        this.passingDirection = 'left';
        this.initSeats();
    }
    initSeats() {
        // 8 seats: 0 is the user, 1-7 are bots
        this.seats.push({
            id: 0,
            isBot: false,
            name: "You",
            pool: [],
            currentPack: []
        });
        for (let i = 1; i < 8; i++) {
            this.seats.push({
                id: i,
                isBot: true,
                name: `Bot ${i}`,
                pool: [],
                currentPack: [],
                brain: new Bot() 
            });
        }
    }
    startRound(packNum) {
        this.packNumber = packNum;
        this.pickNumber = 1;
        // passing direction alternates
        this.passingDirection = (packNum === 2) ? 'right' : 'left';
        // generate pack for each player
        this.seats.forEach(seat => {
            seat.currentPack = this.factory.generatePack();
        });
    }
    handleHumanPick(cardId) {
        const humanSeat = this.seats[0];
        // move card to pool
        const cardIndex = humanSeat.currentPack.findIndex(c => c.id === cardId);
        if (cardIndex === -1) return;
        const pickedCard = humanSeat.currentPack.splice(cardIndex, 1)[0];
        humanSeat.pool.push(pickedCard);
        this.triggerBotPicks();
        this.rotatePacks();
        // check if round is over
        if (humanSeat.currentPack.length === 0) {
            if (this.packNumber < 3) {
                const event = new CustomEvent('pack-complete', { 
                    detail: { packNumber: this.packNumber } 
                });
                document.dispatchEvent(event);
            } else {
                this.finishDraft();
            }
        } else {
            this.pickNumber++;
        }
    }
    triggerBotPicks() {
        for (let i = 1; i < 8; i++) {
            const seat = this.seats[i];
            const pickIndex = seat.brain.pick(seat.currentPack, seat.pool);
            const pickedCard = seat.currentPack.splice(pickIndex, 1)[0];
            seat.pool.push(pickedCard);
        }
    }
    rotatePacks() {
        const allPacks = this.seats.map(s => s.currentPack);
        if (this.passingDirection === 'left') {
            for (let i = 0; i < 8; i++) {
                const receivingSeatIdx = (i + 1) % 8;
                this.seats[receivingSeatIdx].currentPack = allPacks[i];
            }
        } else { // passing right
            for (let i = 0; i < 8; i++) {
                const receivingSeatIdx = (i - 1 + 8) % 8;
                this.seats[receivingSeatIdx].currentPack = allPacks[i];
            }
        }
    }
    finishDraft() {
        document.dispatchEvent(new CustomEvent('draft-complete'));
    }
    getHumanPack() {
        return this.seats[0].currentPack;
    }
}