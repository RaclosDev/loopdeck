/**
 * LoopDeck — Farm Store (Zustand)
 * Manages all farm state: plots, inventory, level, coins.
 */
import { create } from 'zustand';
import { farmApi } from '../services/api';

const useFarmStore = create((set, get) => ({
  farm: null,
  plots: [],
  inventory: [],
  loading: false,
  error: null,

  // Load farm data
  loadFarm: async () => {
    set({ loading: true, error: null });
    try {
      const data = await farmApi.getFarm();
      set({ farm: data.farm, plots: data.plots, inventory: data.inventory, loading: false });
      return data;
    } catch (e) {
      set({ error: e.message, loading: false });
      throw e;
    }
  },

  // Plant a crop
  plant: async (plotIndex, cropId) => {
    const data = await farmApi.plant(plotIndex, cropId);
    // Reload full farm to get updated coins
    await get().loadFarm();
    return data;
  },

  // Harvest a single plot
  harvest: async (plotIndex) => {
    const result = await farmApi.harvest(plotIndex);
    await get().loadFarm();
    return result;
  },

  // Harvest all ready plots
  harvestAll: async () => {
    const result = await farmApi.harvestAll();
    await get().loadFarm();
    return result;
  },

  // Buy a new plot
  buyPlot: async () => {
    const data = await farmApi.buyPlot();
    set({ farm: data.farm, plots: data.plots, inventory: data.inventory });
    return data;
  },

  // Buy an item
  buyItem: async (itemId, quantity = 1) => {
    const data = await farmApi.buyItem(itemId, quantity);
    set({ farm: data.farm, plots: data.plots, inventory: data.inventory });
    return data;
  },

  // Use an item
  useItem: async (itemId, plotIndex = null) => {
    const data = await farmApi.useItem(itemId, plotIndex);
    set({ farm: data.farm, plots: data.plots, inventory: data.inventory });
    return data;
  },

  // Buy a tool
  buyTool: async (toolId) => {
    const data = await farmApi.buyTool(toolId);
    set({ farm: data.farm, plots: data.plots, inventory: data.inventory });
    return data;
  },

  // Buy a decoration
  buyDecoration: async (decorationId) => {
    const data = await farmApi.buyDecoration(decorationId);
    set({ farm: data.farm, plots: data.plots, inventory: data.inventory });
    return data;
  },

  // Clear a dead plot
  clearPlot: async (plotIndex) => {
    const data = await farmApi.clearPlot(plotIndex);
    set({ farm: data.farm, plots: data.plots, inventory: data.inventory });
    return data;
  },
}));

export default useFarmStore;
