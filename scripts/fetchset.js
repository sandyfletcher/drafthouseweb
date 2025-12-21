// scrapes set data from scryfall site
// usage:
// node scripts/fetchset.js [setcode]

import fs from 'fs';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import { pipeline } from 'stream/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const args = process.argv.slice(2);
const SET_CODE = args[0] ? args[0].toLowerCase() : 'dsk'; // default if empty
const DATA_DIR = path.join(__dirname, `../src/data`);
const IMAGES_DIR = path.join(__dirname, `../cards`, SET_CODE); 
const OUTPUT_FILE = path.join(DATA_DIR, `${SET_CODE}.json`);

async function downloadImage(url, filepath) {
    if (fs.existsSync(filepath)) return; // skip if already there
    try {
        const response = await axios.get(url, { responseType: 'stream' });
        await pipeline(response.data, fs.createWriteStream(filepath));
    } catch (error) {
        console.error(`FAILED TO DOWNLOAD ${url}: ${error.message}`);
    }
}

// helper to slow requests
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchSetData() {
    console.log(`\nFETCHING SET: ${SET_CODE.toUpperCase()}`);
    // ensure directories exist
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });
    let allCards = [];
    let hasMore = true;
    // filter out digital-only cards
    let url = `https://api.scryfall.com/cards/search?q=set:${SET_CODE}+game:paper&unique=cards&order=set`;
    try {
        process.stdout.write(`QUERYING SCRYFALL API`);
        while (hasMore) {
            const response = await axios.get(url);
            const data = response.data;
            allCards = [...allCards, ...data.data];
            if (data.has_more) {
                url = data.next_page;
                await sleep(100);
            } else {
                hasMore = false;
            }
        }
        console.log(`=\n FOUND ${allCards.length} CARDS.`);
        // process and download
        const processedCards = [];
        for (let i = 0; i < allCards.length; i++) {
            const c = allCards[i];
            // log progress
            if (i % 20 === 0) process.stdout.write(`\r      Processing ${i}/${allCards.length}...`);
            // account for unusual card layouts
            let frontImageRemote = null;
            let backImageRemote = null;
            let isDoubleFaced = false;
            // check root for images
            if (c.image_uris && c.image_uris.normal) {
                frontImageRemote = c.image_uris.normal;
            } 
            // check alternate locations
            else if (c.card_faces && c.card_faces.length > 1) {
                frontImageRemote = c.card_faces[0].image_uris?.normal;
                backImageRemote = c.card_faces[1].image_uris?.normal;
                isDoubleFaced = true;
            }
            // define/initialize local paths
            let frontLocalPath = "";
            let backLocalPath = "";
            if (frontImageRemote) {
                const filename = `${c.id}_f.jpg`;
                const fullPath = path.join(IMAGES_DIR, filename);
                await downloadImage(frontImageRemote, fullPath);
                // assign web-accessible path
                frontLocalPath = `/cards/${SET_CODE}/${filename}`;
            }
            if (backImageRemote) {
                const filename = `${c.id}_b.jpg`;
                const fullPath = path.join(IMAGES_DIR, filename);
                await downloadImage(backImageRemote, fullPath);
                backLocalPath = `/cards/${SET_CODE}/${filename}`;
            }
            // map data
            processedCards.push({
                id: c.id,
                name: c.name,
                set: c.set,
                collector_number: c.collector_number,
                rarity: c.rarity,
                layout: c.layout,
                mana_cost: c.mana_cost || c.card_faces?.[0]?.mana_cost || "",
                cmc: c.cmc || 0,
                type_line: c.type_line,
                colors: c.colors || c.card_faces?.[0]?.colors || [],
                color_identity: c.color_identity,
                booster: c.booster,
                image: frontLocalPath,
                back_image: isDoubleFaced ? backLocalPath : null,
                oracle_text: c.oracle_text || c.card_faces?.map(f => f.oracle_text).join('\n//\n') || ""
            });
            await sleep(20); 
        }
        console.log(`\nPROCESSED ${processedCards.length} CARDS`);
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(processedCards, null, 2));
    } catch (error) {
        console.error("\nERROR OCCURRED:", error.message);
    }
}
fetchSetData();