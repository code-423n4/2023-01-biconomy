# Description

<!-- Please include a summary of the changes and the related issue. Please also include relevant motivation and context. List any dependencies that are required for this change. -->

- ...
- ...

## Type of change

<!-- Please delete options that are not relevant. -->

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] This change requires a documentation update

# How Has This Been Tested?

<!-- Please describe the tests that you ran to verify your changes. Provide instructions so we can reproduce. Please also list any relevant details for your test configuration -->

- [ ] Manual Testing
  - Sample results/txn hashes/screenshots:
    - ...
    - ...
- [ ] Automated Testing
  - ...


## Test Configuration:
<!-- Please describe any new/required environment variables and also services that your test depends on -->
- ...

## Steps to reproduce
<!-- Please describe how others can clone your changes and run your tests -->
- ...

### Using New Sample API
**Endpoint**: `/api/v1/admin/withdraw-gas-fee/erc20`

**Sample Request**:
```
{
    "chainId": 80001,
    "executorAddress": "0xb214cb91ea1485dadfecd49114c58d5710d135a8",
    "tokenAddress": "0xeaBc4b91d9375796AA4F69cC764A4aB509080A58"
}
```

**Sample Response**:
```
{
    "amountWithdrawn": "5000000000000000000"
    "txHash": "0x123...
}
```

## Automated Tests Added/Updated
<!-- List the new test files -->
- E2E Tests
  - [ ] ...
- Unit Tests
  - [ ] ...

## Coverage
<!-- Please describe how code coverage has been impacted by your changes -->

# Checklist:

- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published in downstream modules