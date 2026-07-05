import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor";
import { loginPage } from "../../pages/loginPage";

Given("I am on the login page", () => {
  loginPage.openLoginPage();
});

When("I enter username {string} and password {string}", (username: string, password: string) => {
  loginPage.enterUserNameInput(username);
  loginPage.enterPasswordInput(password);
});

When("I enter invalid credentials", () => {
  loginPage.enterUserNameInput("invalid");
  loginPage.enterPasswordInput("invalid");
});

When("I submit the login form", () => {
  loginPage.clickLoginButton();
});

Then("I should be redirected to the dashboard", () => {
  cy.url().should("include", "/dashboard");
});

Then("my full name {string} should be displayed", (fullName: string) => {
  cy.getByCy("user-fullname").should("contain.text", fullName);
});

Then("I should see an error message", () => {
  cy.getByCy("login-error").should("be.visible");
});
