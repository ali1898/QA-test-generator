export const LOCATORS = {
  LOGIN_PAGE: {
    Username_Input: "[formcontrolname='username']",
    Password_Input: "[formcontrolname='password']",
    Login_Button: "login",
  },
  Sidebar: {
    Siam_Service: "checkRunService",
    Announcements: "notifications",
    Change_Theme: "toggleTheme",
    Login_As: "showImpersonateDlg",
    Logout: "stopImpersonate",
    Yes_Button: "onOkClick",
    No_Button: "onNoClick",
  },
} as const;

export type Locators = typeof LOCATORS;
