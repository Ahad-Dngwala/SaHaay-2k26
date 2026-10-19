import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  userId: null,
  userName: '',
  email: '',
  phoneNumber: '',
  isAuthenticated: false,
  profile: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.userId = action.payload.userId;
      state.userName = action.payload.userName;
      state.email = action.payload.email;
      state.phoneNumber = action.payload.phoneNumber;
      state.isAuthenticated = true;
    },
    setProfile: (state, action) => {
      state.profile = action.payload;
    },
    clearUser: (state) => {
      state.userId = null;
      state.userName = '';
      state.email = '';
      state.phoneNumber = '';
      state.isAuthenticated = false;
      state.profile = null;
    },
  },
});

export const { setUser, setProfile, clearUser } = userSlice.actions;
export default userSlice.reducer;
