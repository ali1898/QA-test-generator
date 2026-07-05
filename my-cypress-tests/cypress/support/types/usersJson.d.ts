export interface User {
  username: string;
  password: string;
  fullName: string;
  role: "admin" | "operator" | "manager";
}

export interface UsersData {
  [key: string]: User;
}
