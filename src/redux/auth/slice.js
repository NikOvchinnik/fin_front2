import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isAuthenticated: false,
  user: {
    id: null,
    name: '',
    role: 0,
    departmentId: null,
    unitId: null,
    isPayrollManager: false,
    hasFinanceStaffAccess: false,
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
        role: user.user_role_id ?? user.user_role?.id ?? user.user_role,
        departmentId: user.user_department_id,
        unitId: user.user_unit_id,
        isPayrollManager: Boolean(user.user_is_payroll_manager),
        hasFinanceStaffAccess: Boolean(user.user_has_finance_staff_access),
      };
    },
    logout: () => initialState,
    resetState: () => initialState,
  },
});

export const { loginSuccess, logout, resetState } = authSlice.actions;
export const authReducer = authSlice.reducer;
