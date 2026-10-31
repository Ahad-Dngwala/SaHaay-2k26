import { createSlice } from '@reduxjs/toolkit';

const gearoSlice = createSlice({
  name: 'gearo',
  initialState: {
    isMonitoring: false,
    vibrationLevel: 0,
    showCancelFlash: false,
    threshold: 2.5,
  },
  reducers: {
    startMonitoring: (state) => {
      state.isMonitoring = true;
    },
    updateVibration: (state, action) => {
      state.vibrationLevel = action.payload;
      if (action.payload > state.threshold) {
        state.showCancelFlash = true;
      }
    },
    cancelFlash: (state) => {
      state.showCancelFlash = false;
    },
  },
});

export const { startMonitoring, updateVibration, cancelFlash } = gearoSlice.actions;
export default gearoSlice.reducer;
