// TODO: emergencySlice
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { emergencyAPI } from '../../../api';

export const sendEmergency = createAsyncThunk(
  'emergency/send',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await emergencyAPI.sendEmergency(payload);
      if (!response.ok) throw new Error('Failed to send');
      return await response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const emergencySlice = createSlice({
  name: 'emergency',
  initialState: {
    isActive: false,
    missionId: null,
    status: 'idle',
    location: null,
    error: null,
  },
  reducers: {
    emergencyCancelled: (state) => {
      state.isActive = false;
      state.status = 'cancelled';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendEmergency.pending, (state) => {
        state.status = 'sending';
      })
      .addCase(sendEmergency.fulfilled, (state, action) => {
        state.status = 'sent';
        state.missionId = action.payload.missionId;
        state.isActive = true;
      })
      .addCase(sendEmergency.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const { emergencyCancelled } = emergencySlice.actions;
export default emergencySlice.reducer;
