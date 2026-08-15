// Versione semplificata - senza dipendenze esterne
class NFTService {
    constructor() {
        console.log('✅ NFT Service initialized (simplified)');
    }

    async mintNFT(garden, user) {
        const tokenId = Math.floor(Math.random() * 1000000) + 1;
        console.log(`🎨 Minted NFT for garden ${garden.name}: tokenId ${tokenId}`);
        return tokenId;
    }

    async getGardenNFT(tokenId) {
        return {
            tokenId,
            owner: '0x0000000000000000000000000000000000000000',
            garden: {
                name: 'Orto NFT',
                location: '44.0678,12.5695',
                size: 100,
                cropType: 'pomodori, basilico',
                price: 0.01
            },
            price: 0.01
        };
    }
}

module.exports = new NFTService();
