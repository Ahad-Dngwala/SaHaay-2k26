import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  driverId: null,
  driverName: '',
  phoneNumber: '',
  location: {
    latitude: 0,
    longitude: 0,
    accuracy: 0,
  },
  isTracking: false,
  status: 'offline', // offline, online, on-mission
};

const driverSlice = createSlice({
  name: 'driver',
  initialState,
  reducers: {
    setDriver: (state, action) => {
      state.driverId = action.payload.driverId;
      state.driverName = action.payload.driverName;
      state.phoneNumber = action.payload.phoneNumber;
    },
    updateLocation: (state, action) => {
      state.location = action.payload;
    },
    setTracking: (state, action) => {
      state.isTracking = action.payload;
    },
    setStatus: (state, action) => {
      state.status = action.payload;
    },
  },
});

export const { setDriver, updateLocation, setTracking, setStatus } =
  driverSlice.actions;
export default driverSlice.reducer;
