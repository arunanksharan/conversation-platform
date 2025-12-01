# Git Commit Conventions

> A world-class commit convention guide based on practices from Google, Angular, Linux Kernel, Conventional Commits, and leading open-source projects.

---

## Commit Message Format

Every commit message consists of a **header**, **body**, and **footer**:

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

The **header** is mandatory. The **scope** is optional but recommended.

---

## 1. Header

### Format

```
<type>(<scope>): <subject>
```

**Maximum length: 72 characters** (GitHub truncates at 72)

### Types

| Type       | Description                                                         |
| ---------- | ------------------------------------------------------------------- |
| `feat`     | A new feature for the user                                          |
| `fix`      | A bug fix for the user                                              |
| `docs`     | Documentation only changes                                          |
| `style`    | Code style changes (formatting, semicolons, etc.) — no logic change |
| `refactor` | Code change that neither fixes a bug nor adds a feature             |
| `perf`     | Performance improvements                                            |
| `test`     | Adding or correcting tests                                          |
| `build`    | Changes to build system or external dependencies                    |
| `ci`       | Changes to CI configuration files and scripts                       |
| `chore`    | Other changes that don't modify src or test files                   |
| `revert`   | Reverts a previous commit                                           |
| `security` | Security-related changes or fixes                                   |
| `wip`      | Work in progress (should be squashed before merge)                  |

### Scope

The scope provides additional contextual information about the area of the codebase affected:

```
feat(auth): add OAuth2 support
fix(api/users): resolve null pointer in user lookup
docs(readme): update installation instructions
```

**Common scope examples:**

- Module/component names: `auth`, `api`, `ui`, `database`
- Layer names: `controller`, `service`, `repository`
- Feature areas: `payments`, `notifications`, `search`
- Nested scopes: `api/users`, `ui/dashboard`

### Subject

The subject is a succinct description of the change:

- **Use imperative, present tense:** "add" not "added" nor "adds"
- **Don't capitalize the first letter**
- **No period (.) at the end**
- **Complete the sentence:** "This commit will..." + your subject

**Good examples:**

```
feat(cart): add ability to remove items
fix(auth): prevent session timeout on active users
refactor(api): simplify error handling logic
```

**Bad examples:**

```
feat(cart): Added ability to remove items    ❌ Past tense
fix(auth): Prevents session timeout.         ❌ Capitalized, period, third person
refactor: stuff                              ❌ Vague, no scope
```

---

## 2. Body

The body should include the **motivation** for the change and contrast with previous behavior.

### Guidelines

- Wrap at **72 characters** per line
- Separate from header with a **blank line**
- Use imperative, present tense
- Explain **what** and **why**, not **how**
- Include context that isn't obvious from the code

### Example

```
fix(auth): prevent race condition in token refresh

The token refresh mechanism was susceptible to race conditions when
multiple API calls triggered simultaneous refresh attempts. This led
to invalid token states and user logouts.

Implement a mutex lock around the refresh logic to ensure only one
refresh operation executes at a time. Subsequent requests wait for
the ongoing refresh to complete.
```

---

## 3. Footer

### Breaking Changes

Breaking changes **MUST** be indicated in the footer with `BREAKING CHANGE:` or by appending `!` after the type/scope:

```
feat(api)!: change authentication endpoint response format

BREAKING CHANGE: The /auth/login endpoint now returns a nested
token object instead of a flat response. Clients must update
their parsing logic.

Before: { "token": "xxx", "expires": 3600 }
After:  { "data": { "token": "xxx", "expires": 3600 } }
```

### Issue References

Reference issues and pull requests in the footer:

```
fix(payments): resolve decimal precision in currency conversion

Fixes #1234
Closes #1235
Refs #1200
```

**Keywords:**

- `Fixes #123` — Closes the issue when merged
- `Closes #123` — Same as Fixes
- `Resolves #123` — Same as Fixes
- `Refs #123` — References without closing
- `See #123` — Informal reference

### Co-Authors

Credit co-authors for pair programming or collaborative commits:

```
feat(dashboard): implement real-time analytics widget

Co-authored-by: Jane Doe <jane@example.com>
Co-authored-by: John Smith <john@example.com>
```

### Signed-off-by (DCO)

For projects requiring Developer Certificate of Origin:

```
docs(contributing): update contribution guidelines

Signed-off-by: Developer Name <developer@example.com>
```

---

## 4. Special Commit Types

### Revert Commits

```
revert: feat(auth): add OAuth2 support

This reverts commit abc1234def5678.

Reason: OAuth2 integration causing memory leaks in production.
Will reintroduce after fixing the connection pool issue.
```

### Merge Commits

```
Merge branch 'feature/user-dashboard' into main

* feature/user-dashboard:
  feat(dashboard): add export functionality
  feat(dashboard): implement chart components
  fix(dashboard): resolve data loading race condition
```

### Initial Commit

```
chore: initial project setup

Initialize repository with:
- Project structure and configuration
- Development environment setup
- CI/CD pipeline configuration
- Documentation templates
```

---

## 5. Semantic Versioning Correlation

Commits directly influence semantic versioning:

