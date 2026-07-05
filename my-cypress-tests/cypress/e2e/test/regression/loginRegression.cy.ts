import { loginPage } from "../../pages/loginPage";

describe("Login Page — Regression Tests", { tags: ["regression"] }, () => {
  describe("Login with different users", () => {
    beforeEach(() => {
      loginPage.openLoginPage();
    });

    const users = [
      { username: "admin", password: "123456", role: "مدیر سیستم" },
      { username: "operator", password: "123456", role: "اپراتور" },
      { username: "manager", password: "123456", role: "مدیر پروژه" },
    ];

    users.forEach(({ username, password, role }) => {
      it(`user ${username} with role ${role} should login`, () => {
        loginPage.login(username, password);
        cy.url().should("include", "/dashboard");
        cy.getByCy("user-fullname").should("not.be.empty");
      });
    });
  });

  describe("Form validation", () => {
    beforeEach(() => {
      loginPage.openLoginPage();
    });

    it("should show validation error with short password", () => {
      loginPage.enterUserNameInput("admin");
      loginPage.enterPasswordInput("12");
      cy.getByCy("login-button").click();
      cy.getByCy("login-error").should("be.visible");
    });

    it("should show error with empty username", () => {
      loginPage.enterPasswordInput("123456");
      cy.getByCy("login-button").click();
      cy.getByCy("login-error").should("be.visible");
    });
  });

  describe("Direct access (without login)", () => {
    it("should redirect to login page when accessing dashboard directly", () => {
      cy.visit("/dashboard.html");
      cy.url().should("eq", Cypress.config().baseUrl + "/");
    });
  });

  describe("Logout", () => {
    it("should return to login page after logout", () => {
      loginPage.openLoginPage().login("admin", "123456");
      cy.url().should("include", "/dashboard.html");
      cy.getByCy("logout-button").click();
      cy.url().should("eq", Cypress.config().baseUrl + "/");
      cy.getByCy("login-form").should("be.visible");
    });
  });
});
