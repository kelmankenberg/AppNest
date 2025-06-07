# APP RELEASE PROCESS

This document outlines the steps to create a new release of AppNest using GitHub Actions.

## PREREQUISITES

- Node.js 18 or later
- Git installed and configured
- GitHub account with write access to the repository

## RELEASE STEPS

### 1. Update Version Number

Before creating a release, update the version number in `package.json`:

```json
"version": "0.3.7"  // Update to your new version
```

### 2. Commit Changes

```bash
git add package.json RELEASE_NOTES.md
git commit -m "Prepare for v0.3.9 release"
git push origin main
```

### 3. Create and Push a Git Tag

Create an annotated tag for the release:

```bash
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z
```

### 4. Automated Release Process

Once you push the tag, GitHub Actions will automatically:

1. Build the application
2. Run tests
3. Create a new GitHub release
4. Upload the built executables
5. Generate release notes

### 5. Verify the Release

1. Go to the [Releases](https://github.com/kelmankenberg/AppNest/releases) page
2. Verify the new release was created
3. Check that all assets were uploaded correctly
4. Review the automatically generated release notes

## MANUAL RELEASE (If Needed)

If you need to create a release without GitHub Actions:

```bash
# Build the application
npm run build

# Create a release
npm run release:skip-tests
```

## TROUBLESHOOTING

### Release Not Triggering
- Ensure the tag starts with 'v' (e.g., v1.0.0)
- Check GitHub Actions tab for any workflow failures

### Build Failures
- Verify all dependencies are properly installed
- Check Node.js version (should be 18+)
- Review build logs in GitHub Actions

## VERSIONING SCHEME

AppNest follows [Semantic Versioning](https://semver.org/):

- **MAJOR** version for incompatible API changes
- **MINOR** version for added functionality (backwards compatible)
- **PATCH** version for backwards-compatible bug fixes

## MAINTAINER NOTES

- Always update the changelog when creating a new release
- Test the portable version before major releases
- Consider creating pre-releases for testing (v2.0.0-beta.1)
