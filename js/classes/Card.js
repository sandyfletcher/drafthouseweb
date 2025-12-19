export class Card {
    constructor(data) {
        this.guid = crypto.randomUUID(); // unique ID to differentiate copies
        this.id = data.id; // scryfall ID is shared by duplicates
        this.name = data.name;
        this.rarity = data.rarity; 
        this.type_line = data.type_line || ""; 
        this.colors = data.colors || [];
        this.image = data.image; 
        this.backImage = data.back_image;
        this.layout = data.layout;
        this.isFoil = data.is_foil || false; 
        this.cmc = data.cmc !== undefined ? data.cmc : (data.mana_value || 0);
        this.element = null;
    }
    render() {
        const container = document.createElement('div');
        container.classList.add('card');
        container.dataset.id = this.id;
        container.dataset.guid = this.guid;
        container.classList.add(`rarity-${this.rarity}`); // rarity class for shadows
        if (this.isFoil) { // foil effect
            container.classList.add('foil');
        }
        const img = document.createElement('img');
        img.src = this.image;
        img.alt = this.name;
        img.loading = "lazy"; 
        container.appendChild(img);
        if (this.backImage) { // flip button
            const flipBtn = document.createElement('button');
            flipBtn.innerText = '↺';
            flipBtn.className = 'flip-btn';
            flipBtn.onclick = (e) => {
                e.stopPropagation(); 
                this.flip(img);
            };
            container.appendChild(flipBtn);
        }
        this.element = container;
        return container;
    }
    flip(imgElement) {
        const currentSrc = imgElement.getAttribute('src');
        if (currentSrc.includes(this.image)) {
            imgElement.src = this.backImage;
        } else {
            imgElement.src = this.image;
        }
    }
}