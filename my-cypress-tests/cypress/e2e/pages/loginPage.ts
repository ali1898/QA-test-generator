import { LOCATORS } from "../locators/locators";

export class LoginPage {
  openLoginPage(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.visit("/");
  }

  enterUserNameInput(username: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get(LOCATORS.LOGIN_PAGE.Username_Input).type(username);
  }

  enterPasswordInput(password: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get(LOCATORS.LOGIN_PAGE.Password_Input).type(password);
  }

  clickLoginButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.getByCy(LOCATORS.LOGIN_PAGE.Login_Button).click();
  }

  login(username: string, password: string): this {
    this.enterUserNameInput(username);
    this.enterPasswordInput(password);
    this.clickLoginButton();
    return this;
  }
}

export const loginPage = new LoginPage();
