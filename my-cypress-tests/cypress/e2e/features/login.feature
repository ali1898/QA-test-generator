@smoke
Feature: Login
  As a registered user
  I want to log in
  So that I can access my account

  Scenario Outline: Successful login with different users
    Given I am on the login page
    When I enter username "<username>" and password "<password>"
    And I submit the login form
    Then I should be redirected to the dashboard
    And my full name "<fullName>" should be displayed

    Examples:
      | username | password | fullName    |
      | admin    | 123456   | Admin User  |
      | operator | 123456   | Operator    |

  @regression
  Scenario: Login fails with invalid credentials
    Given I am on the login page
    When I enter invalid credentials
    And I submit the login form
    Then I should see an error message
