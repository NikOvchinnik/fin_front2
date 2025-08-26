import { createSlice } from '@reduxjs/toolkit';
import { jwtDecode } from 'jwt-decode';

const initialState = {
  isAuthenticated: false,
  user: {
    id: null,
    name: '',
    role: 0,
    departmentId: null,
    unitId: null,
  },
  token: null,
};

// const parseToken = token => {
//   try {
//     const decodedToken = jwtDecode(token);
//      return {
//        id: decodedToken.user_id || null,
//        name: decodedToken.user_name || '',
//        role: decodedToken.user_role || 0,
//        departmentId: decodedToken.user_department_id || null,
//        unitId: decodedToken.user_unit_id || null,
//      };
//   } catch (error) {
//     console.error('Invalid token:', error);
//     return initialState.user;
//   }
// };

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
        unitId: user.user_unit_id,
      };
    },
    logout: () => initialState,
    resetState: () => initialState,
  },
});

export const { loginSuccess, logout, resetState } = authSlice.actions;
export const authReducer = authSlice.reducer;
