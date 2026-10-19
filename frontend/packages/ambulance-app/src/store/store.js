import { configureStore } from '@reduxjs/toolkit';
import missionReducer from './slices/missionSlice';

export const store = configureStore({
  reducer: {
    mission: missionReducer,
  },
});
