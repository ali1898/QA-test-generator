/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      uploadFile(selector: string, filePath: string): Chainable<void>;
      getByCy(value: string): Chainable<JQuery<HTMLElement>>;
      clickIfVisible(selector: string): Chainable<void>;
      loginByApi(username: string, password: string): Chainable<void>;
    }
  }
}

export {};
