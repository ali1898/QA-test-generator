/// <reference types="cypress" />

Cypress.Commands.add("uploadFile", (selector: string, filePath: string) => {
  cy.get(selector).selectFile(filePath, { force: true });
});

Cypress.Commands.add("getByCy", (value: string) => {
  return cy.get(`[data-cy="${value}"]`);
});

Cypress.Commands.add("clickIfVisible", (selector: string) => {
  cy.get("body").then(($body) => {
    const el = $body.find(selector);
    if (el.length && el.is(":visible")) {
      cy.wrap(el).click();
    }
  });
});

Cypress.Commands.add("loginByApi", (username: string, password: string) => {
  cy.request({
    method: "POST",
    url: "/api/login",
    body: { username, password },
  }).then((response) => {
    expect(response.status).to.eq(200);
    expect(response.body.success).to.be.true;
    cy.setCookie("token", response.body.token);
  });
});
