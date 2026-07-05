import { LOCATORS } from "../locators/locators";

export class Sidebar {
  clickDashboard(): Cypress.Chainable<Element> {
    return cy.getDynamicMenu("Dashboard").click();
  }

  siamService(): Cypress.Chainable<Element> {
    return cy.getByCy(LOCATORS.Sidebar.Siam_Service).click();
  }

  announcements(): Cypress.Chainable<Element> {
    return cy.getByCy(LOCATORS.Sidebar.Announcements).click();
  }

  changeTheme(): Cypress.Chainable<Element> {
    return cy.getByCy(LOCATORS.Sidebar.Change_Theme).click();
  }

  loginAs(): Cypress.Chainable<Element> {
    return cy.getByCy(LOCATORS.Sidebar.Login_As).click();
  }

  logoutAndYesButton(): Cypress.Chainable<Element> {
    cy.getByCy(LOCATORS.Sidebar.Logout).click();
    return cy.getByCy(LOCATORS.Sidebar.Yes_Button).click();
  }
}

export const sidebar = new Sidebar();
