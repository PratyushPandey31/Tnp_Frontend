export interface IAdminRegister {
  name: string;
  email: string;
  passwordHash: string; // The backend expects 'passwordHash'
  role: string;
  designation: string;
}