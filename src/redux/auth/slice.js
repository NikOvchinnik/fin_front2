import { createSlice } from '@reduxjs/toolkit';
import { jwtDecode } from 'jwt-decode';

const initialState = {
  isAuthenticated: false,
  user: {
    id: null,
    name: '',
    role: 0,
    departmentId: null,
    projectId: null,
  },
  token: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess: (state, action) => {
      const { token, user } = action.payload;
      state.isAuthenticated = true;
      state.token = token;
      state.user = {
        id: user.user_id,
        name: user.user_name,
        role: user.user_role,
        departmentId: user.user_department_id,
        projectId: user.user_project_id,
      };
    },
    logout: () => initialState,
    resetState: () => initialState,
  },
});

export const { loginSuccess, logout, resetState } = authSlice.actions;
export const authReducer = authSlice.reducer;
