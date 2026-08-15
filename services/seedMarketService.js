class SeedMarketService {
  constructor() {
    this.listings = [];
    this.orders = [];
  }

  // Crea una nuova offerta
  createListing(data) {
    const listing = {
      id: `LISTING-${Date.now()}`,
      name: data.name,
      type: data.type || 'seed',
      price: data.price || 0.001,
      quantity: data.quantity || 10,
      gardenId: data.gardenId,
      description: data.description || '',
      available: true,
      createdAt: new Date()
    };
    this.listings.push(listing);
    return listing;
  }

  // Acquista
  purchase(listingId, quantity) {
    const listing = this.listings.find(l => l.id === listingId);
    if (!listing) throw new Error('Listing not found');
    if (!listing.available) throw new Error('Listing not available');
    if (listing.quantity < quantity) throw new Error('Insufficient quantity');

    listing.quantity -= quantity;
    if (listing.quantity === 0) listing.available = false;

    const order = {
      id: `ORDER-${Date.now()}`,
      listingId,
      quantity,
      total: quantity * listing.price,
      status: 'completed',
      timestamp: new Date()
    };
    this.orders.push(order);
    return order;
  }

  getListings() {
    return this.listings.filter(l => l.available);
  }

  getStats() {
    return {
      totalListings: this.listings.length,
      available: this.listings.filter(l => l.available).length,
      totalOrders: this.orders.length
    };
  }
}

module.exports = new SeedMarketService();