| Commit Type       | Version Bump  | Example       |
| ----------------- | ------------- | ------------- |
| `fix`             | PATCH (0.0.x) | 1.0.0 → 1.0.1 |
| `feat`            | MINOR (0.x.0) | 1.0.0 → 1.1.0 |
| `BREAKING CHANGE` | MAJOR (x.0.0) | 1.0.0 → 2.0.0 |

---

## 6. Best Practices

### Atomic Commits

Each commit should represent **one logical change**:

```
# Good: Separate concerns
git commit -m "refactor(auth): extract token validation logic"
git commit -m "feat(auth): add token expiration warning"
git commit -m "test(auth): add token validation test cases"

# Bad: Multiple unrelated changes
git commit -m "refactor auth, add warning, fix tests, update readme"
```

### Commit Frequency

- Commit **early and often** during development
- **Squash** WIP commits before merging to main
- Each commit on main should be **deployable**

### Branch Naming Convention

Align branch names with commit conventions:

```
feat/user-authentication
fix/login-timeout-issue
docs/api-documentation
refactor/database-layer
```

### Pre-commit Checklist

Before committing, ensure:

- [ ] Code compiles/builds successfully
- [ ] All tests pass
- [ ] Linting passes with no errors
- [ ] Commit message follows conventions
- [ ] No sensitive data (secrets, keys) included
- [ ] Changes are logically grouped

---

## 7. Tooling Integration

### Commitlint

Enforce commit conventions with [commitlint](https://commitlint.js.org/):

```javascript
// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
      ],
    ],
    'subject-case': [2, 'always', 'lower-case'],
    'header-max-length': [2, 'always', 72],
    'body-max-line-length': [2, 'always', 72],
  },
};
```

### Husky Pre-commit Hook

```json
// package.json
{
  "husky": {
    "hooks": {
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
    }
  }
}
```

### Commitizen

Interactive commit message builder:

```bash
npm install -g commitizen cz-conventional-changelog
echo '{ "path": "cz-conventional-changelog" }' > ~/.czrc
git cz  # Instead of git commit
```

### Semantic Release

Automated versioning based on commits:

```yaml
# .releaserc.yml
branches: ['main']
plugins:
  - '@semantic-release/commit-analyzer'
  - '@semantic-release/release-notes-generator'
  - '@semantic-release/changelog'
  - '@semantic-release/npm'
  - '@semantic-release/git'
```

---

## 8. Complete Examples

### Feature Addition

```
feat(notifications): add push notification support for mobile

Implement push notification system using Firebase Cloud Messaging
for real-time alerts on mobile devices.

Features included:
- Device token registration and management
- Notification payload customization
- Background and foreground handling
- Notification preferences per user

The implementation follows the adapter pattern to allow future
integration with other push notification providers.

Closes #892
Refs #850
```

### Bug Fix

```
fix(checkout): resolve cart total calculation with discounts

Cart totals were incorrectly calculated when multiple percentage
discounts were applied. The discounts were being applied to the
original price instead of the running total.

Changed calculation to apply discounts sequentially to ensure
accurate final pricing.

Fixes #1456
```

### Performance Improvement

```
perf(search): optimize database queries for product search

Reduce search response time from ~800ms to ~120ms by:
- Adding composite index on (category_id, name, created_at)
- Implementing query result caching with 5-minute TTL
- Replacing N+1 queries with eager loading

Benchmark results:
- 100 concurrent users: 120ms avg (was 800ms)
- 1000 concurrent users: 180ms avg (was 2400ms)

Refs #1678
```

### Breaking Change

```
feat(api)!: migrate to v2 authentication system

BREAKING CHANGE: The authentication system has been completely
redesigned to support OAuth 2.0 and improve security.

Migration steps:
1. Update client SDK to version 3.0+
2. Replace /auth/login with /v2/auth/token
3. Use Bearer token in Authorization header
4. Update token refresh logic for new endpoints

Old endpoints will remain available at /v1/* for 6 months
before deprecation.

See migration guide: https://docs.example.com/auth-migration

Closes #2001
```

---

## 9. Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│                    COMMIT MESSAGE FORMAT                     │
├─────────────────────────────────────────────────────────────┤
│  <type>(<scope>): <subject>                    ← max 72 ch  │
│                                                              │
│  [body]                                        ← wrap at 72  │
│                                                              │
│  [footer]                                                    │
├─────────────────────────────────────────────────────────────┤
│  TYPES: feat fix docs style refactor perf test build ci     │
│         chore revert security                                │
├─────────────────────────────────────────────────────────────┤
│  SUBJECT: imperative mood, lowercase, no period             │
├─────────────────────────────────────────────────────────────┤
│  BREAKING CHANGE: feat(api)!: ... or footer notation        │
├─────────────────────────────────────────────────────────────┤
│  ISSUES: Fixes #123 | Closes #123 | Refs #123               │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. Author -

- Do not mention Claude as an author. Only mention human names/emails

## References

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Angular Commit Guidelines](https://github.com/angular/angular/blob/main/CONTRIBUTING.md#commit)
- [Linux Kernel Git Guide](https://www.kernel.org/doc/html/latest/process/submitting-patches.html)
- [Semantic Versioning](https://semver.org/)
- [Git Best Practices](https://git-scm.com/book/en/v2)

---

_Last updated: 2025_
