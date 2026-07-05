import { loginPage } from "../../pages/loginPage";

describe("Login Page — Smoke Tests", { tags: ["smoke"] }, () => {
  beforeEach(() => {
    loginPage.openLoginPage();
  });

  it("should display the login form", () => {
    cy.getByCy("login-form").should("be.visible");
  });

  it("should show an error with empty fields", () => {
    cy.getByCy("login-button").click();
    cy.getByCy("login-error").should("be.visible");
  });

  it("should login with valid credentials", () => {
    loginPage.login("admin", "123456");
    cy.url().should("include", "/dashboard");
  });

  it("should show error with invalid credentials", () => {
    loginPage.login("wrong", "wrong");
    cy.getByCy("login-error").should("be.visible");
  });
});
