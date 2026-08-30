import { create } from 'zustand';
import { farmApi } from '../services/api';

const useFarmStore = create((set, get) => ({
  farm: null,
  availableCrops: [],
  loading: false,
  error: null,

  fetchFarm: async () => {
    set({ loading: true, error: null });
    try {
      const data = await farmApi.getFarm();
      set({ farm: data, loading: false });
    } catch (err) {
      console.error('Error fetching farm:', err);
      set({ error: err.message, loading: false });
    }
  },

  fetchAvailableCrops: async () => {
    try {
      const data = await farmApi.getAvailableCrops();
      set({ availableCrops: data });
    } catch (err) {
      console.error('Error fetching available crops:', err);
    }
  },

  plantSeed: async (plotIndex, cropId) => {
    try {
      await farmApi.plant(plotIndex, cropId);
      await get().fetchFarm();
    } catch (err) {
      console.error('Error planting seed:', err);
      throw err;
    }
  }
}));

export default useFarmStore;
