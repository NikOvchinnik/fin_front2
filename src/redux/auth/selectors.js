export const selectIsAuthenticated = state => state.auth.isAuthenticated;
export const selectToken = state => state.auth.token;
export const selectUserId = state => state.auth.user.id;
export const selectUserRole = state => state.auth.user.role;
export const selectUserName = state => state.auth.user.name;
export const selectUserDepartmentId = state => state.auth.user.departmentId;
export const selectUserProjectId = state => state.auth.user.projectId;