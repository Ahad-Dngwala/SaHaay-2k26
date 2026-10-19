import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const acceptMission = createAsyncThunk(
  'mission/accept',
  async (missionId) => {
    // API call to accept mission
    return { missionId, status: 'accepted' };
  }
);

const missionSlice = createSlice({
  name: 'mission',
  initialState: {
    activeMission: null,
    availableMissions: [],
    status: 'idle',
  },
  reducers: {
    clearMission: (state) => {
      state.activeMission = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(acceptMission.fulfilled, (state, action) => {
      state.activeMission = action.payload;
      state.status = 'active';
    });
  },
});

export const { clearMission } = missionSlice.actions;
export default missionSlice.reducer;
