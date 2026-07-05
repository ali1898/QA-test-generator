import { defineConfig } from "cypress";
import createBundler from "@bahmutov/cypress-esbuild-preprocessor";
import { addCucumberPreprocessorPlugin } from "@badeball/cypress-cucumber-preprocessor";
import createEsbuildPlugin from "@badeball/cypress-cucumber-preprocessor/esbuild";

import allureWriter from "@shelex/cypress-allure-plugin/writer";

export default defineConfig({
  viewportWidth: 1920,
  viewportHeight: 1080,
  defaultCommandTimeout: 10000,
  watchForFileChanges: false,
  experimentalInteractiveRunEvents: true,
  video: true,
  videoCompression: 32,
  videosFolder: "cypress/videos",
  screenshotOnRunFailure: true,
  screenshotsFolder: "cypress/screenshots",
  e2e: {
    baseUrl: "https://example.cypress.io",
    specPattern: ["cypress/e2e/**/*.cy.ts", "cypress/e2e/**/*.feature"],
    supportFile: "cypress/support/e2e.ts",
    retries: {
      runMode: 0,
      openMode: 0,
    },
    async setupNodeEvents(on, config) {
      await addCucumberPreprocessorPlugin(on, config);
      on("file:preprocessor", createBundler({ plugins: [createEsbuildPlugin(config)] }));
      config.env.allure = true;
      require("@shelex/cypress-allure-plugin/writer")(on, config);
      on("task", {
        deleteFileTask(fileName: string): Promise<null> {
          return new Promise((resolve, reject) => {
            const fs = require("fs");
            fs.rm(fileName, { maxRetries: 10, recursive: true }, (err: any) => {
              if (err) return reject(err);
              resolve(null);
            });
          });
        },
      });
      return config;
    },
  },
});
