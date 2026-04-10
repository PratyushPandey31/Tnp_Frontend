export interface IRegister {
  tnprollNo: string;
  name: string;
  email: string;
  password?: string;
  branch: string;
  year: number;     // Corresponds to the passing/batch year
  cgpa: number;
  skills: string;   // Note: Your swagger accepts this as a single string (e.g., "React, Node, Python")
  profilePicUrl?: string; 
}