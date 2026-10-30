import { generateId } from './memoryStoreIds.js';
import { buildSeedDataset } from '../../data/buildSeedDataset.js';

class MemoryDataStore {
  constructor() {
    this.users = [];
    this.drivers = [];
    this.buses = [];
    this.routes = [];
    this.stops = [];
    this.trips = [];
    this.alerts = [];
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    const dataset = await buildSeedDataset();
    this.users = dataset.users;
    this.routes = dataset.routes;
    this.stops = dataset.stops;
    this.buses = dataset.buses;
    this.drivers = dataset.drivers;
    this.trips = dataset.trips;
    this.alerts = dataset.alerts;

    this.initialized = true;
    console.log(
      `[MemoryStore] Seeded real Karachi transit data: ${this.routes.length} BRT/metro corridors, ` +
      `${this.stops.length} stops, ${this.buses.length} buses, ${this.drivers.length} drivers.`
    );
  }

  // Wipe and re-seed (used by scripts/seedRealData.js in memory mode)
  async reset() {
    this.initialized = false;
    await this.initialize();
  }
}

export const memoryStore = new MemoryDataStore();
export default memoryStore;
export { generateId };
